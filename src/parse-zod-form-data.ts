import * as z4 from "zod/v4/core";
import { z } from "zod/v4";
import type { NestedFieldErrors } from "./flatten-zod-form-errors";
import { coerceFormData } from "./coerce-form-data";
import type { DeepPartial } from "./deep-partial";
import { flattenZodFormSchema } from "./flatten-zod-form-schema";
import { unflattenZodFormData } from "./unflatten-zod-form-data";
import { unflattenZodFormErrors } from "./unflatten-zod-form-errors";
import type {
  FlattenedFormData,
  FlattenedFormErrors,
  FlattenedPaths,
} from "./schema-paths";

type MetaKeys = "form" | "global";

type FlattenedErrorsWithMeta<T extends z4.$ZodType> = Partial<
  Record<FlattenedPaths<T> | MetaKeys, string>
>;

export type ParseErrors<T extends z4.$ZodType> = {
  form?: string;
  global?: string;
  fields?: DeepPartial<NestedFieldErrors<T>>;
  flattened?: FlattenedErrorsWithMeta<T>;
};

export type ParseSuccess<T extends z4.$ZodType> = {
  success: true;
  data: z4.output<T>;
  errors?: undefined;
};

export type ParseFailure<T extends z4.$ZodType> = {
  success: false;
  data?: undefined;
  errors: ParseErrors<T>;
};

export type ParseResult<T extends z4.$ZodType> = ParseSuccess<T> | ParseFailure<T>;

const collectFlattenedErrors = <Schema extends z4.$ZodType>(
  issues: ReadonlyArray<z4.$ZodIssue>
): FlattenedErrorsWithMeta<Schema> => {
  const flattened: FlattenedErrorsWithMeta<Schema> = {};
  for (const issue of issues) {
    const path = issue.path.join(".");
    if (path) {
      flattened[path as FlattenedPaths<Schema>] = issue.message;
      continue;
    }

    flattened.form ??= issue.message;
  }
  return flattened;
};

const extractFieldErrors = <Schema extends z4.$ZodType>(
  flattened: FlattenedErrorsWithMeta<Schema>
): FlattenedFormErrors<Schema> => {
  const entries = Object.entries(flattened).filter(
    ([key]) => key !== "form" && key !== "global"
  );
  return Object.fromEntries(entries) as FlattenedFormErrors<Schema>;
};

const buildErrorPayload = <Schema extends z4.$ZodType>(
  flattened: FlattenedErrorsWithMeta<Schema>,
  overrides?: Partial<Pick<ParseErrors<Schema>, MetaKeys>>
): ParseErrors<Schema> => {
  return {
    form: overrides?.form ?? flattened.form,
    global: overrides?.global ?? flattened.global,
    fields: unflattenZodFormErrors<Schema>(extractFieldErrors(flattened)),
    flattened,
  };
};

function matchWildcardString(pattern: string, key: string): boolean {
  const patternParts = pattern.split(".");
  const testParts = key.split(".");

  if (patternParts.length !== testParts.length) {
    return false;
  }

  return patternParts.every((part, index) => {
    return part === "*" || part === testParts[index];
  });
}

export const parseFormData = <T extends z4.$ZodType>(
  form: FormData,
  {
    schema,
  }: {
    schema: T;
  }
): ParseResult<T> => {
  const result: Record<string, unknown> = {};
  const coercionErrors: Record<string, string> = {};

  // Get the flattened schema for type coercion
  const flattenedZodSchema = flattenZodFormSchema(schema);

  // First pass: Coerce values to their correct types
  for (const [key, formDataValue] of form.entries()) {
    const keyWithHash = key.replace(/(\d+)/g, "#");

    // Try to find the matching schema for coercion
    const matchingSchema =
      flattenedZodSchema.shape[keyWithHash] ||
      Object.entries(flattenedZodSchema.shape).find(
        ([k]) => k.includes("*") && matchWildcardString(k, keyWithHash)
      )?.[1];

    if (matchingSchema) {
      try {
        if (matchingSchema instanceof z.ZodNumber) {
          const num = Number(formDataValue);
          if (!Number.isNaN(num)) {
            result[key] = num;
          } else {
            coercionErrors[key] = "Expected number, received string";
            result[key] = formDataValue;
          }
        } else {
          const coercedValue = coerceFormData(
            matchingSchema as z.ZodType
          ).parse(formDataValue);
          result[key] = coercedValue;
        }
      } catch (error) {
        const shouldRecordError =
          !(matchingSchema instanceof z.ZodUnion) &&
          !(matchingSchema instanceof z.ZodDiscriminatedUnion);

        if (shouldRecordError) {
          if (error instanceof z4.$ZodError) {
            let added = false;
            for (const zodError of error.issues) {
              const path = zodError.path.join(".");
              if (path) {
                coercionErrors[path] = zodError.message;
                added = true;
              }
            }
            if (!added) {
              coercionErrors[key] =
                error.issues[0]?.message ?? "Invalid value";
            }
          } else {
            coercionErrors[key] =
              "An unexpected error occurred during coercion";
          }
        }
        result[key] = formDataValue;
      }
    } else {
      result[key] = formDataValue;
    }
  }

  const flattenedData = result as FlattenedFormData<T>;
  const unflattenedData = unflattenZodFormData<T>(flattenedData);

  const validatedData = z4.safeParse(schema, unflattenedData);

  if (validatedData.success && Object.keys(coercionErrors).length === 0) {
    return {
      success: true,
      data: validatedData.data,
    };
  }

  return {
    success: false,
    errors: buildErrorPayload(
      {
        ...coercionErrors,
        ...(!validatedData.success
          ? collectFlattenedErrors<T>(validatedData.error.issues)
          : {}),
      } as FlattenedErrorsWithMeta<T>,
      { form: undefined, global: undefined }
    ),
  };
};

export const parseData = <T extends z4.$ZodType>(
  data: unknown,
  {
    schema,
  }: {
    schema: T;
  }
): ParseResult<T> => {
  const validatedData = z4.safeParse(schema, data);

  if (!validatedData.success) {
    const flattenedErrors = collectFlattenedErrors<T>(
      validatedData.error.issues
    );
    return {
      success: false,
      errors: buildErrorPayload(flattenedErrors, {
        form: undefined,
        global: undefined,
      }),
    };
  }

  return {
    success: true,
    data: validatedData.data,
  };
};

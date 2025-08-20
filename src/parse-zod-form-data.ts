import { ZodError, z } from "zod/v4";
import type { NestedFieldErrors } from "./flatten-zod-form-errors";
import { coerceFormData } from "./coerce-form-data";
import type { DeepPartial } from "./deep-partial";
import { flattenZodFormSchema } from "./flatten-zod-form-schema";
import { unflattenZodFormData } from "./unflatten-zod-form-data";
import type { $ZodType } from "zod/v4/core";

type ParseResult<T extends $ZodType> =
  | { success: true; data: z.infer<T> }
  | {
      success: false;
      errors: DeepPartial<NestedFieldErrors<T>> | Record<string, string>;
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

export const parseZodFormData = <T extends $ZodType>(
  form: FormData,
  {
    schema,
  }: {
    schema: T;
  }
): ParseResult<T> => {
  const result: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

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
        // For numbers, first try to coerce to number
        if (matchingSchema instanceof z.ZodNumber) {
          const num = Number(formDataValue);
          if (!isNaN(num)) {
            result[key] = num;
          } else {
            errors[key] = "Expected number, received string";
            result[key] = formDataValue;
          }
        } else {
          // Use coerceFormData for other types
          const coercedValue = coerceFormData(
            matchingSchema as z.ZodType
          ).parse(formDataValue);
          result[key] = coercedValue;
        }
      } catch (error) {
        if (error instanceof ZodError) {
          let added = false;
          for (const zodError of error.issues) {
            const path = zodError.path.join(".");
            if (path) {
              errors[path] = zodError.message;
              added = true;
            }
          }
          if (!added) {
            errors[key] = error.issues[0]?.message ?? "Invalid value";
          }
        } else {
          errors[key] = "An unexpected error occurred during coercion";
        }
        result[key] = formDataValue;
      }
    } else {
      result[key] = formDataValue;
    }
  }

  // Second pass: Validate the coerced data
  try {
    const unflattenedData = unflattenZodFormData(result);
    // @ts-expect-error - This is a schema
    const validatedData = schema.safeParse(unflattenedData);

    if (!validatedData.success) {
      const validationErrors: Record<string, string> = {};
      for (const error of validatedData.error.issues) {
        const path = error.path.join(".");
        if (path) {
          // Only add errors with non-empty paths
          validationErrors[path] = error.message;
        }
      }
      // Merge validation errors with coercion errors, preferring validation errors
      const finalErrors = { ...errors, ...validationErrors };
      return { success: false, errors: finalErrors };
    } else {
      return { success: true, data: validatedData.data };
    }
  } catch (error) {
    if (error instanceof ZodError) {
      for (const zodError of error.issues) {
        const path = zodError.path.join(".");
        if (!errors[path]) {
          errors[path] = zodError.message;
        }
      }
    }
  }

  // If we have any errors, return them
  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return { success: false, errors: {} };
};

export const parseZodData = <T extends $ZodType>(
  data: z.infer<T>,
  {
    schema,
  }: {
    schema: T;
  }
): ParseResult<T> => {
  try {
    // Use safeParse instead of parse to handle errors more gracefully
    // @ts-expect-error - This is a schema
    const validatedData = schema.safeParse(data);

    if (!validatedData.success) {
      const errors: Record<string, string> = {};
      for (const error of validatedData.error.issues) {
        const path = error.path.join(".");
        errors[path] = error.message;
      }
      return { success: false, errors };
    }

    return { success: true, data: validatedData.data };
  } catch (error) {
    if (error instanceof ZodError) {
      const errors: Record<string, string> = {};
      for (const zodError of error.issues) {
        const path = zodError.path.join(".");
        errors[path] = zodError.message;
      }
      return { success: false, errors };
    }
    return { success: false, errors: {} };
  }
};

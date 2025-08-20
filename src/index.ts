import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod/v4";
import type { DeepPartial } from "./deep-partial";
import { flattenZodFormData } from "./flatten-zod-form-data";
import { flattenZodFormErrors } from "./flatten-zod-form-errors";
import type { NestedFieldErrors } from "./flatten-zod-form-errors";
import { getFieldProps, NestedFields } from "./get-field-props";
import { $ZodType } from "zod/v4/core";

// NestedFieldErrors type is defined in flatten-zod-form-errors to avoid divergence

type TupleKeys<T extends any[]> = Exclude<keyof T, keyof any[]>;
export type ZodPaths<T extends $ZodType> = T extends z.ZodObject<infer Shape>
  ? {
      [K in keyof Shape]: Shape[K] extends z.ZodArray<infer Item>
        ? Item extends z.ZodObject<infer NestedShape>
          ?
              | `${K & string}.#`
              | {
                  [N in keyof NestedShape]:
                    | `${K & string}.#.${N & string}`
                    | `${K & string}.#.${ZodPaths<
                        NestedShape[N] & z.ZodTypeAny
                      >}`;
                }[keyof NestedShape]
          : `${K & string}.#`
        : Shape[K] extends z.ZodTuple<infer Items>
        ? {
            [I in TupleKeys<
              Items & z.ZodTypeAny[]
            >]: Items[I] extends z.ZodObject<any>
              ?
                  | `${K & string}.${I & string}`
                  | `${K & string}.${I & string}.${ZodPaths<
                      Items[I] & z.ZodTypeAny
                    >}`
              : `${K & string}.${I & string}`;
          }[TupleKeys<Items & z.ZodTypeAny[]>]
        : Shape[K] extends z.ZodObject<any>
        ? `${K & string}` | `${K & string}.${ZodPaths<Shape[K] & z.ZodTypeAny>}`
        : K & string;
    }[keyof Shape]
  : never;

// Unwrap optional/default/nullable wrappers to reach the underlying schema
// Works with zod/v4 classes
type UnwrapModifiers<T> = T extends z.ZodOptional<infer U>
  ? UnwrapModifiers<U>
  : T extends z.ZodDefault<infer U>
  ? UnwrapModifiers<U>
  : T extends z.ZodNullable<infer U>
  ? UnwrapModifiers<U>
  : T;

export type ArrayElementType<
  Schema extends z.ZodTypeAny,
  Path extends string
> = Path extends `${infer Key}.#.${infer Rest}`
  ? Schema extends z.ZodObject<infer Shape>
    ? Key extends keyof Shape
      ? UnwrapModifiers<Shape[Key]> extends z.ZodArray<infer Item>
        ? ArrayElementType<Item & z.ZodTypeAny, Rest>
        : never
      : never
    : never
  : Path extends `${infer Key}.${infer Rest}`
  ? Schema extends z.ZodObject<infer Shape>
    ? Key extends keyof Shape
      ? ArrayElementType<UnwrapModifiers<Shape[Key]> & z.ZodTypeAny, Rest>
      : never
    : never
  : Schema extends z.ZodObject<infer Shape>
  ? Path extends keyof Shape
    ? UnwrapModifiers<Shape[Path]> extends z.ZodArray<infer Item>
      ? z.infer<Item>
      : never
    : never
  : never;

export type ArrayPaths<
  T extends z.ZodTypeAny,
  Prefix extends string = ""
> = T extends z.ZodObject<infer Shape>
  ? {
      [K in keyof Shape]: UnwrapModifiers<Shape[K]> extends z.ZodArray<infer Item>
        ?
            | `${Prefix}${K & string}`
            | ArrayPaths<Item & z.ZodTypeAny, `${Prefix}${K & string}.#.`>
        : UnwrapModifiers<Shape[K]> extends z.ZodObject<any>
        ? ArrayPaths<UnwrapModifiers<Shape[K]>, `${Prefix}${K & string}.`>
        : never;
    }[keyof Shape]
  : never;

// A form is a flattened collection of fields
// - sub fields should be . delimited
// - array fields should be [#] delimited
// When we pass in the schema, we should be able to determine what the form field names should be.
export const useZodForm = <Schema extends $ZodType>({
  schema,
  defaultValues,
  errors: passedInErrors,
}: {
  schema: Schema;
  defaultValues?: DeepPartial<z.infer<Schema>>;
  errors?: DeepPartial<NestedFieldErrors<Schema>> | null;
}) => {
  const [flattenedData, setFlattenedData] = useState(() => {
    const initial = defaultValues ?? ({} as DeepPartial<z.infer<Schema>>);
    return flattenZodFormData(schema, initial);
  });

  const [internalErrors, setInternalErrors] = useState<Map<string, string>>(
    () => flattenZodFormErrors(passedInErrors)
  );

  const setFieldErrors = useCallback(
    (newErrors: DeepPartial<NestedFieldErrors<Schema>>) => {
      setInternalErrors(flattenZodFormErrors(newErrors));
    },
    []
  );

  // Don't love this useEffect, internal errors needs to be a state so we can set it
  // and we also want to update it when the passed in errors change as well.
  useEffect(() => {
    if (passedInErrors) setFieldErrors(passedInErrors);
  }, [passedInErrors, setFieldErrors]);

  const fields = useMemo((): NestedFields<Schema> => {
    return getFieldProps(
      schema,
      [],
      flattenedData as Record<string, unknown>,
      (updater) =>
        setFlattenedData(
          (prev) => updater(prev as Record<string, unknown>) as any
        ),
      internalErrors
    ) as NestedFields<Schema>;
  }, [schema, flattenedData, internalErrors]);

  const getFieldArrayHelpers = useCallback(
    <P extends ArrayPaths<Schema & z.ZodTypeAny>>(path: P) => {
      return {
        add: (value: ArrayElementType<Schema & z.ZodTypeAny, P>) => {
          setFlattenedData((prev) => {
            const newData = { ...prev };
            const currentArray = Object.keys(newData)
              .filter((key) => key.startsWith(`${path}.`))
              .reduce((max, key) => {
                const match = key.match(new RegExp(`^${path}\\.(\\d+)`));
                return match
                  ? Math.max(max, Number.parseInt(match[1], 10))
                  : max;
              }, -1);

            const newIndex = currentArray + 1;

            if (typeof value === "object" && value !== null) {
              for (const [key, val] of Object.entries(value)) {
                newData[`${path}.${newIndex}.${key}`] = val;
              }
            } else {
              newData[`${path}.${newIndex}`] = value;
            }

            return newData;
          });
        },
        remove: (index: number) => {
          setFlattenedData((prev) => {
            const newData = { ...prev };
            const prefix = `${path}.${index}`;

            // Remove all keys that start with the prefix
            for (const key of Object.keys(newData)) {
              if (key.startsWith(prefix)) {
                delete newData[key];
              }
            }

            // Shift the indices of the remaining elements
            for (const key of Object.keys(newData)) {
              const match = key.match(new RegExp(`^${path}\\.(\\d+)`));
              if (match) {
                const currentIndex = Number.parseInt(match[1], 10);
                if (currentIndex > index) {
                  const newKey = key.replace(
                    new RegExp(`^${path}\\.${currentIndex}`),
                    `${path}.${currentIndex - 1}`
                  );
                  newData[newKey] = newData[key];
                  delete newData[key];
                }
              }
            }

            return newData;
          });
        },
      };
    },
    []
  );

  return {
    fields,
    getFieldArrayHelpers,
    setFieldErrors,
  } satisfies {
    fields: NestedFields<Schema>;
    getFieldArrayHelpers: <P extends ArrayPaths<Schema & z.ZodTypeAny>>(
      path: P
    ) => {
      add: (value: ArrayElementType<Schema & z.ZodTypeAny, P>) => void;
      remove: (index: number) => void;
    };
    setFieldErrors: (errors: DeepPartial<NestedFieldErrors<Schema>>) => void;
  };
};

export { getFieldProps };

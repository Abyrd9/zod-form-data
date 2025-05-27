import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod/v4";
import type { DeepPartial } from "./deep-partial";
import { extractZodDefaults } from "./extract-zod-defaults";
import { flattenZodFormData } from "./flatten-zod-form-data";
import { flattenZodFormErrors } from "./flatten-zod-form-errors";
import { unflattenZodFormData } from "./unflatten-zod-form-data";

export type ZodFormSchema = z.ZodTypeAny;

export type FieldProps<T> = {
  name: string;
  value: T;
  onChange: (payload: T) => void;
  error: string | null;
};

export type NestedFields<T extends z.ZodTypeAny> =
  T extends z.ZodObject<infer Shape>
    ? { [K in keyof Shape]: NestedFields<Shape[K] & z.ZodTypeAny> }
    : T extends z.ZodRecord<any, infer Value>
      ? Record<string, NestedFields<Value & z.ZodTypeAny>>
      : T extends z.ZodMap<infer Key, infer Value>
        ? Map<z.infer<Key>, NestedFields<Value & z.ZodTypeAny>>
        : T extends z.ZodArray<infer Item>
          ? NestedFields<Item & z.ZodTypeAny>[]
          : T extends z.ZodSet<infer Item>
            ? Set<NestedFields<Item & z.ZodTypeAny>>
            : T extends z.ZodTuple<infer Items>
              ? { [K in keyof Items]: NestedFields<Items[K] & z.ZodTypeAny> }
              : FieldProps<z.infer<T>>;

export type NestedFieldErrors<T extends z.ZodTypeAny> =
  T extends z.ZodObject<infer Shape>
    ? { [K in keyof Shape]: NestedFieldErrors<Shape[K] & z.ZodTypeAny> }
    : T extends z.ZodRecord<any, infer Value>
      ? Record<string, NestedFieldErrors<Value & z.ZodTypeAny>>
      : T extends z.ZodMap<infer Key, infer Value>
        ? Map<z.infer<Key>, NestedFieldErrors<Value & z.ZodTypeAny>>
        : T extends z.ZodArray<infer Item>
          ? NestedFieldErrors<Item & z.ZodTypeAny>[]
          : T extends z.ZodSet<infer Item>
            ? Set<NestedFieldErrors<Item & z.ZodTypeAny>>
            : T extends z.ZodTuple<infer Items>
              ? { [K in keyof Items]: NestedFieldErrors<Items[K] & z.ZodTypeAny> }
              : string;

type TupleKeys<T extends any[]> = Exclude<keyof T, keyof any[]>;
export type ZodPaths<T extends z.ZodTypeAny> =
  T extends z.ZodObject<infer Shape>
    ? {
        [K in keyof Shape]:
          Shape[K] extends z.ZodArray<infer Item>
            ? Item extends z.ZodObject<infer NestedShape>
              ? `${K & string}.#` | { [N in keyof NestedShape]: `${K & string}.#.${N & string}` | `${K & string}.#.${ZodPaths<NestedShape[N] & z.ZodTypeAny>}` }[keyof NestedShape]
              : `${K & string}.#`
            : Shape[K] extends z.ZodTuple<infer Items>
              ? { [I in TupleKeys<Items & z.ZodTypeAny[]>]:
                    Items[I] extends z.ZodObject<any>
                      ? `${K & string}.${I & string}` | `${K & string}.${I & string}.${ZodPaths<Items[I] & z.ZodTypeAny>}`
                      : `${K & string}.${I & string}`
                }[TupleKeys<Items & z.ZodTypeAny[]>]
            : Shape[K] extends z.ZodObject<any>
              ? `${K & string}` | `${K & string}.${ZodPaths<Shape[K] & z.ZodTypeAny>}`
            : K & string
      }[keyof Shape]
    : never;

export type ArrayElementType<
  Schema extends z.ZodTypeAny,
  Path extends string
> =
  Path extends `${infer Key}.#.${infer Rest}`
    ? Schema extends z.ZodObject<infer Shape>
      ? Key extends keyof Shape
        ? Shape[Key] extends z.ZodArray<infer Item>
          ? ArrayElementType<Item & z.ZodTypeAny, Rest>
          : never
        : never
      : never
    : Path extends `${infer Key}.${infer Rest}`
      ? Schema extends z.ZodObject<infer Shape>
        ? Key extends keyof Shape
          ? ArrayElementType<Shape[Key] & z.ZodTypeAny, Rest>
          : never
        : never
      : Schema extends z.ZodObject<infer Shape>
        ? Path extends keyof Shape
          ? Shape[Path] extends z.ZodArray<infer Item>
            ? z.infer<Item>
            : never
          : never
        : never;

export type ArrayPaths<T extends z.ZodTypeAny, Prefix extends string = ""> =
  T extends z.ZodObject<infer Shape>
    ? {
        [K in keyof Shape]:
          Shape[K] extends z.ZodArray<infer Item>
            ? | `${Prefix}${K & string}`
              | ArrayPaths<Item & z.ZodTypeAny, `${Prefix}${K & string}.#.`>
            : Shape[K] extends z.ZodObject<any>
              ? ArrayPaths<Shape[K], `${Prefix}${K & string}.`>
              : never
      }[keyof Shape]
    : never;

    const schema = z.object({
      users: z.array(z.object({
        name: z.string(),
        posts: z.array(z.object({ title: z.string() }))
      }))
    });

// A form is a flattened collection of fields
// - sub fields should be . delimited
// - array fields should be [#] delimited
// When we pass in the schema, we should be able to determine what the form field names should be.

export const useZodForm = <Schema extends ZodFormSchema>({
  schema,
  defaultValues,
  errors: passedInErrors,
}: {
  schema: Schema;
  defaultValues?: DeepPartial<z.infer<Schema>>;
  errors?: DeepPartial<NestedFieldErrors<Schema>> | null;
}) => {
  const [flattenedData, setFlattenedData] = useState(() => {
    const zodDefaults = extractZodDefaults(schema);
    const initial = defaultValues ?? zodDefaults ?? {} as DeepPartial<z.infer<Schema>>;
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
    const getFieldProps = <T extends z.ZodTypeAny>(
      field: T,
      path: string[] = []
    ): NestedFields<T> => {
      if (field instanceof z.ZodType) {
        if (field instanceof z.ZodObject) {
          const objectFields: Record<string, unknown> = {};
          for (const [key, subField] of Object.entries(field.shape)) {
            objectFields[key] = getFieldProps(subField as z.ZodTypeAny, [
              ...path,
              key,
            ]);
          }
  
          return objectFields as NestedFields<T>;
        }
      }


      if (field instanceof z.ZodArray) {
        const arrayPath = path.join(".") as ZodPaths<Schema>;

        const nested = unflattenZodFormData<typeof field>(
          flattenedData,
          arrayPath
        );

        return (
          (nested?.map((_: unknown, index: number) =>
            getFieldProps(
              (field as unknown as z.ZodArray<z.ZodTypeAny>).element,
              [...path, index.toString()]
            )
          ) as NestedFields<T>) ?? []
        );
      }

      const fieldPath = path.join(".") as ZodPaths<Schema>;
      const value = flattenedData[fieldPath] as z.infer<T>;

      return {
        name: fieldPath,
        value,
        onChange: (payload: z.infer<T>) => {
          setFlattenedData((prev) => ({ ...prev, [fieldPath]: payload }));
        },
        error: internalErrors.get(fieldPath) ?? null,
      } as unknown as NestedFields<T>;
    };

    return getFieldProps(schema) as NestedFields<Schema>;
  }, [schema, flattenedData, internalErrors]);

  const getFieldArrayHelpers = useCallback(
    <P extends ArrayPaths<Schema>>(path: P) => {
      return {
        add: (value: ArrayElementType<Schema, P>) => {
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
    getFieldArrayHelpers: <P extends ArrayPaths<Schema>>(
      path: P
    ) => {
      add: (value: ArrayElementType<Schema, P>) => void;
      remove: (index: number) => void;
    };
    setFieldErrors: (errors: DeepPartial<NestedFieldErrors<Schema>>) => void;
  };
};

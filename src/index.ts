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

/**
 * Extracts all keys from a tuple of Zod object schemas
 */
type AllKeysFromOptions<Options extends readonly z.ZodTypeAny[]> = {
  [I in keyof Options]: Options[I] extends z.ZodObject<infer Shape>
    ? keyof Shape
    : never;
}[number];

/**
 * For a given key K, get the union of field types from all options that have that key
 */
type FieldTypeForKey<
  Options extends readonly z.ZodTypeAny[],
  K extends PropertyKey
> = {
  [I in keyof Options]: Options[I] extends z.ZodObject<infer Shape>
    ? K extends keyof Shape
      ? NestedFields<Shape[K] & z.ZodTypeAny>
      : never
    : never;
}[number];

/**
 * Creates a merged object type with all keys from all options.
 * All keys are present (not optional) since getFieldProps always creates fields for all keys.
 * Each key's type is a union of the field types from all options that have that key.
 */
type MergeOptionFields<
  Options extends readonly z.ZodTypeAny[],
  Keys extends PropertyKey = AllKeysFromOptions<Options>
> = {
  [K in Keys]: FieldTypeForKey<Options, K>;
};

/**
 * Utility type to cast discriminated union fields from getFieldProps.
 * At runtime, getFieldProps returns a merged object with all possible keys from all union options.
 * 
 * Usage:
 *   const field = result.fields.myUnionField;
 *   // TypeScript sees: Option1 | Option2 | Option3
 *   // Runtime has: all keys from all options present
 *   
 * To access option-specific fields without TypeScript errors, use optional chaining:
 *   field.optionSpecificProp?.name
 * 
 * Or narrow the type using the discriminator:
 *   if (field.discriminator.value === "option1") {
 *     // Now TypeScript knows which option, but runtime still has all keys
 *   }
 */
export type DiscriminatedFields<
  S extends z.ZodTypeAny
> = S extends z.ZodDiscriminatedUnion<any, infer Options>
  ? Options extends readonly z.ZodTypeAny[]
    ? MergeOptionFields<Options>
    : never
  : never;

/**
 * Utility type to cast non-discriminated union fields from getFieldProps.
 * Similar to DiscriminatedFields. At runtime, all possible keys are present.
 * Use optional chaining to access fields that don't exist in all union options.
 */
export type UnionFields<
  S extends z.ZodTypeAny
> = S extends z.ZodUnion<
  infer Tuple extends [z.ZodTypeAny, ...z.ZodTypeAny[]]
>
  ? MergeOptionFields<Tuple>
  : never;
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
  : Path extends `${infer Key}.${number}.${infer Rest}`
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

// Helper type to replace # with ${number} to allow concrete indices at runtime
type ReplaceHashWithNumber<T extends string> = 
  T extends `${infer Before}.#.${infer After}`
    ? `${Before}.${number}.${ReplaceHashWithNumber<After>}`
    : T extends `${infer Before}.#`
    ? `${Before}.${number}`
    : T;

export type ArrayPaths<
  T extends z.ZodTypeAny,
  Prefix extends string = ""
> = T extends z.ZodObject<infer Shape>
  ? {
      [K in keyof Shape]: UnwrapModifiers<Shape[K]> extends z.ZodArray<infer Item>
        ?
            | `${Prefix}${K & string}`
            | ArrayPaths<Item & z.ZodTypeAny, `${Prefix}${K & string}.#.`>
            | ReplaceHashWithNumber<`${Prefix}${K & string}` | ArrayPaths<Item & z.ZodTypeAny, `${Prefix}${K & string}.#.`>>
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

  const reset = useCallback(() => {
    setFlattenedData(flattenZodFormData(schema, defaultValues ?? ({} as DeepPartial<z.infer<Schema>>)));
    setInternalErrors(new Map<string, string>());
  }, [schema, defaultValues]);

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
        add: (value: ArrayElementType<Schema & z.ZodTypeAny, P>, atIndex?: number) => {
          setFlattenedData((prev) => {
            const newData = { ...prev };
            const currentMaxIndex = Object.keys(newData)
              .filter((key) => key.startsWith(`${path}.`))
              .reduce((max, key) => {
                const match = key.match(new RegExp(`^${path}\\.(\\d+)`));
                return match
                  ? Math.max(max, Number.parseInt(match[1], 10))
                  : max;
              }, -1);

            const insertIndex = atIndex !== undefined ? atIndex : currentMaxIndex + 1;

            // If inserting in the middle or at a specific position, shift existing items
            if (atIndex !== undefined && atIndex <= currentMaxIndex) {
              // Shift items at insertIndex and beyond up by 1
              for (const key of Object.keys(newData).sort().reverse()) {
                const match = key.match(new RegExp(`^${path}\\.(\\d+)(.*)$`));
                if (match) {
                  const currentIndex = Number.parseInt(match[1], 10);
                  const suffix = match[2] || '';
                  if (currentIndex >= insertIndex) {
                    const newKey = `${path}.${currentIndex + 1}${suffix}`;
                    newData[newKey] = newData[key];
                    delete newData[key];
                  }
                }
              }
            }

            // Insert the new item
            if (typeof value === "object" && value !== null) {
              for (const [key, val] of Object.entries(value)) {
                newData[`${path}.${insertIndex}.${key}`] = val;
              }
            } else {
              newData[`${path}.${insertIndex}`] = value;
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
        move: (fromIndex: number, toIndex: number) => {
          setFlattenedData((prev) => {
            const newData = { ...prev };
            
            // Get all keys for the item we're moving
            const itemKeys = Object.keys(newData).filter((key) => {
              const match = key.match(new RegExp(`^${path}\\.(\\d+)(.*)$`));
              return match && Number.parseInt(match[1], 10) === fromIndex;
            });

            if (itemKeys.length === 0) return prev; // Item doesn't exist

            // Store the item data
            const itemData: Record<string, any> = {};
            for (const key of itemKeys) {
              const match = key.match(new RegExp(`^${path}\\.(\\d+)(.*)$`));
              if (match) {
                const suffix = match[2] || '';
                itemData[suffix] = newData[key];
              }
            }

            // Remove the item from its current position
            for (const key of itemKeys) {
              delete newData[key];
            }

            // Determine the direction of the move
            if (fromIndex < toIndex) {
              // Moving down: shift items between fromIndex and toIndex down by 1
              for (const key of Object.keys(newData)) {
                const match = key.match(new RegExp(`^${path}\\.(\\d+)(.*)$`));
                if (match) {
                  const currentIndex = Number.parseInt(match[1], 10);
                  const suffix = match[2] || '';
                  if (currentIndex > fromIndex && currentIndex <= toIndex) {
                    const newKey = `${path}.${currentIndex - 1}${suffix}`;
                    newData[newKey] = newData[key];
                    delete newData[key];
                  }
                }
              }
            } else if (fromIndex > toIndex) {
              // Moving up: shift items between toIndex and fromIndex up by 1
              for (const key of Object.keys(newData).sort().reverse()) {
                const match = key.match(new RegExp(`^${path}\\.(\\d+)(.*)$`));
                if (match) {
                  const currentIndex = Number.parseInt(match[1], 10);
                  const suffix = match[2] || '';
                  if (currentIndex >= toIndex && currentIndex < fromIndex) {
                    const newKey = `${path}.${currentIndex + 1}${suffix}`;
                    newData[newKey] = newData[key];
                    delete newData[key];
                  }
                }
              }
            }

            // Insert the item at the new position
            for (const [suffix, value] of Object.entries(itemData)) {
              newData[`${path}.${toIndex}${suffix}`] = value;
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
    reset,
  } satisfies {
    fields: NestedFields<Schema>;
    getFieldArrayHelpers: <P extends ArrayPaths<Schema & z.ZodTypeAny>>(
      path: P
    ) => {
      add: (value: ArrayElementType<Schema & z.ZodTypeAny, P>, atIndex?: number) => void;
      remove: (index: number) => void;
      move: (fromIndex: number, toIndex: number) => void;
    };
    setFieldErrors: (errors: DeepPartial<NestedFieldErrors<Schema>>) => void;
    reset: () => void;
  };
};

export { getFieldProps };

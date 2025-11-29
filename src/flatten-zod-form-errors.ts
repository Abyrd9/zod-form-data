import type * as z4 from "zod/v4/core";
import type { DeepPartial } from "./deep-partial";
import type { FlattenedFormErrors } from "./schema-paths";

export type NestedFieldErrors<T extends z4.$ZodType> = T extends z4.$ZodObject<infer Shape>
    ? { [K in keyof Shape]: NestedFieldErrors<Shape[K] & z4.$ZodType> }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    : T extends z4.$ZodRecord<any, infer Value>
    ? Record<string, NestedFieldErrors<Value & z4.$ZodType>>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    : T extends z4.$ZodMap<any, infer Value>
    ? Map<string, NestedFieldErrors<Value & z4.$ZodType>>
    : T extends z4.$ZodArray<infer Item>
    ? NestedFieldErrors<Item & z4.$ZodType>[]
    : T extends z4.$ZodSet<infer Item>
    ? Set<NestedFieldErrors<Item & z4.$ZodType>>
    : T extends z4.$ZodTuple<infer Items>
    ? { [K in keyof Items]: NestedFieldErrors<Items[K] & z4.$ZodType> }
    : T extends z4.$ZodOptional<infer Inner>
    ? NestedFieldErrors<Inner & z4.$ZodType>
    : T extends z4.$ZodDefault<infer Inner>
    ? NestedFieldErrors<Inner & z4.$ZodType>
    : T extends z4.$ZodNullable<infer Inner>
    ? NestedFieldErrors<Inner & z4.$ZodType>
    : T extends z4.$ZodUnion<infer Options>
    ? Options extends readonly z4.$ZodType[]
    ? NestedFieldErrors<Options[number] & z4.$ZodType>
    : string
    : T extends z4.$ZodIntersection<infer Left, infer Right>
    ? NestedFieldErrors<Left & z4.$ZodType> & NestedFieldErrors<Right & z4.$ZodType>
    : T extends z4.$ZodLazy<infer LazyType>
    ? LazyType extends z4.$ZodType
    ? NestedFieldErrors<LazyType>
    : string
    : T extends z4.$ZodPipe<infer Input, z4.$ZodType>
    ? NestedFieldErrors<Input & z4.$ZodType>
    : T extends z4.$ZodCatch<infer Inner>
    ? NestedFieldErrors<Inner & z4.$ZodType>
    : T extends z4.$ZodPromise<infer Unwrapped>
    ? Unwrapped extends z4.$ZodType
    ? NestedFieldErrors<Unwrapped>
    : string
    : string;

export function flattenZodFormErrors<T extends z4.$ZodType>(
  errors?: DeepPartial<NestedFieldErrors<T>> | null
): FlattenedFormErrors<T> {
  if (!errors) return {};

  const flattenedErrors: Record<string, string> = {};

  function flatten(subErrors: Record<string, unknown>, prefix = ""): void {
    for (const [key, value] of Object.entries(subErrors)) {
      const newPrefix = prefix ? `${prefix}.${key}` : key;
      if (typeof value === "string") {
        flattenedErrors[newPrefix] = value;
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item === "string") {
            flattenedErrors[`${newPrefix}.${index}`] = item;
          } else if (item && typeof item === "object") {
            flatten(item as Record<string, unknown>, `${newPrefix}.${index}`);
          }
        });
      } else if (value && typeof value === "object") {
        flatten(value as Record<string, unknown>, newPrefix);
      }
    }
  }

  flatten(errors as unknown as Record<string, unknown>);

  return flattenedErrors as FlattenedFormErrors<T>;
}

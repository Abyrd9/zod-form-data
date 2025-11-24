import { $ZodType } from "zod/v4/core";
import type { DeepPartial } from "./deep-partial";
import type { FlattenedFormErrors } from "./schema-paths";

export type NestedFieldErrors<T extends $ZodType> = T extends { _zod: { def: { type: "object"; shape: infer Shape } } }
    ? { [K in keyof Shape]: NestedFieldErrors<Shape[K] & $ZodType> }
    : T extends { _zod: { def: { type: "record"; valueType: infer Value } } }
    ? Record<string, NestedFieldErrors<Value & $ZodType>>
    : T extends { _zod: { def: { type: "map"; valueType: infer Value } } }
    ? Map<string, NestedFieldErrors<Value & $ZodType>>
    : T extends { _zod: { def: { type: "array"; element: infer Item } } }
    ? NestedFieldErrors<Item & $ZodType>[]
    : T extends { _zod: { def: { type: "set"; element: infer Item } } }
    ? Set<NestedFieldErrors<Item & $ZodType>>
    : T extends { _zod: { def: { type: "tuple"; items: infer Items } } }
    ? { [K in keyof Items]: NestedFieldErrors<Items[K] & $ZodType> }
    : T extends { _zod: { def: { type: "optional"; innerType: infer Inner } } }
    ? NestedFieldErrors<Inner & $ZodType>
    : T extends { _zod: { def: { type: "default"; innerType: infer Inner } } }
    ? NestedFieldErrors<Inner & $ZodType>
    : T extends { _zod: { def: { type: "nullable"; innerType: infer Inner } } }
    ? NestedFieldErrors<Inner & $ZodType>
    : T extends { _zod: { def: { type: "union"; options: infer Options } } }
    ? Options extends readonly $ZodType[]
    ? NestedFieldErrors<Options[number] & $ZodType>
    : string
    : T extends { _zod: { def: { type: "intersection"; left: infer Left; right: infer Right } } }
    ? NestedFieldErrors<Left & $ZodType> & NestedFieldErrors<Right & $ZodType>
    : T extends { _zod: { def: { type: "lazy"; getter: () => infer LazyType } } }
    ? LazyType extends $ZodType
    ? NestedFieldErrors<LazyType>
    : string
    : T extends { _zod: { def: { type: "transform"; input: infer Input; output: infer Output } } }
    ? NestedFieldErrors<Input & $ZodType>
    : T extends { _zod: { def: { type: "pipe"; input: infer Input; output: infer Output } } }
    ? NestedFieldErrors<Input & $ZodType>
    : T extends { _zod: { def: { type: "catch"; innerType: infer Inner } } }
    ? NestedFieldErrors<Inner & $ZodType>
    : T extends { _zod: { def: { type: "success"; data: infer Data } } }
    ? string
    : T extends { _zod: { def: { type: "literal"; value: infer Value } } }
    ? string
    : T extends { _zod: { def: { type: "enum"; values: infer Values } } }
    ? string
    : T extends { _zod: { def: { type: "promise"; unwrap: infer Unwrapped } } }
    ? Unwrapped extends $ZodType
    ? NestedFieldErrors<Unwrapped>
    : string
    : T extends { _zod: { def: { type: "custom" } } }
    ? string
    : string;

export function flattenZodFormErrors<T extends $ZodType>(
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

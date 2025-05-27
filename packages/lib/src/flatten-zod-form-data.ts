import { z } from "zod/v4";
import type { ZodFormSchema } from ".";
import type { DeepPartial } from "./deep-partial";
import { $ZodType } from "zod/v4/core";

export function flattenZodFormData<T extends ZodFormSchema>(
  schema: T,
  data: DeepPartial<z.infer<T>>
) {
  const flattenedDataMap = new Map<string, unknown>();

  function flatten(subSchema: $ZodType, subValue: unknown, prefix = ""): void {
    let currentSubSchema = subSchema;

    if (currentSubSchema instanceof z.ZodObject) {
      if (typeof subValue === "object" && subValue !== null) {
        for (const [key, value] of Object.entries(currentSubSchema.shape)) {
          const newPrefix = prefix ? `${prefix}.${key}` : key;
          flatten(
            value as z.ZodType,
            (subValue as Record<string, unknown>)[key] as unknown,
            newPrefix
          );
        }
      } else {
        console.error("Expected object, got", subValue);
      }
      return;
    }

    if (currentSubSchema instanceof z.ZodArray) {
      if (Array.isArray(subValue)) {
        subValue.forEach((item, index) => {
          flatten(
            (currentSubSchema as z.ZodArray<z.ZodType>).element,
            item,
            `${prefix}.${index}`
          );
        });
      } else {
        console.error("Expected array, got", subValue);
      }
      return;
    }

    if (
      currentSubSchema instanceof z.ZodUnion ||
      currentSubSchema instanceof z.ZodDiscriminatedUnion
    ) {
      const options = currentSubSchema.options;
      for (const option of options) {
        flatten(option as z.ZodType, subValue, prefix);
      }
      return;
    }

    if (currentSubSchema instanceof z.ZodLazy) {
      const lazyValue = currentSubSchema.def.getter();
      flatten(lazyValue, subValue, prefix);
      return;
    }

    if (currentSubSchema instanceof z.ZodOptional) {
      const inner = currentSubSchema.def.innerType;
      flatten(inner, subValue, prefix);
      return;
    }

    if (currentSubSchema instanceof z.ZodDefault) {
      const inner = currentSubSchema.def.innerType;
      const defaultValue = currentSubSchema.def.defaultValue;
      const valueWithDefault = subValue === undefined ? defaultValue : subValue;
      flatten(inner, valueWithDefault, prefix);
      return;
    }

    if (currentSubSchema instanceof z.ZodRecord) {
      if (typeof subValue === "object" && subValue !== null) {
        for (const [key, value] of Object.entries(
          subValue as Record<string, unknown>
        )) {
          if (subSchema instanceof z.ZodRecord) {
            const newSubSchema = subSchema.def.valueType as $ZodType;
            const newSubValue = (subValue as Record<string, unknown>)[key];
            const newPrefix = `${prefix}.${key}`;

            flatten(newSubSchema, newSubValue, newPrefix);
          } else {
            console.error("Expected record, got", subValue);
          }
        }
      }

      return;
    }

    flattenedDataMap.set(prefix, subValue);
  }

  flatten(schema, data);
  return Object.fromEntries(flattenedDataMap);
}

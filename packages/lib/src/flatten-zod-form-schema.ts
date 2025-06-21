import { z } from "zod/v4";
import type { ZodFormSchema } from ".";
import { ZodFirstPartyTypeKind } from "zod";
import { $ZodType } from "zod/v4/core";

export function flattenZodFormSchema<T extends ZodFormSchema>(
  schema: T
): z.ZodObject<z.ZodRawShape> {
  const flattenedSchemaMap = new Map<string, z.ZodType>();

  function flatten(subSchema: $ZodType, prefix = "") {
    let currentSubSchema = subSchema;

    if (currentSubSchema instanceof z.ZodObject) {
      for (const [key, value] of Object.entries(currentSubSchema.shape)) {
        const newPrefix = prefix ? `${prefix}.${key}` : key;
        flatten(value as z.ZodType, newPrefix);
      }
      return;
    }

    if (currentSubSchema instanceof z.ZodArray) {
      flatten(currentSubSchema.element, `${prefix}.#`);
      return;
    }

    if (
      currentSubSchema instanceof z.ZodUnion ||
      currentSubSchema instanceof z.ZodDiscriminatedUnion
    ) {
      for (const option of currentSubSchema.options) {
        flatten(option as z.ZodType, prefix);
      }
      return;
    }

    if (currentSubSchema instanceof z.ZodLazy) {
      const lazyValue = currentSubSchema.def.getter();
      flatten(lazyValue, prefix);
      return;
    }

    if (currentSubSchema instanceof z.ZodOptional) {
      flatten(currentSubSchema.def.innerType, prefix);
      return;
    }

    if (currentSubSchema instanceof z.ZodDefault) {
      flatten(currentSubSchema.def.innerType, prefix);
      return;
    }

    if (currentSubSchema instanceof z.ZodRecord) {
      flatten(currentSubSchema.def.valueType, `${prefix}.*`);
      return;
    }

    flattenedSchemaMap.set(prefix, subSchema as z.ZodType);
  }

  flatten(schema);

  return z.object(Object.fromEntries(flattenedSchemaMap));
}

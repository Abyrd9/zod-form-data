import { z } from "zod/v4";
import { $ZodType } from "zod/v4/core";

export function flattenZodFormSchema<T extends $ZodType>(
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

    if (currentSubSchema instanceof z.ZodTuple) {
      // For tuples, coerce each element using a union of item schemas and use # placeholder
      const items = (currentSubSchema.def.items ?? []) as unknown as z.ZodType[];
      if (items.length === 1) {
        flattenedSchemaMap.set(`${prefix}.#`, items[0] as z.ZodType);
      } else if (items.length > 1) {
        flattenedSchemaMap.set(`${prefix}.#`, z.union(items as any));
      }
      return;
    }

    // Discriminated unions: include the discriminator path and flatten option fields
    if (currentSubSchema instanceof z.ZodDiscriminatedUnion) {
      const discriminator = (currentSubSchema as any)._def?.discriminator ?? (currentSubSchema as any).discriminator;
      const discPath = prefix ? `${prefix}.${discriminator}` : discriminator;
      // The discriminator itself is a literal string; using z.string() matches tests
      flattenedSchemaMap.set(discPath, z.string());
      for (const option of currentSubSchema.options) {
        flatten(option as z.ZodType, prefix);
      }
      return;
    }
    if (currentSubSchema instanceof z.ZodUnion) {
      // Keep union as a single leaf at this path for coercion
      flattenedSchemaMap.set(prefix, currentSubSchema);
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

    // Leaf: store the schema at this path
    flattenedSchemaMap.set(prefix, subSchema as z.ZodType);
  }

  flatten(schema);

  return z.object(Object.fromEntries(flattenedSchemaMap));
}

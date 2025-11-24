import { z } from "zod/v4";
import { $ZodType } from "zod/v4/core";

export function flattenZodFormSchema<T extends $ZodType>(
  schema: T
): z.ZodObject<z.ZodRawShape> {
  const flattenedSchemaMap = new Map<string, z.ZodType>();

  function flatten(
    subSchema: $ZodType,
    prefix = "",
    options?: { isOptional?: boolean; lazyDepth?: number }
  ) {
    let currentSubSchema = subSchema;
    const isOptional = options?.isOptional === true;
    const lazyDepth = options?.lazyDepth ?? 0;

    if (currentSubSchema instanceof z.ZodObject) {
      for (const [key, value] of Object.entries(currentSubSchema.shape)) {
        const newPrefix = prefix ? `${prefix}.${key}` : key;
        flatten(value as z.ZodType, newPrefix, { isOptional, lazyDepth });
      }
      return;
    }

    if (currentSubSchema instanceof z.ZodArray) {
      flatten(currentSubSchema.element, `${prefix}.#`, { isOptional, lazyDepth });
      return;
    }

    if (currentSubSchema instanceof z.ZodTuple) {
      // For tuples, coerce each element using a union of item schemas and use # placeholder
      const items = (currentSubSchema.def.items ?? []) as unknown as z.ZodType[];
      if (items.length === 1) {
        flattenedSchemaMap.set(`${prefix}.#`, items[0] as z.ZodType);
      } else if (items.length > 1) {
        const tupleForUnion = items as unknown as [
          z.ZodTypeAny,
          z.ZodTypeAny,
          ...z.ZodTypeAny[]
        ];
        flattenedSchemaMap.set(`${prefix}.#`, z.union(tupleForUnion));
      }
      return;
    }

    // Discriminated unions: include the discriminator path and flatten option fields
    if (currentSubSchema instanceof z.ZodDiscriminatedUnion) {
      const discriminator = currentSubSchema._def.discriminator;
      const discPath = prefix ? `${prefix}.${discriminator}` : discriminator;
      // The discriminator itself is a literal string; using z.string() matches tests
      flattenedSchemaMap.set(discPath, z.string());
      for (const option of currentSubSchema.options) {
        flatten(option as z.ZodType, prefix, { isOptional, lazyDepth });
      }
      return;
    }
    if (currentSubSchema instanceof z.ZodUnion) {
      // Keep union as a single leaf at this path for coercion
      const leaf = currentSubSchema as unknown as z.ZodType;
      const isCollectionElement = prefix.endsWith('.#') || prefix.endsWith('.*');
      flattenedSchemaMap.set(prefix, isOptional && !isCollectionElement ? z.optional(leaf) : leaf);
      return;
    }

    if (currentSubSchema instanceof z.ZodLazy) {
      // Allow a deeper expansion to capture nested lazy structures
      if (lazyDepth >= 3) return;
      const lazyValue = currentSubSchema.def.getter();
      flatten(lazyValue, prefix, { isOptional, lazyDepth: lazyDepth + 1 });
      return;
    }

    if (currentSubSchema instanceof z.ZodOptional) {
      flatten(currentSubSchema.def.innerType, prefix, { isOptional: true, lazyDepth });
      return;
    }

    if (currentSubSchema instanceof z.ZodDefault) {
      flatten(currentSubSchema.def.innerType, prefix, { isOptional, lazyDepth });
      return;
    }

    if (currentSubSchema instanceof z.ZodRecord) {
      flatten(currentSubSchema.def.valueType, `${prefix}.*`, { isOptional, lazyDepth });
      return;
    }

    // Leaf: store the schema at this path
    const leaf = subSchema as z.ZodType;
    const isCollectionElement = prefix.endsWith('.#') || prefix.endsWith('.*');
    flattenedSchemaMap.set(prefix, isOptional && !isCollectionElement ? z.optional(leaf) : leaf);
  }

  flatten(schema);

  return z.object(Object.fromEntries(flattenedSchemaMap));
}

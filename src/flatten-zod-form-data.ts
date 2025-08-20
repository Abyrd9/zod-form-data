import { z } from "zod/v4";
import type { DeepPartial } from "./deep-partial";
import { $ZodType } from "zod/v4/core";

/**
 * Flattens nested form data based on a Zod v4 schema into a flat key-value map.
 * 
 * This function recursively traverses a Zod schema and corresponding data, converting
 * nested objects, arrays, and complex types into a flat structure where each field
 * is represented by a dot-notation path (e.g., "user.address.street").
 * 
 * Supports all Zod v4 schema types:
 * - Primitive types (string, number, boolean, etc.)
 * - Objects with nested fields
 * - Arrays of primitives or objects
 * - Records (key-value mappings)
 * - Maps and Sets
 * - Tuples with fixed positions
 * - Unions and intersections
 * - Optional, nullable, and default fields
 * - Transform and pipe operations
 * - Lazy schemas
 * - Literal values and enums
 * - Promise types (stored as-is)
 * - Custom validation schemas
 * 
 * @param schema - The Zod v4 schema that defines the data structure
 * @param data - The nested data to flatten, can be partial
 * @returns A flat object with dot-notation keys and corresponding values
 * 
 * @example
 * ```typescript
 * const schema = z.object({
 *   user: z.object({
 *     name: z.string(),
 *     addresses: z.array(z.object({
 *       street: z.string(),
 *       city: z.string()
 *     }))
 *   })
 * });
 * 
 * const data = {
 *   user: {
 *     name: "John",
 *     addresses: [
 *       { street: "123 Main St", city: "Boston" },
 *       { street: "456 Oak Ave", city: "NYC" }
 *     ]
 *   }
 * };
 * 
 * const flattened = flattenZodFormData(schema, data);
 * // Result:
 * // {
 * //   "user.name": "John",
 * //   "user.addresses.0.street": "123 Main St",
 * //   "user.addresses.0.city": "Boston",
 * //   "user.addresses.1.street": "456 Oak Ave",
 * //   "user.addresses.1.city": "NYC"
 * // }
 * ```
 */
export function flattenZodFormData<T extends $ZodType>(
  schema: T,
  data: DeepPartial<z.infer<T>>
) {
  const flattenedDataMap = new Map<string, unknown>();

  function flatten(subSchema: $ZodType, subValue: unknown, prefix = ""): void {
    let currentSubSchema = subSchema;

    if (!currentSubSchema?._zod) {
      return;
    }

    // Handle discriminated unions first regardless of def.type string
    if (currentSubSchema instanceof z.ZodDiscriminatedUnion) {
      const discriminator = (currentSubSchema as any)._def?.discriminator ?? (currentSubSchema as any).discriminator;
      const discPath = prefix ? `${prefix}.${discriminator}` : discriminator;
      const discValue = (subValue as any)?.[discriminator];
      flattenedDataMap.set(discPath, discValue);

      // Try to flatten only the selected option under the same prefix
      const selectedOption = (currentSubSchema.options as any[]).find((opt: any) => {
        const lit = (opt.shape?.[discriminator] as any)?.value ?? (opt._def?.shape?.[discriminator]?._def?.value);
        return lit === discValue;
      });
      if (selectedOption && typeof subValue === "object" && subValue !== null) {
        if (selectedOption instanceof z.ZodObject) {
          for (const [key, value] of Object.entries(selectedOption.shape)) {
            if (key === discriminator) continue;
            const newPrefix = prefix ? `${prefix}.${key}` : key;
            flatten(value as z.ZodType, (subValue as any)[key], newPrefix);
          }
          return;
        }
      }
      return;
    }

    switch (currentSubSchema._zod.def.type) {
      case "object": {
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
          }
        }
        break;
      }

      case "array": {
        if (currentSubSchema instanceof z.ZodArray) {
          if (Array.isArray(subValue)) {
            subValue.forEach((item, index) => {
              flatten(
                currentSubSchema.element,
                item,
                `${prefix}.${index}`
              );
            });
          }
        }
        break;
      }

      case "union": {
        if (currentSubSchema instanceof z.ZodUnion) {
          // Treat union as leaf: use the current value as-is at this path
          flattenedDataMap.set(prefix, subValue);
        }
        break;
      }

      case "lazy": {
        if (currentSubSchema instanceof z.ZodLazy) {
          const lazyValue = currentSubSchema.def.getter();
          flatten(lazyValue, subValue, prefix);
        }
        break;
      }
      // Note: discriminated unions are handled before the switch

      case "optional": {
        if (currentSubSchema instanceof z.ZodOptional) {
          const inner = currentSubSchema.def.innerType;
          flatten(inner, subValue, prefix);
        }
        break;
      }

      case "default": {
        if (currentSubSchema instanceof z.ZodDefault) {
          const inner = currentSubSchema.def.innerType;
          const defaultValue = currentSubSchema.def.defaultValue;
          const valueWithDefault = subValue === undefined ? defaultValue : subValue;
          flatten(inner, valueWithDefault, prefix);
        }
        break;
      }

      case "record": {
        if (currentSubSchema instanceof z.ZodRecord) {
          if (typeof subValue === "object" && subValue !== null) {
            for (const [key, value] of Object.entries(
              subValue as Record<string, unknown>
            )) {
              const newSubSchema = currentSubSchema.valueType as $ZodType;
              const newSubValue = (subValue as Record<string, unknown>)[key];
              const newPrefix = `${prefix}.${key}`;

              flatten(newSubSchema, newSubValue, newPrefix);
            }
          }
        }
        break;
      }

      case "map": {
        if (currentSubSchema instanceof z.ZodMap) {
          if (subValue instanceof Map) {
            for (const [key, value] of subValue.entries()) {
              const newSubSchema = currentSubSchema.valueType as $ZodType;
              const newPrefix = `${prefix}.${String(key)}`;
              flatten(newSubSchema, value, newPrefix);
            }
          }
        }
        break;
      }

      case "set": {
        if (currentSubSchema instanceof z.ZodSet) {
          if (subValue instanceof Set) {
            let index = 0;
            for (const value of subValue) {
              const newSubSchema = currentSubSchema.def.valueType as $ZodType;
              const newPrefix = `${prefix}.${index}`;
              flatten(newSubSchema, value, newPrefix);
              index++;
            }
          }
        }
        break;
      }

      case "tuple": {
        if (currentSubSchema instanceof z.ZodTuple) {
          if (Array.isArray(subValue)) {
            const items = currentSubSchema.def.items;
            for (let i = 0; i < items?.length; i++) {
              const itemSchema = items[i] as $ZodType;
              const itemValue = subValue[i];
              const newPrefix = `${prefix}.${i}`;
              flatten(itemSchema, itemValue, newPrefix);
            }
          }
        }
        break;
      }

      case "nullable": {
        if (currentSubSchema instanceof z.ZodNullable) {
          if (subValue !== null) {
            const inner = currentSubSchema.def.innerType;
            flatten(inner, subValue, prefix);
          }
        }
        break;
      }

      case "intersection": {
        if (currentSubSchema instanceof z.ZodIntersection) {
          const left = currentSubSchema.def.left;
          const right = currentSubSchema.def.right;
          // Process both sides of the intersection
          flatten(left, subValue, prefix);
          flatten(right, subValue, prefix);
        }
        break;
      }

      case "transform": {
        if (currentSubSchema instanceof z.ZodTransform) {
          // For transform schemas, the value has already been transformed
          // We just store the transformed value as-is
          flattenedDataMap.set(prefix, subValue);
        }
        break;
      }

      case "pipe": {
        if (currentSubSchema instanceof z.ZodPipe) {
          const input = currentSubSchema.def.in;
          // For pipe, we process the input type
          flatten(input, subValue, prefix);
        }
        break;
      }

      case "catch": {
        if (currentSubSchema instanceof z.ZodCatch) {
          const inner = currentSubSchema.def.innerType;
          flatten(inner, subValue, prefix);
        }
        break;
      }

      case "success": {
        if (currentSubSchema instanceof z.ZodSuccess) {
          const innerType = currentSubSchema.def.innerType;
          // For success, we process the inner type
          flatten(innerType, subValue, prefix);
        }
        break;
      }

      case "literal": {
        if (currentSubSchema instanceof z.ZodLiteral) {
          const values = currentSubSchema.def.values;
          // For literal, we use the first value or the actual subValue
          const literalValue = values?.[0] ?? subValue;
          flattenedDataMap.set(prefix, literalValue);
        }
        break;
      }

      case "enum": {
        if (currentSubSchema instanceof z.ZodEnum) {
          // For enum, we just store the value as-is since it's already validated
          flattenedDataMap.set(prefix, subValue);
        }
        break;
      }

      case "promise": {
        if (currentSubSchema instanceof z.ZodPromise) {
          // For promise, we store the promise as-is since we can't resolve it synchronously
          // The promise will be resolved when the data is actually used
          flattenedDataMap.set(prefix, subValue);
        }
        break;
      }

      case "custom": {
        if (currentSubSchema instanceof z.ZodCustom) {
          // For custom schemas, we just store the value as-is
          flattenedDataMap.set(prefix, subValue);
        }
        break;
      }
      default: {
        // For primitive types (string, number, boolean, etc.) or unhandled types
        // For transform schemas, the value has already been transformed, so we just store it
        flattenedDataMap.set(prefix, subValue);
        break;
      }
    }
  }

  flatten(schema, data);
  return Object.fromEntries(flattenedDataMap);
}

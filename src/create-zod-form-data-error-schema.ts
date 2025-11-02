import { z } from "zod/v4";
import type { $ZodType } from "zod/v4/core";

/**
 * Creates a Zod schema that matches the NestedFieldErrors structure
 * This converts each field in your schema to an optional nullable string
 * matching what parseZodFormData returns as errors
 */
export function createZodFormDataErrorSchema<T extends $ZodType>(
  schema: T
): z.ZodType<Record<string, unknown>> {
  function transformSchema(s: $ZodType): z.ZodTypeAny {
    const def = (s as any)._zod?.def;
    if (!def) return z.optional(z.nullable(z.string()));

    const type = def.type;

    switch (type) {
      case "object": {
        const shape = def.shape;
        const errorShape: Record<string, z.ZodTypeAny> = {};
        
        for (const key in shape) {
          errorShape[key] = transformSchema(shape[key]);
        }
        
        return z.optional(z.object(errorShape));
      }

      case "array": {
        const element = def.element;
        return z.optional(z.array(transformSchema(element)));
      }

      case "tuple": {
        const items = def.items;
        const errorItems = items.map((item: $ZodType) => transformSchema(item));
        return z.optional(z.tuple(errorItems as [z.ZodTypeAny, ...z.ZodTypeAny[]]));
      }

      case "record": {
        const valueType = def.valueType;
        return z.optional(z.record(z.string(), transformSchema(valueType)));
      }

      case "map": {
        const valueType = def.valueType;
        return z.optional(z.map(z.string(), transformSchema(valueType)));
      }

      case "set": {
        const element = def.element;
        return z.optional(z.set(transformSchema(element)));
      }

      case "optional": {
        const innerType = def.innerType;
        return transformSchema(innerType);
      }

      case "default": {
        const innerType = def.innerType;
        return transformSchema(innerType);
      }

      case "nullable": {
        const innerType = def.innerType;
        return transformSchema(innerType);
      }

      case "union": {
        const options = def.options;
        if (options && options.length > 0) {
          return transformSchema(options[0]);
        }
        return z.optional(z.nullable(z.string()));
      }

      case "intersection": {
        const left = def.left;
        const right = def.right;
        return z.optional(
          z.intersection(transformSchema(left), transformSchema(right))
        );
      }

      case "lazy": {
        // For lazy types, we can't easily transform them
        // Return a permissive schema
        return z.optional(z.nullable(z.string()));
      }

      case "transform":
      case "pipe": {
        const input = def.input;
        return transformSchema(input);
      }

      case "catch": {
        const innerType = def.innerType;
        return transformSchema(innerType);
      }

      // Primitive types become optional nullable strings
      case "string":
      case "number":
      case "boolean":
      case "date":
      case "bigint":
      case "literal":
      case "enum":
      case "nativeEnum":
      case "promise":
      case "custom":
      case "any":
      case "unknown":
      case "never":
      case "void":
      case "undefined":
      case "null":
      default:
        return z.optional(z.nullable(z.string()));
    }
  }

  return transformSchema(schema) as z.ZodType<Record<string, unknown>>;
}


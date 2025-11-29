import * as z4 from "zod/v4/core";
import { z } from "zod/v4";

// Helper type for accessing def properties
type AnyDef = z4.$ZodTypeDef & {
  shape?: Record<string, z4.$ZodType>;
  element?: z4.$ZodType;
  items?: readonly z4.$ZodType[];
  valueType?: z4.$ZodType;
  innerType?: z4.$ZodType;
  options?: readonly z4.$ZodType[];
  left?: z4.$ZodType;
  right?: z4.$ZodType;
  input?: z4.$ZodType;
  in?: z4.$ZodType;
};

/**
 * Creates a Zod schema that matches the NestedFieldErrors structure
 * This converts each field in your schema to an optional nullable string
 * matching what parseZodFormData returns as errors
 */
export function createZodFormDataErrorSchema<T extends z4.$ZodType>(
  schema: T
): z.ZodType<Record<string, unknown>> {
  function transformSchema(s: z4.$ZodType): z.ZodTypeAny {
    if (!s) return z.optional(z.nullable(z.string()));

    const def = s._zod?.def as AnyDef | undefined;
    if (!def) return z.optional(z.nullable(z.string()));

    const type = def.type;

    switch (type) {
      case "object": {
        const shape = def.shape;
        const errorShape: Record<string, z.ZodTypeAny> = {};
        
        if (shape) {
          for (const key in shape) {
            errorShape[key] = transformSchema(shape[key]);
          }
        }
        
        return z.optional(z.object(errorShape));
      }

      case "array": {
        const element = def.element;
        return z.optional(z.array(transformSchema(element ?? (z.unknown() as unknown as z4.$ZodType))));
      }

      case "tuple": {
        const items = def.items ?? [];
        const errorItems = items.map((item: z4.$ZodType) => transformSchema(item));
        return z.optional(z.tuple(errorItems as [z.ZodTypeAny, ...z.ZodTypeAny[]]));
      }

      case "record": {
        const valueType = def.valueType;
        return z.optional(z.record(z.string(), transformSchema(valueType ?? (z.unknown() as unknown as z4.$ZodType))));
      }

      case "map": {
        const valueType = def.valueType;
        return z.optional(z.map(z.string(), transformSchema(valueType ?? (z.unknown() as unknown as z4.$ZodType))));
      }

      case "set": {
        const element = def.element;
        return z.optional(z.set(transformSchema(element ?? (z.unknown() as unknown as z4.$ZodType))));
      }

      case "optional": {
        const innerType = def.innerType;
        return transformSchema(innerType ?? (z.unknown() as unknown as z4.$ZodType));
      }

      case "default": {
        const innerType = def.innerType;
        return transformSchema(innerType ?? (z.unknown() as unknown as z4.$ZodType));
      }

      case "nullable": {
        const innerType = def.innerType;
        return transformSchema(innerType ?? (z.unknown() as unknown as z4.$ZodType));
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
          z.intersection(
            transformSchema(left ?? (z.unknown() as unknown as z4.$ZodType)),
            transformSchema(right ?? (z.unknown() as unknown as z4.$ZodType))
          )
        );
      }

      case "lazy": {
        // For lazy types, we can't easily transform them
        // Return a permissive schema
        return z.optional(z.nullable(z.string()));
      }

      case "transform":
      case "pipe": {
        const input = def.input ?? def.in;
        return transformSchema(input ?? (z.unknown() as unknown as z4.$ZodType));
      }

      case "catch": {
        const innerType = def.innerType;
        return transformSchema(innerType ?? (z.unknown() as unknown as z4.$ZodType));
      }

      // Primitive types become optional nullable strings
      case "string":
      case "number":
      case "boolean":
      case "date":
      case "bigint":
      case "literal":
      case "enum":
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


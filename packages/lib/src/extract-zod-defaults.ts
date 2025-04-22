import {
  type ZodFirstPartySchemaTypes,
  ZodFirstPartyTypeKind,
  type z,
} from "zod";
import type { ZodObjectOrEffects } from ".";
import type { DeepPartial } from "./deep-partial";
import { unflattenZodFormData } from "./unflatten-zod-form-data";

export function extractZodDefaults<T extends ZodObjectOrEffects>(
  schema: T
): DeepPartial<z.infer<T>> {
  const defaults: Record<string, unknown> = {};

  function extract(subSchema: z.ZodTypeAny, prefix = ""): void {
    const currentSubSchema = subSchema;
    const def = (currentSubSchema as ZodFirstPartySchemaTypes)._def;
    switch (def.typeName) {
      case ZodFirstPartyTypeKind.ZodObject: {
        const shape = (currentSubSchema as z.ZodObject<z.ZodRawShape>).shape;
        for (const [key, value] of Object.entries(shape)) {
          const newPrefix = prefix ? `${prefix}.${key}` : key;
          extract(value as z.ZodTypeAny, newPrefix);
        }
        break;
      }
      case ZodFirstPartyTypeKind.ZodArray: {
        const element = (currentSubSchema as z.ZodArray<z.ZodTypeAny>).element;
        // Don't set default empty arrays
        extract(element, `${prefix}.0`);
        break;
      }
      case ZodFirstPartyTypeKind.ZodDefault: {
        const defaultValue = currentSubSchema._def.defaultValue();
        if (defaultValue !== undefined) {
          defaults[prefix] = defaultValue;
        }
        extract(currentSubSchema._def.innerType, prefix);
        break;
      }
      case ZodFirstPartyTypeKind.ZodOptional: {
        extract(currentSubSchema._def.innerType, prefix);
        break;
      }
      case ZodFirstPartyTypeKind.ZodEffects: {
        const innerType = (
          currentSubSchema as z.ZodEffects<z.ZodTypeAny>
        ).innerType();
        extract(innerType, prefix);
        break;
      }
      default: {
        console.error("Zod type not handled in extractZodDefaults", def.typeName);
        break;
      }
    }
  }

  extract(schema);
  return unflattenZodFormData(defaults);
}

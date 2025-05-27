import {
  z,
} from "zod/v4";
import type { ZodFormSchema } from ".";
import type { DeepPartial } from "./deep-partial";
import { unflattenZodFormData } from "./unflatten-zod-form-data";
import { $ZodType } from "zod/v4/core";

export function extractZodDefaults<T extends ZodFormSchema>(
  schema: T
): DeepPartial<z.infer<T>> {
  const defaults: Record<string, unknown> = {};

  function extract(subSchema: $ZodType, prefix = ""): void {
    const currentSubSchema = subSchema;

    if (currentSubSchema instanceof z.ZodObject) {
      const shape = currentSubSchema.shape;
      for (const [key, value] of Object.entries(shape)) {
          const newPrefix = prefix ? `${prefix}.${key}` : key;
          extract(value as z.ZodType, newPrefix);
        }

        return;
    }

    if (currentSubSchema instanceof z.ZodArray) {
      const element = currentSubSchema.element;
      extract(element, `${prefix}.0`);
      return;
    }

    if (currentSubSchema instanceof z.ZodDefault) {
      const defaultValue = currentSubSchema.def.defaultValue
      if (defaultValue !== undefined) {
        defaults[prefix] = defaultValue;
      }
      return;
    }

    if (currentSubSchema instanceof z.ZodOptional) {
      extract(currentSubSchema.def.innerType, prefix);
      return;
    }

    console.warn("unhandled zod type", currentSubSchema)
  }

  extract(schema);
  return unflattenZodFormData<T>(defaults) as DeepPartial<z.infer<T>>;
}

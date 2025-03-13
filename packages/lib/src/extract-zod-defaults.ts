import { z } from "zod";
import type { ZodObjectOrEffects } from ".";
import type { DeepPartial } from "./deep-partial";
import { unflattenZodFormData } from "./unflatten-zod-form-data";

export function extractZodDefaults<T extends ZodObjectOrEffects>(
	schema: T,
): DeepPartial<z.infer<T>> {
	const defaults: Record<string, unknown> = {};

	function extract(
		subSchema: z.ZodTypeAny,
		prefix = "",
	): void {
		let currentSubSchema = subSchema;
		if (currentSubSchema instanceof z.ZodEffects) {
			currentSubSchema = currentSubSchema.innerType();
		}

		if (currentSubSchema instanceof z.ZodObject) {
			for (const [key, value] of Object.entries(currentSubSchema.shape)) {
				const newPrefix = prefix ? `${prefix}.${key}` : key;
				extract(value as z.ZodTypeAny, newPrefix);
			}
		} else if (currentSubSchema instanceof z.ZodArray) {
			// Don't set default empty arrays
			extract(currentSubSchema.element, `${prefix}.0`);
		} else if (currentSubSchema instanceof z.ZodDefault) {
			const defaultValue = currentSubSchema._def.defaultValue();
			if (defaultValue !== undefined) {
				defaults[prefix] = defaultValue;
			}
			extract(currentSubSchema._def.innerType, prefix);
		} else if (currentSubSchema instanceof z.ZodOptional) {
			extract(currentSubSchema._def.innerType, prefix);
		}
	}

	extract(schema);
	return unflattenZodFormData(defaults);
}

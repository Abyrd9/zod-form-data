import type { z } from "zod";
import type { DeepPartial } from "./deep-partial";
import type {  ZodObjectOrEffects } from ".";

export function flattenZodFormErrors<T extends ZodObjectOrEffects>(
	errors?: DeepPartial<z.infer<T>>,
) {
	if (!errors) return new Map<string, string>();

	const flattenedErrorsMap = new Map<string, string>();

	// Flatten object errors
	function flatten(subErrors: Record<string, unknown>, prefix = "") {
		for (const [key, value] of Object.entries(subErrors)) {
			const newPrefix = prefix ? `${prefix}.${key}` : key;
			if (typeof value === "string") {
				flattenedErrorsMap.set(newPrefix, value);
			} else if (Array.isArray(value)) {
				value.forEach((item, index) => {
					if (typeof item === "string") {
						flattenedErrorsMap.set(`${newPrefix}.${index}`, item);
					} else {
						flatten(item as Record<string, unknown>, `${newPrefix}.${index}`);
					}
				});
			} else if (typeof value === "object" && value !== null) {
				flatten(value as Record<string, unknown>, newPrefix);
			}
		}
	}

	flatten(errors as unknown as Record<string, unknown>);

	return flattenedErrorsMap;
}

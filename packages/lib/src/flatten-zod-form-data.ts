import { type ZodTypeAny, z } from "zod";
import type { DeepPartial } from "./deep-partial";
import type { ZodObjectOrEffects } from ".";

export function flattenZodFormData<T extends ZodObjectOrEffects>(
	schema: T,
	data: DeepPartial<z.infer<T>>,
) {
	const flattenedDataMap = new Map<string, unknown>();

	function flatten(
		subSchema: z.ZodTypeAny,
		subValue: unknown,
		prefix = "",
	): void {
		let currentSubSchema = subSchema;
		if (currentSubSchema instanceof z.ZodEffects) {
			currentSubSchema = currentSubSchema.innerType();
		}

		if (currentSubSchema instanceof z.ZodObject) {
			if (typeof subValue === "object" && subValue !== null) {
				for (const [key, value] of Object.entries(currentSubSchema.shape)) {
					const newPrefix = prefix ? `${prefix}.${key}` : key;
					flatten(
						value as z.ZodTypeAny,
						(subValue as Record<string, unknown>)[key],
						newPrefix,
					);
				}
			}
		} else if (currentSubSchema instanceof z.ZodArray) {
			if (Array.isArray(subValue)) {
				subValue.forEach((item, index) => {
					flatten(currentSubSchema.element, item, `${prefix}.${index}`);
				});
			}
		} else if (
			currentSubSchema instanceof z.ZodUnion ||
			currentSubSchema instanceof z.ZodDiscriminatedUnion
		) {
			// For union types, we'll need to determine which option matches the data
			// This is a simplification and might need more sophisticated handling
			currentSubSchema.options.forEach(
				(option: z.ZodTypeAny, index: number) => {
					try {
						option.parse(subValue);
						flatten(option, subValue, prefix);
					} catch (error) {
						// Do nothing
					}
				},
			);
		} else if (currentSubSchema instanceof z.ZodLazy) {
			const lazyValue = currentSubSchema._def.getter();
			flatten(lazyValue, subValue, prefix);
		} else if (currentSubSchema instanceof z.ZodOptional) {
			const inner = currentSubSchema._def.innerType;
			flatten(inner, subValue, prefix);
		} else if (currentSubSchema instanceof z.ZodDefault) {
			const inner = currentSubSchema._def.innerType;
			const defaultValue = currentSubSchema._def.defaultValue();
			const valueWithDefault = subValue === undefined ? defaultValue : subValue;
			flatten(inner, valueWithDefault, prefix);
		} else if (currentSubSchema instanceof z.ZodRecord) {
			if (typeof subValue === "object" && subValue !== null) {
				for (const [key, value] of Object.entries(
					subValue as Record<string, unknown>,
				)) {
					try {
						currentSubSchema._def.keyType.parse(key);
						currentSubSchema._def.valueType.parse(value);

						const newSubSchema = subSchema._def.valueType as ZodTypeAny;
						const newSubValue = (subValue as Record<string, unknown>)[key];
						const newPrefix = `${prefix}.${key}`;

						flatten(newSubSchema, newSubValue, newPrefix);
					} catch (error) {
						// Do nothing
					}
				}
			}
		} else {
			flattenedDataMap.set(prefix, subValue);
		}
	}

	flatten(schema, data);
	return Object.fromEntries(flattenedDataMap);
}

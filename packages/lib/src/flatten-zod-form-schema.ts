import { z } from "zod";
import type { ZodObjectOrEffects } from ".";

export function flattenZodFormSchema<T extends ZodObjectOrEffects>(
	schema: T,
): z.ZodObject<z.ZodRawShape> {
	const flattenedSchemaMap = new Map<string, z.ZodTypeAny>();

	function flatten(subSchema: z.ZodTypeAny, prefix = "") {
		let currentSubSchema = subSchema;
		if (currentSubSchema instanceof z.ZodEffects) {
			currentSubSchema = currentSubSchema.innerType();
		}

		if (currentSubSchema instanceof z.ZodObject) {
			for (const [key, value] of Object.entries(currentSubSchema.shape)) {
				const newPrefix = prefix ? `${prefix}.${key}` : key;
				flatten(value as z.ZodTypeAny, newPrefix);
			}
		} else if (currentSubSchema instanceof z.ZodArray) {
			flatten(currentSubSchema.element, `${prefix}.#`);
		} else if (
			currentSubSchema instanceof z.ZodUnion ||
			currentSubSchema instanceof z.ZodDiscriminatedUnion
		) {
			currentSubSchema.options.forEach(
				(option: z.ZodTypeAny, index: number) => {
					flatten(option, `${prefix}`);
				},
			);
		} else if (currentSubSchema instanceof z.ZodLazy) {
			const lazyValue = currentSubSchema._def.getter();
			flatten(lazyValue, prefix);
		} else if (currentSubSchema instanceof z.ZodOptional) {
			const inner = currentSubSchema._def.innerType;
			console.log(prefix, inner.isOptional());
			flatten(inner, prefix);
		} else if (currentSubSchema instanceof z.ZodDefault) {
			const inner = currentSubSchema._def.innerType;
			flatten(inner, prefix);
		} else if (currentSubSchema instanceof z.ZodRecord) {
			flatten(currentSubSchema._def.valueType, `${prefix}.*`);
		} else {
			flattenedSchemaMap.set(prefix, subSchema);
		}
	}

	flatten(schema);

	return z.object(Object.fromEntries(flattenedSchemaMap));
}

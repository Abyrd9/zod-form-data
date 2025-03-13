import { ZodError, type ZodIssue, type z } from "zod";
import type { DeepPartial } from "./deep-partial";
import type { NestedFieldErrors, ZodObjectOrEffects } from ".";
import { coerceFormData } from "./coerce-form-data";
import { flattenZodFormSchema } from "./flatten-zod-form-schema";
import { unflattenZodFormData } from "./unflatten-zod-form-data";
import { unflattenZodFormErrors } from "./unflatten-zod-form-errors";

type ParseResult<T extends ZodObjectOrEffects> =
	| { success: true; data: z.infer<T> }
	| {
			success: false;
			errors: DeepPartial<NestedFieldErrors<T>> | Record<string, string>;
	  };

function matchWildcardString(pattern: string, key: string): boolean {
	const patternParts = pattern.split(".");
	const testParts = key.split(".");

	if (patternParts.length !== testParts.length) {
		return false;
	}

	return patternParts.every((part, index) => {
		return part === "*" || part === testParts[index];
	});
}

export const parseZodFormData = <T extends ZodObjectOrEffects>(
	form: FormData,
	{
		schema,
	}: {
		schema: T;
	},
): ParseResult<T> => {
	const result: Record<string, unknown> = {};
	const errors: Record<string, string> = {};

	const flattenedZodSchema = flattenZodFormSchema(schema);

	for (const [key, formDataValue] of form.entries()) {
		const keyWithHash = key.replace(/(\d+)/g, "#");

		if (keyWithHash in flattenedZodSchema.shape) {
			const keySchema = flattenedZodSchema.shape[keyWithHash];
			try {
				result[key] = coerceFormData(keySchema).parse(formDataValue);
			} catch (error) {
				if (error instanceof ZodError) {
					console.log("Zod error", error);
					errors[key] = error.errors[0].message;
				} else {
					console.error(error);
					errors[key] = "An unexpected error occurred";
				}
			}

			continue;
		}

		const keysWithRecordShape = Object.keys(flattenedZodSchema.shape).filter(
			(key) => key.includes("*"),
		);

		const keyWithRecordShape = keysWithRecordShape.find((key) => {
			return matchWildcardString(key, keyWithHash);
		});

		if (keyWithRecordShape) {
			const keySchema = flattenedZodSchema.shape[keyWithRecordShape];

			try {
				result[key] = coerceFormData(keySchema).parse(formDataValue);
			} catch (error) {
				if (error instanceof ZodError) {
					errors[key] = error.errors[0].message;
				} else {
					console.error(error);
					errors[key] = "An unexpected error occurred";
				}
			}
		}
	}

	// Check for missing required fields
	for (const [key, fieldSchema] of Object.entries(flattenedZodSchema.shape)) {
		if (!key.includes("*") && !(key in result) && !fieldSchema.isOptional()) {
			console.warn("Missing field in form", key);
		}
	}

	if (Object.keys(errors).length > 0) {
		const unflattenedErrors = unflattenZodFormErrors<T>(errors);
		return { success: false, errors: unflattenedErrors };
	}

	try {
		const unflattenedData = unflattenZodFormData(result);
		return { success: true, data: schema.parse(unflattenedData) };
	} catch (error) {
		if (error instanceof ZodError) {
			const errors: Record<string, string> = {};
			for (const zodError of error.errors) {
				console.log("Zod error not caught:", zodError);
				errors[zodError.path[0]] = zodError.message;
			}
			return { success: false, errors };
		}
		return { success: false, errors: {} };
	}
};

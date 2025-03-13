import type { z } from "zod";
import type { DeepPartial } from "./deep-partial";
import type { NestedFieldErrors, ZodObjectOrEffects } from ".";

export function unflattenZodFormErrors<T extends ZodObjectOrEffects>(
	errors: Record<string, string>,
	root?: string,
): DeepPartial<NestedFieldErrors<T>> {
	const result: Record<string, unknown> = {};

	const nest = (
		errors: Record<string, unknown> | unknown[],
		keys: string[],
		level: number,
		value: string,
	) => {
		const key = keys[level];
		const nextKey = keys[level + 1];

		/*
			If we're on the last key, we're dealing with a primitive value.
			So either push it to an array if that's what's passed in, or set is as the value of the key.
		*/
		const isLastKey = nextKey === undefined;
		if (isLastKey) {
			if (Array.isArray(errors)) {
				errors.push(value);
				return errors;
			}

			errors[key] = value;
			return errors;
		}

		// If the next key is a number, the current levels value is an array
		const keyIsArray = !Number.isNaN(Number(nextKey));
		if (keyIsArray) {
			if (Array.isArray(errors)) {
				// In this instance we're dealing with an array within an array
				console.warn("ARRAY WITHIN ARRAY");
			} else {
				// We're dealing with a passed in object
				// We need to check if the current level key already exists
				// If it does, we want to pass the values down the chain
				if (errors[key]) {
					return nest(errors[key] as unknown[], keys, level + 1, value);
				}

				// We need to create the empty array value if it doesn't exist
				errors[key] = [];
				return nest(errors[key] as unknown[], keys, level + 1, value);
			}
		} else {
			// If the next key is not a number, the current level value is an object
			if (Array.isArray(errors)) {
				/*
					If the passed in errors is an array, check if the current level key (index) already exists in the array.
				*/

				// We know that the previous level key was a number
				// So we can assume that the current level key is a number
				const valueAtIndex = errors[Number(key)];

				// If the key at the index exists, we just need to pass down values
				if (valueAtIndex !== undefined) {
					return nest(
						valueAtIndex as Record<string, unknown>,
						keys,
						level + 1,
						value,
					);
				}

				// If it doesn't exist, we know it's an empty object
				errors[Number(key)] = {};
				return nest(
					errors[Number(key)] as Record<string, unknown>,
					keys,
					level + 1,
					value,
				);
			}

			/*
				And finally, we're dealing with objects.
				If the current level key doesn't exist on the passed in errors,
				we need to create an empty object and pass down the values.
				Otherwise, we just need to pass down the values.
			*/
			if (!errors[key]) {
				errors[key] = {};
				return nest(
					errors[key] as Record<string, unknown>,
					keys,
					level + 1,
					value,
				);
			}

			if (errors[key]) {
				return nest(
					errors[key] as Record<string, unknown>,
					keys,
					level + 1,
					value,
				);
			}
		}
	};

	for (const [key, value] of Object.entries(errors)) {
		const keys = key.split(".");

		// Check if a root is provided and if the current key starts with it
		if (root) {
			if (key.startsWith(`${root}.`)) {
				nest(result, keys, 0, value);
			}
		} else {
			// If no root is provided, process all keys as before
			nest(result, keys, 0, value);
		}
	}

	return root
		? (result[root] as DeepPartial<NestedFieldErrors<T>>)
		: (result as DeepPartial<NestedFieldErrors<T>>);
}

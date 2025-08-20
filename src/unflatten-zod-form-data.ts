import type { z } from "zod/v4";
import type { DeepPartial } from "./deep-partial";
import { $ZodType } from "zod/v4/core";

export function unflattenZodFormData<T extends $ZodType>(
  data: Record<string, unknown>,
  root?: string
): DeepPartial<z.infer<T>> {
  const result: Record<string, unknown> = {};

  const nest = (
    data: Record<string, unknown> | unknown[],
    keys: string[],
    level: number,
    value: unknown
  ) => {
    const key = keys[level];
    const nextKey = keys[level + 1];

    /*
			If we're on the last key, we're dealing with a primitive value.
			So either push it to an array if that's what's passed in, or set is as the value of the key.
		*/
    const isLastKey = nextKey === undefined;
    if (isLastKey) {
      if (Array.isArray(data)) {
        data.push(value);
        return data;
      }

      data[key] = value;
      return data;
    }

    // If the next key is a number, the current levels value is an array
    const keyIsArray = !Number.isNaN(Number(nextKey));
    if (keyIsArray) {
      if (Array.isArray(data)) {
        // In this instance we're dealing with an array within an array
        console.warn("ARRAY WITHIN ARRAY");
      } else {
        // We're dealing with a passed in object
        // We need to check if the current level key already exists
        // If it does, we want to pass the values down the chain
        if (data[key]) {
          return nest(data[key] as unknown[], keys, level + 1, value);
        }

        // We need to create the empty array value if it doesn't exist
        data[key] = [];
        return nest(data[key] as unknown[], keys, level + 1, value);
      }
    } else {
      // If the next key is not a number, the current level value is an object
      if (Array.isArray(data)) {
        /*
					If the passed in data is an array, check if the current level key (index) already exists in the array.
				*/

        // We know that the previous level key was a number
        // So we can assume that the current level key is a number
        const valueAtIndex = data[Number(key)];

        // If the key at the index exists, we just need to pass down values
        if (valueAtIndex !== undefined) {
          return nest(
            valueAtIndex as Record<string, unknown>,
            keys,
            level + 1,
            value
          );
        }

        // If it doesn't exist, we know it's an empty object
        data[Number(key)] = {};
        return nest(
          data[Number(key)] as Record<string, unknown>,
          keys,
          level + 1,
          value
        );
      }

      /*
				And finally, we're dealing with objects.
				If the current level key doesn't exist on the passed in data,
				we need to create an empty object and pass down the values.
				Otherwise, we just need to pass down the values.
			*/
      if (!data[key]) {
        data[key] = {};
        return nest(
          data[key] as Record<string, unknown>,
          keys,
          level + 1,
          value
        );
      }

      if (data[key]) {
        return nest(
          data[key] as Record<string, unknown>,
          keys,
          level + 1,
          value
        );
      }
    }
  };

  for (const [key, value] of Object.entries(data)) {
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
    ? (result[root] as DeepPartial<z.infer<T>>)
    : (result as DeepPartial<z.infer<T>>);
}

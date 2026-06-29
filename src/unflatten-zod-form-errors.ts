import type * as z4 from "zod/v4/core";
import type { NestedFieldErrors } from "./flatten-zod-form-errors";
import type { DeepPartial } from "./deep-partial";
import type { FlattenedFormErrors } from "./schema-paths";

export function unflattenZodFormErrors<T extends z4.$ZodType>(
  errors: FlattenedFormErrors<T>,
  root?: string
): DeepPartial<NestedFieldErrors<T>> {
  const result: Record<string, unknown> = {};

  const nest = (
    container: Record<string, unknown> | unknown[],
    keys: string[],
    level: number,
    value: string
  ): void => {
    const key = keys[level];
    const nextKey = keys[level + 1];

    if (nextKey === undefined) {
      if (Array.isArray(container)) {
        container.push(value);
        return;
      }

      container[key] = value;
      return;
    }

    if (!Number.isNaN(Number(nextKey))) {
      if (Array.isArray(container)) {
        console.warn("ARRAY WITHIN ARRAY");
        return;
      }

      const nextContainer = container[key];
      if (nextContainer !== undefined) {
        nest(nextContainer as unknown[], keys, level + 1, value);
        return;
      }

      container[key] = [];
      nest(container[key] as unknown[], keys, level + 1, value);
      return;
    }

    if (Array.isArray(container)) {
      const index = Number(key);
      const nextContainer = container[index];

      if (nextContainer !== undefined) {
        nest(nextContainer as Record<string, unknown>, keys, level + 1, value);
        return;
      }

      container[index] = {};
      nest(container[index] as Record<string, unknown>, keys, level + 1, value);
      return;
    }

    const nextContainer = container[key];
    if (nextContainer !== undefined) {
      nest(nextContainer as Record<string, unknown>, keys, level + 1, value);
      return;
    }

    container[key] = {};
    nest(container[key] as Record<string, unknown>, keys, level + 1, value);
  };

  for (const [key, value] of Object.entries(errors as Record<string, string>)) {
    if (root && key !== root && !key.startsWith(`${root}.`)) continue;
    nest(result, key.split("."), 0, value);
  }

  if (!root) return result as DeepPartial<NestedFieldErrors<T>>;

  const rootValue = root.split(".").reduce<unknown>((value, key) => {
    if (value === null || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[key];
  }, result);

  return rootValue as DeepPartial<NestedFieldErrors<T>>;
}

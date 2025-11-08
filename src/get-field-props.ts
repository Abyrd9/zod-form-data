import { z } from "zod/v4";
import { $ZodType } from "zod/v4/core";

export type FieldProps<T> = {
	name: string;
	value: T;
	onChange: (payload: T | undefined | null) => void;
	error: string | null;
};

/**
 * Extracts all keys from a tuple of Zod object schemas
 */
type AllKeysFromOptions<Options extends readonly z.ZodTypeAny[]> = {
  [I in keyof Options]: Options[I] extends z.ZodObject<infer Shape>
    ? keyof Shape
    : never;
}[number];

/**
 * For a given key K, get the union of field types from all options that have that key
 */
type FieldTypeForKey<
  Options extends readonly z.ZodTypeAny[],
  K extends PropertyKey
> = {
  [I in keyof Options]: Options[I] extends z.ZodObject<infer Shape>
    ? K extends keyof Shape
      ? NestedFields<Shape[K] & z.ZodTypeAny>
      : never
    : never;
}[number];

/**
 * Creates a merged object type with all keys from all options.
 * All keys are present (not optional) since getFieldProps always creates fields for all keys.
 * Each key's type is a union of the field types from all options that have that key.
 */
type MergeOptionFields<
  Options extends readonly z.ZodTypeAny[],
  Keys extends PropertyKey = AllKeysFromOptions<Options>
> = {
  [K in Keys]: FieldTypeForKey<Options, K>;
};

export type NestedFields<T extends $ZodType> = 
	// Handle discriminated unions: return merged object with all keys
	// In Zod v4, discriminated unions have type: "union" AND a discriminator field
	T extends { _zod: { def: { type: "union"; discriminator: any; options: infer Options } } }
	? Options extends readonly z.ZodTypeAny[]
		? MergeOptionFields<Options>
		: FieldProps<z.infer<T>>
	// Handle regular unions: return merged object with all keys
	: T extends { _zod: { def: { type: "union"; options: infer Options } } }
	? Options extends readonly z.ZodTypeAny[]
		? MergeOptionFields<Options>
		: FieldProps<z.infer<T>>
	: T extends { _zod: { def: { type: "object"; shape: infer Shape } } }
	? { [K in keyof Shape]: NestedFields<Shape[K] & $ZodType> }
	: T extends { _zod: { def: { type: "record"; valueType: infer Value } } }
	? Record<string, NestedFields<Value & $ZodType>>
	: T extends { _zod: { def: { type: "map"; valueType: infer Value } } }
	? Map<string, NestedFields<Value & $ZodType>>
	: T extends { _zod: { def: { type: "array"; element: infer Item } } }
	? NestedFields<Item & $ZodType>[]
	: T extends { _zod: { def: { type: "set"; element: infer Item } } }
	? Set<NestedFields<Item & $ZodType>>
	: T extends { _zod: { def: { type: "tuple"; items: infer Items } } }
	? { [K in keyof Items]: NestedFields<Items[K] & $ZodType> }
	: T extends { _zod: { def: { type: "optional"; innerType: infer Inner } } }
	? NestedFields<Inner & $ZodType>
	: T extends { _zod: { def: { type: "default"; innerType: infer Inner } } }
	? NestedFields<Inner & $ZodType>
	: T extends { _zod: { def: { type: "nullable"; innerType: infer Inner } } }
	? NestedFields<Inner & $ZodType>
	: T extends { _zod: { def: { type: "intersection"; left: infer Left; right: infer Right } } }
	? NestedFields<Left & $ZodType> & NestedFields<Right & $ZodType>
	: T extends { _zod: { def: { type: "lazy"; getter: () => infer LazyType } } }
	? LazyType extends $ZodType
		? NestedFields<LazyType>
		: FieldProps<z.infer<T>>
	: T extends { _zod: { def: { type: "transform"; input: infer Input; output: infer Output } } }
	? NestedFields<Input & $ZodType>
	: T extends { _zod: { def: { type: "pipe"; input: infer Input; output: infer Output } } }
	? NestedFields<Input & $ZodType>
	: T extends { _zod: { def: { type: "catch"; innerType: infer Inner } } }
	? NestedFields<Inner & $ZodType>
	: T extends { _zod: { def: { type: "success"; data: infer Data } } }
	? FieldProps<Data>
	: T extends { _zod: { def: { type: "literal"; value: infer Value } } }
	? FieldProps<Value>
	: T extends { _zod: { def: { type: "enum"; values: infer Values } } }
	? FieldProps<Values[keyof Values]>
	: T extends { _zod: { def: { type: "promise"; unwrap: infer Unwrapped } } }
	? Unwrapped extends $ZodType
		? NestedFields<Unwrapped>
		: FieldProps<z.infer<T>>
	: T extends { _zod: { def: { type: "custom" } } }
	? FieldProps<z.infer<T>>
	: FieldProps<z.infer<T>>;

// Helper function to get field props from a Zod v4 schema
export function getFieldProps<T extends $ZodType>(
	field: T,
	path: string[] = [],
	flattenedData: Record<string, unknown> = {},
	setFlattenedData?: (updater: (prev: Record<string, unknown>) => Record<string, unknown>) => void,
	errors?: Map<string, string>
): NestedFields<T> {
	const def = field._zod.def;
	const currentPath = path.join(".");

	const buildLeaf = (): FieldProps<z.infer<T>> => {
		const name = currentPath;
		const value = (flattenedData?.[name] ?? undefined) as z.infer<T> | undefined | null;
		const error = errors?.get(name) ?? null;
		const onChange = (payload: z.infer<T> | undefined | null) => {
			if (!setFlattenedData || !name) return;
			setFlattenedData((prev) => ({ ...prev, [name]: payload }));
		};
		return { name, value, onChange, error } as FieldProps<z.infer<T>>;
	};

	// Handle discriminated unions up-front
	if (field instanceof z.ZodDiscriminatedUnion) {
		const discriminator: string =
			((field as unknown as { _def?: { discriminator?: string } })._def?.discriminator as string) ??
			(field as any).discriminator;

		const discriminatorField = getFieldProps(
			z.string() as unknown as $ZodType,
			[...path, discriminator],
			flattenedData,
			setFlattenedData,
			errors
		) as unknown;

		// Build a merged view that includes discriminator plus all option keys
		const merged: Record<string, unknown> = {
			[discriminator]: discriminatorField,
		};

		for (const opt of Array.from(field.options)) {
			if (opt instanceof z.ZodObject) {
				const shape = opt.shape ?? (opt as any).shape ?? {};
				for (const key of Object.keys(shape)) {
					if (key === discriminator) continue;
					// Avoid re-building the same key if multiple options share it
					if (merged[key] !== undefined) continue;
					merged[key] = getFieldProps(
						shape[key] as $ZodType,
						[...path, key],
						flattenedData,
						setFlattenedData,
						errors
					) as unknown;
				}
			}
		}

		return merged as unknown as NestedFields<T>;
	}
	
	// Heuristic support for non-discriminated unions
	if (field instanceof z.ZodUnion) {
		const options = (field as unknown as z.ZodUnion<[z.ZodTypeAny, ...z.ZodTypeAny[]]>).options as z.ZodTypeAny[];
		const prefix = currentPath ? `${currentPath}.` : "";
		const objectOptions = options.filter((opt) => opt instanceof z.ZodObject) as z.ZodObject<any>[];

		// If there are object options, expose the union of their keys
		if (objectOptions.length > 0) {
			const merged: Record<string, unknown> = {};
			for (const opt of objectOptions) {
				const shape = opt.shape ?? {};
				for (const key of Object.keys(shape)) {
					if (merged[key] !== undefined) continue;
					merged[key] = getFieldProps(
						shape[key] as $ZodType,
						[...path, key],
						flattenedData,
						setFlattenedData,
						errors
					) as unknown;
				}
			}
			return merged as unknown as NestedFields<T>;
		}
		// Otherwise, treat as a leaf at current path
		return buildLeaf() as unknown as NestedFields<T>;
	}

	switch (def.type) {
		case "object": {
			if (field instanceof z.ZodObject) {
				const objectFields: Record<string, unknown> = {};

				if (field.shape) {
					for (const [key, subField] of Object.entries(field.shape)) {
						objectFields[key] = getFieldProps(
							subField as $ZodType,
							[...path, key],
							flattenedData,
							setFlattenedData,
							errors
						);
					}
				}

				return objectFields as NestedFields<T>;
			}
			break;
		}
		case "array": {
			if (field instanceof z.ZodArray) {
				const prefix = currentPath;
				const indices = new Set<number>();
				for (const key of Object.keys(flattenedData ?? {})) {
					const match = prefix ? key.match(new RegExp(`^${prefix}\.(\\d+)`)) : null;
					if (match) indices.add(Number.parseInt(match[1], 10));
				}
				const result: unknown[] = [];
				const sorted = Array.from(indices).sort((a, b) => a - b);
				if (sorted.length === 0) return result as NestedFields<T>;
				for (const index of sorted) {
					const sub = getFieldProps(
						field.element as $ZodType,
						[...path, String(index)],
						flattenedData,
						setFlattenedData,
						errors
					);
					result.push(sub as unknown);
				}
				return result as NestedFields<T>;
			}
			break;
		}
		case "optional": {
			if (field instanceof z.ZodOptional) {
				return getFieldProps(
					field.def.innerType as $ZodType,
					path,
					flattenedData,
					setFlattenedData,
					errors
				) as unknown as NestedFields<T>;
			}
			break;
		}
		case "default": {
			if (field instanceof z.ZodDefault) {
				return getFieldProps(
					field.def.innerType as $ZodType,
					path,
					flattenedData,
					setFlattenedData,
					errors
				) as unknown as NestedFields<T>;
			}
			break;
		}
		case "nullable": {
			if (field instanceof z.ZodNullable) {
				return getFieldProps(
					field.def.innerType as $ZodType,
					path,
					flattenedData,
					setFlattenedData,
					errors
				) as unknown as NestedFields<T>;
			}
			break;
		}
		default: {
			return buildLeaf() as unknown as NestedFields<T>;
		}
	}

	return buildLeaf() as unknown as NestedFields<T>;
}
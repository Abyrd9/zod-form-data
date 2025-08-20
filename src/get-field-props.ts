import { z } from "zod/v4";
import { $ZodType } from "zod/v4/core";

export type FieldProps<T> = {
    name: string;
    value: T;
    onChange: (payload: T) => void;
    error: string | null;
};

export type NestedFields<T extends $ZodType> = T extends { _zod: { def: { type: "object"; shape: infer Shape } } }
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
    : T extends { _zod: { def: { type: "union"; options: infer Options } } }
    ? Options extends readonly $ZodType[]
    ? NestedFields<Options[number] & $ZodType>
    : FieldProps<z.infer<T>>
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
        const value = (flattenedData?.[name] ?? undefined) as z.infer<T>;
        const error = errors?.get(name) ?? null;
        const onChange = (payload: z.infer<T>) => {
            if (!setFlattenedData || !name) return;
            setFlattenedData((prev) => ({ ...prev, [name]: payload }));
        };
        return { name, value, onChange, error } as FieldProps<z.infer<T>>;
    };

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
                    const match = prefix ? key.match(new RegExp(`^${prefix}\\.(\\d+)`)) : null;
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
                    field._def.innerType as $ZodType,
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
                    field._def.innerType as $ZodType,
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
                    field._def.innerType as $ZodType,
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
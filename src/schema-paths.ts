import type * as z4 from "zod/v4/core";

type PrimitiveKey = string | number;

type Join<Prefix extends string, Key extends PrimitiveKey> = Prefix extends ""
  ? `${Key}`
  : `${Prefix}.${Key}`;

type AppendIndex<Prefix extends string> = Join<Prefix, number>;

type NonEmpty<Prefix extends string> = Prefix extends "" ? never : Prefix;

type TupleKeys<T extends readonly unknown[]> = Exclude<keyof T, keyof []>;

type UnionOptionsPaths<
  Options extends readonly z4.$ZodType[],
  Prefix extends string
> = Options extends readonly [infer First, ...infer Rest]
  ? First extends z4.$ZodType
    ? SchemaPaths<First, Prefix> |
        (Rest extends readonly z4.$ZodType[]
          ? UnionOptionsPaths<Rest, Prefix>
          : never)
    : never
  : never;

export type SchemaPaths<
  T extends z4.$ZodType,
  Prefix extends string = ""
> = T extends z4.$ZodOptional<infer U extends z4.$ZodType>
  ? SchemaPaths<U, Prefix>
  : T extends z4.$ZodNullable<infer U extends z4.$ZodType>
  ? SchemaPaths<U, Prefix>
  : T extends z4.$ZodDefault<infer U extends z4.$ZodType>
  ? SchemaPaths<U, Prefix>
  : T extends z4.$ZodLazy<infer U extends z4.$ZodType>
  ? SchemaPaths<U, Prefix>
  : T extends z4.$ZodObject<infer Shape>
  ? {
      [K in keyof Shape & string]: SchemaPaths<
        Shape[K] & z4.$ZodType,
        Join<Prefix, K>
      >;
    }[keyof Shape & string]
  : T extends z4.$ZodArray<infer Item extends z4.$ZodType>
  ? NonEmpty<AppendIndex<Prefix>> |
      SchemaPaths<Item, AppendIndex<Prefix>>
  : T extends z4.$ZodTuple<infer Items>
  ? {
      [I in TupleKeys<Items> & number]: Items[I] extends z4.$ZodType
        ? SchemaPaths<Items[I], Join<Prefix, `${I}`>>
        : never;
    }[TupleKeys<Items> & number]
  : T extends z4.$ZodSet<infer Item extends z4.$ZodType>
  ? NonEmpty<AppendIndex<Prefix>> |
      SchemaPaths<Item, AppendIndex<Prefix>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  : T extends z4.$ZodRecord<any, infer Value>
  ? Value extends z4.$ZodType
    ? string
    : never
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  : T extends z4.$ZodMap<any, infer Value>
  ? Value extends z4.$ZodType
    ? string
    : never
  : T extends z4.$ZodUnion<infer Options>
  ? Options extends readonly [z4.$ZodType, ...z4.$ZodType[]]
    ? UnionOptionsPaths<Options, Prefix>
    : never
  : T extends z4.$ZodIntersection<
      infer Left extends z4.$ZodType,
      infer Right extends z4.$ZodType
    >
  ? SchemaPaths<Left, Prefix> | SchemaPaths<Right, Prefix>
  : NonEmpty<Prefix>;

export type FlattenedPaths<T extends z4.$ZodType> = SchemaPaths<T>;

export type FlattenedFormData<T extends z4.$ZodType> = Partial<
  Record<FlattenedPaths<T>, unknown>
>;

export type FlattenedFormErrors<T extends z4.$ZodType> = Partial<
  Record<FlattenedPaths<T>, string>
>;


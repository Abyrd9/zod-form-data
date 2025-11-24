import { z } from "zod/v4";
import type { $ZodType } from "zod/v4/core";

type PrimitiveKey = string | number;

type Join<Prefix extends string, Key extends PrimitiveKey> = Prefix extends ""
  ? `${Key}`
  : `${Prefix}.${Key}`;

type AppendIndex<Prefix extends string> = Join<Prefix, number>;

type NonEmpty<Prefix extends string> = Prefix extends "" ? never : Prefix;

type TupleKeys<T extends readonly unknown[]> = Exclude<keyof T, keyof []>;

type UnionOptionsPaths<
  Options extends readonly z.ZodTypeAny[],
  Prefix extends string
> = Options extends readonly [infer First, ...infer Rest]
  ? First extends z.ZodTypeAny
    ? SchemaPaths<First, Prefix> |
        (Rest extends readonly z.ZodTypeAny[]
          ? UnionOptionsPaths<Rest, Prefix>
          : never)
    : never
  : never;

export type SchemaPaths<
  T extends z.ZodTypeAny,
  Prefix extends string = ""
> = T extends z.ZodOptional<infer U extends z.ZodTypeAny>
  ? SchemaPaths<U, Prefix>
  : T extends z.ZodNullable<infer U extends z.ZodTypeAny>
  ? SchemaPaths<U, Prefix>
  : T extends z.ZodDefault<infer U extends z.ZodTypeAny>
  ? SchemaPaths<U, Prefix>
  : T extends z.ZodLazy<infer U extends z.ZodTypeAny>
  ? SchemaPaths<U, Prefix>
  : T extends z.ZodObject<infer Shape>
  ? {
      [K in keyof Shape & string]: SchemaPaths<
        Shape[K] & z.ZodTypeAny,
        Join<Prefix, K>
      >;
    }[keyof Shape & string]
  : T extends z.ZodArray<infer Item extends z.ZodTypeAny>
  ? NonEmpty<AppendIndex<Prefix>> |
      SchemaPaths<Item, AppendIndex<Prefix>>
  : T extends z.ZodTuple<infer Items>
  ? {
      [I in TupleKeys<Items> & number]: Items[I] extends z.ZodTypeAny
        ? SchemaPaths<Items[I], Join<Prefix, `${I}`>>
        : never;
    }[TupleKeys<Items> & number]
  : T extends z.ZodSet<infer Item extends z.ZodTypeAny>
  ? NonEmpty<AppendIndex<Prefix>> |
      SchemaPaths<Item, AppendIndex<Prefix>>
  : T extends z.ZodRecord<any, infer Value>
  ? Value extends z.ZodTypeAny
    ? string
    : never
  : T extends z.ZodMap<any, infer Value>
  ? Value extends z.ZodTypeAny
    ? string
    : never
  : T extends z.ZodDiscriminatedUnion<
      infer Disc extends string,
      infer Options extends readonly [z.ZodTypeAny, ...z.ZodTypeAny[]]
    >
  ? NonEmpty<Join<Prefix, Disc>> | UnionOptionsPaths<Options, Prefix>
  : T extends z.ZodUnion<infer Options>
  ? Options extends readonly [z.ZodTypeAny, ...z.ZodTypeAny[]]
    ? UnionOptionsPaths<Options, Prefix>
    : never
  : T extends z.ZodIntersection<
      infer Left extends z.ZodTypeAny,
      infer Right extends z.ZodTypeAny
    >
  ? SchemaPaths<Left, Prefix> | SchemaPaths<Right, Prefix>
  : NonEmpty<Prefix>;

export type FlattenedPaths<T extends $ZodType> = SchemaPaths<T>;

export type FlattenedFormData<T extends $ZodType> = Partial<
  Record<FlattenedPaths<T>, unknown>
>;

export type FlattenedFormErrors<T extends $ZodType> = Partial<
  Record<FlattenedPaths<T>, string>
>;


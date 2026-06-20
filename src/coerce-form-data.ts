import type * as z4 from "zod/v4/core";
import { z } from "zod/v4";

const BoolAsString = z
  .string()
  .regex(
    /^(true|false|on)$/,
    'Must be a boolean string ("true", "false", or "on")'
  )
  .transform((value) => value === "true" || value === "on");

const IntAsString = z
  .string()
  .regex(/^-?\d+$/, "Must be an integer string")
  .transform((val) => Number.parseInt(val, 10));

const NumAsString = z
  .string()
  .regex(/^-?\d*\.?\d+$/, "Must be a number string")
  .transform(Number);

const hasNumberContent = (value: unknown) =>
  typeof value !== "string" || value.trim() !== "";

export const unwrapFormDataSchema = (schema: z4.$ZodType): z4.$ZodType => {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return unwrapFormDataSchema(schema.unwrap());
  }

  if (schema instanceof z.ZodDefault) {
    return unwrapFormDataSchema(schema.removeDefault());
  }

  return schema;
};

export const coerceNumberFormDataValue = (value: unknown) => {
  if (!hasNumberContent(value)) return NumAsString.parse(value);

  const coerced = z.coerce.number().safeParse(value);
  if (coerced.success) return coerced.data;

  return NumAsString.parse(value);
};

const DateAsString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a date string (YYYY-MM-DD)")
  .transform((val) => new Date(val));

export function coerceFormData<Schema extends z.ZodType>(
  type: Schema
): z.ZodType<z.output<Schema>> {
  let schema: z.ZodType = type;
  switch (schema.def.type) {
    case "string":
    case "literal":
    case "enum":
      schema = z
        .any()
        .overwrite((value) => z.coerce.string().parse(value))
        .pipe(type);
      break;
    case "bigint":
      schema = z
        .any()
        .overwrite((value) => IntAsString.parse(value))
        .pipe(type);
      break;
    case "number":
      schema = z
        .any()
        .overwrite(coerceNumberFormDataValue)
        .pipe(type);
      break;
    case "boolean":
      schema = z
        .any()
        .overwrite((value) => BoolAsString.parse(value))
        .pipe(type);
      break;
    case "date":
      schema = z
        .any()
        .overwrite((value) => DateAsString.parse(value))
        .pipe(type);
      break;
    case "array":
      schema = z.preprocess(
        (val) => (Array.isArray(val) ? val : val === undefined ? [] : [val]),
        type
      );
      break;
    case "union": {
      // Try to coerce into each union option by reusing coerceFormData recursively
      const options = (schema as z.ZodUnion<z.ZodType[]>).options;
      schema = z
        .any()
        .overwrite((value) => {
          for (const opt of options) {
            const coerced = coerceFormData(opt).safeParse(value);
            if (coerced.success) return coerced.data;
          }
          return value;
        })
        .pipe(type);
      break;
    }
    case "nullable":
    case "optional":
      schema = z.preprocess((val) => (val === "" ? null : val), type);
      break;
    case "file":
      schema = z
        .any()
        .overwrite((value) =>
          value instanceof File ? value : new File([value], value.name)
        )
        .pipe(type);
      break;
    default:
      console.error(
        `Zod type not handled in coerceFormData: ${schema.def.type}`
      );
      break;
  }

  return schema as z.ZodType<z.output<Schema>>;
}

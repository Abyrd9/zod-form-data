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
        .overwrite((value) => {
          // First try to coerce to number
          const coerced = z.coerce.number().safeParse(value);
          if (coerced.success) return coerced.data;

          // If that fails, try parsing as string
          return NumAsString.parse(value);
        })
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

import {
  type ZodFirstPartySchemaTypes,
  ZodFirstPartyTypeKind,
  type ZodType,
  type ZodTypeAny,
  any,
  type output,
  z,
} from "zod";

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

export function coerceFormData<Schema extends ZodTypeAny>(
  type: Schema
): ZodType<output<Schema>> {
  let schema: ZodTypeAny = type;
  const def = (type as ZodFirstPartySchemaTypes)._def;

  switch (def.typeName) {
    case ZodFirstPartyTypeKind.ZodString:
    case ZodFirstPartyTypeKind.ZodLiteral:
    case ZodFirstPartyTypeKind.ZodEnum:
    case ZodFirstPartyTypeKind.ZodNativeEnum:
      schema = any()
        .transform((value) => z.coerce.string().parse(value))
        .pipe(type);
      break;
    case ZodFirstPartyTypeKind.ZodBigInt:
      schema = any()
        .transform((value) => IntAsString.parse(value))
        .pipe(type);
      break;
    case ZodFirstPartyTypeKind.ZodNumber:
      schema = any()
        .transform((value) => NumAsString.parse(value))
        .pipe(type);
      break;
    case ZodFirstPartyTypeKind.ZodBoolean:
      schema = any()
        .transform((value) => BoolAsString.parse(value))
        .pipe(type);
      break;
    case ZodFirstPartyTypeKind.ZodDate:
      schema = any()
        .transform((value) => {
          console.log(value);
          console.log(DateAsString.parse(value));
          return DateAsString.parse(value);
        })
        .pipe(type);
      break;
    case ZodFirstPartyTypeKind.ZodArray:
      schema = z.preprocess(
        (val) => (Array.isArray(val) ? val : val === undefined ? [] : [val]),
        type
      );
      break;
    case ZodFirstPartyTypeKind.ZodNullable:
    case ZodFirstPartyTypeKind.ZodOptional:
      schema = z.preprocess((val) => (val === "" ? null : val), type);
      break;
    case ZodFirstPartyTypeKind.ZodUnion:
      schema = z.preprocess((val) => {
        for (const unionType of def.options) {
          try {
            return coerceFormData(unionType).parse(val);
          } catch {}
        }
        return val;
      }, type);
      break;
    case ZodFirstPartyTypeKind.ZodEffects:
      schema = coerceFormData(def.schema);
      break;
    default:
      console.error(`Unsupported Zod type: ${def.typeName}`);
      break;
  }

  return schema;
}

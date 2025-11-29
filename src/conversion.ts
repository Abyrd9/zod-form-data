import * as z4 from "zod/v4/core";
import { z } from "zod/v4";
import type { DeepPartial } from "./deep-partial";
import { flattenZodFormData } from "./flatten-zod-form-data";
import { flattenZodFormSchema } from "./flatten-zod-form-schema";
import type { FlattenedFormData } from "./schema-paths";
import { unflattenZodFormData } from "./unflatten-zod-form-data";
import { coerceFormData } from "./coerce-form-data";

const toFormDataValue = (value: unknown): string | Blob | null => {
  if (value === undefined) return null;
  if (value === null) return "";
  if (value instanceof Blob) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  return JSON.stringify(value);
};

const unwrapSchema = (schema: z4.$ZodType): z4.$ZodType => {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return unwrapSchema(schema.unwrap());
  }
  if (schema instanceof z.ZodDefault) {
    return unwrapSchema(schema.removeDefault());
  }
  return schema;
};

export const convertObjectToFormData = <Schema extends z4.$ZodType>(
  schema: Schema,
  data: DeepPartial<z4.output<Schema>>,
  formData: FormData = new FormData()
): FormData => {
  const flattened = flattenZodFormData(schema, data);
  for (const [key, value] of Object.entries(flattened)) {
    const serialized = toFormDataValue(value);
    if (serialized !== null) {
      formData.append(key, serialized);
    }
  }
  return formData;
};

export const convertFormDataToObject = <Schema extends z4.$ZodType>(
  schema: Schema,
  form: FormData
): DeepPartial<z4.output<Schema>> => {
  const result: Record<string, unknown> = {};
  const flattenedSchema = flattenZodFormSchema(schema);

  for (const [key, formDataValue] of form.entries()) {
    const keyWithHash = key.replace(/(\d+)/g, "#");
    const matchingSchema =
      flattenedSchema.shape[keyWithHash] ||
      Object.entries(flattenedSchema.shape).find(([pattern]) => {
        if (!pattern.includes("*")) return false;
        const patternParts = pattern.split(".");
        const testParts = keyWithHash.split(".");
        if (patternParts.length !== testParts.length) {
          return false;
        }
        return patternParts.every((part, index) => {
          return part === "*" || part === testParts[index];
        });
      })?.[1];

    if (!matchingSchema) {
      result[key] = formDataValue;
      continue;
    }

    const effectiveSchema = unwrapSchema(matchingSchema);

    if (effectiveSchema instanceof z.ZodNumber) {
      const num = Number(formDataValue);
      result[key] = Number.isNaN(num) ? formDataValue : num;
      continue;
    }

    try {
      result[key] = coerceFormData(matchingSchema as z.ZodType).parse(formDataValue);
    } catch {
      result[key] = formDataValue;
    }
  }

  return unflattenZodFormData<Schema>(result as FlattenedFormData<Schema>);
};


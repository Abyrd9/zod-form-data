import { NestedFieldErrors } from "./src/flatten-zod-form-errors";
import { FieldProps } from "./src/get-field-props";
import {
  useZodForm
} from "./src/index";
import { parseZodFormData, parseZodData } from "./src/parse-zod-form-data";
import { createZodFormDataErrorSchema } from "./src/create-zod-form-data-error-schema";
import type { DeepPartial } from "./src/deep-partial";
import { $ZodType } from "zod/v4/core";
import type { DiscriminatedFields, UnionFields } from "./src/index";
import z from "zod/v4";

type ZodFormDataParseResultSuccess<T extends $ZodType> = z.infer<T>;
type ZodFormDataParseResultError<T extends $ZodType> = DeepPartial<NestedFieldErrors<T>>

export {
  useZodForm,
  parseZodFormData,
  parseZodData,
  createZodFormDataErrorSchema,
  type FieldProps,
  type NestedFieldErrors as FieldErrors,
  type DeepPartial,
  type DiscriminatedFields,
  type UnionFields,
  type ZodFormDataParseResultSuccess,
  type ZodFormDataParseResultError,
};

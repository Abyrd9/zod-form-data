import { NestedFieldErrors } from "./src/flatten-zod-form-errors";
import { FieldProps } from "./src/get-field-props";
import {
  useZodForm
} from "./src/index";
import { parseZodFormData, parseZodData } from "./src/parse-zod-form-data";
import type { DeepPartial } from "./src/deep-partial";
import { $ZodType } from "zod/v4/core";
import z from "zod/v4";

type ZodFormDataParseResultSuccess<T extends $ZodType> = z.infer<T>;
type ZodFormDataParseResultError<T extends $ZodType> = DeepPartial<NestedFieldErrors<T>> | Record<string, string>;

export {
  useZodForm,
  parseZodFormData,
  parseZodData,
  type FieldProps,
  type NestedFieldErrors as FieldErrors,
  type ZodFormDataParseResultSuccess,
  type ZodFormDataParseResultError,
};

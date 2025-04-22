import {
  type ZodFirstPartySchemaTypes,
  ZodFirstPartyTypeKind,
  type ZodTypeAny,
  type z,
} from "zod";
import type { ZodObjectOrEffects } from ".";
import type { DeepPartial } from "./deep-partial";

export function flattenZodFormData<T extends ZodObjectOrEffects>(
  schema: T,
  data: DeepPartial<z.infer<T>>
) {
  const flattenedDataMap = new Map<string, unknown>();

  function flatten(
    subSchema: z.ZodTypeAny,
    subValue: unknown,
    prefix = ""
  ): void {
    let currentSubSchema = subSchema;
    const def = (currentSubSchema as ZodFirstPartySchemaTypes)._def;

    if (def.typeName === ZodFirstPartyTypeKind.ZodEffects) {
      currentSubSchema = (
        currentSubSchema as z.ZodEffects<z.ZodTypeAny>
      ).innerType();
    }

    switch (def.typeName) {
      case ZodFirstPartyTypeKind.ZodObject: {
        if (typeof subValue === "object" && subValue !== null) {
          for (const [key, value] of Object.entries(
            (currentSubSchema as z.ZodObject<z.ZodRawShape>).shape
          )) {
            const newPrefix = prefix ? `${prefix}.${key}` : key;
            flatten(
              value as z.ZodTypeAny,
              (subValue as Record<string, unknown>)[key],
              newPrefix
            );
          }
        }
        break;
      }
      case ZodFirstPartyTypeKind.ZodArray: {
        if (Array.isArray(subValue)) {
          subValue.forEach((item, index) => {
            flatten(
              (currentSubSchema as z.ZodArray<z.ZodTypeAny>).element,
              item,
              `${prefix}.${index}`
            );
          });
        }
        break;
      }
      case ZodFirstPartyTypeKind.ZodUnion:
      case ZodFirstPartyTypeKind.ZodDiscriminatedUnion: {
        // For union types, we'll need to determine which option matches the data
        // This is a simplification and might need more sophisticated handling
        (
          currentSubSchema as z.ZodUnion<
            readonly [z.ZodTypeAny, ...z.ZodTypeAny[]]
          >
        ).options.forEach((option: z.ZodTypeAny, index: number) => {
          try {
            option.parse(subValue);
            flatten(option, subValue, prefix);
          } catch (error) {
            // Do nothing
          }
        });
        break;
      }
      case ZodFirstPartyTypeKind.ZodLazy: {
        const lazyValue = currentSubSchema._def.getter();
        flatten(lazyValue, subValue, prefix);
        break;
      }
      case ZodFirstPartyTypeKind.ZodOptional: {
        const inner = currentSubSchema._def.innerType;
        flatten(inner, subValue, prefix);
        break;
      }
      case ZodFirstPartyTypeKind.ZodDefault: {
        const inner = currentSubSchema._def.innerType;
        const defaultValue = currentSubSchema._def.defaultValue();
        const valueWithDefault =
          subValue === undefined ? defaultValue : subValue;
        flatten(inner, valueWithDefault, prefix);
        break;
      }
      case ZodFirstPartyTypeKind.ZodRecord: {
        if (typeof subValue === "object" && subValue !== null) {
          for (const [key, value] of Object.entries(
            subValue as Record<string, unknown>
          )) {
            try {
              currentSubSchema._def.keyType.parse(key);
              currentSubSchema._def.valueType.parse(value);

              const newSubSchema = subSchema._def.valueType as ZodTypeAny;
              const newSubValue = (subValue as Record<string, unknown>)[key];
              const newPrefix = `${prefix}.${key}`;

              flatten(newSubSchema, newSubValue, newPrefix);
            } catch (error) {
              // Do nothing
            }
          }
        }
        break;
      }
      default: {
        flattenedDataMap.set(prefix, subValue);
        break;
      }
    }
  }

  flatten(schema, data);
  return Object.fromEntries(flattenedDataMap);
}

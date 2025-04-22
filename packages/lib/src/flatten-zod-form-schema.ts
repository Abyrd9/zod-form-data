import { type ZodFirstPartySchemaTypes, ZodFirstPartyTypeKind, z } from "zod";
import type { ZodObjectOrEffects } from ".";

export function flattenZodFormSchema<T extends ZodObjectOrEffects>(
  schema: T
): z.ZodObject<z.ZodRawShape> {
  const flattenedSchemaMap = new Map<string, z.ZodTypeAny>();

  function flatten(subSchema: z.ZodTypeAny, prefix = "") {
    let currentSubSchema = subSchema;
    const def = (currentSubSchema as ZodFirstPartySchemaTypes)._def;

    if (def.typeName === ZodFirstPartyTypeKind.ZodEffects) {
      currentSubSchema = (
        currentSubSchema as z.ZodEffects<z.ZodTypeAny>
      ).innerType();
    }

    switch (def.typeName) {
      case ZodFirstPartyTypeKind.ZodObject: {
        for (const [key, value] of Object.entries(
          (currentSubSchema as z.ZodObject<z.ZodRawShape>).shape
        )) {
          const newPrefix = prefix ? `${prefix}.${key}` : key;
          flatten(value as z.ZodTypeAny, newPrefix);
        }
        break;
      }
      case ZodFirstPartyTypeKind.ZodArray: {
        flatten(
          (currentSubSchema as z.ZodArray<z.ZodTypeAny>).element,
          `${prefix}.#`
        );
        break;
      }
      case ZodFirstPartyTypeKind.ZodUnion:
      case ZodFirstPartyTypeKind.ZodDiscriminatedUnion: {
        (
          currentSubSchema as z.ZodUnion<
            readonly [z.ZodTypeAny, ...z.ZodTypeAny[]]
          >
        ).options.forEach((option: z.ZodTypeAny, index: number) => {
          flatten(option, `${prefix}`);
        });
        break;
      }
      case ZodFirstPartyTypeKind.ZodLazy: {
        const lazyValue = currentSubSchema._def.getter();
        flatten(lazyValue, prefix);
        break;
      }
      case ZodFirstPartyTypeKind.ZodOptional: {
        const inner = currentSubSchema._def.innerType;
        console.log(prefix, inner.isOptional());
        flatten(inner, prefix);
        break;
      }
      case ZodFirstPartyTypeKind.ZodDefault: {
        const inner = currentSubSchema._def.innerType;
        flatten(inner, prefix);
        break;
      }
      case ZodFirstPartyTypeKind.ZodRecord: {
        flatten(currentSubSchema._def.valueType, `${prefix}.*`);
        break;
      }
      default: {
        flattenedSchemaMap.set(prefix, subSchema);
        break;
      }
    }
  }

  flatten(schema);

  return z.object(Object.fromEntries(flattenedSchemaMap));
}

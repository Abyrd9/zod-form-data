/// <reference lib="dom" />
import { describe, expect, test } from "vitest";
import { z } from "zod/v4";
import { renderHook } from "@testing-library/react";
import { useZodForm, type DiscriminatedFields, type UnionFields } from "../src";

describe("getFieldProps - unions expose all option keys", () => {
  describe("discriminated unions", () => {
    const schema = z.object({
      field: z.discriminatedUnion("type", [
        z.object({
          type: z.literal("text"),
          label: z.string(),
          placeholder: z.string().optional(),
        }),
        z.object({
          type: z.literal("number"),
          min: z.number(),
          max: z.number().optional(),
        }),
      ]),
    });

  test("always exposes discriminator and all possible option keys", () => {
    const { result } = renderHook(() => useZodForm({ schema }));

    // Discriminator is present
    expect(result.current.fields.field.type.name).toBe("field.type");

    // All keys from all options are present (no cast needed anymore!)
    const field = result.current.fields.field;
    if (field.type.value === "text") {
      expect(field.label.name).toBe("field.label");
      expect(field.placeholder.name).toBe("field.placeholder");
    } else if (field.type.value === "number") {
      expect(field.min.name).toBe("field.min");
      expect(field.max.name).toBe("field.max");
    }
    expect(result.current.fields.field.placeholder?.name).toBe("field.placeholder");
    expect(result.current.fields.field.min?.name).toBe("field.min");
    expect(result.current.fields.field.max?.name).toBe("field.max");
  });

    test("with default selected option, still exposes all keys", () => {
      const { result } = renderHook(() =>
        useZodForm({
          schema,
          defaultValues: { field: { type: "text", label: "Hello" } } as any,
        })
      );

      const field = result.current.fields.field;
      expect(field.type.value).toBe("text");
      expect(field.label.name).toBe("field.label");
      expect(field.min.name).toBe("field.min");
    });
  });

  describe("non-discriminated unions of objects", () => {
    const schema = z.object({
      value: z.union([
        z.object({ a: z.string(), common: z.string().optional() }),
        z.object({ b: z.number(), common: z.string().optional() }),
      ]),
    });

    test("exposes union of keys for object options", () => {
      const { result } = renderHook(() => useZodForm({ schema }));
      const v = result.current.fields.value;
      expect(v.a.name).toBe("value.a");
      expect(v.b.name).toBe("value.b");
      expect(v.common.name).toBe("value.common");
    });

    test("with defaults for one side, still includes other side keys", () => {
      const { result } = renderHook(() =>
        useZodForm({ schema, defaultValues: { value: { a: "x" } } as any })
      );
      const v = result.current.fields.value;
      expect(v.a.name).toBe("value.a");
      expect(v.b.name).toBe("value.b");
      expect(v.common.name).toBe("value.common");
    });
  });
});



import { describe, expect, test } from "vitest";
import { z } from "zod/v4";
import { flattenZodFormData } from "../src/flatten-zod-form-data";

describe("flattenZodFormData", () => {
  test("flattens basic object schema", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const data = {
      name: "John",
      age: 30,
    };

    expect(flattenZodFormData(schema, data)).toEqual({
      name: "John",
      age: 30,
    });
  });

  test("flattens nested object schema", () => {
    const schema = z.object({
      user: z.object({
        name: z.string(),
        address: z.object({
          street: z.string(),
          city: z.string(),
        }),
      }),
    });

    const data = {
      user: {
        name: "John",
        address: {
          street: "123 Main St",
          city: "Boston",
        },
      },
    };

    expect(flattenZodFormData(schema, data)).toEqual({
      "user.name": "John",
      "user.address.street": "123 Main St",
      "user.address.city": "Boston",
    });
  });

  test("flattens array schema", () => {
    const schema = z.object({
      tags: z.array(z.string()),
    });

    const data = {
      tags: ["typescript", "zod", "testing"],
    };

    expect(flattenZodFormData(schema, data)).toEqual({
      "tags.0": "typescript",
      "tags.1": "zod",
      "tags.2": "testing",
    });
  });

  test("handles empty array with undefined value", () => {
    const schema = z.object({
      tags: z.array(z.string()),
    });

    const data = {
      tags: [],
    };

    expect(flattenZodFormData(schema, data)).toEqual({
      "tags.0": undefined,
    });
  });

  test("flattens optional fields", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number().optional(),
    });

    const data = {
      name: "John",
    };

    expect(flattenZodFormData(schema, data)).toEqual({
      name: "John",
      age: undefined,
    });
  });

  test("handles union types", () => {
    const schema = z.object({
      status: z.union([z.literal("active"), z.literal("inactive")]),
    });

    expect(
      flattenZodFormData(schema, {
        status: "active",
      })
    ).toEqual({
      status: "active",
    });
  });

  test("handles discriminated unions", () => {
    const schema = z.object({
      data: z.discriminatedUnion("type", [
        z.object({ type: z.literal("text"), content: z.string() }),
        z.object({ type: z.literal("number"), value: z.number() }),
      ]),
    });

    expect(
      flattenZodFormData(schema, {
        data: { type: "text", content: "Hello" },
      })
    ).toEqual({
      "data.type": "text",
      "data.content": "Hello",
    });
  });

  test("handles record types", () => {
    const schema = z.object({
      metadata: z.record(z.string(), z.string()),
    });

    const data = {
      metadata: {
        key1: "value1",
        key2: "value2",
      },
    };

    expect(flattenZodFormData(schema, data)).toEqual({
      "metadata.key1": "value1",
      "metadata.key2": "value2",
    });
  });

  test("handles partial data", () => {
    const schema = z.object({
      user: z.object({
        name: z.string(),
        age: z.number(),
        address: z.object({
          street: z.string(),
          city: z.string(),
        }),
      }),
    });

    const data = {
      user: {
        name: "John",
        address: {
          street: "123 Main St",
        },
      },
    };

    expect(flattenZodFormData(schema, data)).toEqual({
      "user.name": "John",
      "user.address.street": "123 Main St",
      "user.age": undefined,
      "user.address.city": undefined,
    });
  });

  test("handles arrays with default values", () => {
    const schema = z.object({
      tags: z.array(z.string()).default([]),
      settings: z.object({
        permissions: z.array(z.string()).default(["read"]),
      }).default({ permissions: ["read"] }),
    });

    // Test with empty data
    expect(flattenZodFormData(schema, {})).toEqual({
      "tags.0": undefined,
      "settings.permissions.0": "read",
    });

    // Test with provided data
    expect(flattenZodFormData(schema, {
      tags: ["typescript"],
      settings: {
        permissions: ["write", "admin"],
      },
    })).toEqual({
      "tags.0": "typescript",
      "settings.permissions.0": "write",
      "settings.permissions.1": "admin",
    });
  });

  test("handles optional arrays", () => {
    const schema = z.object({
      tags: z.array(z.string()).optional(),
      settings: z.object({
        permissions: z.array(z.string()).optional(),
      }),
    });

    // Test with empty data
    expect(flattenZodFormData(schema, {})).toEqual({
      "tags.0": undefined,
      "settings.permissions.0": undefined,
    });

    // Test with provided data
    expect(flattenZodFormData(schema, {
      tags: ["typescript"],
      settings: {
        permissions: ["admin"],
      },
    })).toEqual({
      "tags.0": "typescript",
      "settings.permissions.0": "admin",
    });
  });

  test("handles combination of optional and default arrays", () => {
    const schema = z.object({
      required: z.array(z.string()),
      optional: z.array(z.string()).optional(),
      defaulted: z.array(z.string()).default([]),
      nested: z.object({
        required: z.array(z.string()),
        optional: z.array(z.string()).optional(),
        defaulted: z.array(z.string()).default(["default"]),
      }).default({ required: [], optional: undefined, defaulted: ["default"] }),
    });

    // Test with minimal data
    expect(flattenZodFormData(schema, {
      required: ["req"],
    })).toEqual({
      "required.0": "req",
      "optional.0": undefined,
      "defaulted.0": undefined,
      "nested.required.0": undefined,
      "nested.optional.0": undefined,
      "nested.defaulted.0": "default",
    });

    // Test with full data
    expect(flattenZodFormData(schema, {
      required: ["req"],
      optional: ["opt"],
      defaulted: ["def"],
      nested: {
        required: ["nested-req"],
        optional: ["nested-opt"],
        defaulted: ["nested-def"],
      },
    })).toEqual({
      "required.0": "req",
      "optional.0": "opt",
      "defaulted.0": "def",
      "nested.required.0": "nested-req",
      "nested.optional.0": "nested-opt",
      "nested.defaulted.0": "nested-def",
    });
  });
});

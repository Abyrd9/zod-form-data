import { describe, expect, test } from "vitest";
import { z } from "zod";
import { parseZodData } from "../dist/index.js";

describe("parseZodData (Production)", () => {
  test("parses basic data", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const data = {
      name: "John",
      age: 30,
    };

    const result = parseZodData(data, { schema });
    expect(result).toEqual({
      success: true,
      data: {
        name: "John",
        age: 30,
      },
    });
  });

  test("handles validation errors", () => {
    const schema = z.object({
      email: z.string().email(),
      age: z.number().min(18),
    });

    const data = {
      email: "invalid-email",
      age: 16,
    };

    const result = parseZodData(data, { schema });
    expect(result).toEqual({
      success: false,
      errors: {
        email: "Invalid email",
        age: "Number must be greater than or equal to 18",
      },
    });
  });

  test("handles nested object data", () => {
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

    const result = parseZodData(data, { schema });
    expect(result).toEqual({
      success: true,
      data: {
        user: {
          name: "John",
          address: {
            street: "123 Main St",
            city: "Boston",
          },
        },
      },
    });
  });

  test("handles array data", () => {
    const schema = z.object({
      tags: z.array(z.string()),
      users: z.array(
        z.object({
          name: z.string(),
          age: z.number(),
        })
      ),
    });

    const data = {
      tags: ["typescript", "zod"],
      users: [
        { name: "John", age: 30 },
        { name: "Jane", age: 25 },
      ],
    };

    const result = parseZodData(data, { schema });
    expect(result).toEqual({
      success: true,
      data: {
        tags: ["typescript", "zod"],
        users: [
          { name: "John", age: 30 },
          { name: "Jane", age: 25 },
        ],
      },
    });
  });

  test("handles record types", () => {
    const schema = z.object({
      metadata: z.record(z.string(), z.string()),
      settings: z.record(z.string(), z.number()),
    });

    const data = {
      metadata: {
        key1: "value1",
        key2: "value2",
      },
      settings: {
        timeout: 5000,
        limit: 100,
      },
    };

    const result = parseZodData(data, { schema });
    expect(result).toEqual({
      success: true,
      data: {
        metadata: {
          key1: "value1",
          key2: "value2",
        },
        settings: {
          timeout: 5000,
          limit: 100,
        },
      },
    });
  });

  test("handles optional fields", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number().optional(),
      address: z
        .object({
          street: z.string(),
          city: z.string().optional(),
        })
        .optional(),
    });

    const data = {
      name: "John",
      address: {
        street: "123 Main St",
      },
    };

    const result = parseZodData(data, { schema });
    expect(result).toEqual({
      success: true,
      data: {
        name: "John",
        address: {
          street: "123 Main St",
        },
      },
    });
  });

  test.skip("handles discriminated unions", () => {
    const schema = z.object({
      data: z.discriminatedUnion("type", [
        z.object({ type: z.literal("text"), content: z.string() }),
        z.object({ type: z.literal("number"), value: z.number() }),
      ]),
    });

    const data = {
      data: {
        type: "text",
        content: "Hello World",
      },
    };

    // TODO: We don't handle this well yet. Also it would be weird in a form to submit a completely different value in a form field??
    // @ts-ignore
    const result = parseZodData(data, { schema });
    expect(result).toEqual({
      success: true,
      data: {
        data: {
          type: "text",
          content: "Hello World",
        },
      },
    });
  });

  test("handles missing required fields", () => {
    const schema = z.object({
      name: z.string(),
      email: z.string().email(),
    });

    const data = {
      name: "John",
    };

    // @ts-expect-error - We're testing for this field missing
    const result = parseZodData(data, { schema });
    expect(result).toEqual({
      success: false,
      errors: {
        email: "Required",
      },
    });
  });

  test("handles refinements", () => {
    const schema = z
      .object({
        password: z.string(),
        confirmPassword: z.string(),
      })
      .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
      });

    const data = {
      password: "secret123",
      confirmPassword: "secret124",
    };

    const result = parseZodData(data, { schema });
    expect(result).toEqual({
      success: false,
      errors: {
        confirmPassword: "Passwords don't match",
      },
    });
  });
});

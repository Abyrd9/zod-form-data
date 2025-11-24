import { describe, expect, test } from "vitest";
import { z } from "zod/v4";
import { parseData } from "../src";

describe("parseData", () => {
  test("parses basic data", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const data = {
      name: "John",
      age: 30,
    };

    const result = parseData(data, { schema });
    expect(result).toEqual({
      success: true,
      data: { name: "John", age: 30 },
    });
  });

  test("handles validation errors", () => {
    const schema = z.object({
      email: z.email(),
      age: z.number().min(18),
    });

    const data = {
      email: "invalid-email",
      age: 16,
    };

    const result = parseData(data, { schema });
    expect(result).toEqual({
      success: false,
      errors: {
        form: undefined,
        global: undefined,
        fields: {
          email: "Invalid email address",
          age: "Too small: expected number to be >=18",
        },
        flattened: {
          email: "Invalid email address",
          age: "Too small: expected number to be >=18",
        },
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

    const result = parseData(data, { schema });
    expect(result).toEqual({
      success: true,
      data,
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

    const result = parseData(data, { schema });
    expect(result).toEqual({
      success: true,
      data,
    });
  });

  test("handles record types", () => {
    const schema = z.object({
      settings: z.record(z.string(), z.number()),
    });

    const data = {
      settings: {
        timeout: 5000,
        limit: 100,
      },
    };

    const result = parseData(data, { schema });
    expect(result).toEqual({
      success: true,
      data,
    });
  });

  test("handles optional fields", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number().optional(),
      address: z.object({
        street: z.string(),
        city: z.string().optional(),
      }).optional(),
    });

    const data = {
      name: "John",
      address: {
        street: "123 Main St",
      },
    };

    const result = parseData(data, { schema });
    expect(result).toEqual({
      success: true,
      data,
    });
  });

  test("handles missing required fields", () => {
    const schema = z.object({
      name: z.string(),
      email: z.email(),
    });

    const data = {
      name: "John",
    };

    const result = parseData(data, { schema });
    expect(result).toEqual({
      success: false,
      errors: {
        form: undefined,
        global: undefined,
        fields: {
          email: "Invalid input: expected string, received undefined",
        },
        flattened: {
          email: "Invalid input: expected string, received undefined",
        },
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

    const result = parseData(data, { schema });
    expect(result).toEqual({
      success: false,
      errors: {
        form: undefined,
        global: undefined,
        fields: {
          confirmPassword: "Passwords don't match",
        },
        flattened: {
          confirmPassword: "Passwords don't match",
        },
      },
    });
  });

  // NEW: tuples
  test("handles tuples", () => {
    const schema = z.object({ coords: z.tuple([z.number(), z.number()]) });
    const data = { coords: [40.7128, -74.006] as [number, number] };
    const result = parseData(data, { schema });
    expect(result).toEqual({
      success: true,
      data,
    });
  });

  // NEW: map and set
  test("handles map and set", () => {
    const schema = z.object({
      scores: z.map(z.string(), z.number()),
      labels: z.set(z.string()),
    });

    const data = {
      scores: new Map<string, number>([
        ["a", 1],
        ["b", 2],
      ]),
      labels: new Set<string>(["x", "y"]),
    };

    const result = parseData(data, { schema });
    expect(result).toEqual({
      success: true,
      data,
    });
  });
});

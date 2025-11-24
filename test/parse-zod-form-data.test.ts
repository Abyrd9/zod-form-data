import { describe, expect, test } from "vitest";
import { z } from "zod/v4";
import { parseFormData } from "../src";

describe("parseFormData", () => {
  test("parses basic form data", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const formData = new FormData();
    formData.append("name", "John");
    formData.append("age", "30");

    const result = parseFormData(formData, { schema });
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

    const formData = new FormData();
    formData.append("email", "invalid-email");
    formData.append("age", "16");

    const result = parseFormData(formData, { schema });
    expect(result).toEqual({
      success: false,
      errors: {
        form: undefined,
        global: undefined,
        fields: {
          age: "Too small: expected number to be >=18",
          email: "Invalid email address",
        },
        flattened: {
          age: "Too small: expected number to be >=18",
          email: "Invalid email address",
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

    const formData = new FormData();
    formData.append("user.name", "John");
    formData.append("user.address.street", "123 Main St");
    formData.append("user.address.city", "Boston");

    const result = parseFormData(formData, { schema });
    expect(result).toEqual({
      success: true,
      data: {
        user: {
          name: "John",
          address: { street: "123 Main St", city: "Boston" },
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

    const formData = new FormData();
    formData.append("tags.0", "typescript");
    formData.append("tags.1", "zod");
    formData.append("users.0.name", "John");
    formData.append("users.0.age", "30");
    formData.append("users.1.name", "Jane");
    formData.append("users.1.age", "25");

    const result = parseFormData(formData, { schema });
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

    const formData = new FormData();
    formData.append("metadata.key1", "value1");
    formData.append("metadata.key2", "value2");
    formData.append("settings.timeout", "5000");
    formData.append("settings.limit", "100");

    const result = parseFormData(formData, { schema });
    expect(result).toEqual({
      success: true,
      data: {
        metadata: { key1: "value1", key2: "value2" },
        settings: { timeout: 5000, limit: 100 },
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

    const formData = new FormData();
    formData.append("name", "John");
    formData.append("address.street", "123 Main St");

    const result = parseFormData(formData, { schema });
    expect(result).toEqual({
      success: true,
      data: {
        name: "John",
        address: { street: "123 Main St" },
      },
    });
  });

  test("handles missing required fields", () => {
    const schema = z.object({
      name: z.string(),
      email: z.email(),
    });

    const formData = new FormData();
    formData.append("name", "John");

    const result = parseFormData(formData, { schema });
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

    const formData = new FormData();
    formData.append("password", "secret123");
    formData.append("confirmPassword", "secret124");

    const result = parseFormData(formData, { schema });
    expect(result).toEqual({
      success: false,
      errors: {
        form: undefined,
        global: undefined,
        fields: { confirmPassword: "Passwords don't match" },
        flattened: { confirmPassword: "Passwords don't match" },
      },
    });
  });

  // NEW: tuples via form fields
  test("handles tuples", () => {
    const schema = z.object({ coords: z.tuple([z.number(), z.number()]) });

    const formData = new FormData();
    formData.append("coords.0", "40.7128");
    formData.append("coords.1", "-74.006");

    const result = parseFormData(formData, { schema });
    expect(result).toEqual({
      success: true,
      data: { coords: [40.7128, -74.006] },
    });
  });

  // NEW: map and set are not directly representable with FormData; verify graceful handling
  test("handles map and set like structures with record/array fallbacks", () => {
    const schema = z.object({
      scores: z.record(z.string(), z.number()),
      labels: z.array(z.string()),
    });

    const formData = new FormData();
    formData.append("scores.math", "95");
    formData.append("scores.science", "90");
    formData.append("labels.0", "x");
    formData.append("labels.1", "y");

    const result = parseFormData(formData, { schema });
    expect(result).toEqual({
      success: true,
      data: {
        scores: { math: 95, science: 90 },
        labels: ["x", "y"],
      },
    });
  });

  // NEW: boolean coercion
  test("coerces boolean strings", () => {
    const schema = z.object({ agree: z.boolean() });
    const formData = new FormData();
    formData.append("agree", "on");
    const result = parseFormData(formData, { schema });
    expect(result).toEqual({
      success: true,
      data: { agree: true },
    });
  });

  test("invalid boolean string yields error", () => {
    const schema = z.object({ agree: z.boolean() });
    const formData = new FormData();
    formData.append("agree", "yes");
    const result = parseFormData(formData, { schema });
    expect(result).toEqual({
      success: false,
      errors: {
        form: undefined,
        global: undefined,
        fields: { agree: "Invalid input: expected boolean, received string" },
        flattened: {
          agree: "Invalid input: expected boolean, received string",
        },
      },
    });
  });

  // NEW: nullable empty string -> null
  test("maps empty string to null for nullable", () => {
    const schema = z.object({ middle: z.string().nullable() });
    const formData = new FormData();
    formData.append("middle", "");
    const result = parseFormData(formData, { schema });
    expect(result).toEqual({
      success: true,
      data: { middle: null },
    });
  });

  // NEW: union leaf coercion
  test("coerces union leaf to number when possible", () => {
    const schema = z.object({ value: z.union([z.number(), z.string()]) });
    const formData = new FormData();
    formData.append("value", "42");
    const result = parseFormData(formData, { schema });
    expect(result).toEqual({
      success: true,
      data: { value: 42 },
    });
  });

  test("falls back to string for union leaf when not a number", () => {
    const schema = z.object({ value: z.union([z.number(), z.string()]) });
    const formData = new FormData();
    formData.append("value", "hello");
    const result = parseFormData(formData, { schema });
    expect(result).toEqual({
      success: true,
      data: { value: "hello" },
    });
  });
});

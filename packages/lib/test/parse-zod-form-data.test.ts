import { describe, expect, test } from "vitest";
import { z } from "zod";
import { parseZodFormData } from "../src/parse-zod-form-data";

describe("parseZodFormData", () => {
  test("parses basic form data", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const formData = new FormData();
    formData.append("name", "John");
    formData.append("age", "30");

    const result = parseZodFormData(formData, { schema });
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

    const formData = new FormData();
    formData.append("email", "invalid-email");
    formData.append("age", "16");

    const result = parseZodFormData(formData, { schema });
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

    const formData = new FormData();
    formData.append("user.name", "John");
    formData.append("user.address.street", "123 Main St");
    formData.append("user.address.city", "Boston");

    const result = parseZodFormData(formData, { schema });
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

    const formData = new FormData();
    formData.append("tags.0", "typescript");
    formData.append("tags.1", "zod");
    formData.append("users.0.name", "John");
    formData.append("users.0.age", "30");
    formData.append("users.1.name", "Jane");
    formData.append("users.1.age", "25");

    const result = parseZodFormData(formData, { schema });
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

    const result = parseZodFormData(formData, { schema });
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

    const formData = new FormData();
    formData.append("name", "John");
    formData.append("address.street", "123 Main St");

    const result = parseZodFormData(formData, { schema });
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

  // TODO: We don't handle this well yet. Also it would be weird in a form to submit a completely different value in a form field??
  test.skip("handles discriminated unions", () => {
    const schema = z.object({
      data: z.discriminatedUnion("type", [
        z.object({ type: z.literal("text"), content: z.string() }),
        z.object({ type: z.literal("number"), value: z.number() }),
      ]),
    });

    const formData = new FormData();
    formData.append("data.type", "text");
    formData.append("data.content", "Hello World");

    const result = parseZodFormData(formData, { schema });
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

    const formData = new FormData();
    formData.append("name", "John");

    const result = parseZodFormData(formData, { schema });
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

    const formData = new FormData();
    formData.append("password", "secret123");
    formData.append("confirmPassword", "secret124");

    const result = parseZodFormData(formData, { schema });
    expect(result).toEqual({
      success: false,
      errors: {
        confirmPassword: "Passwords don't match",
      },
    });
  });
});

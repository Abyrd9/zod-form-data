import { describe, expect, test } from "bun:test";
import { z } from "zod/v4";
import { createZodFormDataErrorSchema } from "../src/create-zod-form-data-error-schema";

describe("createZodFormDataErrorSchema", () => {
  test("creates error schema for simple object", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const errorSchema = createZodFormDataErrorSchema(schema);

    // Valid error object
    const validErrors = {
      name: "Name is required",
      age: "Age must be a number",
    };
    expect(errorSchema.safeParse(validErrors).success).toBe(true);

    // Partial errors (some fields missing)
    const partialErrors = {
      name: "Name is required",
    };
    expect(errorSchema.safeParse(partialErrors).success).toBe(true);

    // Empty errors
    expect(errorSchema.safeParse({}).success).toBe(true);

    // With null values
    const nullErrors = {
      name: null,
      age: "Age must be a number",
    };
    expect(errorSchema.safeParse(nullErrors).success).toBe(true);
  });

  test("creates error schema for nested object", () => {
    const schema = z.object({
      user: z.object({
        name: z.string(),
        email: z.string(),
      }),
      settings: z.object({
        theme: z.string(),
      }),
    });

    const errorSchema = createZodFormDataErrorSchema(schema);

    const nestedErrors = {
      user: {
        name: "Name is required",
        email: "Invalid email",
      },
      settings: {
        theme: "Invalid theme",
      },
    };
    expect(errorSchema.safeParse(nestedErrors).success).toBe(true);

    // Partial nested errors
    const partialNestedErrors = {
      user: {
        name: "Name is required",
      },
    };
    expect(errorSchema.safeParse(partialNestedErrors).success).toBe(true);
  });

  test("creates error schema for array fields", () => {
    const schema = z.object({
      tags: z.array(z.string()),
      users: z.array(
        z.object({
          name: z.string(),
          email: z.string(),
        })
      ),
    });

    const errorSchema = createZodFormDataErrorSchema(schema);

    const arrayErrors = {
      tags: ["Tag 0 is invalid", "Tag 1 is invalid"],
      users: [
        {
          name: "Name is required",
          email: "Invalid email",
        },
      ],
    };
    expect(errorSchema.safeParse(arrayErrors).success).toBe(true);
  });

  test("creates error schema for optional fields", () => {
    const schema = z.object({
      name: z.string(),
      nickname: z.string().optional(),
      age: z.number().nullable(),
    });

    const errorSchema = createZodFormDataErrorSchema(schema);

    const errors = {
      name: "Name is required",
      nickname: "Nickname is too long",
      age: null,
    };
    expect(errorSchema.safeParse(errors).success).toBe(true);

    // Without optional fields
    const minimalErrors = {
      name: "Name is required",
    };
    expect(errorSchema.safeParse(minimalErrors).success).toBe(true);
  });

  test("creates error schema for record fields", () => {
    const schema = z.object({
      metadata: z.record(z.string(), z.string()),
    });

    const errorSchema = createZodFormDataErrorSchema(schema);

    const recordErrors = {
      metadata: {
        key1: "Invalid value",
        key2: "Another error",
      },
    };
    expect(errorSchema.safeParse(recordErrors).success).toBe(true);
  });

  test("creates error schema for union types", () => {
    const schema = z.object({
      value: z.union([z.string(), z.number()]),
    });

    const errorSchema = createZodFormDataErrorSchema(schema);

    const errors = {
      value: "Invalid value",
    };
    expect(errorSchema.safeParse(errors).success).toBe(true);
  });

  test("can be used in ActionData schema", () => {
    const userSchema = z.object({
      name: z.string(),
      email: z.string(),
    });

    // Create error schema
    const errorSchema = createZodFormDataErrorSchema(userSchema);

    // Create action data schema with form and global errors
    const actionDataErrorSchema = z.object({
      status: z.literal("error"),
      payload: z.null().optional(),
      errors: z
        .intersection(
          errorSchema,
          z.object({
            form: z.string().nullable().optional(),
            global: z.string().nullable().optional(),
          })
        )
        .optional(),
    });

    // Valid error response
    const errorResponse = {
      status: "error" as const,
      payload: null,
      errors: {
        name: "Name is required",
        email: "Invalid email",
        form: null,
        global: "Something went wrong",
      },
    };
    expect(actionDataErrorSchema.safeParse(errorResponse).success).toBe(true);

    // Error response without field errors
    const globalErrorResponse = {
      status: "error" as const,
      errors: {
        global: "Server error",
      },
    };
    expect(actionDataErrorSchema.safeParse(globalErrorResponse).success).toBe(true);
  });

  test("creates error schema for tuple types", () => {
    const schema = z.object({
      coordinates: z.tuple([z.number(), z.number()]),
    });

    const errorSchema = createZodFormDataErrorSchema(schema);

    const errors = {
      coordinates: ["Invalid latitude", "Invalid longitude"],
    };
    expect(errorSchema.safeParse(errors).success).toBe(true);
  });

  test("creates error schema for deeply nested structures", () => {
    const schema = z.object({
      company: z.object({
        name: z.string(),
        departments: z.array(
          z.object({
            name: z.string(),
            employees: z.array(
              z.object({
                name: z.string(),
                email: z.string(),
              })
            ),
          })
        ),
      }),
    });

    const errorSchema = createZodFormDataErrorSchema(schema);

    const deepErrors = {
      company: {
        name: "Company name is required",
        departments: [
          {
            name: "Department name is required",
            employees: [
              {
                name: "Employee name is required",
                email: "Invalid email",
              },
            ],
          },
        ],
      },
    };
    expect(errorSchema.safeParse(deepErrors).success).toBe(true);
  });
});


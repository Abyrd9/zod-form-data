import { describe, expect, test } from "vitest";
import { z } from "zod/v4";
import { flattenZodFormSchema } from "../src/flatten-zod-form-schema";

describe("flattenZodFormSchema", () => {
  test("flattens basic object schema", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const flattened = flattenZodFormSchema(schema);
    expect(Object.keys(flattened.shape)).toEqual(["name", "age"]);
    expect(flattened.shape.name).toBeInstanceOf(z.ZodString);
    expect(flattened.shape.age).toBeInstanceOf(z.ZodNumber);
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

    const flattened = flattenZodFormSchema(schema);
    expect(Object.keys(flattened.shape)).toEqual([
      "user.name",
      "user.address.street",
      "user.address.city",
    ]);
    expect(flattened.shape["user.name"]).toBeInstanceOf(z.ZodString);
    expect(flattened.shape["user.address.street"]).toBeInstanceOf(z.ZodString);
    expect(flattened.shape["user.address.city"]).toBeInstanceOf(z.ZodString);
  });

  test("flattens array schema with # placeholder", () => {
    const schema = z.object({
      tags: z.array(z.string()),
      users: z.array(
        z.object({
          name: z.string(),
          age: z.number(),
        })
      ),
    });

    const flattened = flattenZodFormSchema(schema);
    expect(Object.keys(flattened.shape)).toEqual([
      "tags.#",
      "users.#.name",
      "users.#.age",
    ]);
    expect(flattened.shape["tags.#"]).toBeInstanceOf(z.ZodString);
    expect(flattened.shape["users.#.name"]).toBeInstanceOf(z.ZodString);
    expect(flattened.shape["users.#.age"]).toBeInstanceOf(z.ZodNumber);
  });

  // TODO: We don't handle this well yet
  test("handles union types", () => {
    const schema = z.object({
      status: z.union([z.literal("active"), z.literal("inactive")]),
    });

    const flattened = flattenZodFormSchema(schema);
    expect(Object.keys(flattened.shape)).toEqual(["status"]);
    expect(flattened.shape.status instanceof z.ZodUnion).toBe(true);
  });

  test("handles discriminated unions", () => {
    const schema = z.object({
      data: z.discriminatedUnion("type", [
        z.object({ type: z.literal("text"), content: z.string() }),
        z.object({ type: z.literal("number"), value: z.number() }),
      ]),
    });

    const flattened = flattenZodFormSchema(schema);
    expect(Object.keys(flattened.shape)).toEqual([
      "data.type",
      "data.content",
      "data.value",
    ]);
  });

  // TODO: Handle passing down optional fields to the flattened field
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

    const flattened = flattenZodFormSchema(schema);
    expect(Object.keys(flattened.shape).sort()).toEqual([
      "address.city",
      "address.street",
      "age",
      "name",
    ].sort());

    // @ts-expect-error - isOptional is not a method on $ZodType
    expect(flattened.shape.age.isOptional()).toBe(true);
    // @ts-expect-error - isOptional is not a method on $ZodType
    expect(flattened.shape["address.city"].isOptional()).toBe(true);
  });

  test("handles record types with * placeholder", () => {
    const schema = z.object({
      metadata: z.record(z.string(), z.string()),
      nested: z.record(
        z.string(),
        z.object({
          value: z.number(),
          label: z.string(),
        })
      ),
    });

    const flattened = flattenZodFormSchema(schema);
    expect(Object.keys(flattened.shape)).toEqual([
      "metadata.*",
      "nested.*.value",
      "nested.*.label",
    ]);
    expect(flattened.shape["metadata.*"]).toBeInstanceOf(z.ZodString);
    expect(flattened.shape["nested.*.value"]).toBeInstanceOf(z.ZodNumber);
    expect(flattened.shape["nested.*.label"]).toBeInstanceOf(z.ZodString);
  });

  test("handles arrays with default values", () => {
    const schema = z.object({
      tags: z.array(z.string()).default([]),
      settings: z.object({
        permissions: z.array(z.string()).default(["read"]),
      }).default({ permissions: ["read"] }),
    });

    const flattened = flattenZodFormSchema(schema);
    expect(Object.keys(flattened.shape)).toEqual([
      "tags.#",
      "settings.permissions.#",
    ]);
    expect(flattened.shape["tags.#"]).toBeInstanceOf(z.ZodString);
    expect(flattened.shape["settings.permissions.#"]).toBeInstanceOf(z.ZodString);
  });

  test("handles optional arrays", () => {
    const schema = z.object({
      tags: z.array(z.string()).optional(),
      settings: z.object({
        permissions: z.array(z.string()).optional(),
      }),
    });

    const flattened = flattenZodFormSchema(schema);
    expect(Object.keys(flattened.shape)).toEqual([
      "tags.#",
      "settings.permissions.#",
    ]);
    expect(flattened.shape["tags.#"]).toBeInstanceOf(z.ZodString);
    expect(flattened.shape["settings.permissions.#"]).toBeInstanceOf(z.ZodString);
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

    const flattened = flattenZodFormSchema(schema);
    expect(Object.keys(flattened.shape)).toEqual([
      "required.#",
      "optional.#",
      "defaulted.#",
      "nested.required.#",
      "nested.optional.#",
      "nested.defaulted.#",
    ]);

    // All array elements should be strings
    for (const value of Object.values(flattened.shape)) {
      expect(value).toBeInstanceOf(z.ZodString);
    }
  });

  // TODO: We don't handle this well yet
  test("handles lazy recursive schemas", () => {
    type Comment = {
      text: string;
      replies: Comment[];
    };

    const commentSchema: z.ZodType<Comment> = z.lazy(() =>
      z.object({
        text: z.string(),
        replies: z.array(commentSchema),
      })
    );

    const schema = z.object({
      comment: commentSchema,
    });

    const flattened = flattenZodFormSchema(schema);
    expect(Object.keys(flattened.shape)).toEqual([
      "comment.text",
      "comment.replies.#.text",
      "comment.replies.#.replies.#.text",
    ]);
    expect(flattened.shape["comment.text"]).toBeInstanceOf(z.ZodString);
    expect(flattened.shape["comment.replies.#.text"]).toBeInstanceOf(z.ZodString);
  });

  test("handles zod effects", () => {
    const schema = z
      .object({
        age: z.number(),
        name: z.string(),
      })
      .refine((data) => data.age >= 18, {
        message: "Must be 18 or older",
        path: ["age"],
      });

    const flattened = flattenZodFormSchema(schema);
    expect(Object.keys(flattened.shape)).toEqual(["age", "name"]);
    expect(flattened.shape.age).toBeInstanceOf(z.ZodNumber);
    expect(flattened.shape.name).toBeInstanceOf(z.ZodString);
  });

  test("flattens tuple schema into # placeholder", () => {
    const schema = z.object({ coords: z.tuple([z.number(), z.number()]) });
    const flattened = flattenZodFormSchema(schema);
    expect(Object.keys(flattened.shape)).toContain("coords.#");
    expect(flattened.shape["coords.#"]).toBeInstanceOf(z.ZodUnion);
  });
});

import { describe, expect, test } from "vitest";
import { z } from "zod";
import { extractZodDefaults } from "../src/extract-zod-defaults";

describe("extractZodDefaults", () => {
  test("extracts basic default values", () => {
    const schema = z.object({
      name: z.string().default("John"),
      age: z.number().default(30),
      active: z.boolean().default(true),
    });

    expect(extractZodDefaults(schema)).toEqual({
      name: "John",
      age: 30,
      active: true,
    });
  });

  test("extracts nested default values", () => {
    const schema = z.object({
      user: z.object({
        name: z.string().default("John"),
        settings: z.object({
          theme: z.string().default("dark"),
          notifications: z.boolean().default(true),
        }).default({ theme: "dark", notifications: true }),
      }).default({ name: "John", settings: { theme: "dark", notifications: true } }),
    });

    expect(extractZodDefaults(schema)).toEqual({
      user: {
        name: "John",
        settings: {
          theme: "dark",
          notifications: true,
        },
      },
    });
  });

  test("extracts array default values", () => {
    const schema = z.object({
      tags: z.array(z.string()).default(["default"]),
      settings: z.object({
        permissions: z.array(z.string()).default(["read"]),
      }).default({ permissions: ["read"] }),
    });

    expect(extractZodDefaults(schema)).toEqual({
      tags: ["default"],
      settings: {
        permissions: ["read"],
      },
    });
  });

  test("handles optional fields", () => {
    const schema = z.object({
      required: z.string().default("required"),
      optional: z.string().optional(),
      optionalWithDefault: z.string().optional().default("default"),
    });

    expect(extractZodDefaults(schema)).toEqual({
      required: "required",
      optionalWithDefault: "default",
    });
  });

  test("handles combination of optional and default arrays", () => {
    const schema = z.object({
      required: z.array(z.string()),
      optional: z.array(z.string()).optional(),
      defaulted: z.array(z.string()).default(["default"]),
      nested: z.object({
        required: z.array(z.string()),
        optional: z.array(z.string()).optional(),
        defaulted: z.array(z.string()).default(["nested-default"]),
      }).default({ required: [], optional: undefined, defaulted: ["nested-default"] }),
    });

    expect(extractZodDefaults(schema)).toEqual({
      defaulted: ["default"],
      nested: {
        required: [],
        defaulted: ["nested-default"],
      },
    });
  });

  test("handles effects", () => {
    const schema = z
      .object({
        age: z.number().default(18),
        name: z.string().default("John"),
      })
      .refine((data) => data.age >= 18, {
        message: "Must be 18 or older",
        path: ["age"],
      });

    expect(extractZodDefaults(schema)).toEqual({
      age: 18,
      name: "John",
    });
  });
}); 
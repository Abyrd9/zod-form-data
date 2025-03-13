import { describe, expect, test } from "vitest";
import { unflattenZodFormData } from "../src/unflatten-zod-form-data";
import { z } from "zod";

describe("unflattenZodFormData", () => {
  test("unflattens basic object data", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const flatData = {
      name: "John",
      age: 30,
    };

    const result = unflattenZodFormData<typeof schema>(flatData);
    expect(result).toEqual({
      name: "John",
      age: 30,
    });
  });

  test("unflattens nested object data", () => {
    const schema = z.object({
      user: z.object({
        name: z.string(),
        address: z.object({
          street: z.string(),
          city: z.string(),
        }),
      }),
    });

    const flatData = {
      "user.name": "John",
      "user.address.street": "123 Main St",
      "user.address.city": "Boston",
    };

    const result = unflattenZodFormData<typeof schema>(flatData);
    expect(result).toEqual({
      user: {
        name: "John",
        address: {
          street: "123 Main St",
          city: "Boston",
        },
      },
    });
  });

  test("unflattens array data", () => {
    const schema = z.object({
      tags: z.array(z.string()),
      users: z.array(
        z.object({
          name: z.string(),
          age: z.number(),
        })
      ),
    });

    const flatData = {
      "tags.0": "typescript",
      "tags.1": "zod",
      "users.0.name": "John",
      "users.0.age": 30,
      "users.1.name": "Jane",
      "users.1.age": 25,
    };

    const result = unflattenZodFormData<typeof schema>(flatData);
    expect(result).toEqual({
      tags: ["typescript", "zod"],
      users: [
        { name: "John", age: 30 },
        { name: "Jane", age: 25 },
      ],
    });
  });

  test("handles sparse arrays", () => {
    const schema = z.object({
      items: z.array(z.string()),
    });

    const flatData = {
      "items.0": "first",
      "items.2": "third",
    };

    const result = unflattenZodFormData<typeof schema>(flatData);
    expect(result).toEqual({
      items: ["first", "third"],
    });
  });
  // TODO: We don't handle nested arrays yet
  test.skip("handles nested arrays", () => {
    const schema = z.object({
      matrix: z.array(z.array(z.number())),
    });

    const flatData = {
      "matrix.0.0": 1,
      "matrix.0.1": 2,
      "matrix.1.0": 3,
      "matrix.1.1": 4,
    };

    const result = unflattenZodFormData<typeof schema>(flatData);
    expect(result).toEqual({
      matrix: [
        [1, 2],
        [3, 4],
      ],
    });
  });

  test("unflattens with specific root", () => {
    const schema = z.object({
      user: z.object({
        name: z.string(),
        details: z.object({
          age: z.number(),
          city: z.string(),
        }),
      }),
    });

    const flatData = {
      "user.name": "John",
      "user.details.age": 30,
      "user.details.city": "Boston",
    };

    const result = unflattenZodFormData<typeof schema>(flatData, "user");
    expect(result).toEqual({
      name: "John",
      details: {
        age: 30,
        city: "Boston",
      },
    });
  });

  test("handles empty objects", () => {
    const schema = z.object({
      user: z.object({
        settings: z.object({}),
      }),
    });

    const flatData = {
      "user.settings": {},
    };

    const result = unflattenZodFormData<typeof schema>(flatData);
    expect(result).toEqual({
      user: {
        settings: {},
      },
    });
  });

  test("handles null and undefined values", () => {
    const schema = z.object({
      name: z.string().nullable(),
      age: z.number().optional(),
      address: z.object({
        street: z.string().nullable(),
        city: z.string().optional(),
      }),
    });

    const flatData = {
      name: null,
      "address.street": null,
    };

    const result = unflattenZodFormData<typeof schema>(flatData);
    expect(result).toEqual({
      name: null,
      address: {
        street: null,
      },
    });
  });

  test("handles array of objects with optional fields", () => {
    const schema = z.object({
      users: z.array(
        z.object({
          name: z.string(),
          email: z.string().optional(),
          phone: z.string().optional(),
        })
      ),
    });

    const flatData = {
      "users.0.name": "John",
      "users.0.email": "john@example.com",
      "users.1.name": "Jane",
      "users.1.phone": "123-456-7890",
    };

    const result = unflattenZodFormData<typeof schema>(flatData);
    expect(result).toEqual({
      users: [
        { name: "John", email: "john@example.com" },
        { name: "Jane", phone: "123-456-7890" },
      ],
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
    const emptyResult = unflattenZodFormData<typeof schema>({
      "tags.0": undefined,
      "settings.permissions.0": "read",
    });
    expect(emptyResult).toEqual({
      tags: [undefined],
      settings: {
        permissions: ["read"],
      },
    });

    // Test with provided data
    const result = unflattenZodFormData<typeof schema>({
      "tags.0": "typescript",
      "settings.permissions.0": "write",
      "settings.permissions.1": "admin",
    });
    expect(result).toEqual({
      tags: ["typescript"],
      settings: {
        permissions: ["write", "admin"],
      },
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
    const emptyResult = unflattenZodFormData<typeof schema>({
      "tags.0": undefined,
      "settings.permissions.0": undefined,
    });
    expect(emptyResult).toEqual({
      tags: [undefined],
      settings: {
        permissions: [undefined],
      },
    });

    // Test with provided data
    const result = unflattenZodFormData<typeof schema>({
      "tags.0": "typescript",
      "settings.permissions.0": "admin",
    });
    expect(result).toEqual({
      tags: ["typescript"],
      settings: {
        permissions: ["admin"],
      },
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
    const minimalResult = unflattenZodFormData<typeof schema>({
      "required.0": "req",
      "optional.0": undefined,
      "defaulted.0": undefined,
      "nested.required.0": undefined,
      "nested.optional.0": undefined,
      "nested.defaulted.0": "default",
    });
    expect(minimalResult).toEqual({
      required: ["req"],
      optional: [undefined],
      defaulted: [undefined],
      nested: {
        required: [undefined],
        optional: [undefined],
        defaulted: ["default"],
      },
    });

    // Test with full data
    const result = unflattenZodFormData<typeof schema>({
      "required.0": "req",
      "optional.0": "opt",
      "defaulted.0": "def",
      "nested.required.0": "nested-req",
      "nested.optional.0": "nested-opt",
      "nested.defaulted.0": "nested-def",
    });
    expect(result).toEqual({
      required: ["req"],
      optional: ["opt"],
      defaulted: ["def"],
      nested: {
        required: ["nested-req"],
        optional: ["nested-opt"],
        defaulted: ["nested-def"],
      },
    });
  });
});

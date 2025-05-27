import { describe, expect, test } from "vitest";
import { unflattenZodFormErrors } from "../src/unflatten-zod-form-errors";
import { z } from "zod/v4";

describe("unflattenZodFormErrors", () => {
  test("unflattens basic error messages", () => {
    const schema = z.object({
      name: z.string(),
      email: z.string(),
    });

    const flatErrors = {
      name: "Name is required",
      email: "Invalid email format",
    };

    const result = unflattenZodFormErrors<typeof schema>(flatErrors);
    expect(result).toEqual({
      name: "Name is required",
      email: "Invalid email format",
    });
  });

  test("unflattens nested error messages", () => {
    const schema = z.object({
      user: z.object({
        name: z.string(),
        address: z.object({
          street: z.string(),
          city: z.string(),
        }),
      }),
    });

    const flatErrors = {
      "user.name": "Name is required",
      "user.address.street": "Street is required",
      "user.address.city": "City is required",
    };

    const result = unflattenZodFormErrors<typeof schema>(flatErrors);
    expect(result).toEqual({
      user: {
        name: "Name is required",
        address: {
          street: "Street is required",
          city: "City is required",
        },
      },
    });
  });

  test("unflattens array error messages", () => {
    const schema = z.object({
      tags: z.array(z.string()),
      users: z.array(
        z.object({
          name: z.string(),
          email: z.string(),
        })
      ),
    });

    const flatErrors = {
      "tags.0": "Tag is invalid",
      "tags.1": "Tag is too short",
      "users.0.name": "Name is required",
      "users.0.email": "Invalid email",
      "users.1.name": "Name is too short",
    };

    const result = unflattenZodFormErrors<typeof schema>(flatErrors);
    expect(result).toEqual({
      tags: ["Tag is invalid", "Tag is too short"],
      users: [
        { name: "Name is required", email: "Invalid email" },
        { name: "Name is too short" },
      ],
    });
  });

  test("handles sparse array errors", () => {
    const schema = z.object({
      items: z.array(z.string()),
    });

    const flatErrors = {
      "items.0": "First error",
      "items.2": "Third error",
    };

    const result = unflattenZodFormErrors<typeof schema>(flatErrors);
    expect(result).toEqual({
      items: ["First error", "Third error"],
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

    const flatErrors = {
      "user.name": "Name is required",
      "user.details.age": "Age must be a number",
      "user.details.city": "City is required",
    };

    const result = unflattenZodFormErrors<typeof schema>(flatErrors, "user");
    expect(result).toEqual({
      name: "Name is required",
      details: {
        age: "Age must be a number",
        city: "City is required",
      },
    });
  });

  // TODO: We don't handle nested arrays yet
  test.skip("handles nested array errors", () => {
    const schema = z.object({
      matrix: z.array(z.array(z.number())),
    });

    const flatErrors = {
      "matrix.0.0": "Not a number",
      "matrix.0.1": "Too large",
      "matrix.1.1": "Invalid input",
    };

    const result = unflattenZodFormErrors<typeof schema>(flatErrors);
    expect(result).toEqual({
      matrix: [
        ["Not a number", "Too large"],
        ["Invalid input"],
      ],
    });
  });

  test("handles complex nested structures", () => {
    const schema = z.object({
      profile: z.object({
        personal: z.object({
          name: z.string(),
          age: z.number(),
        }),
        contacts: z.array(
          z.object({
            type: z.string(),
            value: z.string(),
          })
        ),
      }),
    });

    const flatErrors = {
      "profile.personal.name": "Name is required",
      "profile.personal.age": "Must be over 18",
      "profile.contacts.0.type": "Invalid type",
      "profile.contacts.0.value": "Invalid format",
      "profile.contacts.1.value": "Already exists",
    };

    const result = unflattenZodFormErrors<typeof schema>(flatErrors);
    expect(result).toEqual({
      profile: {
        personal: {
          name: "Name is required",
          age: "Must be over 18",
        },
        contacts: [
          { type: "Invalid type", value: "Invalid format" },
          { value: "Already exists" },
        ],
      },
    });
  });

  test("handles empty error object", () => {
    const schema = z.object({
      user: z.object({
        name: z.string(),
      }),
    });

    const flatErrors = {};

    const result = unflattenZodFormErrors<typeof schema>(flatErrors);
    expect(result).toEqual({});
  });
});

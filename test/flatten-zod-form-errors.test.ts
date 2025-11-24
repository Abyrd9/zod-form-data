import { describe, expect, test } from "vitest";
import { flattenZodFormErrors } from "../src/flatten-zod-form-errors";
import type { NestedFieldErrors } from "../src";
import { z } from "zod/v4";

describe("flattenZodFormErrors", () => {
  test("returns empty object when no errors provided", () => {
    const result = flattenZodFormErrors();
    expect(result).toEqual({});
  });

  test("flattens simple error object", () => {
    const schema = z.object({
      name: z.string(),
      email: z.string(),
    });
    
    const errors: NestedFieldErrors<typeof schema> = {
      name: "Name is required",
      email: "Invalid email format",
    };

    const result = flattenZodFormErrors(errors);
    expect(result).toEqual({
      name: "Name is required",
      email: "Invalid email format",
    });
  });

  test("flattens nested error object", () => {
    const schema = z.object({
      user: z.object({
        name: z.string(),
        address: z.object({
          street: z.string(),
          city: z.string(),
        }),
      }),
    });

    const errors: NestedFieldErrors<typeof schema> = {
      user: {
        name: "Name is required",
        address: {
          street: "Street is required",
          city: "City is required",
        },
      },
    };

    const result = flattenZodFormErrors(errors);
    expect(result).toEqual({
      "user.name": "Name is required",
      "user.address.street": "Street is required",
      "user.address.city": "City is required",
    });
  });

  test("flattens array errors", () => {
    const schema = z.object({
      items: z.array(z.string()),
    });

    const errors = {
      items: [
        "First item is invalid",
        "Second item is invalid",
        "Third item is invalid",
      ],
    };

    const result = flattenZodFormErrors(errors);
    expect(result).toEqual({
      "items.0": "First item is invalid",
      "items.1": "Second item is invalid",
      "items.2": "Third item is invalid",
    });
  });

  test("flattens nested array errors", () => {
    const schema = z.object({
      users: z.array(
        z.object({
          name: z.string(),
          email: z.string().optional(),
          phone: z.string().optional(),
        })
      ),
    });

    const errors = {
      users: [
        {
          name: "Name is required",
          email: "Invalid email",
        },
        {
          name: "Name too short",
          phone: "Invalid phone",
        },
      ],
    };

    const result = flattenZodFormErrors(errors);
    expect(result).toEqual({
      "users.0.name": "Name is required",
      "users.0.email": "Invalid email",
      "users.1.name": "Name too short",
      "users.1.phone": "Invalid phone",
    });
  });

  test("handles mixed nested structures", () => {
    const schema = z.object({
      profile: z.object({
        personal: z.object({
          name: z.string(),
          age: z.string(),
        }),
        contacts: z.array(
          z.object({
            email: z.string(),
            phone: z.string().optional(),
          })
        ),
      }),
    });

    const errors = {
      profile: {
        personal: {
          name: "Name is required",
          age: "Must be over 18",
        },
        contacts: [
          {
            email: "Invalid email",
            phone: "Invalid phone",
          },
          {
            email: "Email already exists",
          },
        ],
      },
    };

    const result = flattenZodFormErrors(errors);
    expect(result).toEqual({
      "profile.personal.name": "Name is required",
      "profile.personal.age": "Must be over 18",
      "profile.contacts.0.email": "Invalid email",
      "profile.contacts.0.phone": "Invalid phone",
      "profile.contacts.1.email": "Email already exists",
    });
  });

  test("handles null and undefined values", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number().nullable(),
      email: z.string().optional(),
    });

    const errors = {
      name: "Name is required",
      age: null,
      email: undefined,
    };

    const result = flattenZodFormErrors(errors);
    expect(result).toEqual({
      name: "Name is required",
    });
  });

  test("handles empty objects", () => {
    const schema = z.object({
      user: z.object({}).optional(),
      profile: z.object({
        details: z.object({}),
      }),
    });

    const errors = {
      user: {},
      profile: {
        details: {},
      },
    };

    const result = flattenZodFormErrors(errors);
    expect(result).toEqual({});
  });
});

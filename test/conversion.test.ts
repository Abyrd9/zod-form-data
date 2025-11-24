import { describe, expect, test } from "vitest";
import { z } from "zod/v4";
import {
  convertFormDataToObject,
  convertObjectToFormData,
} from "../src";

describe("conversion helpers", () => {
  const simpleSchema = z.object({
    user: z.object({
      name: z.string(),
      age: z.number().optional(),
    }),
    tags: z.array(z.string()).default([]),
  });

  test("convertObjectToFormData flattens simple entries", () => {
    const formData = convertObjectToFormData(simpleSchema, {
      user: { name: "Ada", age: 37 },
      tags: ["zod", "forms"],
    });

    expect(formData.get("user.name")).toBe("Ada");
    expect(formData.get("user.age")).toBe("37");
    expect(formData.get("tags.0")).toBe("zod");
    expect(formData.get("tags.1")).toBe("forms");
  });

  test("convertFormDataToObject reconstructs simple nested data", () => {
    const formData = new FormData();
    formData.append("user.name", "Ada");
    formData.append("user.age", "37");
    formData.append("tags.0", "zod");
    formData.append("tags.1", "forms");

    const result = convertFormDataToObject(simpleSchema, formData);

    expect(result).toEqual({
      user: { name: "Ada", age: 37 },
      tags: ["zod", "forms"],
    });
  });

  const complexSchema = z.object({
    profile: z.object({
      name: z.string(),
      contact: z.object({
        email: z.string().email(),
        phone: z.string().optional(),
      }),
    }),
    settings: z.object({
      theme: z.union([z.literal("light"), z.literal("dark")]),
      notifications: z.object({
        email: z.boolean(),
        sms: z.boolean().optional(),
      }),
    }),
    addresses: z.array(
      z.object({
        label: z.string(),
        location: z.object({
          line1: z.string(),
          city: z.string(),
        }),
        tags: z.array(z.string()),
        primary: z.boolean(),
      })
    ),
    metadata: z.record(z.string(), z.number()).default({}),
    status: z.discriminatedUnion("type", [
      z.object({
        type: z.literal("guest"),
        expiresAt: z.string().optional(),
      }),
      z.object({
        type: z.literal("member"),
        level: z.number(),
      }),
    ]),
  });

  test("conversion helpers handle deeply nested data structures", () => {
    const complexData = {
      profile: {
        name: "Ada Lovelace",
        contact: {
          email: "[email protected]",
        },
      },
      settings: {
        theme: "dark" as const,
        notifications: {
          email: true,
        },
      },
      addresses: [
        {
          label: "Home",
          location: { line1: "123 Analytical Way", city: "London" },
          tags: ["primary", "billing"],
          primary: true,
        },
        {
          label: "Office",
          location: { line1: "42 Logic Lane", city: "Oxford" },
          tags: ["work"],
          primary: false,
        },
      ],
      metadata: {
        priority: 2,
      },
      status: { type: "member" as const, level: 3 },
    };

    const formData = convertObjectToFormData(complexSchema, complexData);

    expect(formData.get("profile.name")).toBe("Ada Lovelace");
    expect(formData.get("profile.contact.email")).toBe("[email protected]");
    expect(formData.get("settings.theme")).toBe("dark");
    expect(formData.get("settings.notifications.email")).toBe("true");
    expect(formData.get("settings.notifications.sms")).toBeNull();
    expect(formData.get("addresses.0.label")).toBe("Home");
    expect(formData.get("addresses.0.location.line1")).toBe(
      "123 Analytical Way"
    );
    expect(formData.get("addresses.0.tags.0")).toBe("primary");
    expect(formData.get("addresses.0.tags.1")).toBe("billing");
    expect(formData.get("addresses.0.primary")).toBe("true");
    expect(formData.get("metadata.priority")).toBe("2");
    expect(formData.get("status.type")).toBe("member");
    expect(formData.get("status.level")).toBe("3");

    const reconstructed = convertFormDataToObject(complexSchema, formData);

    expect(reconstructed).toEqual({
      profile: {
        name: "Ada Lovelace",
        contact: { email: "[email protected]" },
      },
      settings: {
        theme: "dark",
        notifications: {
          email: true,
        },
      },
      addresses: [
        {
          label: "Home",
          location: { line1: "123 Analytical Way", city: "London" },
          tags: ["primary", "billing"],
          primary: true,
        },
        {
          label: "Office",
          location: { line1: "42 Logic Lane", city: "Oxford" },
          tags: ["work"],
          primary: false,
        },
      ],
      metadata: {
        priority: 2,
      },
      status: { type: "member", level: 3 },
    });
  });

  test("convertFormDataToObject coerces primitive values and skips missing optionals", () => {
    const formData = new FormData();
    formData.append("profile.name", "Grace Hopper");
    formData.append("profile.contact.email", "[email protected]");
    formData.append("settings.theme", "light");
    formData.append("settings.notifications.email", "false");
    formData.append("addresses.0.label", "HQ");
    formData.append("addresses.0.location.line1", "1 Byte Blvd");
    formData.append("addresses.0.location.city", "Arlington");
    formData.append("addresses.0.tags.0", "primary");
    formData.append("addresses.0.primary", "true");
    formData.append("metadata.reviewScore", "4");
    formData.append("status.type", "guest");
    formData.append("status.expiresAt", "2025-12-31");

    const reconstructed = convertFormDataToObject(complexSchema, formData);

    expect(reconstructed).toEqual({
      profile: {
        name: "Grace Hopper",
        contact: {
          email: "[email protected]",
        },
      },
      settings: {
        theme: "light",
        notifications: {
          email: false,
        },
      },
      addresses: [
        {
          label: "HQ",
          location: { line1: "1 Byte Blvd", city: "Arlington" },
          tags: ["primary"],
          primary: true,
        },
      ],
      metadata: {
        reviewScore: 4,
      },
      status: {
        type: "guest",
        expiresAt: "2025-12-31",
      },
    });
  });
});



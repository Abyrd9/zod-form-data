import { describe, expect, test } from "vitest";
import { z } from "zod/v4";
import {
  convertFormDataToObject,
  convertObjectToFormData,
} from "../src";

describe("pick and extend schema conversion", () => {
  // Base schema with some basic types
  const baseSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    age: z.number(),
    isActive: z.boolean(),
    role: z.enum(["admin", "user", "guest"]),
    metadata: z.object({
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  });

  // Schema using .pick() and .extend()
  const extendedSchema = baseSchema
    .pick({ name: true, email: true, age: true })
    .extend({
      bio: z.string().optional(),
      settings: z.object({
        theme: z.enum(["light", "dark"]),
        notifications: z.boolean(),
      }),
    });

  test("convertObjectToFormData works with base schema", () => {
    const formData = convertObjectToFormData(baseSchema, {
      id: "123",
      name: "Alice",
      email: "[email protected]",
      age: 30,
      isActive: true,
      role: "admin",
      metadata: {
        createdAt: "2024-01-01",
        updatedAt: "2024-06-01",
      },
    });

    expect(formData.get("id")).toBe("123");
    expect(formData.get("name")).toBe("Alice");
    expect(formData.get("email")).toBe("[email protected]");
    expect(formData.get("age")).toBe("30");
    expect(formData.get("isActive")).toBe("true");
    expect(formData.get("role")).toBe("admin");
    expect(formData.get("metadata.createdAt")).toBe("2024-01-01");
    expect(formData.get("metadata.updatedAt")).toBe("2024-06-01");
  });

  test("convertObjectToFormData with pick and extend schema", () => {
    const formData = convertObjectToFormData(extendedSchema, {
      name: "Bob",
      email: "[email protected]",
      age: 25,
      bio: "Software developer",
      settings: {
        theme: "dark",
        notifications: true,
      },
    });

    expect(formData.get("name")).toBe("Bob");
    expect(formData.get("email")).toBe("[email protected]");
    expect(formData.get("age")).toBe("25");
    expect(formData.get("bio")).toBe("Software developer");
    expect(formData.get("settings.theme")).toBe("dark");
    expect(formData.get("settings.notifications")).toBe("true");
  });

  test("convertFormDataToObject with pick and extend schema", () => {
    const formData = new FormData();
    formData.append("name", "Charlie");
    formData.append("email", "[email protected]");
    formData.append("age", "35");
    formData.append("bio", "Designer");
    formData.append("settings.theme", "light");
    formData.append("settings.notifications", "false");

    const result = convertFormDataToObject(extendedSchema, formData);

    expect(result).toEqual({
      name: "Charlie",
      email: "[email protected]",
      age: 35,
      bio: "Designer",
      settings: {
        theme: "light",
        notifications: false,
      },
    });
  });

  // Test with just .pick()
  const pickedSchema = baseSchema.pick({ name: true, email: true });

  test("convertObjectToFormData with just pick", () => {
    const formData = convertObjectToFormData(pickedSchema, {
      name: "Diana",
      email: "[email protected]",
    });

    expect(formData.get("name")).toBe("Diana");
    expect(formData.get("email")).toBe("[email protected]");
  });

  test("convertFormDataToObject with just pick", () => {
    const formData = new FormData();
    formData.append("name", "Eve");
    formData.append("email", "[email protected]");

    const result = convertFormDataToObject(pickedSchema, formData);

    expect(result).toEqual({
      name: "Eve",
      email: "[email protected]",
    });
  });

  // Test with just .extend()
  const justExtendedSchema = baseSchema.extend({
    additionalField: z.string(),
  });

  test("convertObjectToFormData with just extend", () => {
    const formData = convertObjectToFormData(justExtendedSchema, {
      id: "456",
      name: "Frank",
      email: "[email protected]",
      age: 40,
      isActive: false,
      role: "user",
      metadata: {
        createdAt: "2023-01-01",
        updatedAt: "2023-12-01",
      },
      additionalField: "extra data",
    });

    expect(formData.get("id")).toBe("456");
    expect(formData.get("additionalField")).toBe("extra data");
  });

  // Test with .omit()
  const omittedSchema = baseSchema.omit({ id: true, metadata: true });

  test("convertObjectToFormData with omit", () => {
    const formData = convertObjectToFormData(omittedSchema, {
      name: "Grace",
      email: "[email protected]",
      age: 28,
      isActive: true,
      role: "guest",
    });

    expect(formData.get("name")).toBe("Grace");
    expect(formData.get("id")).toBeNull();
    expect(formData.get("metadata.createdAt")).toBeNull();
  });

  // Test with .partial()
  const partialSchema = baseSchema.partial();

  test("convertObjectToFormData with partial", () => {
    const formData = convertObjectToFormData(partialSchema, {
      name: "Henry",
    });

    expect(formData.get("name")).toBe("Henry");
  });

  // Chained operations: pick -> extend -> partial
  const chainedSchema = baseSchema
    .pick({ name: true, age: true })
    .extend({ location: z.string() })
    .partial();

  test("convertObjectToFormData with chained operations", () => {
    const formData = convertObjectToFormData(chainedSchema, {
      name: "Ivy",
      location: "NYC",
    });

    expect(formData.get("name")).toBe("Ivy");
    expect(formData.get("location")).toBe("NYC");
    expect(formData.get("age")).toBeNull();
  });

  test("convertFormDataToObject with chained operations", () => {
    const formData = new FormData();
    formData.append("name", "Jack");
    formData.append("age", "22");

    const result = convertFormDataToObject(chainedSchema, formData);

    expect(result).toEqual({
      name: "Jack",
      age: 22,
    });
  });
});

describe("advanced schema compositions that may cause issues", () => {
  const schema1 = z.object({
    name: z.string(),
    age: z.number(),
  });

  const schema2 = z.object({
    email: z.string().email(),
    active: z.boolean(),
  });

  // Test with .merge()
  const mergedSchema = schema1.merge(schema2);

  test("convertObjectToFormData with merged schema", () => {
    const formData = convertObjectToFormData(mergedSchema, {
      name: "Alice",
      age: 30,
      email: "[email protected]",
      active: true,
    });

    expect(formData.get("name")).toBe("Alice");
    expect(formData.get("age")).toBe("30");
    expect(formData.get("email")).toBe("[email protected]");
    expect(formData.get("active")).toBe("true");
  });

  test("convertFormDataToObject with merged schema", () => {
    const formData = new FormData();
    formData.append("name", "Bob");
    formData.append("age", "25");
    formData.append("email", "[email protected]");
    formData.append("active", "false");

    const result = convertFormDataToObject(mergedSchema, formData);

    expect(result).toEqual({
      name: "Bob",
      age: 25,
      email: "[email protected]",
      active: false,
    });
  });

  // Test with intersection type using .and()
  const intersectedSchema = schema1.and(schema2);

  test("convertObjectToFormData with intersected schema (.and())", () => {
    const formData = convertObjectToFormData(intersectedSchema, {
      name: "Charlie",
      age: 35,
      email: "[email protected]",
      active: true,
    });

    expect(formData.get("name")).toBe("Charlie");
    expect(formData.get("age")).toBe("35");
    expect(formData.get("email")).toBe("[email protected]");
    expect(formData.get("active")).toBe("true");
  });

  test("convertFormDataToObject with intersected schema (.and())", () => {
    const formData = new FormData();
    formData.append("name", "Diana");
    formData.append("age", "40");
    formData.append("email", "[email protected]");
    formData.append("active", "true");

    const result = convertFormDataToObject(intersectedSchema, formData);

    expect(result).toEqual({
      name: "Diana",
      age: 40,
      email: "[email protected]",
      active: true,
    });
  });

  // Test with deeply nested pick/extend
  const deepBaseSchema = z.object({
    user: z.object({
      profile: z.object({
        name: z.string(),
        bio: z.string(),
        avatar: z.string(),
      }),
      settings: z.object({
        theme: z.string(),
        language: z.string(),
      }),
    }),
    posts: z.array(z.object({
      title: z.string(),
      content: z.string(),
    })),
  });

  const deepPickedExtended = deepBaseSchema
    .pick({ user: true })
    .extend({
      preferences: z.object({
        notifications: z.boolean(),
      }),
    });

  test("convertObjectToFormData with deeply nested pick and extend", () => {
    const formData = convertObjectToFormData(deepPickedExtended, {
      user: {
        profile: {
          name: "Eve",
          bio: "Developer",
          avatar: "avatar.png",
        },
        settings: {
          theme: "dark",
          language: "en",
        },
      },
      preferences: {
        notifications: true,
      },
    });

    expect(formData.get("user.profile.name")).toBe("Eve");
    expect(formData.get("user.profile.bio")).toBe("Developer");
    expect(formData.get("user.settings.theme")).toBe("dark");
    expect(formData.get("preferences.notifications")).toBe("true");
    // Posts should not be present since we picked only user
    expect(formData.get("posts.0.title")).toBeNull();
  });

  test("convertFormDataToObject with deeply nested pick and extend", () => {
    const formData = new FormData();
    formData.append("user.profile.name", "Frank");
    formData.append("user.profile.bio", "Designer");
    formData.append("user.profile.avatar", "pic.jpg");
    formData.append("user.settings.theme", "light");
    formData.append("user.settings.language", "es");
    formData.append("preferences.notifications", "false");

    const result = convertFormDataToObject(deepPickedExtended, formData);

    expect(result).toEqual({
      user: {
        profile: {
          name: "Frank",
          bio: "Designer",
          avatar: "pic.jpg",
        },
        settings: {
          theme: "light",
          language: "es",
        },
      },
      preferences: {
        notifications: false,
      },
    });
  });

  // Test with .passthrough() - this might cause issues
  const passthroughSchema = z.object({
    name: z.string(),
  }).passthrough();

  test("convertObjectToFormData with passthrough schema", () => {
    const formData = convertObjectToFormData(passthroughSchema, {
      name: "Grace",
      // Extra fields that passthrough should allow
      extraField: "extra",
    } as any);

    expect(formData.get("name")).toBe("Grace");
    // Extra fields won't be in FormData since they're not in schema
    // This is expected behavior - passthrough only affects parsing
  });

  // Test with .strict() 
  const strictSchema = z.object({
    name: z.string(),
    age: z.number(),
  }).strict();

  test("convertObjectToFormData with strict schema", () => {
    const formData = convertObjectToFormData(strictSchema, {
      name: "Henry",
      age: 50,
    });

    expect(formData.get("name")).toBe("Henry");
    expect(formData.get("age")).toBe("50");
  });

  // Test with .refine() - transforms the object but keeps structure
  const refinedSchema = z.object({
    name: z.string(),
    age: z.number(),
  }).refine(data => data.age >= 18, {
    message: "Must be 18 or older",
  });

  test("convertObjectToFormData with refined schema", () => {
    const formData = convertObjectToFormData(refinedSchema, {
      name: "Ivy",
      age: 21,
    });

    expect(formData.get("name")).toBe("Ivy");
    expect(formData.get("age")).toBe("21");
  });

  test("convertFormDataToObject with refined schema", () => {
    const formData = new FormData();
    formData.append("name", "Jack");
    formData.append("age", "25");

    const result = convertFormDataToObject(refinedSchema, formData);

    expect(result).toEqual({
      name: "Jack",
      age: 25,
    });
  });

  // Test with .transform()
  const transformSchema = z.object({
    name: z.string(),
    birthYear: z.number(),
  }).transform(data => ({
    ...data,
    age: new Date().getFullYear() - data.birthYear,
  }));

  test("convertObjectToFormData with transform schema - input data", () => {
    // When converting to FormData, we use input type
    const formData = convertObjectToFormData(transformSchema, {
      name: "Kate",
      birthYear: 1990,
    });

    expect(formData.get("name")).toBe("Kate");
    expect(formData.get("birthYear")).toBe("1990");
    // age is not in the input, only in output
  });

  // Test with branded types
  const brandedSchema = z.object({
    userId: z.string().brand<"UserId">(),
    name: z.string(),
  });

  test("convertObjectToFormData with branded schema", () => {
    const formData = convertObjectToFormData(brandedSchema, {
      userId: "user-123" as string & { __brand: "UserId" },
      name: "Leo",
    });

    expect(formData.get("userId")).toBe("user-123");
    expect(formData.get("name")).toBe("Leo");
  });

  test("convertFormDataToObject with branded schema", () => {
    const formData = new FormData();
    formData.append("userId", "user-456");
    formData.append("name", "Mia");

    const result = convertFormDataToObject(brandedSchema, formData);

    expect(result).toEqual({
      userId: "user-456",
      name: "Mia",
    });
  });

  // Test pick/extend with arrays
  const withArraysBase = z.object({
    name: z.string(),
    tags: z.array(z.string()),
    items: z.array(z.object({
      id: z.string(),
      value: z.number(),
    })),
  });

  const pickedWithArrays = withArraysBase
    .pick({ name: true, items: true })
    .extend({
      categories: z.array(z.string()),
    });

  test("convertObjectToFormData with pick/extend on arrays", () => {
    const formData = convertObjectToFormData(pickedWithArrays, {
      name: "Nina",
      items: [
        { id: "item-1", value: 100 },
        { id: "item-2", value: 200 },
      ],
      categories: ["cat-a", "cat-b"],
    });

    expect(formData.get("name")).toBe("Nina");
    expect(formData.get("items.0.id")).toBe("item-1");
    expect(formData.get("items.0.value")).toBe("100");
    expect(formData.get("items.1.id")).toBe("item-2");
    expect(formData.get("items.1.value")).toBe("200");
    expect(formData.get("categories.0")).toBe("cat-a");
    expect(formData.get("categories.1")).toBe("cat-b");
    // tags should not be present since we didn't pick it
    expect(formData.get("tags.0")).toBeNull();
  });

  test("convertFormDataToObject with pick/extend on arrays", () => {
    const formData = new FormData();
    formData.append("name", "Oscar");
    formData.append("items.0.id", "a1");
    formData.append("items.0.value", "50");
    formData.append("categories.0", "c1");
    formData.append("categories.1", "c2");

    const result = convertFormDataToObject(pickedWithArrays, formData);

    expect(result).toEqual({
      name: "Oscar",
      items: [{ id: "a1", value: 50 }],
      categories: ["c1", "c2"],
    });
  });
});


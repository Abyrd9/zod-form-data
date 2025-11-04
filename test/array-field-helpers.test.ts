/// <reference lib="dom" />

import { describe, expect, test } from "vitest";
import { z } from "zod/v4";
import { useZodForm } from "../src";
import { renderHook, act } from "@testing-library/react";

describe("array field helpers", () => {
  describe("add method", () => {
    test("adds primitive values to end of array", () => {
    const schema = z.object({
      tags: z.array(z.string()),
    });

    const { result } = renderHook(() =>
      useZodForm({
        schema,
      })
    );
    
    // Initially should be an empty array
    expect(result.current.fields.tags).toHaveLength(0);

    act(() => {
      result.current.getFieldArrayHelpers("tags").add("new-tag");
    });

    // After adding, should have one item
    expect(result.current.fields.tags).toHaveLength(1);
    expect(result.current.fields.tags[0].value).toBe("new-tag");
  });

    test("adds object values to end of array", () => {
    const schema = z.object({
      users: z.array(
        z.object({
          name: z.string(),
          age: z.number(),
        })
      ),
    });

    const { result } = renderHook(() =>
      useZodForm({
        schema,
        defaultValues: {
          users: [{ name: "John", age: 30 }],
        },
      })
    );

    act(() => {
      result.current.getFieldArrayHelpers("users").add({
        name: "Jane",
        age: 25,
      });
    });

    expect(result.current.fields.users).toHaveLength(2);
    expect(result.current.fields.users[0].name.value).toBe("John");
    expect(result.current.fields.users[0].age.value).toBe(30);
    expect(result.current.fields.users[1].name.value).toBe("Jane");
    expect(result.current.fields.users[1].age.value).toBe(25);
  });

    test("adds primitive at specific index", () => {
      const schema = z.object({
        tags: z.array(z.string()),
      });

      const { result } = renderHook(() =>
        useZodForm({
          schema,
          defaultValues: {
            tags: ["first", "second", "third"],
          },
        })
      );

      act(() => {
        result.current.getFieldArrayHelpers("tags").add("inserted", 1);
      });

      expect(result.current.fields.tags).toHaveLength(4);
      expect(result.current.fields.tags[0].value).toBe("first");
      expect(result.current.fields.tags[1].value).toBe("inserted");
      expect(result.current.fields.tags[2].value).toBe("second");
      expect(result.current.fields.tags[3].value).toBe("third");
    });

    test("adds object at specific index", () => {
      const schema = z.object({
        users: z.array(
          z.object({
            name: z.string(),
            age: z.number(),
          })
        ),
      });

      const { result } = renderHook(() =>
        useZodForm({
          schema,
          defaultValues: {
            users: [
              { name: "Alice", age: 25 },
              { name: "Bob", age: 30 },
            ],
          },
        })
      );

      act(() => {
        result.current.getFieldArrayHelpers("users").add(
          { name: "Charlie", age: 35 },
          1
        );
      });

      expect(result.current.fields.users).toHaveLength(3);
      expect(result.current.fields.users[0].name.value).toBe("Alice");
      expect(result.current.fields.users[1].name.value).toBe("Charlie");
      expect(result.current.fields.users[2].name.value).toBe("Bob");
    });

    test("prepends item when index is 0", () => {
      const schema = z.object({
        tags: z.array(z.string()),
      });

      const { result } = renderHook(() =>
        useZodForm({
          schema,
          defaultValues: {
            tags: ["second", "third"],
          },
        })
      );

      act(() => {
        result.current.getFieldArrayHelpers("tags").add("first", 0);
      });

      expect(result.current.fields.tags).toHaveLength(3);
      expect(result.current.fields.tags[0].value).toBe("first");
      expect(result.current.fields.tags[1].value).toBe("second");
      expect(result.current.fields.tags[2].value).toBe("third");
    });

    test("adds to end when index is beyond array length", () => {
      const schema = z.object({
        tags: z.array(z.string()),
      });

      const { result } = renderHook(() =>
        useZodForm({
          schema,
          defaultValues: {
            tags: ["first", "second"],
          },
        })
      );

      act(() => {
        result.current.getFieldArrayHelpers("tags").add("last", 100);
      });

      expect(result.current.fields.tags).toHaveLength(3);
      expect(result.current.fields.tags[0].value).toBe("first");
      expect(result.current.fields.tags[1].value).toBe("second");
      expect(result.current.fields.tags[2].value).toBe("last");
    });
  });

  describe("remove method", () => {
  test("removes items from an array", () => {
    const schema = z.object({
      tags: z.array(z.string()),
    });

    const { result } = renderHook(() =>
      useZodForm({
        schema,
        defaultValues: {
          tags: ["first", "second", "third"],
        },
      })
    );

    act(() => {
        result.current.getFieldArrayHelpers("tags").remove(1);
    });

    expect(result.current.fields.tags).toHaveLength(2);
    expect(result.current.fields.tags[0].value).toBe("first");
    expect(result.current.fields.tags[1].value).toBe("third");
  });

  test("removes items from an array of objects", () => {
    const schema = z.object({
      users: z.array(
        z.object({
          name: z.string(),
          age: z.number(),
        })
      ),
    });

    const { result } = renderHook(() =>
      useZodForm({
        schema,
        defaultValues: {
          users: [
            { name: "John", age: 30 },
            { name: "Jane", age: 25 },
            { name: "Bob", age: 35 },
          ],
        },
      })
    );

    act(() => {
        result.current.getFieldArrayHelpers("users").remove(1);
    });

    expect(result.current.fields.users).toHaveLength(2);
    expect(result.current.fields.users[0].name.value).toBe("John");
    expect(result.current.fields.users[0].age.value).toBe(30);
    expect(result.current.fields.users[1].name.value).toBe("Bob");
    expect(result.current.fields.users[1].age.value).toBe(35);
  });

    test("removes first item", () => {
      const schema = z.object({
        tags: z.array(z.string()),
      });

      const { result } = renderHook(() =>
        useZodForm({
          schema,
          defaultValues: {
            tags: ["first", "second", "third"],
          },
        })
      );

      act(() => {
        result.current.getFieldArrayHelpers("tags").remove(0);
      });

      expect(result.current.fields.tags).toHaveLength(2);
      expect(result.current.fields.tags[0].value).toBe("second");
      expect(result.current.fields.tags[1].value).toBe("third");
    });

    test("removes last item", () => {
      const schema = z.object({
        tags: z.array(z.string()),
      });

      const { result } = renderHook(() =>
        useZodForm({
          schema,
          defaultValues: {
            tags: ["first", "second", "third"],
          },
        })
      );

      act(() => {
        result.current.getFieldArrayHelpers("tags").remove(2);
      });

      expect(result.current.fields.tags).toHaveLength(2);
      expect(result.current.fields.tags[0].value).toBe("first");
      expect(result.current.fields.tags[1].value).toBe("second");
    });
  });

  describe("move method", () => {
    test("moves items down in array", () => {
      const schema = z.object({
        tags: z.array(z.string()),
      });

      const { result } = renderHook(() =>
        useZodForm({
          schema,
          defaultValues: {
            tags: ["first", "second", "third", "fourth"],
          },
        })
      );

      act(() => {
        result.current.getFieldArrayHelpers("tags").move(1, 3);
      });

      expect(result.current.fields.tags).toHaveLength(4);
      expect(result.current.fields.tags[0].value).toBe("first");
      expect(result.current.fields.tags[1].value).toBe("third");
      expect(result.current.fields.tags[2].value).toBe("fourth");
      expect(result.current.fields.tags[3].value).toBe("second");
    });

    test("moves items up in array", () => {
      const schema = z.object({
        tags: z.array(z.string()),
      });

      const { result } = renderHook(() =>
        useZodForm({
          schema,
          defaultValues: {
            tags: ["first", "second", "third", "fourth"],
          },
        })
      );

      act(() => {
        result.current.getFieldArrayHelpers("tags").move(3, 1);
      });

      expect(result.current.fields.tags).toHaveLength(4);
      expect(result.current.fields.tags[0].value).toBe("first");
      expect(result.current.fields.tags[1].value).toBe("fourth");
      expect(result.current.fields.tags[2].value).toBe("second");
      expect(result.current.fields.tags[3].value).toBe("third");
    });

    test("moves objects preserving all fields", () => {
      const schema = z.object({
        users: z.array(
          z.object({
            name: z.string(),
            age: z.number(),
          })
        ),
      });

      const { result } = renderHook(() =>
        useZodForm({
          schema,
          defaultValues: {
            users: [
              { name: "Alice", age: 25 },
              { name: "Bob", age: 30 },
              { name: "Charlie", age: 35 },
            ],
          },
        })
      );

      act(() => {
        result.current.getFieldArrayHelpers("users").move(0, 2);
      });

      expect(result.current.fields.users).toHaveLength(3);
      expect(result.current.fields.users[0].name.value).toBe("Bob");
      expect(result.current.fields.users[0].age.value).toBe(30);
      expect(result.current.fields.users[1].name.value).toBe("Charlie");
      expect(result.current.fields.users[1].age.value).toBe(35);
      expect(result.current.fields.users[2].name.value).toBe("Alice");
      expect(result.current.fields.users[2].age.value).toBe(25);
    });

    test("does nothing when moving to same index", () => {
      const schema = z.object({
        tags: z.array(z.string()),
      });

      const { result } = renderHook(() =>
        useZodForm({
          schema,
          defaultValues: {
            tags: ["first", "second", "third"],
          },
        })
      );

      act(() => {
        result.current.getFieldArrayHelpers("tags").move(1, 1);
      });

      expect(result.current.fields.tags).toHaveLength(3);
      expect(result.current.fields.tags[0].value).toBe("first");
      expect(result.current.fields.tags[1].value).toBe("second");
      expect(result.current.fields.tags[2].value).toBe("third");
    });

    test("moves first item to last", () => {
      const schema = z.object({
        tags: z.array(z.string()),
      });

      const { result } = renderHook(() =>
        useZodForm({
          schema,
          defaultValues: {
            tags: ["first", "second", "third"],
          },
        })
      );

      act(() => {
        result.current.getFieldArrayHelpers("tags").move(0, 2);
      });

      expect(result.current.fields.tags).toHaveLength(3);
      expect(result.current.fields.tags[0].value).toBe("second");
      expect(result.current.fields.tags[1].value).toBe("third");
      expect(result.current.fields.tags[2].value).toBe("first");
    });

    test("moves last item to first", () => {
      const schema = z.object({
        tags: z.array(z.string()),
      });

      const { result } = renderHook(() =>
        useZodForm({
          schema,
          defaultValues: {
            tags: ["first", "second", "third"],
          },
        })
      );

      act(() => {
        result.current.getFieldArrayHelpers("tags").move(2, 0);
      });

      expect(result.current.fields.tags).toHaveLength(3);
      expect(result.current.fields.tags[0].value).toBe("third");
      expect(result.current.fields.tags[1].value).toBe("first");
      expect(result.current.fields.tags[2].value).toBe("second");
    });
  });

  describe("nested arrays", () => {
    test("handles nested array fields", () => {
      const schema = z.object({
        groups: z.array(
          z.object({
            name: z.string(),
            members: z.array(
              z.object({
                name: z.string(),
                role: z.string(),
              })
            ),
          })
        ),
      });

      const { result } = renderHook(() =>
        useZodForm({
          schema,
          defaultValues: {
            groups: [
              {
                name: "Group 1",
                members: [{ name: "John", role: "admin" }],
              },
            ],
          },
        })
      );

      // Add a new member to the first group (using concrete index at runtime)
      act(() => {
        result.current.getFieldArrayHelpers("groups.0.members").add({
          name: "Jane",
          role: "user",
        });
      });

      expect(result.current.fields.groups[0].members).toHaveLength(2);
      expect(result.current.fields.groups[0].members[0].name.value).toBe("John");
      expect(result.current.fields.groups[0].members[0].role.value).toBe("admin");
      expect(result.current.fields.groups[0].members[1].name.value).toBe("Jane");
      expect(result.current.fields.groups[0].members[1].role.value).toBe("user");

      // Remove the first member (using concrete index at runtime)
      act(() => {
        result.current.getFieldArrayHelpers("groups.0.members").remove(0);
      });

      expect(result.current.fields.groups[0].members).toHaveLength(1);
      expect(result.current.fields.groups[0].members[0].name.value).toBe("Jane");
      expect(result.current.fields.groups[0].members[0].role.value).toBe("user");
    });

    test("can add nested items at specific index", () => {
      const schema = z.object({
        groups: z.array(
          z.object({
            name: z.string(),
            members: z.array(z.string()),
          })
        ),
      });

      const { result } = renderHook(() =>
        useZodForm({
          schema,
          defaultValues: {
            groups: [
              {
                name: "Team A",
                members: ["Alice", "Bob"],
              },
            ],
          },
        })
      );

      act(() => {
        result.current.getFieldArrayHelpers("groups.0.members").add("Charlie", 1);
      });

      expect(result.current.fields.groups[0].members).toHaveLength(3);
      expect(result.current.fields.groups[0].members[0].value).toBe("Alice");
      expect(result.current.fields.groups[0].members[1].value).toBe("Charlie");
      expect(result.current.fields.groups[0].members[2].value).toBe("Bob");
    });

    test("can move items in nested arrays", () => {
      const schema = z.object({
        groups: z.array(
          z.object({
            name: z.string(),
            members: z.array(z.string()),
          })
        ),
      });

      const { result } = renderHook(() =>
        useZodForm({
          schema,
          defaultValues: {
            groups: [
              {
                name: "Team A",
                members: ["Alice", "Bob", "Charlie"],
              },
            ],
          },
        })
      );

      act(() => {
        result.current.getFieldArrayHelpers("groups.0.members").move(0, 2);
      });

      expect(result.current.fields.groups[0].members).toHaveLength(3);
      expect(result.current.fields.groups[0].members[0].value).toBe("Bob");
      expect(result.current.fields.groups[0].members[1].value).toBe("Charlie");
      expect(result.current.fields.groups[0].members[2].value).toBe("Alice");
    });
  });

  describe("edge cases", () => {
    test("handles arrays with default values", () => {
      const schema = z.object({
        tags: z.array(z.string()).default(["default"]),
      });

      const { result } = renderHook(() =>
        useZodForm({
          schema,
        })
      );

      expect(result.current.fields.tags).toHaveLength(1);
      expect(result.current.fields.tags[0].value).toBe("default");

      act(() => {
        result.current.getFieldArrayHelpers("tags").add("new-tag");
      });

      expect(result.current.fields.tags).toHaveLength(2);
      expect(result.current.fields.tags[0].value).toBe("default");
      expect(result.current.fields.tags[1].value).toBe("new-tag");
    });

    test("handles optional arrays", () => {
      const schema = z.object({
        tags: z.array(z.string()).optional(),
      });

      const { result } = renderHook(() =>
        useZodForm({
          schema,
        })
      );

      act(() => {
        result.current.getFieldArrayHelpers("tags").add("first-tag");
      });

      expect(result.current.fields.tags).toHaveLength(1);
      expect(result.current.fields.tags[0].value).toBe("first-tag");
    });

    test("maintains array indices after multiple operations", () => {
      const schema = z.object({
        items: z.array(z.string()),
      });

      const { result } = renderHook(() =>
        useZodForm({
          schema,
          defaultValues: {
            items: ["one", "two", "three"],
          },
        })
      );

      // Add a new item
      act(() => {
        result.current.getFieldArrayHelpers("items").add("four");
      });

      // Remove the second item
      act(() => {
        result.current.getFieldArrayHelpers("items").remove(1);
      });

      // Add another item
      act(() => {
        result.current.getFieldArrayHelpers("items").add("five");
      });

      expect(result.current.fields.items).toHaveLength(4);
      expect(result.current.fields.items[0].value).toBe("one");
      expect(result.current.fields.items[1].value).toBe("three");
      expect(result.current.fields.items[2].value).toBe("four");
      expect(result.current.fields.items[3].value).toBe("five");
    });

    test("complex sequence of operations", () => {
      const schema = z.object({
        items: z.array(z.string()),
      });

      const { result } = renderHook(() =>
        useZodForm({
          schema,
          defaultValues: {
            items: ["A", "B", "C"],
          },
        })
      );

      // Add at index 1
      act(() => {
        result.current.getFieldArrayHelpers("items").add("X", 1);
      });
      // ["A", "X", "B", "C"]

      // Move last to first
      act(() => {
        result.current.getFieldArrayHelpers("items").move(3, 0);
      });
      // ["C", "A", "X", "B"]

      // Remove index 2
      act(() => {
        result.current.getFieldArrayHelpers("items").remove(2);
      });
      // ["C", "A", "B"]

      // Add at end
      act(() => {
        result.current.getFieldArrayHelpers("items").add("Z");
      });
      // ["C", "A", "B", "Z"]

      expect(result.current.fields.items).toHaveLength(4);
      expect(result.current.fields.items[0].value).toBe("C");
      expect(result.current.fields.items[1].value).toBe("A");
      expect(result.current.fields.items[2].value).toBe("B");
      expect(result.current.fields.items[3].value).toBe("Z");
    });

    test("handles empty array operations", () => {
      const schema = z.object({
        items: z.array(z.string()),
      });

      const { result } = renderHook(() =>
        useZodForm({
          schema,
          defaultValues: {
            items: [],
          },
        })
      );

      expect(result.current.fields.items).toHaveLength(0);

      // Add to empty array
      act(() => {
        result.current.getFieldArrayHelpers("items").add("first");
      });

      expect(result.current.fields.items).toHaveLength(1);
      expect(result.current.fields.items[0].value).toBe("first");

      // Add at index 0 (prepend)
      act(() => {
        result.current.getFieldArrayHelpers("items").add("zero", 0);
      });

      expect(result.current.fields.items).toHaveLength(2);
      expect(result.current.fields.items[0].value).toBe("zero");
      expect(result.current.fields.items[1].value).toBe("first");
    });

    test("handles removing all items one by one", () => {
      const schema = z.object({
        items: z.array(z.string()),
      });

      const { result } = renderHook(() =>
        useZodForm({
          schema,
          defaultValues: {
            items: ["A", "B", "C"],
          },
        })
      );

      act(() => {
        result.current.getFieldArrayHelpers("items").remove(0);
      });
      expect(result.current.fields.items).toHaveLength(2);

      act(() => {
        result.current.getFieldArrayHelpers("items").remove(0);
      });
      expect(result.current.fields.items).toHaveLength(1);

      act(() => {
        result.current.getFieldArrayHelpers("items").remove(0);
      });
      expect(result.current.fields.items).toHaveLength(0);
    });
  });
});

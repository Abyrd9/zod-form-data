/// <reference lib="dom" />

import { describe, expect, test } from "vitest";
import { z } from "zod";
import { useZodForm } from "../src";
import { renderHook, act } from "@testing-library/react";

describe("array field helpers", () => {
  test("adds primitive values to an array", () => {
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

  test("adds object values to an array", () => {
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
      result.current.getFieldArrayHelpers("tags").remove(1); // Remove "second"
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
      result.current.getFieldArrayHelpers("users").remove(1); // Remove Jane
    });

    expect(result.current.fields.users).toHaveLength(2);
    expect(result.current.fields.users[0].name.value).toBe("John");
    expect(result.current.fields.users[0].age.value).toBe(30);
    expect(result.current.fields.users[1].name.value).toBe("Bob");
    expect(result.current.fields.users[1].age.value).toBe(35);
  });

//   test("handles nested array fields", () => {
//     const schema = z.object({
//       groups: z.array(
//         z.object({
//           name: z.string(),
//           members: z.array(
//             z.object({
//               name: z.string(),
//               role: z.string(),
//             })
//           ),
//         })
//       ),
//     });

//     const { result } = renderHook(() =>
//       useZodForm({
//         schema,
//         defaultValues: {
//           groups: [
//             {
//               name: "Group 1",
//               members: [{ name: "John", role: "admin" }],
//             },
//           ],
//         },
//       })
//     );

//     // Add a new member to the first group
//     act(() => {
//       result.current.getFieldArrayHelpers("groups.0.members").add({
//         name: "Jane",
//         role: "user",
//       });
//     });

//     expect(result.current.fields.groups[0].members).toHaveLength(2);
//     expect(result.current.fields.groups[0].members[0].name.value).toBe("John");
//     expect(result.current.fields.groups[0].members[0].role.value).toBe("admin");
//     expect(result.current.fields.groups[0].members[1].name.value).toBe("Jane");
//     expect(result.current.fields.groups[0].members[1].role.value).toBe("user");

//     // Remove the first member
//     act(() => {
//       result.current.getFieldArrayHelpers("groups.0.members").remove(0);
//     });

//     expect(result.current.fields.groups[0].members).toHaveLength(1);
//     expect(result.current.fields.groups[0].members[0].name.value).toBe("Jane");
//     expect(result.current.fields.groups[0].members[0].role.value).toBe("user");
//   });

//   test("handles arrays with default values", () => {
//     const schema = z.object({
//       tags: z.array(z.string()).default(["default"]),
//     });

//     const { result } = renderHook(() =>
//       useZodForm({
//         schema,
//       })
//     );

//     expect(result.current.fields.tags).toHaveLength(1);
//     expect(result.current.fields.tags[0].value).toBe("default");

//     act(() => {
//       result.current.getFieldArrayHelpers("tags").add("new-tag");
//     });

//     expect(result.current.fields.tags).toHaveLength(2);
//     expect(result.current.fields.tags[0].value).toBe("default");
//     expect(result.current.fields.tags[1].value).toBe("new-tag");
//   });

//   test("handles optional arrays", () => {
//     const schema = z.object({
//       tags: z.array(z.string()).optional(),
//     });

//     const { result } = renderHook(() =>
//       useZodForm({
//         schema,
//       })
//     );

//     act(() => {
//       result.current.getFieldArrayHelpers("tags").add("first-tag");
//     });

//     expect(result.current.fields.tags).toHaveLength(1);
//     expect(result.current.fields.tags[0].value).toBe("first-tag");
//   });

//   test("maintains array indices after multiple operations", () => {
//     const schema = z.object({
//       items: z.array(z.string()),
//     });

//     const { result } = renderHook(() =>
//       useZodForm({
//         schema,
//         defaultValues: {
//           items: ["one", "two", "three"],
//         },
//       })
//     );

//     // Add a new item
//     act(() => {
//       result.current.getFieldArrayHelpers("items").add("four");
//     });

//     // Remove the second item
//     act(() => {
//       result.current.getFieldArrayHelpers("items").remove(1);
//     });

//     // Add another item
//     act(() => {
//       result.current.getFieldArrayHelpers("items").add("five");
//     });

//     expect(result.current.fields.items).toHaveLength(4);
//     expect(result.current.fields.items[0].value).toBe("one");
//     expect(result.current.fields.items[1].value).toBe("three");
//     expect(result.current.fields.items[2].value).toBe("four");
//     expect(result.current.fields.items[3].value).toBe("five");
//   });
});

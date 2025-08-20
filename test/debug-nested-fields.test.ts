import { describe, test } from "vitest";
import { z } from "zod/v4";
import { getFieldProps } from "../src";

describe("Debug getFieldProps", () => {
  test("debug simple schema", () => {
    const schema = z.object({
      name: z.string(),
      email: z.string(),
    });

    getFieldProps(schema);
  });

  test("debug record schema", () => {
    const schema = z.record(z.string(), z.number());
    
    getFieldProps(schema);
  });
});

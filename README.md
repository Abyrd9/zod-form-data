# zod-form-data

Type-safe FormData helpers for Zod v4 schemas. Convert objects to `FormData`, recover nested data from `FormData`, and validate either representation while keeping the schema’s type inference intact.

## What’s included

| Function | Description |
| --- | --- |
| `convertObjectToFormData(schema, data)` | Flattens an object that conforms to `schema` into a `FormData` instance. Numbers, booleans, and dates are stringified; blobs pass through untouched. |
| `convertFormDataToObject(schema, formData)` | Coerces a `FormData` instance back into a nested object using the schema’s field semantics. Arrays, records, unions, and discriminated unions are reconstructed automatically. |
| `parseFormData(formData, { schema })` | Coerces and validates `FormData`, returning either `{ success: true, data }` or `{ success: false, data: null, errors }`. Failures include field-level errors plus optional `form`/`global` messages. |
| `parseData(data, { schema })` | Validates plain JavaScript data against a schema, producing the same result envelope (with `form`/`global` error slots). |

The internal conversion logic understands the full Zod v4 surface area: objects, arrays, tuples, unions, discriminated unions, records, maps, sets, optional/default/nullable wrappers, lazy schemas, and more.

## Quick start

```ts
import { z } from "zod/v4";
import {
  convertObjectToFormData,
  convertFormDataToObject,
  parseFormData,
  parseData,
} from "@abyrd9/zod-form-data";

const schema = z.object({
  user: z.object({
    name: z.string(),
    age: z.number().optional(),
  }),
  tags: z.array(z.string()).default([]),
});

// Object -> FormData
const formData = convertObjectToFormData(schema, {
  user: { name: "Ada", age: 37 },
  tags: ["zod", "forms"],
});
formData.get("user.age"); // "37"

// FormData -> object
const restored = convertFormDataToObject(schema, formData);
// => { user: { name: "Ada", age: 37 }, tags: ["zod", "forms"] }

// Parse with validation
const result = parseFormData(formData, { schema });
if (result.success) {
  // result.data is typed as z.infer<typeof schema>
} else {
  // result.errors.fields contains nested field errors
  // result.errors.flattened contains dotted-path errors
  // result.errors.form / result.errors.global are optional high-level slots
}

// Parse plain objects
const fromData = parseData(restored, { schema });
```

## Parse error shape

When parsing fails, both `parseFormData` and `parseData` return:

```ts
{
  success: false;
  errors: {
    form?: string;
    global?: string;
    fields?: DeepPartial<NestedFieldErrors<Schema>>;
    flattened?: FlattenedFormErrors<Schema> & {
      form?: string;
      global?: string;
    };
  };
}
```

Use `errors.form` for form-level messages, `errors.global` for non-field errors (e.g. server failures), `errors.fields` for nested structures, and `errors.flattened` when you need dotted-path keys.

## Development

```bash
bun test
```

# zod-form-data

Type-safe utilities for building forms with Zod v4 schemas. Parse, flatten, and manage form data and errors while preserving schema intent. Includes a React hook for ergonomic field access and array helpers.

## Highlights
- Works with Zod v4 types (objects, arrays, tuples, unions, discriminated unions, records, maps, sets, lazy, optional, default, nullable)
- Parse from FormData and plain data with coercion (string → number/boolean/date, tuple elements, union options)
- Flatten/unflatten data and error structures using predictable dotted paths
- React hook `useZodForm` for field props and array helpers
- Strong TypeScript types for paths and element types (with unwrapping of optional/default/nullable)
- Exhaustive test suite

## Install
```bash
bun install
```

## Quick start
```ts
import { z } from 'zod/v4';
import { useZodForm, parseZodFormData } from '@abyrd9/zod-form-data';

const schema = z.object({
  user: z.object({
    name: z.string(),
    age: z.number().optional(),
  }),
  tags: z.array(z.string()).default([]),
  mode: z.union([z.literal('light'), z.literal('dark')])
});

// Parse from FormData
const formData = new FormData();
formData.append('user.name', 'Jane');
formData.append('user.age', '30');
formData.append('tags.0', 'typescript');
formData.append('mode', 'dark');

const parsed = parseZodFormData(formData, { schema });
// { success: true, data: { user: { name: 'Jane', age: 30 }, tags: ['typescript'], mode: 'dark' } }

// React usage
function Form() {
  const { fields, getFieldArrayHelpers, setFieldErrors } = useZodForm({ schema });

  // Example array helpers
  const tagsHelpers = getFieldArrayHelpers('tags');
  // tagsHelpers.add('new-tag');

  // fields.user.name.value, fields.user.name.error, fields.user.name.onChange(...)
  return null;
}
```

## Core API

### parseZodFormData(formData, { schema })
- Coerces types using schema (numbers, booleans, dates, tuples, unions)
- Returns `{ success: true, data }` or `{ success: false, errors }`
- Error paths follow dotted keys (e.g., `user.address.city`)

### parseZodData(data, { schema })
- Validates plain JS objects against the schema (no coercion from strings)
- Same return shape as `parseZodFormData`

### flattenZodFormSchema(schema)
- Produces a flat Zod object keyed by dotted paths
- Arrays use `#` placeholder (e.g., `tags.#`)
- Records use `*` placeholder (e.g., `metadata.*`)
- Tuples use `#` for element coercion (e.g., `coords.#`)
- Discriminated unions add the discriminator path (e.g., `data.type`)

### flattenZodFormData(schema, data)
- Flattens nested JS data using schema semantics
- Keys like `user.name`, `users.0.age`

### unflattenZodFormData(flat)
- Reconstructs nested data from flattened keys

### flattenZodFormErrors(errors)
- Flattens nested error objects to a `Map<string, string>` of dotted paths

### useZodForm({ schema, defaultValues?, errors? })
- Returns:
  - `fields`: nested structure of field props `{ name, value, onChange, error }`
  - `getFieldArrayHelpers(path)`: `{ add(value), remove(index) }`
  - `setFieldErrors(errors)`
- Strongly typed paths and element types for arrays; unwraps optional/default/nullable wrappers

## Path semantics
- Objects: `user.name`
- Arrays: `tags.0`, helpers use `'tags'`
- Records: `metadata.key`
- Tuples: `coords.0`, `coords.1` (coercion via `coords.#`)
- Discriminated union: `data.type`, plus option-specific keys

## Examples
- Boolean coercion: `"true" | "false" | "on"` → boolean
- Nullable empty string: `""` → `null` for `z.string().nullable()`
- Union leaf coercion: `z.union([z.number(), z.string()])` coerces numeric strings to numbers

## Development
```bash
# Browser dev
bun run dev
# Tests
bun test
# Build
bun run build
```

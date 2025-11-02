# Using createZodFormDataErrorSchema with ActionData

## Quick Example

```typescript
import { z } from "zod/v4";
import type { $ZodType } from "zod/v4/core";
import { 
  createZodFormDataErrorSchema,
  parseZodFormData,
  type NestedFieldErrors,
  type DeepPartial,
  type ZodFormDataParseResultSuccess,
  type ZodFormDataParseResultError,
} from "@abyrd9/zod-form-data";

// Your data schema
const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  age: z.number().min(18, "Must be 18+"),
});

// Create the error schema
const userErrorSchema = createZodFormDataErrorSchema(userSchema);

// Build your ActionData schema
const actionDataErrorSchema = z.object({
  status: z.literal("error"),
  payload: z.optional(z.null()),
  errors: z.optional(
    z.intersection(
      userErrorSchema, // ← Generated error schema
      z.object({
        form: z.optional(z.nullable(z.string())),
        global: z.optional(z.nullable(z.string())),
      })
    )
  ),
});

const actionDataOkSchema = z.object({
  status: z.literal("ok"),
  payload: userSchema,
  errors: z.optional(z.null()),
});

// Use in your action
export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  
  const result = parseZodFormData(formData, { schema: userSchema });
  
  if (!result.success) {
    // result.errors is typed as ZodFormDataParseResultError<typeof userSchema>
    // which is DeepPartial<NestedFieldErrors<typeof userSchema>>
    const errorResponse = {
      status: "error" as const,
      payload: null,
      errors: {
        ...result.errors,
        form: undefined,
        global: "Please fix the errors above",
      },
    };
    
    // Validate the response matches the schema
    return actionDataErrorSchema.parse(errorResponse);
  }
  
  // result.data is typed as ZodFormDataParseResultSuccess<typeof userSchema>
  // which is z.infer<typeof userSchema>
  const okResponse = {
    status: "ok" as const,
    payload: result.data,
    errors: null,
  };
  
  return actionDataOkSchema.parse(okResponse);
}
```

## Type-level Types Available

```typescript
// Get the success data type
type UserData = ZodFormDataParseResultSuccess<typeof userSchema>;
// = { name: string; email: string; age: number }

// Get the error structure type  
type UserErrors = ZodFormDataParseResultError<typeof userSchema>;
// = DeepPartial<NestedFieldErrors<typeof userSchema>>
// = { name?: string | null; email?: string | null; age?: string | null }
```

## Full Type Definition

```typescript
type ZodFormDataParseResultSuccess<T extends $ZodType> = z.infer<T>;

type ZodFormDataParseResultError<T extends $ZodType> = 
  DeepPartial<NestedFieldErrors<T>>;
```

## Benefits

1. **Runtime Validation** - `createZodFormDataErrorSchema` generates a Zod schema you can use with `.parse()` or `.safeParse()`
2. **Type Safety** - Error structure matches exactly what `parseZodFormData` returns
3. **Flexibility** - Add your own error fields (like `form` and `global`) via intersection
4. **Autocomplete** - Full TypeScript inference for error field names
5. **Consistency** - No manual type definitions that can drift


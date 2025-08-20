import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { useZodForm } from './index';
import { z } from 'zod/v4';

// Example form component for debugging
function TestForm() {
  // Recursive (lazy) type
  const Tree: z.ZodType<any> = z.lazy(() => z.object({
    name: z.string(),
    children: z.array(Tree)
  }));

  // Discriminated union variants
  const Content = z.discriminatedUnion('type', [
    z.object({ type: z.literal('text'), body: z.string() }),
    z.object({ type: z.literal('image'), url: z.string().url(), caption: z.string().optional() }),
    z.object({ type: z.literal('number'), value: z.number() }),
  ]);

  // Comprehensive schema covering most Zod features used in the library
  const complexSchema = z.object({
    // primitives
    id: z.string(),
    active: z.boolean().default(true),
    count: z.number().min(0).optional(),
    createdAt: z.date(),
    big: z.bigint().optional(),

    // literals and enums
    literalField: z.literal('hello'),
    role: z.enum(['admin', 'user', 'moderator']).default('admin'),
    status: z.union([z.literal('active'), z.literal('inactive')]),

    // objects, nested objects, optional/nullable/default
    profile: z.object({
      name: z.string(),
      email: z.string().email().optional(),
      phone: z.string().nullable(),
      address: z.object({
        street: z.string(),
        city: z.string(),
        zip: z.string().length(5),
      }),
    }),

    // arrays (primitive and object), optional/default arrays
    tags: z.array(z.string()).default([]),
    users: z.array(z.object({
      name: z.string(),
      age: z.number(),
      contact: z.object({
        email: z.string().email().optional(),
        phones: z.array(z.string()).optional(),
      }).default({}),
    })),

    // records, maps, sets
    metadata: z.record(z.string(), z.string()).default({}),
    scores: z.map(z.string(), z.number()).default(new Map()),
    labels: z.set(z.string()).default(new Set()),

    // tuples
    coords: z.tuple([z.number(), z.number()]),

    // discriminated union and standard union
    content: Content,
    misc: z.union([z.string(), z.number(), z.boolean()]),

    // optional + default chaining and nullable default
    optionalDefault: z.string().optional().default('default-value'),
    nullableDefault: z.string().nullable().default('ok'),

    // transform / pipe / catch / success / promise / file / custom
    upperName: z.string().transform((v) => v.toUpperCase()),
    stringToNumber: z.string().transform((v) => Number(v)).pipe(z.number()),
    alphaOnly: z.string().regex(/^[a-z]+$/).catch('fallback'),
    successField: z.success(z.string()),
    asyncText: z.promise(z.string()),
    document: z.file().optional(),
    customField: z.custom<string>((v) => typeof v === 'string' && v.length > 0),

    // nested arrays
    groups: z.array(z.object({
      name: z.string(),
      members: z.array(z.object({
        name: z.string(),
        role: z.string(),
      })),
    })),

    // lazy recursive
    tree: Tree,
  });

  const { fields, getFieldArrayHelpers, setFieldErrors } = useZodForm({
    schema: complexSchema,
    defaultValues: {
      id: 'id-1',
      createdAt: new Date(),
    },
  });

  return null;
}

// Mount the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<TestForm />);
} else {
  console.error('Root element not found');
}

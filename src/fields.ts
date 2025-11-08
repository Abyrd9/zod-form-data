import { z } from "zod/v4";

/**
 * Field Definition Schemas
 *
 * These schemas define the structure of custom fields that can be attached to
 * items (pipeline data) or pipelines (pipeline metadata).
 *
 * Each field type has its own schema with type-specific properties.
 */

export enum FieldTypeEnum {
	text = "text",
	textarea = "textarea",
	number = "number",
	currency = "currency",
	percentage = "percentage",
	date = "date",
	datetime = "datetime",
	boolean = "boolean",
	dropdown = "dropdown",
	multiselect = "multiselect",
	url = "url",
	email = "email",
	phone = "phone",
	user = "user",
}

export const FieldTypeEnumSchema = z.enum([
	FieldTypeEnum.text,
	FieldTypeEnum.textarea,
	FieldTypeEnum.number,
	FieldTypeEnum.currency,
	FieldTypeEnum.percentage,
	FieldTypeEnum.date,
	FieldTypeEnum.datetime,
	FieldTypeEnum.boolean,
	FieldTypeEnum.dropdown,
	FieldTypeEnum.multiselect,
	FieldTypeEnum.url,
	FieldTypeEnum.email,
	FieldTypeEnum.phone,
	FieldTypeEnum.user,
]);

// ----------------------------------------------------------------------------
// Shared helpers and base schema
// ----------------------------------------------------------------------------

export const MachineNameSchema = z.string().regex(/^[a-z][a-z0-9_]*$/, {
	message:
		"Must start with a letter and contain only lowercase letters, numbers, and underscores",
});

const StepIdSchema = z.string();
const RoleIdSchema = z.string();

export const StepScopeSchema = z.union([
	z.literal("all"),
	z.array(StepIdSchema).min(1),
]);

/**
 * Common metadata shared across all field types.
 * Note: id is optional here; it can be generated server-side.
 */
export const FieldBaseSchema = z.object({
	id: z.string().optional(),
	name: MachineNameSchema, // Machine-safe unique name within a template

	// UI
	label: z.string().optional(),
	help_text: z.string().optional(),
	category: z.string().optional(),
	display_order: z.number().default(0),

	// Validation / display
	is_required: z.boolean().default(false),
	is_read_only: z.boolean().default(false),

	// Visibility/behavior controls by step and role
	visibleOnSteps: StepScopeSchema.optional(),
	requiredOnSteps: StepScopeSchema.optional(),
	editableOnSteps: StepScopeSchema.optional(),
	readableRoles: z.array(RoleIdSchema).optional(),
	writableRoles: z.array(RoleIdSchema).optional(),

	// Computed / audit controls
	computed: z.boolean().default(false).optional(),
	formula: z.string().optional(),
	is_audited: z.boolean().default(false).optional(),
	is_immutable_after_step: StepIdSchema.optional(),
});

// ============================================================================
// Text Field
// ============================================================================
export const TextFieldSchema = FieldBaseSchema.extend({
	type: z.literal(FieldTypeEnum.text),
	name: MachineNameSchema, // override doc clarity
	value: z.string().optional(),

	// UI
	placeholder: z.string().optional(),
	initial_value: z.string().optional(), // kept for legacy; prefer default_value
	default_value: z.string().optional(),

	// Validation
	min_length: z.number().optional(),
	max_length: z.number().optional(),
	pattern: z.string().optional(), // Regex pattern
});

// ============================================================================
// Textarea Field
// ============================================================================
export const TextareaFieldSchema = FieldBaseSchema.extend({
	type: z.literal(FieldTypeEnum.textarea),
	name: MachineNameSchema,
	value: z.string().optional(),

	// UI
	placeholder: z.string().optional(),
	initial_value: z.string().optional(), // kept for legacy; prefer default_value
	default_value: z.string().optional(),
	rows: z.number().default(4), // Textarea height in rows
	min_length: z.number().optional(),
	max_length: z.number().optional(),
});

// ============================================================================
// Number Field
// ============================================================================
export const NumberFieldSchema = FieldBaseSchema.extend({
	type: z.literal(FieldTypeEnum.number),
	name: MachineNameSchema,
	value: z.number().optional(),

	// UI
	placeholder: z.string().optional(),
	initial_value: z.number().optional(), // kept for legacy; prefer default_value
	default_value: z.number().optional(),
	suffix: z.string().optional(), // e.g., "items", "users"
	format: z.enum(["integer", "decimal"]).default("decimal"),

	// Validation
	min_value: z.number().optional(),
	max_value: z.number().optional(),
	step: z.number().default(1),
});

// ============================================================================
// Currency Field
// ============================================================================
export const CurrencyFieldSchema = FieldBaseSchema.extend({
	type: z.literal(FieldTypeEnum.currency),
	name: MachineNameSchema,
	value: z.number().optional(), // Stored in cents

	// UI
	placeholder: z.string().optional(),
	initial_value: z.number().optional(), // kept for legacy; prefer default_value
	default_value: z.number().optional(),
	currency_code: z.string().default("USD"), // ISO 4217

	// Validation
	min_value: z.number().optional(),
	max_value: z.number().optional(),
});

// ============================================================================
// Percentage Field
// ============================================================================
export const PercentageFieldSchema = FieldBaseSchema.extend({
	type: z.literal(FieldTypeEnum.percentage),
	name: MachineNameSchema,
	value: z.number().optional(), // Stored as decimal (e.g., 25.5)

	// UI
	placeholder: z.string().optional(),
	initial_value: z.number().optional(), // kept for legacy; prefer default_value
	default_value: z.number().optional(),

	// Validation
	min_value: z.number().default(0),
	max_value: z.number().default(100),
	step: z.number().default(1),
});

// ============================================================================
// Date Field
// ============================================================================
export const DateFieldSchema = FieldBaseSchema.extend({
	type: z.literal(FieldTypeEnum.date),
	name: MachineNameSchema,
	value: z.string().optional(), // ISO date string (YYYY-MM-DD)

	// UI
	placeholder: z.string().optional(),
	initial_value: z.string().optional(), // kept for legacy; prefer default_value
	default_value: z.string().optional(),

	// Validation
	min_date: z.string().optional(), // ISO date string
	max_date: z.string().optional(), // ISO date string
});

// ============================================================================
// DateTime Field
// ============================================================================
export const DateTimeFieldSchema = FieldBaseSchema.extend({
	type: z.literal(FieldTypeEnum.datetime),
	name: MachineNameSchema,
	value: z.string().optional(), // ISO 8601 string

	// UI
	placeholder: z.string().optional(),
	initial_value: z.string().optional(), // kept for legacy; prefer default_value
	default_value: z.string().optional(),

	// Validation
	min_datetime: z.string().optional(),
	max_datetime: z.string().optional(),
});

// ============================================================================
// Boolean Field
// ============================================================================
export const BooleanFieldSchema = FieldBaseSchema.extend({
	type: z.literal(FieldTypeEnum.boolean),
	name: MachineNameSchema,
	value: z.boolean().optional(),

	// UI
	initial_value: z.boolean().optional(), // kept for legacy; prefer default_value
	default_value: z.boolean().optional(),
});

// ============================================================================
// Dropdown Field (Single Select)
// ============================================================================
export const DropdownOptionSchema = z.object({
	value: z.string(),
	label: z.string(),
	color: z.string().optional(),
});

export const DropdownFieldSchema = FieldBaseSchema.extend({
	type: z.literal(FieldTypeEnum.dropdown),
	name: MachineNameSchema,
	value: z.string().optional(), // Selected option value

	// UI
	placeholder: z.string().optional(),
	initial_value: z.string().optional(), // kept for legacy; prefer default_value
	default_value: z.string().optional(),

	// Options
	options: z.array(DropdownOptionSchema),
	allow_custom: z.boolean().default(false),

	// Validation
});

// ============================================================================
// Multiselect Field (Multiple Select)
// ============================================================================
export const MultiselectFieldSchema = FieldBaseSchema.extend({
	type: z.literal(FieldTypeEnum.multiselect),
	name: MachineNameSchema,
	value: z.array(z.string()).optional(), // Selected option values

	// UI
	placeholder: z.string().optional(),
	initial_value: z.array(z.string()).optional(), // kept for legacy; prefer default_value
	default_value: z.array(z.string()).optional(),

	// Options
	options: z.array(DropdownOptionSchema),
	allow_custom: z.boolean().default(false),

	// Validation
	min_selections: z.number().optional(),
	max_selections: z.number().optional(),
});

// ============================================================================
// URL Field
// ============================================================================
export const UrlFieldSchema = FieldBaseSchema.extend({
	type: z.literal(FieldTypeEnum.url),
	name: MachineNameSchema,
	value: z.string().url().optional(),

	// UI
	placeholder: z.string().optional(),
	initial_value: z.string().url().optional(), // kept for legacy; prefer default_value
	default_value: z.string().url().optional(),

	// Validation
	pattern: z.string().optional(), // Custom URL pattern
});

// ============================================================================
// Email Field
// ============================================================================
export const EmailFieldSchema = FieldBaseSchema.extend({
	type: z.literal(FieldTypeEnum.email),
	name: MachineNameSchema,
	value: z.string().email().optional(),

	// UI
	placeholder: z.string().optional(),
	initial_value: z.string().email().optional(), // kept for legacy; prefer default_value
	default_value: z.string().email().optional(),
});

// ============================================================================
// Phone Field
// ============================================================================
export const PhoneFieldSchema = FieldBaseSchema.extend({
	type: z.literal(FieldTypeEnum.phone),
	name: MachineNameSchema,
	value: z.string().optional(),

	// UI
	placeholder: z.string().optional(),
	initial_value: z.string().optional(), // kept for legacy; prefer default_value
	default_value: z.string().optional(),

	// Validation
	pattern: z.string().optional(), // Phone format pattern
});

// ============================================================================
// User Field (Reference to Account)
// ============================================================================
export const UserFieldSchema = FieldBaseSchema.extend({
	type: z.literal(FieldTypeEnum.user),
	name: MachineNameSchema,
	value: z.string().optional(), // account_id

	// UI
	placeholder: z.string().optional(),
	initial_value: z.string().optional(), // kept for legacy; prefer default_value
	default_value: z.string().optional(),
});

// ============================================================================
// Field Definition Union (Discriminated Union)
// ============================================================================
export const FieldDefinitionSchema = z.discriminatedUnion("type", [
	TextFieldSchema,
	TextareaFieldSchema,
	NumberFieldSchema,
	CurrencyFieldSchema,
	PercentageFieldSchema,
	DateFieldSchema,
	DateTimeFieldSchema,
	BooleanFieldSchema,
	DropdownFieldSchema,
	MultiselectFieldSchema,
	UrlFieldSchema,
	EmailFieldSchema,
	PhoneFieldSchema,
	UserFieldSchema,
]);

export type FieldDefinition = z.infer<typeof FieldDefinitionSchema>;

// Individual field types
export type TextField = z.infer<typeof TextFieldSchema>;
export type TextareaField = z.infer<typeof TextareaFieldSchema>;
export type NumberField = z.infer<typeof NumberFieldSchema>;
export type CurrencyField = z.infer<typeof CurrencyFieldSchema>;
export type PercentageField = z.infer<typeof PercentageFieldSchema>;
export type DateField = z.infer<typeof DateFieldSchema>;
export type DateTimeField = z.infer<typeof DateTimeFieldSchema>;
export type BooleanField = z.infer<typeof BooleanFieldSchema>;
export type DropdownField = z.infer<typeof DropdownFieldSchema>;
export type MultiselectField = z.infer<typeof MultiselectFieldSchema>;
export type UrlField = z.infer<typeof UrlFieldSchema>;
export type EmailField = z.infer<typeof EmailFieldSchema>;
export type PhoneField = z.infer<typeof PhoneFieldSchema>;
export type UserField = z.infer<typeof UserFieldSchema>;
export type DropdownOption = z.infer<typeof DropdownOptionSchema>;

// ============================================================================
// Field Scope (where fields are used)
// ============================================================================
export const FieldScopeEnum = z.enum([
	"item", // Attached to items (the things moving through pipeline)
	"pipeline", // Attached to pipeline instances (metadata for entire pipeline)
]);

export type FieldScope = z.infer<typeof FieldScopeEnum>;

// ============================================================================
// Fields Definition (Template) and Layout
// ============================================================================

export const FieldLayoutSectionSchema = z.object({
	title: z.string().optional(),
	fields: z.array(MachineNameSchema),
});

export const FieldsLayoutSchema = z.record(
	z.string(), // step_template_id
	z.object({
		sections: z.array(FieldLayoutSectionSchema).default([]),
	}),
);

export const FieldsDefinitionSchema = z.object({
	version: z.number().int().positive().default(1),
	fields: z.array(FieldDefinitionSchema),
	layout: FieldsLayoutSchema.optional(),
});

export type FieldLayoutSection = z.infer<typeof FieldLayoutSectionSchema>;
export type FieldsLayout = z.infer<typeof FieldsLayoutSchema>;
export type FieldsDefinition = z.infer<typeof FieldsDefinitionSchema>;

// ============================================================================
// Helper Types for Field Values Storage
// ============================================================================

// What gets stored in JSONB columns
export type FieldValue =
	| string // text, textarea, url, email, phone, user, dropdown, date, datetime
	| number // number, currency, percentage
	| boolean // boolean
	| string[] // multiselect
	| null
	| undefined;

export type FieldValues = Record<string, FieldValue>;

// Field value schema for validation
export const FieldValueSchema = z.union([
	z.string(),
	z.number(),
	z.boolean(),
	z.array(z.string()),
	z.null(),
	z.undefined(),
]);

export const FieldValuesSchema = z.record(z.string(), FieldValueSchema);

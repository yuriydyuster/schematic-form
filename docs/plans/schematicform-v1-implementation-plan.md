# SchematicForm V1 Implementation Plan

## Summary

Build SchematicForm as a greenfield React-first component library using HeroUI v3, React 19, Tailwind CSS v4, TypeScript, Vite library mode, Ajv validation, Vitest/React Testing Library, Chrome DevTools MCP browser acceptance tests, and Storybook.

V1 will target a working publishable package and local demo, but will not include npm publishing automation yet.

- Default package name: `@schematic-form/react`
- Default license: Apache-2.0
- Deferred: custom elements, Zod/Yup adapters, dependency/branching logic beyond the specified `oneOf`/`anyOf` dropdown behavior, semantic-release, and npm publishing

## Key Changes

- Scaffold a Vite + React 19 + TypeScript library workspace with `src/index.ts`, `src/SchematicForm.tsx`, library build output to `dist`, a demo/playground, and Storybook.
- Add HeroUI v3 dependencies with runtime peer dependencies for `react`, `react-dom`, and `@heroui/react`.
- Document Tailwind v4 style setup, including import order: `tailwindcss` before `@heroui/styles`.
- Use Ajv as the validation engine with `ajv-formats`, `allErrors: true`, schema validation enabled, and strict handling for unsupported schema keywords.
- Do not introduce `uiSchema` in V1; renderer behavior is derived from JSON Schema fields and the explicit SchematicForm rules in this plan.
- Render every field at `width: 100%` of the available container width.
- Wrap every object and array level in a same-level HeroUI `Surface` using the transparent variant, with nested objects and arrays also wrapped in a `Fieldset` for that level.

## Public API

Expose one primary component plus supporting types:

```ts
export type ValidationMode = "change" | "blur" | "submit" | "hybrid";

export type SchematicFormState<TData = unknown> = {
  data: TData;
  isValid: boolean;
  errors: string[];
};

export type SchematicFormProps<TData = unknown> = {
  schema: object;
  value?: TData;
  defaultValue?: TData;
  onChange?: (data: TData) => void;
  onStateChange?: (state: SchematicFormState<TData>) => void;
  onSubmit?: (state: SchematicFormState<TData>, event: React.FormEvent) => void;
  validationMode?: ValidationMode;
  messages?: Partial<Record<string, string>>;
  className?: string;
  readOnly?: boolean;
  disabled?: boolean;
  fieldRenderer?: (ctx: FieldRenderContext) => React.ReactNode;
  errorFormatter?: (issue: ValidationIssue) => string;
};
```

V1 public state must always include `data`, `isValid`, and `errors[]`.

## Implementation

- Create schema normalization and render-model layers for `object`, `array`, `string`, `number`, `integer`, `boolean`, `null`, `enum`, `required`, supported formats, basic constraints, `oneOf`, `anyOf`, `propertyOrdering`, and array `uniqueItems` for enum string arrays.
- Ignore all branching/dependency logic not explicitly included in V1. Do not implement `dependencies`, `dependentRequired`, `dependentSchemas`, `if`/`then`/`else`, or advanced `allOf` behavior in this release.
- Resolve labels from `title` first and property-key fallback second.
- Render fields in object insertion order unless `propertyOrdering` is present; when present, render listed keys first in that order, then render unlisted keys in their original object order.
- Show `description` above its field or group whenever present.
- Render with HeroUI React components:
  - every object and array level -> transparent `Surface` containing a same-level `Fieldset`
  - `object` -> recursive `Fieldset` group
  - `array` -> repeatable rows with stable internal row IDs and an `Add {label}` button when the schema accepts a new element
  - `string` -> `TextField` + `TextArea` by default when no `format` is specified and `maxLength` is less than 256 or not specified
  - formatted `string` -> format-specific field for only `date`, `time`, `date-time`, `email`, and `uri`
  - `number` / `integer` -> `NumberField`
  - `integer` with both `minimum` and `maximum` -> horizontal `Slider`
  - `boolean` -> `Checkbox`
  - `type: "null"` -> dummy display-only title and description using `Typography` (`h4` for title, body for description), excluded from form data state
  - string/number `enum` with fewer than 6 options -> `RadioGroup`
  - string/number `enum` with 6 or more options -> dropdown
  - array of enum strings with fewer than 6 options -> `CheckboxGroup`
  - array of enum strings with 6 or more options -> multiselect dropdown
  - dropdown-selected values -> rendered by the HeroUI select value only; no separate `TagGroup`
  - `oneOf` and `anyOf` -> dropdown branch selector using branch titles; treat `anyOf` as `oneOf` for V1
- Respect `uniqueItems` only for arrays whose `items` are enum strings.
- Keep validation separate from rendering:
  - Ajv determines validity.
  - HeroUI receives `isInvalid`, `isRequired`, labels, descriptions, and `FieldError`.
  - `Form` uses `validationBehavior="aria"` so JSON Schema validation controls truth.
- Add state management for controlled and uncontrolled usage, nested path get/set, touched/dirty tracking, per-field validation issue lookup, and array row identity.
- Add accessibility behavior for labels, semantic required state, text-associated inline errors, first-invalid-field focus on submit, and an error summary when validation fails.

## Deferred Features

- Native custom element adapter package
- True `anyOf` semantics and advanced branch/dependency logic
- `dependencies`, `dependentRequired`, `dependentSchemas`, and `if`/`then`/`else`
- Advanced `allOf` behavior
- `$ref` resolution beyond local/simple cases
- Async business validation hook
- `ajv-i18n` localization
- semantic-release and npm publishing
- Zod/Yup adapters

## Test Plan

- Unit tests:
  - schema normalization
  - path get/set utilities
  - Ajv error formatting into `ValidationIssue` and public `errors[]`
  - required and constraint handling
  - array add/remove/reorder preserving sibling values
  - `propertyOrdering` field order
  - `type: "null"` dummy field exclusion from data state
  - `oneOf`/`anyOf` dropdown branch selection with `anyOf` treated as `oneOf`
  - `uniqueItems` enforcement for enum string arrays
- React Testing Library integration tests:
  - primitive fields render with labels
  - required errors appear after submit or configured validation mode
  - nested object fieldsets render correctly
  - all fields use the available width
  - all object and array levels render transparent `Surface` plus `Fieldset`
  - descriptions render above fields
  - enum fields choose `RadioGroup`, dropdown, `CheckboxGroup`, or multiselect dropdown according to option count and array shape
  - dropdown selections render through the HeroUI select value without separate tags
  - integer min/max fields render as horizontal sliders
  - controlled and uncontrolled modes both emit `onStateChange`
- Chrome DevTools MCP browser acceptance tests:
  - demo page loads
  - invalid submit focuses first invalid field
  - array rows can be added, edited, reordered, and removed
  - keyboard-accessible enum controls work in a real browser
  - nested object and array levels preserve full-width layout without overlap
  - branch selector switches between titled `oneOf`/`anyOf` branches
- Storybook stories:
  - primitive fields
  - nested object
  - array of primitives
  - array of objects
  - enum select/radio
  - enum checkbox/multiselect
  - oneOf/anyOf branch selector
  - type null dummy title/description block
  - integer slider
  - validation errors
  - disabled/read-only form

## Assumptions

- Use `npm` unless the repo is later initialized with another package manager.
- Use Vitest instead of Jest because this is a greenfield Vite library.
- Use HeroUI v3 React components directly; no custom elements in V1.
- Treat schemas as trusted application input for V1.
- Treat `anyOf` as `oneOf` intentionally in V1.
- Treat the multiline default for unformatted strings with `maxLength < 256` or unspecified literally as requested.
- Treat `propertyOrdering` and display-only `type: "null"` dummy fields as SchematicForm-supported schema conventions that must be documented.

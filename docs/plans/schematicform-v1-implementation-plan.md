# SchematicForm V1 Implementation Plan

## Summary

Build SchematicForm as a greenfield React-first component library using HeroUI v3, React 19, Tailwind CSS v4, TypeScript, Vite library mode, Ajv validation, Vitest/React Testing Library, Playwright, and Storybook.

V1 will target a working publishable package and local demo, but will not include npm publishing automation yet.

- Default package name: `@schematic-form/react`
- Default license: MIT
- Deferred: custom elements, Zod/Yup adapters, full union UX, semantic-release, and npm publishing

## Key Changes

- Scaffold a Vite + React 19 + TypeScript library workspace with `src/index.ts`, `src/SchematicForm.tsx`, library build output to `dist`, a demo/playground, and Storybook.
- Add HeroUI v3 dependencies with runtime peer dependencies for `react`, `react-dom`, and `@heroui/react`.
- Document Tailwind v4 style setup, including import order: `tailwindcss` before `@heroui/styles`.
- Use Ajv as the validation engine with `ajv-formats`, `allErrors: true`, schema validation enabled, and strict handling for UI metadata.
- Keep UI hints in `uiSchema`, not embedded schema keys.

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
  uiSchema?: Record<string, unknown>;
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

- Create schema normalization and render-model layers for `object`, `array`, `string`, `number`, `integer`, `boolean`, `enum`, `required`, formats, and basic constraints.
- Normalize draft `dependencies` into internal `dependentRequired` handling where possible.
- Resolve labels from `title`, property-key fallback, and `uiSchema` labels.
- Render with HeroUI React components:
  - `object` -> `Fieldset`
  - `array` -> repeatable rows with add/remove/reorder controls and stable internal row IDs
  - `string` -> `TextField` + `Input`, or `TextArea` when `uiSchema` requests multiline
  - `number` / `integer` -> `NumberField`
  - `boolean` -> `Checkbox`
  - `enum` -> `RadioGroup` for small option sets, `Select` for larger option sets
- Keep validation separate from rendering:
  - Ajv determines validity.
  - HeroUI receives `isInvalid`, `isRequired`, labels, descriptions, and `FieldError`.
  - `Form` uses `validationBehavior="aria"` so JSON Schema validation controls truth.
- Add state management for controlled and uncontrolled usage, nested path get/set, touched/dirty tracking, per-field validation issue lookup, and array row identity.
- Add accessibility behavior for labels, semantic required state, text-associated inline errors, first-invalid-field focus on submit, and an error summary when validation fails.

## Deferred Features

- Native custom element adapter package
- `oneOf`, `anyOf`, and advanced `allOf` branch UX
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
- React Testing Library integration tests:
  - primitive fields render with labels
  - required errors appear after submit or configured validation mode
  - nested object fieldsets render correctly
  - enum fields choose `RadioGroup` or `Select`
  - controlled and uncontrolled modes both emit `onStateChange`
- Playwright tests:
  - demo page loads
  - invalid submit focuses first invalid field
  - array rows can be added, edited, reordered, and removed
  - keyboard-accessible enum controls work in a real browser
- Storybook stories:
  - primitive fields
  - nested object
  - array of primitives
  - array of objects
  - enum select/radio
  - validation errors
  - disabled/read-only form

## Assumptions

- Use `npm` unless the repo is later initialized with another package manager.
- Use Vitest instead of Jest because this is a greenfield Vite library.
- Use HeroUI v3 React components directly; no custom elements in V1.
- Treat schemas as trusted application input for V1.
- Keep `uiSchema` as the only supported place for UI-specific hints.

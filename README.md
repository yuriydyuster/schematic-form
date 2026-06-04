# SchematicForm

SchematicForm is a React-first JSON Schema form renderer built with HeroUI v3. You give it a supported JSON Schema-shaped object, and it renders a working form, tracks form data, validates with Ajv, and can optionally save unfinished drafts in browser storage.

This repository contains the component library package `@schematic-form/react`. The local demo app exists to exercise and test the library during development.

## What It Does

SchematicForm helps application teams turn a data contract into a form without writing every field by hand.

- It renders objects, arrays, strings, numbers, booleans, enums, dates, and branch choices from schema.
- It validates submitted and edited data with Ajv.
- It emits the current data and validation state through callbacks.
- It supports controlled and uncontrolled React usage.
- It can persist uncontrolled drafts to `localStorage`, `sessionStorage`, or a custom storage adapter.
- It keeps `oneOf` and `anyOf` branch choices user-friendly by using dropdown selectors.

## Installing The Package In An App

```bash
npm install @schematic-form/react @heroui/react @heroui/styles react react-dom
```

HeroUI v3 expects React 19+ and Tailwind CSS v4. Import styles in this order:

```css
@import "tailwindcss";
@import "@heroui/styles";
@import "@schematic-form/react/styles.css";
```

## Basic Usage

```tsx
import {SchematicForm} from "@schematic-form/react";
import "@schematic-form/react/styles.css";

const schema = {
  type: "object",
  title: "Profile",
  required: ["name"],
  properties: {
    intro: {
      type: "null",
      title: "Public profile",
      description: "This display-only field is not included in form data.",
    },
    name: {
      type: "string",
      title: "Name",
      minLength: 1,
    },
    email: {
      type: "string",
      title: "Email",
      format: "email",
    },
  },
};

export function ProfileForm() {
  return (
    <SchematicForm
      schema={schema}
      persistence={{key: "profile-draft"}}
      onStateChange={({data, isValid, errors}) => {
        console.log({data, isValid, errors});
      }}
      onSubmit={({data, isValid}) => {
        if (isValid) console.log("Submit", data);
      }}
    />
  );
}
```

## Quick Start For Contributors

Prerequisites:

- Node.js compatible with Vite 7, such as Node 20.19+ or a current Node 22+ release.
- npm.

Install dependencies:

```bash
npm install
```

Run the local demo:

```bash
npm run dev
```

Open the local Vite URL printed in the terminal, usually `http://127.0.0.1:5173/`.

Run automated tests:

```bash
npm test
```

Typecheck:

```bash
npm run lint
```

Build the library:

```bash
npm run build
```

## Main Props

| Prop | Purpose |
| --- | --- |
| `schema` | Required JSON Schema-shaped object that drives rendering and validation. |
| `value` | Controlled data value. When provided, the parent owns data updates. |
| `defaultValue` | Initial uncontrolled data value. |
| `onChange` | Called with data whenever a field changes. |
| `onStateChange` | Called with `{data, isValid, errors}` after validation state changes. |
| `onSubmit` | Called with `{data, isValid, errors}` and the form event after submit. |
| `validationMode` | `"change"`, `"blur"`, `"submit"`, or `"hybrid"`; defaults to `"hybrid"`. |
| `messages` | Overrides button labels and error summary text. |
| `readOnly` / `disabled` | Applies read-only or disabled state to rendered controls. |
| `persistence` | Enables draft storage for uncontrolled forms. |
| `fieldRenderer` | Optional custom renderer hook for individual fields. |
| `errorFormatter` | Optional formatter for validation issue messages. |

## Supported Schema Behavior

SchematicForm Beta intentionally supports a clear subset of JSON Schema:

| Schema feature | Rendered behavior |
| --- | --- |
| `type: "object"` | Nested field group inside a transparent HeroUI surface. |
| `type: "array"` | Repeatable rows with add, move, and remove buttons. |
| `type: "string"` | Single-line input by default. |
| Long unformatted string | Text area when `minLength` or `maxLength` is greater than `255`. |
| `format: "email"` | Email input semantics. |
| `format: "uri"` | URL input semantics. |
| `format: "date"` | HeroUI date picker. |
| `format: "date-time"` | HeroUI date picker with minute granularity. |
| `format: "time"` | HeroUI time field. |
| `type: "number"` / `type: "integer"` | Number field. |
| Integer with `minimum` and `maximum` | Slider. |
| `type: "boolean"` | Switch. |
| Scalar `enum` with fewer than six options | Radio group. |
| Scalar `enum` with six or more options | Dropdown. |
| Array of string enum with fewer than six options | Checkbox group. |
| Array of string enum with six or more options | Multiselect dropdown. |
| `type: "null"` | Display-only title/description block, excluded from form data. |
| `oneOf` / `anyOf` | Branch dropdown using branch titles. Beta treats `anyOf` as `oneOf`. |
| `propertyOrdering` | Local convention for field order within objects. |

Unsupported or intentionally ignored in Beta:

- custom field styling and formatting
- true `anyOf` semantics
- `dependencies`, `dependentRequired`, `dependentSchemas`
- `if`, `then`, `else`
- advanced `allOf`
- remote `$ref` resolution
- async business validation

## Draft Persistence

The `persistence` prop is optional. It works only for uncontrolled forms because controlled forms must keep the parent-provided `value` as the source of truth.

```tsx
<SchematicForm
  schema={schema}
  persistence={{
    key: "profile-draft",
    storage: "localStorage",
    debounceMs: 250,
    clearOnValidSubmit: true,
  }}
/>
```

Defaults:

- `storage`: `"localStorage"`
- `debounceMs`: `250`
- `clearOnValidSubmit`: `true`

Persisted drafts include a schema fingerprint. If the schema changes, old drafts are ignored instead of being loaded into a different form shape.

## Validation

Ajv is the validation engine. SchematicForm sanitizes the schema before validation so local rendering conventions match data rules:

- Display-only `type: "null"` properties are excluded.
- `anyOf` is validated as `oneOf`.
- Unsupported string formats are ignored.
- Dependency and conditional keywords are ignored in Beta.

Public state always has this shape:

```ts
type SchematicFormState<TData = unknown> = {
  data: TData;
  isValid: boolean;
  errors: string[];
};
```

## Development Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the Vite demo server. |
| `npm test` | Runs Vitest tests once. |
| `npm run test:watch` | Runs Vitest in watch mode. |
| `npm run lint` | Runs TypeScript checks without emitting files. |
| `npm run typecheck` | Same TypeScript check as `lint`. |
| `npm run build` | Builds declarations and the library bundle. |
| `npm run build:storybook` | Builds static Storybook output. |
| `npm run dev:acceptance` | Starts the Vite server for manual browser acceptance. |
| `npm run test:acceptance:install` | Installs the Chromium browser binary used by Playwright. |
| `npm run test:acceptance` | Runs automated Playwright browser acceptance tests against the demo. |

## Package Verification

```bash
npm run lint
npm test
npm run build
npm pack --dry-run
```

## Project Structure

```text
src/
  SchematicForm.tsx       Main component and renderer
  schema.ts               Schema interpretation helpers
  validation.ts           Ajv integration
  persistence.ts          Draft storage helpers
  branchMetadata.ts       Branch pointer rebasing
  paths.ts                Nested path utilities
  types.ts                Public and internal types
  sampleSchemas.ts        Demo/test schemas
demo/
  main.tsx                Local demo app
tests/
  browser/                Playwright acceptance tests
  setup.ts                jsdom browser API shims
playwright.config.ts      Browser acceptance test configuration
docs/
  ARCHITECTURE.md         Architecture notes
  acceptance/             Browser acceptance notes
  plans/                  Deferred implementation plans
```

## More Documentation

- `docs/ARCHITECTURE.md` describes module boundaries, data flow, validation, persistence, and testing architecture.
- `docs/acceptance/chrome-devtools-mcp.md` describes manual browser acceptance for maintainers.
- `docs/plans/` contains deferred implementation plans.

## License

Apache-2.0

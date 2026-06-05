# SchematicForm Architecture

## Purpose

SchematicForm is a React component library that renders forms from a JSON Schema-shaped configuration object. The package is intended for application teams that already know their data contract and want a consistent HeroUI-based form without maintaining a separate UI schema.

The package name is `@schematic-form/react`. It builds ESM, CommonJS, TypeScript declarations, and a CSS entry from the same `src` implementation.

## Technology Stack

- React 19 is the rendering runtime.
- HeroUI v3 is the component system and styling baseline.
- Tailwind CSS v4 and `@heroui/styles` provide global styles.
- Ajv plus `ajv-formats` provide JSON Schema validation.
- `@internationalized/date` powers date, date-time, and time controls.
- Gravity UI icons are used for row actions and reset affordances.
- Vite builds both the local demo and library package.
- Vitest, jsdom, React Testing Library, and user-event cover automated tests.
- Playwright covers automated real-browser acceptance against the local demo.

## Public Entry Points

- `src/index.ts` is the library entry. It exports `SchematicForm`, validation helpers, schema helpers, path helpers, public types, and imports `src/styles.css` as the package style side effect.
- `@schematic-form/react/styles.css` is exported from the built package and must be imported by consumers after Tailwind and HeroUI styles.
- `demo/main.tsx` is a local Vite demo, not production library code.
- `src/SchematicForm.stories.tsx` provides Storybook examples for development and visual review.
- `.storybook/main.ts` configures Storybook with React Vite, the docs addon, and Tailwind CSS.
- `.storybook/preview.ts` imports the package styles so Storybook examples render with the same styling baseline as consumers.

## Module Responsibilities

- `src/SchematicForm.tsx` owns the React component, recursive rendering, controlled/uncontrolled state, branch selection, draft hydration, form submit/reset behavior, and focus management.
- `src/types.ts` defines the public and internal TypeScript model: schemas, paths, validation issues, form state, props, and persistence options.
- `src/schema.ts` interprets supported schema features for rendering: type inference, labels, field ordering, enum handling, default values, display-only fields, branch metadata, and format support.
- `src/validation.ts` sanitizes SchematicForm-specific schema behavior before Ajv compilation and maps Ajv errors into `ValidationIssue` objects.
- `src/paths.ts` provides immutable nested data updates and JSON Pointer/field-path conversion.
- `src/persistence.ts` stores and restores versioned draft payloads in browser storage or a custom storage adapter.
- `src/branchMetadata.ts` rebases branch selection and branch value cache pointers when array rows are inserted, removed, or moved.
- `src/sampleSchemas.ts` contains demo and test schemas that exercise supported Beta behavior.
- `tests/setup.ts` installs jsdom browser API shims required by HeroUI and React Testing Library tests.

## Runtime Data Flow

1. `SchematicForm` receives a schema plus optional `value`, `defaultValue`, callbacks, validation settings, messages, persistence config, custom renderer, and error formatter.
2. If `value` is provided, the form is controlled and `value` remains the source of truth. Otherwise the form stores internal data initialized from `defaultValue` or schema defaults.
3. Draft persistence is enabled only for uncontrolled forms with a `persistence` prop. A matching persisted draft hydrates `data`, `branchSelection`, and `branchValueCache` after mount.
4. The active validation schema is derived from the original schema plus current branch selections. Only selected `oneOf`/`anyOf` branches are validated.
5. Ajv validates current data and produces public state `{data, isValid, errors}`.
6. `renderSchema` recursively renders the schema tree. Field updates use path helpers to immutably write or delete nested data.
7. `onChange` receives raw data changes. `onStateChange` receives public state after draft hydration. `onSubmit` receives the latest public state and the form event.
8. Valid submit clears a persisted draft by default. Invalid submit shows an error summary and focuses the first invalid field.

## Supported Business Rules

SchematicForm Beta intentionally supports a bounded JSON Schema subset plus a few local conventions:

- Root form label and root heading use schema `name` first, then `title`.
- `propertyOrdering` renders listed object keys first, followed by remaining schema property order.
- `type: "null"` renders a display-only title/description block and is excluded from form data and validation.
- String formats `date`, `time`, `date-time`, `email`, and `uri` receive specialized controls or native input semantics. Unsupported formats are ignored for rendering and stripped before validation.
- Long unformatted strings become text areas when `minLength` or `maxLength` is greater than `255`.
- Integer fields with both `minimum` and `maximum` render as sliders. Other numbers and integers render as number fields.
- Scalar enums with fewer than six options render as radios. Scalar enums with six or more options render as dropdowns.
- Unique arrays of string enums with fewer than six options render as checkbox groups. Unique arrays of string enums with six or more options render as multiselect dropdowns.
- Non-unique arrays of string enums render as generic repeatable rows, with each item rendered as a dropdown.
- Generic arrays render repeatable rows with add, move, and remove actions. `maxItems` disables adding when the limit is reached.
- `oneOf` and `anyOf` render as a branch dropdown using branch titles. Beta treats `anyOf` as `oneOf`.
- Inactive branch values are cached internally so users can switch back without leaking inactive values into submitted data.
- `uniqueItems` is enforced for arrays whose item schema is a string enum.
- Empty strings are removed from data unless the schema explicitly sets `minLength: 0`.

## Validation Boundaries

Validation is separated from rendering. `validation.ts` sanitizes the schema before Ajv compiles it:

- Display-only `null` properties are removed from validation and from `required`.
- `anyOf` is converted to `oneOf`.
- `propertyOrdering`, `allOf`, `dependencies`, `dependentRequired`, `dependentSchemas`, `if`, `then`, and `else` are ignored in Beta.
- Unsupported string formats are removed before Ajv sees the schema.
- Ajv runs with `allErrors: true`, strict mode, schema validation, and a custom `time` format.

Unsupported schema features should be documented or planned before implementation. Do not partially implement advanced JSON Schema behavior in the renderer without updating validation and tests.

## Rendering And Styling

The component renders with HeroUI React components and keeps SchematicForm CSS thin:

- The root form, fields, controls, surfaces, arrays, and branches are full width.
- Object and generic array levels render transparent HeroUI `Surface` wrappers with same-level `Fieldset` structure.
- Complex groups use `Fieldset`, `Legend`, and description/error slots where possible.
- The form uses `validationBehavior="aria"` so JSON Schema validation remains the source of truth.
- `SchematicForm.tsx` owns render-role class composition through the local `sfClasses` map and `cx(...)` helper. Add or change Tailwind utilities there instead of scattering inline class strings through JSX.
- Keep stable `schematic-form__*` semantic selectors on rendered structure because tests and consumer CSS may target them.
- `src/styles.css` imports styles in this order: Tailwind CSS, HeroUI styles, then SchematicForm rules.
- Keep `src/styles.css` for package-level custom CSS rules and selector fixes; do not move Tailwind layout ownership between TSX and CSS without updating this architecture note and style-sensitive tests.

HeroUI v3 API compatibility is handled in `SchematicForm.tsx` through component aliases and small fallbacks. Keep this compatibility layer local unless a repeated pattern proves it needs extraction.

## Persistence Model

Draft persistence is opt-in through:

```ts
persistence={{
  key: "unique-draft-key",
  storage: "localStorage",
  debounceMs: 250,
  clearOnValidSubmit: true,
}}
```

The stored payload contains `version`, `savedAt`, `schemaFingerprint`, `data`, `branchSelection`, and `branchValueCache`. Drafts are ignored when parsing fails, versions mismatch, schema fingerprints mismatch, or storage access throws.

Persistence is deliberately best-effort: storage failures must not break the form.

## Testing Architecture

Automated tests run with Vitest in jsdom:

- `src/SchematicForm.test.tsx` covers rendered behavior, accessibility-facing labels/roles, validation UI, branch switching, arrays, draft hydration, submit/reset behavior, and callback state.
- `src/schema.test.ts` covers schema interpretation and defaults.
- `src/validation.test.ts` covers schema sanitization and Ajv error mapping.
- `src/persistence.test.ts` covers draft payload parsing, fingerprints, and storage adapters.
- `src/paths.test.ts` covers immutable path utilities.
- `src/branchMetadata.test.ts` covers array pointer rebasing for branch metadata.
- `tests/browser/` covers real-browser acceptance with Playwright.

Browser acceptance has two roles. `npm run test:acceptance` runs the automated Playwright suite with pass/fail status. Chrome DevTools MCP is documented in `docs/acceptance/chrome-devtools-mcp.md` for manual agent inspection and debugging.

## Storybook Documentation

Storybook is the local documentation and visual review surface for SchematicForm. It discovers stories from `src/**/*.stories.tsx`, with the primary examples in `src/SchematicForm.stories.tsx`.

Run local interactive docs with:

```bash
npm exec -- storybook dev --host 127.0.0.1 --port 6006
```

Build static Storybook output with:

```bash
npm run build:storybook
```

The static output is written to `storybook-static/`. Do not edit generated Storybook output directly.

## Build And Distribution

- `npm run dev` starts the demo app.
- `npm run test` runs automated Vitest tests.
- `npm run test:acceptance` runs automated Playwright browser acceptance tests.
- `npm run lint` and `npm run typecheck` run TypeScript with `--noEmit`.
- `npm run build` emits declarations through TypeScript and bundles the library with Vite library mode.
- `npm run build:storybook` emits static Storybook documentation to `storybook-static/`.
- Peer dependencies are `react`, `react-dom`, `@heroui/react`, and `@heroui/styles`.

## Deliberate Non-Goals In Beta

- No `uiSchema`.
- No true `anyOf` semantics.
- No dependency schemas or conditional schemas.
- No advanced `allOf` behavior.
- No remote `$ref` resolver.
- No async validation hook.
- No custom elements package.
- No publishing automation.

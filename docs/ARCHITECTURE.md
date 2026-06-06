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

- `src/SchematicForm.tsx` owns the React component, recursive rendering, controlled/uncontrolled state, branch selection, draft hydration, form submit/clean/reset behavior, and focus management.
- `src/types.ts` defines the public and internal TypeScript model: schemas, paths, validation issues, form state, props, and persistence options.
- `src/schema.ts` interprets supported schema features for rendering: type inference, labels, field ordering, enum handling, default values, display-only fields, branch metadata, and format support.
- `src/refResolver.ts` resolves same-document `$ref` pointers lazily against the root schema for rendering and schema helper decisions.
- `src/validation.ts` sanitizes SchematicForm-specific schema behavior before Ajv compilation and maps Ajv errors into `ValidationIssue` objects.
- `src/paths.ts` provides immutable nested data updates and JSON Pointer/field-path conversion.
- `src/persistence.ts` stores and restores versioned draft payloads in browser storage or a custom storage adapter.
- `src/branchMetadata.ts` rebases branch selection and branch value cache pointers when array rows are inserted, removed, or moved.
- `src/sampleSchemas.ts` contains demo and test schemas that exercise supported Beta behavior.
- `tests/setup.ts` installs jsdom browser API shims required by HeroUI and React Testing Library tests.

## Runtime Data Flow

1. `SchematicForm` receives a schema plus optional `value`, `defaultValue`, callbacks, validation settings, messages, persistence config, custom renderer, and error formatter.
2. If `value` is provided, the form is controlled and `value` remains the source of truth. Otherwise the form stores internal data initialized from `defaultValue` or schema defaults.
3. Branch selections are inferred from populated data for initial/default/controlled values, with explicit user selections taking precedence.
4. Draft persistence is enabled only for uncontrolled forms with a `persistence` prop. A matching persisted draft hydrates `data`, `branchSelection`, and `branchValueCache` after mount.
5. The active validation schema is derived from the original schema plus current branch selections. Only selected `oneOf`/`anyOf` branches are validated.
6. Ajv validates current data and produces public state `{data, isValid, errors}`.
7. `renderSchema` recursively renders the schema tree, resolving local refs lazily at each render node. Field updates use path helpers to immutably write or delete nested data.
8. `onChange` receives raw data changes. `onStateChange` receives public state after draft hydration. `onSubmit` receives the latest public state and the form event.
9. Clean clears current form values back to schema-materialized empty data. Reset is shown only when `defaultValue` is explicitly provided and restores that initial data.
10. Valid submit clears a persisted draft by default. Invalid submit shows an error summary and focuses the first invalid field.

## Supported Business Rules

SchematicForm Beta intentionally supports a bounded JSON Schema subset plus a few local conventions:

- Root form label and root heading use schema `name` first, then `title`.
- `propertyOrdering` renders listed object keys first, followed by remaining schema property order.
- `type: "null"` renders a display-only title/description block and is excluded from form data and validation.
- String formats `date`, `time`, `date-time`, `email`, and `uri` receive specialized controls or native input semantics. Unsupported formats are ignored for rendering and stripped before validation.
- Long unformatted strings become text areas when `minLength` or `maxLength` is greater than `255`.
- Integer fields with both `minimum` and `maximum` render as sliders. Other numbers and integers render as number fields.
- Scalar enums with fewer than six options render as radios. Scalar enums with six or more options render as dropdowns.
- Required object properties with a single-value `enum` are hidden from user input and materialized into form data with that sole enum value.
- Unique arrays of string enums with fewer than six options render as checkbox groups. Unique arrays of string enums with six or more options render as multiselect dropdowns.
- Non-unique arrays of string enums render as generic repeatable rows, with each item rendered as a dropdown.
- Generic arrays render repeatable rows with add, move, and remove actions. `maxItems` disables adding when the limit is reached.
- `oneOf` and `anyOf` render as a branch dropdown using branch titles. Beta treats `anyOf` as `oneOf`.
- Populated initial, controlled, and draft data infer matching branch dropdown selections so visible branch controls stay aligned with data.
- Inactive branch values are cached internally so users can switch back without leaking inactive values into submitted data.
- `uniqueItems` is enforced for arrays whose item schema is a string enum.
- Empty strings are removed from data unless the schema explicitly sets `minLength: 0`.
- Local same-document `$ref` values such as `#/$defs/field` are resolved lazily for rendering. Recursive references are supported when UI expansion is bounded by data, such as repeatable array rows.
- `$ref` node siblings such as `title`, `description`, and `default` are honored by rendering after the referenced schema is resolved.

## Validation Boundaries

Validation is separated from rendering. `validation.ts` sanitizes the schema before Ajv compiles it:

- Display-only `null` properties are removed from validation and from `required`.
- `anyOf` is converted to `oneOf`.
- `$defs` entries are sanitized recursively while `$ref` remains in the schema for Ajv to resolve.
- `propertyOrdering`, `allOf`, `dependencies`, `dependentRequired`, `dependentSchemas`, `if`, `then`, `else`, and `unevaluatedProperties` are ignored in Beta.
- Unsupported string formats are removed before Ajv sees the schema.
- Ajv runs with `allErrors: true`, strict mode, schema validation, and a custom `time` format.

Unsupported schema features should be documented or planned before implementation. Do not partially implement advanced JSON Schema behavior in the renderer without updating validation and tests.

## Rendering And Styling

The component renders with HeroUI React components and keeps SchematicForm CSS thin:

- The root form, fields, controls, surfaces, arrays, and branches are full width.
- Object and generic array levels render transparent HeroUI `Surface` wrappers with same-level `Fieldset` structure.
- Non-root object surfaces render a native `button` disclosure trigger inside the HeroUI `Surface`/`Fieldset` structure so large nested sections are collapsible while remaining expanded by default. Expansion state is UI-only, keyed by data pointer, persisted best-effort in `localStorage` by schema fingerprint, and is not emitted as form data.
- Collapsed object surfaces keep their descriptions visible and replace hidden controls with small HeroUI summary chips for populated leaf values. Summary chips use the deepest available field label and mirror expanded field labels, so array item indexes such as `#1` and `#2` appear only when the expanded field label is indexed. Summary chips include materialized hidden required single-value enum fields, render booleans as `On`/`Off`, trim labels and values after 20 symbols, show at most 10 field chips, and add a final `...` chip when more populated fields exist. Visible invalid fields are shown as danger soft chips; required invalid fields are included even when empty as label-only chips, while optional invalid fields are included only when they have a value.
- Invalid submit expands collapsed object ancestors before focusing the first invalid field.
- Complex groups use `Fieldset`, `Legend`, and description/error slots where possible.
- The form uses `validationBehavior="aria"` so JSON Schema validation remains the source of truth.
- `SchematicForm.tsx` renders direct semantic `schematic-form__*` class names. Use the local `cx(...)` helper only for conditional state classes or caller-provided `className`.
- Keep stable `schematic-form__*` semantic selectors on rendered structure because tests and consumer CSS may target them.
- `src/styles.css` imports styles in this order: Tailwind CSS, HeroUI styles, then SchematicForm rules.
- `src/styles.css` owns SchematicForm layout and visual styling through Tailwind `@apply` and HeroUI theme tokens where possible.
- Keep raw CSS limited to behavior Tailwind cannot express cleanly, such as pseudo-element content and nested HeroUI selector fixes.

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

- `src/SchematicForm.test.tsx` covers rendered behavior, accessibility-facing labels/roles, validation UI, branch switching, arrays, draft hydration, submit/clean/reset behavior, and callback state.
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
- No cross-document `$id` reference registry.
- No async validation hook.
- No custom elements package.
- No publishing automation.

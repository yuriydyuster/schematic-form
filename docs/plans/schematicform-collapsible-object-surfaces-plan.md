# Collapsible Object Surfaces Plan

## Summary

Large JSON schemas can produce visually heavy forms because every nested object renders fully expanded inside its own `Surface`. Add collapsible nested object surfaces so users can hide sections they are not actively editing while preserving current data, validation, draft persistence, and schema interpretation behavior.

HeroUI v3.0.5 includes `Disclosure`, `Surface`, `Fieldset`, and `Button`. `Disclosure` is the closest HeroUI primitive because it represents one independently collapsible region. `Accordion` is a poorer fit for independently rendered schema objects because it introduces group-level disclosure behavior.

Implementation note: the first implementation used HeroUI `Disclosure`, but schema-heavy test runs showed avoidable jsdom/runtime overhead. The final implementation keeps HeroUI `Surface` and `Fieldset` as the visual and grouping primitives, and uses a lightweight native `button` with `aria-expanded` plus a hidden content region for the actual collapse behavior.

## Goals

- Make nested object `Surface` sections collapsible.
- Keep root object content expanded and non-collapsible by default.
- Keep all nested object sections expanded by default to avoid surprising existing consumers.
- Add a compact top-right toggle for each collapsible object surface.
- Preserve `data-sf-path` and stable `schematic-form__*` selectors.
- Preserve controlled/uncontrolled data semantics and draft persistence payloads.
- Persist expanded/collapsed UI state across page refreshes without emitting it as form data.
- Expand collapsed ancestors before focusing the first invalid field on submit.

## Non-Goals

- Do not add `uiSchema`.
- Do not change validation behavior or Ajv sanitization.
- Do not make arrays, branch surfaces, or scalar group surfaces collapsible in this pass.
- Do not introduce schema keywords for UI behavior.

## Implementation Plan

1. Consult HeroUI `Disclosure` docs/source for the accessible disclosure model.
2. Add UI-only expanded object state in `SchematicForm`, keyed by JSON Pointer.
3. Render non-root object surfaces with a native top-right `button` trigger carrying `aria-expanded`.
4. Keep object fields under a plain hidden content container, and retain the existing `Fieldset`/`Fieldset.Group` structure inside the surface.
5. Add a top-right icon-only disclosure trigger with an accessible label derived from the object label.
6. Add nested issue detection so object surfaces can expose an invalid state when a visible issue exists inside them.
7. On invalid submit, mark ancestor object pointers as expanded before the existing first-invalid-field focus pass runs.
8. Persist object expansion state best-effort in `localStorage`, keyed by schema fingerprint.
9. Style new semantic selectors in `src/styles.css` using Tailwind `@apply` and HeroUI tokens.
10. Update README and architecture docs to document collapsible nested object surfaces.
11. Add focused React Testing Library coverage for collapse/expand behavior, data preservation, refresh persistence, and invalid-submit auto-expand.

## Test Plan

- `src/SchematicForm.test.tsx`
  - nested object surfaces render a disclosure toggle
  - clicking the toggle collapses and expands nested object fields
  - collapsed object sections do not mutate public form data
  - invalid submit expands a collapsed object containing the first invalid field
- Verification commands:
  - `npm test`
  - `npm run lint`
  - `npm run test:acceptance` when checking browser layout/focus behavior

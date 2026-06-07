# SchematicForm Tailwind Class Normalization Plan

## Summary

Status: superseded by `docs/plans/schematicform-semantic-tailwind-css-plan.md`.

Normalize styling in `src/SchematicForm.tsx` by centralizing class strings into one local class map and using a small local class combiner. This is a code-organization refactor only: rendered classes, visual behavior, semantic `schematic-form__*` hooks, and the public API should remain unchanged.

The goal is to replace the current mix of module-level constants, inline literals, template strings, and repeated `.filter(Boolean).join(" ")` expressions with one consistent implementation pattern.

## Implementation Changes

- Add a local `cx(...values)` helper in `src/SchematicForm.tsx` for conditional class composition. Do not add `clsx`, `tailwind-merge`, or another dependency.
- Replace scattered style constants and inline class literals with a grouped `sfClasses` object.
- Keep class entries organized by render role:
  - Form structure: `root`, `form`, `formActions`, `surface`, `fieldset`, `fieldGroup`, `field`, `control`.
  - Arrays: `array`, `arrayItems`, `arrayRowSurface`, `rowActions`, `arrayActions`.
  - Branches: `branchSurface`, `branchGroup`, `branchSelector`.
  - Field states: `requiredLabel`, `sliderEmpty`, `sliderOutputEmpty`, `sliderHeader`, `switchRow`.
  - Supporting UI: `description`, `buttonIcon`, `fieldIcon`, `errorMessage`, `errorSummary`.
- Replace class composition call sites with `cx(...)`, including root `className`, branch surfaces, slider empty state, and dropdown control composition.
- Preserve every existing semantic selector, including `schematic-form__surface`, `schematic-form__field`, `schematic-form__control`, `schematic-form__branch-group`, and action selectors.
- Keep `src/styles.css` unchanged in this refactor. Moving layout ownership from TSX utilities into CSS should be a separate follow-up because it changes style ownership and needs broader visual verification.

## Public API And Styling Behavior

- No public API changes.
- No prop, type, schema, validation, persistence, or renderer behavior changes.
- No new runtime dependency.
- Rendered class output should remain effectively identical, including Tailwind utilities such as `flex`, `flex-col`, `gap-*`, `grid`, `rounded-xl`, `border`, and `p-3`.
- Tests and consumer CSS overrides that target `schematic-form__*` selectors should keep working.

## Test Plan

- Run `npm run lint`.
- Run `npm test`.
- Existing style-sensitive tests should continue to pass, especially coverage for:
  - full-width surfaces and fieldsets
  - form and row action grid classes
  - branch group spacing
  - field and switch row layout
  - control, icon, description, error, and required-label selectors
- Do not run browser acceptance unless the implementation changes rendered class output or computed layout.

## Assumptions

- Target refactor depth is centralization only.
- `src/styles.css` remains the package CSS owner for existing custom rules.
- Deeper Tailwind/CSS deduplication is intentionally deferred to avoid mixing a mechanical cleanup with style ownership changes.

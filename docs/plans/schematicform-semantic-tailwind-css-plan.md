# SchematicForm Semantic Tailwind CSS Plan

## Summary

Status: implemented.

Refine the styling strategy so `SchematicForm.tsx` renders plain semantic `schematic-form__*` class names, while `src/styles.css` owns the Tailwind-based implementation with `@apply`. This replaces the current `sfClasses` map with direct semantic class strings and keeps `cx(...)` only for conditional state classes.

The intended split is:

- TSX declares structure and state hooks.
- HeroUI components and props provide the control baseline.
- `styles.css` applies Tailwind utilities and HeroUI theme tokens to SchematicForm-specific layout.

## Implementation Changes

- Remove the `sfClasses` object from `src/SchematicForm.tsx`.
- Keep the local `cx(...)` helper only for conditional or caller-composed classes, such as root `className`, dropdown control extension, and slider empty state.
- Replace `sfClasses.*` references with direct semantic class strings, for example:
  - `className="schematic-form__field"`
  - `className="schematic-form__surface"`
  - `className="schematic-form__surface schematic-form__array-row"`
  - `className={cx("schematic-form__field", isUnset && "schematic-form__slider--empty")}`
- Move Tailwind layout and visual utilities from TSX into `src/styles.css` with `@apply`.
- Keep HeroUI theme integration by using Tailwind/HeroUI token utilities where available, such as `border-danger`, `text-danger`, `text-muted`, `rounded-xl`, `border`, `p-3`, and `gap-*`.
- Keep raw CSS only where Tailwind cannot express the behavior cleanly, such as `content: " *"` and the branch selector nested HeroUI override.

## Styling Rules

- `src/styles.css` is the single owner for SchematicForm layout and visual styling.
- `SchematicForm.tsx` should not contain Tailwind utility classes except when forwarding a user-provided `className` through `cx(...)`.
- Preserve all existing `schematic-form__*` selectors because tests and consumer CSS may target them.
- Do not use hardcoded colors when a HeroUI/Tailwind token utility or variable is available.
- Avoid changing rendered DOM structure or HeroUI component choices as part of this refactor.

## Test Plan

- Run `npm run lint`.
- Run `npm test`.
- Update style-sensitive tests so they assert semantic structure and behavior first, not Tailwind implementation details where possible.
- Run `npm run test:acceptance` if computed layout changes, spacing changes, or HeroUI popover/control rendering is affected.

## Documentation Updates

- Update `docs/ARCHITECTURE.md` to state that TSX owns semantic hooks and `styles.css` owns Tailwind `@apply` styling.
- Update `AGENTS.md` so future agents do not reintroduce Tailwind utilities into `SchematicForm.tsx`.
- Mark this plan implemented after the refactor lands.

## Assumptions

- `@tailwindcss/vite` continues to process `src/styles.css`, so `@apply` is supported in the package CSS build.
- The public `className` prop remains a root wrapper extension point only.
- This refactor is styling-ownership cleanup, not a visual redesign.

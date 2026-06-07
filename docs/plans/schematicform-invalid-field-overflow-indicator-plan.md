# Invalid Field Overflow Indicator Plan

## Objective

Improve collapsed object summaries so the overflow chip (`...`) signals hidden validation problems.

When a collapsed object summary overflows beyond the visible chip limit, the overflow chip should render in the invalid style only when at least one hidden summary item is invalid.

## Problem Statement

Current behavior renders:
- Up to 10 summary chips.
- A neutral `...` chip when more items exist.
- Invalid visible items as danger soft chips.

Gap: invalid fields that are hidden behind overflow are not indicated unless they happen to be among the first visible chips.

## Behavior Contract

1. Visible summary chips keep current behavior.
2. Overflow chip appears only when there are hidden items beyond the limit.
3. Overflow chip uses danger soft styling when any hidden item is invalid.
4. Overflow chip keeps neutral styling when hidden items are all valid.
5. Summary traversal must terminate for recursive `$ref` schemas by using finite, bounded traversal rules.
6. No changes to validation rules or error generation.

## Non-Goals

- No changes to Ajv schema sanitization or validation semantics.
- No changes to public form state shape.
- No changes to summary chip text format, truncation, or ordering.
- No changes to collapse/expand interaction model.

## Architecture Constraints

- Keep implementation localized to collapsed summary logic in `src/SchematicForm.tsx`.
- Keep `schematic-form__*` selectors stable.
- Keep HeroUI chip usage and existing semantic class names.
- Treat this as UI interpretation of existing `issueMap`; do not introduce new validation passes.
- Respect existing recursive-ref handling (`refStack`) and keep traversal bounded by concrete form data, not schema shape alone.

## Implementation Strategy

### 1. Summary Output Shape

Track overflow invalidity in the local collapsed summary model (internal to `SchematicForm.tsx`).

Required data:
- `items`: visible chips (max 10).
- `hasOverflow`: whether hidden items exist.
- `hasInvalidOverflow`: whether any hidden item is invalid.

### 2. Collection Logic

Refactor summary collection so hidden invalidity is computed correctly.

Key requirement:
- Do not stop traversal immediately after collecting visible chips.
- Continue enough traversal to determine whether any hidden item is invalid.
- Keep traversal finite for recursive schemas and pathological nested values.

Acceptable implementations:
1. Single traversal with dual bookkeeping:
   - Collect visible chips until limit.
   - Continue scanning hidden candidates for invalidity only.
2. Two-phase approach:
   - First pass for visible chips and overflow detection.
   - Second pass (or targeted continuation) to compute hidden invalid flag.

Selection criteria:
- Correctness for deeply nested objects/arrays/branches.
- No behavioral regressions in existing summary chip ordering.
- Simple enough to maintain in current module.

### 2a. Recursive Reference Safety

Traversal rules must explicitly prevent unbounded recursion:
- Continue to rely on schema reference-cycle handling from `refStack`/resolver behavior.
- Descend only through concrete runtime values (object keys/array items), never by expanding schema-only recursive definitions.
- Introduce a reasonable traversal budget (for example depth and/or visited-node cap) so extremely deep nested data cannot recurse indefinitely.
- On budget exhaustion, fail safe by stopping deeper summary traversal without throwing or blocking form rendering.

### 3. Rendering Logic

Update overflow chip rendering to map state to style:
- `hasInvalidOverflow = true` -> danger soft chip.
- `hasInvalidOverflow = false` -> current neutral style.

Visible item chip styling remains unchanged.

## Testing Plan

Primary coverage belongs in `src/SchematicForm.collapse.test.tsx`.

Add/adjust tests for:
1. Hidden invalid only:
   - First 10 visible chips are valid.
   - At least one hidden chip is invalid.
   - Overflow chip renders as danger soft.
2. Hidden all valid:
   - Overflow exists.
   - No hidden invalid items.
   - Overflow chip remains neutral.
3. Visible invalid only:
   - Visible invalid chips render as danger soft.
   - Hidden items valid.
   - Overflow chip remains neutral.
4. Visible and hidden invalid:
   - Visible invalid chips remain danger soft.
   - Overflow chip also danger soft.
5. No overflow:
   - Fewer than or equal to 10 chips.
   - No `...` chip rendered.
6. Recursive `$ref` bounded traversal:
   - Use a recursive local-ref schema with nested data.
   - Verify summary generation completes and preserves current visible-chip behavior.
7. Pathological deep nesting guard:
   - Use very deep nested value input.
   - Verify traversal stops safely (no hang/stack overflow) and UI still renders.

Test notes:
- Keep assertions on stable classes (`chip--danger`, `chip--soft`, etc.).
- Avoid contradictory setups where the "hidden invalid" field is actually visible.

## Browser Acceptance Scope

Optional for this change.

Rationale:
- Behavior is deterministic UI state in a unit-tested summary component path.
- Existing Playwright suite does not currently target this specific collapsed-summary overflow case.

If acceptance coverage is added, include one scenario that verifies:
- Collapsed overflow chip style changes when hidden invalid fields exist.

## Documentation Updates

After implementation, update `docs/ARCHITECTURE.md` collapsed-summary behavior section to note:
- Overflow chip signals hidden invalid fields via danger styling.

## Risks And Mitigations

- Risk: hidden invalid detection misses deep nested invalids.
  - Mitigation: include nested object/array case in unit tests.
- Risk: regression in summary ordering/limit behavior.
  - Mitigation: keep and extend current limit/ordering tests.
- Risk: style regressions from class/variant changes.
  - Mitigation: assert chip classes in tests.

## Deliverables

- [x] Implement internal summary model update.
- [x] Implement collector logic that correctly computes hidden invalid overflow.
- [x] Add explicit bounded-traversal safeguards for recursive/deep data cases.
- [x] Implement overflow chip style mapping.
- [x] Add/adjust unit tests in `src/SchematicForm.collapse.test.tsx`.
- [x] Update `docs/ARCHITECTURE.md` summary behavior note.
- [x] Run `npm test`.
- [x] Run `npm run lint`.

## Success Criteria

1. Overflow chip turns danger soft only when hidden items include invalid state.
2. Overflow chip remains neutral when hidden items are valid.
3. Existing collapsed summary behavior (limit/order/content) remains unchanged.
4. New and existing unit tests pass.
5. Recursive `$ref` schemas are handled with finite traversal and no hangs.
6. Architecture docs reflect the updated overflow behavior and recursion-bounding rule.

## Implementation Remarks (2026-06-07)

Implemented in `src/SchematicForm.tsx`, `src/SchematicForm.collapse.test.tsx`, and `docs/ARCHITECTURE.md`.

Delivered behavior from this plan:
- Overflow `...` chip now turns danger soft only when hidden summary items include invalid fields.
- Overflow `...` chip stays neutral when hidden summary items are valid.
- Hidden invalid overflow navigation targets the first hidden invalid field.
- Summary traversal is bounded by depth and node budget and guarded against recursive runtime cycles.

Related follow-up behavior implemented in the same workstream:
- Explicit-label summary chips are actionable and navigate to the exact field.
- Hidden required single-value enum chips remain in summary but are not actionable because no input is rendered.
- Chip navigation is focus-only (no synthetic control activation), expands collapsed ancestors, retries after expansion, and targets exact controls (including switch roles).
- Pointer-triggered switch navigation now applies visible focus treatment consistently.
- Chip navigation scrolls smoothly and positions targets at least 100px above viewport bottom when possible.

Verification status:
- `npm test -- src/SchematicForm.collapse.test.tsx`: passed.
- `npm test`: passed.
- `npm run lint`: passed.
- `npm run test:acceptance`: currently fails due pre-existing strict locator ambiguities in Playwright tests, unrelated to summary-chip logic.

# oneOf Primitive String Branch Validation Plan

## Summary

Remove unintended invalid-on-select behavior for primitive `oneOf` string branches while preserving branch cache and branch switching semantics.

## Problem Statement

When users select a primitive string `oneOf` branch (for example `format: "email"`), the branch currently seeds `""` into form data. That synthetic value is immediately invalid for format constraints and can surface errors before meaningful user input.

## Goals

- Keep branch switching and inactive branch cache behavior unchanged.
- Stop writing synthetic empty strings for primitive string branch selection.
- Keep field-level validation visibility for primitive selected branches.
- Avoid duplicated error presentation on both branch selector and selected primitive field.

## Non-Goals

- No changes to public `SchematicForm` props.
- No changes to persistence payload schema.
- No changes to validation sanitizer rules.

## Implementation Steps

1. Update primitive branch fallback behavior:
- In `defaultBranchValue`, stop returning `""` for `type: "string"` fallback.
- Keep existing fallback behavior for explicit defaults, enum first value, `null`, and numeric minimum/zero.

2. Scope selector-level error rendering:
- Update branch selector issue filtering so selected primitive branches do not render field-level issues on the selector.
- Keep selector-level issues for unselected branches.

3. Add regression coverage:
- Add a component test proving selected primitive string branches do not seed data with `""`.
- Add assertions that format errors render once on the selected field and not on the selector.

## Verification

Run:

```bash
npm test
npm run lint
npm run test:acceptance
```

## Status (2026-06-07)

- Completed.

## Implementation Notes (2026-06-07)

- Updated branch fallback behavior in [SchematicForm.tsx](/Users/deuster/Documents/Projects/schematic-form/src/SchematicForm.tsx):
- `defaultBranchValue` no longer seeds primitive string branches with `""`.
- Existing fallback intent is preserved for explicit defaults, enum-first fallback, `null`, and numeric minimum/zero.

- Updated selector issue handling in [SchematicForm.tsx](/Users/deuster/Documents/Projects/schematic-form/src/SchematicForm.tsx):
- `renderBranch` now passes the selected branch schema into selector issue filtering.
- `getBranchSelectorIssues` now suppresses selector issues for selected primitive branches, so field-level format/pattern issues render on the field itself rather than being duplicated on the selector.
- Existing selector behavior for unselected branches remains intact.

- Added regression coverage in [SchematicForm.test.tsx](/Users/deuster/Documents/Projects/schematic-form/src/SchematicForm.test.tsx):
- New test: `does not seed primitive string branch data and keeps format issues on the branch field only`.
- Asserts that selecting a primitive string branch does not write `preferredContact` into public data until user input exists.
- Asserts that invalid format feedback appears once at field level and does not mark selector invalid for selected primitive branches.

- Verification:
- `npm run lint`: passed.
- `npm run test:acceptance`: passed.
- Targeted regression checks passed:
  - `./node_modules/.bin/vitest run src/SchematicForm.test.tsx -t "does not seed primitive string branch data and keeps format issues on the branch field only" --reporter=verbose --testTimeout=10000 --no-file-parallelism`
  - `./node_modules/.bin/vitest run src/SchematicForm.collapse.test.tsx -t "does not render invalid branch wrapper chips for company schema summary" --no-file-parallelism`
  - `./node_modules/.bin/vitest run src/SchematicForm.test.tsx -t "restores persisted multiselect enum array labels after remount" --no-file-parallelism`
- `npm test` was run and failed due unrelated 10s timeout flakes under concurrent full-suite execution in this session; the timed-out tests pass when run individually as listed above.

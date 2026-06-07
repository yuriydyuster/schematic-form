# String Format And Pattern Validation Plan

## Summary

Extend schema validation and UI error reporting so string fields support all required formats:

- `email`
- `uri`
- `date`
- `date-time`
- `time`
- `hostname`
- `ipv4`
- `ipv6`
- `uuid`

Also ensure string `pattern` validation is supported end-to-end, add a machine-friendly `pattern` for proto-schema `key`, and add focused tests for validation and UI behavior.

## Goals

- Support all listed string formats in runtime schema validation.
- Support JSON Schema `pattern` validation in runtime schema validation.
- Add pattern validation to proto-schema `key` in the demo authoring schema.
- Represent format/pattern validation failures in UI via field-level and form-level error surfaces.
- Add regression tests across validation, schema helpers, renderer behavior, and proto-schema conversion where relevant.

## Non-Goals

- No `uiSchema` introduction.
- No new advanced JSON Schema features beyond listed formats and `pattern`.
- No change to controlled/uncontrolled semantics or persistence behavior.
- No generated artifact edits (`dist/`, `storybook-static/`).

## Current Gaps

- `SupportedStringFormat` and `schema.ts` currently recognize only `date`, `time`, `date-time`, `email`, and `uri`.
- Validation sanitization drops unknown `format` values because support is gated by `getSupportedFormat`.
- `pattern` is present in schema types and string control props, but dedicated tests are missing for validation and UI error behavior.
- Proto-schema `key` currently has `minLength` only and does not constrain machine-friendly naming.

## Behavior Contract

1. Ajv validation accepts/rejects string values for all listed formats.
2. Ajv validation enforces `pattern` for string schemas.
3. Unsupported formats (outside the allowlist) continue to be ignored in Beta sanitization.
4. UI continues to use specialized controls for `date`, `date-time`, and `time`.
5. UI continues to use input semantics/icons for `email` and `uri`.
6. UI continues to use standard text input for `hostname`, `ipv4`, `ipv6`, and `uuid`.
7. Validation failures for `format` and `pattern` appear in field-level issue areas (`FieldHelp`/`SchemaFieldHelp`).
8. Validation failures for `format` and `pattern` appear in the form-level error summary on submit.
9. Proto-schema `key` rejects non machine-friendly names and surfaces an inline validation issue.

## Proposed Proto Key Pattern

Use this regex for proto-schema `key`:

`^[a-z][A-Za-z0-9_]*$`

Rationale:

- starts with lowercase letter
- supports existing camelCase keys used in sample initial values
- allows digits and underscores after first character
- blocks spaces and punctuation that create unstable machine keys

## Implementation Steps

### 1. Expand Supported Format Typing And Helpers

- Update `src/types.ts` and extend `SupportedStringFormat` to include `hostname`, `ipv4`, `ipv6`, `uuid`.
- Update `src/schema.ts` and expand `supportedFormats` to the same list.
- Keep existing control mapping behavior, with no new special control branch for hostname/IP/UUID.

### 2. Preserve Validation Sanitization Contract

- Keep `src/validation.ts` sanitizer flow unchanged except for new allowlisted formats now returned by `getSupportedFormat`.
- Keep Ajv setup with `addFormats(ajv)` and custom `time` validator.
- Confirm that `pattern` passes through sanitization and is enforced by Ajv for both root and nested `$defs` schemas.

### 3. Ensure UI Representation Of New Validations

- In `src/SchematicForm.tsx`, keep the current rendering approach for all formats.
- Keep `date`, `date-time`, and `time` as specialized controls.
- Keep `email` and `uri` mapped to input types/icons.
- Render `hostname`, `ipv4`, `ipv6`, and `uuid` as standard string fields.
- Keep existing error rendering components (`IssueList`, `SchemaIssueList`, submit summary) as the canonical UI representation for new validation failures.
- Confirm no visibility regressions for issue display under `validationMode` rules.

### 4. Annotate Proto-Schema `key` With Pattern

- Update `src/sampleSchemas.ts` in `propertyKeyAnnotationSchema`.
- Add `pattern: "^[a-z][A-Za-z0-9_]*$"`.
- Update description to clarify the machine-friendly key rule.
- Ensure sample initial proto values still satisfy the pattern.

### 5. Add/Update Automated Tests

#### `src/validation.test.ts`

- Add table-driven format tests for valid and invalid `hostname`, `ipv4`, `ipv6`, and `uuid`.
- Add `pattern` validation tests that pass when value matches regex.
- Add `pattern` validation tests that fail with `keyword: "pattern"` when value does not match.
- Add sanitizer test asserting new formats are retained (not stripped).

#### `src/schema.test.ts`

- Add tests for `getSupportedFormat` returning all nine supported formats.
- Add test confirming formatted long strings (including hostname/IP/UUID) do not trigger multiline heuristic in `isLongUnformattedString`.

#### `src/SchematicForm.test.tsx`

- Add UI test that invalid values for hostname/IP/UUID and pattern show field-level error text after interaction/submit.
- Add UI test that submit summary includes format/pattern validation errors.
- Add proto-schema builder test that `Key` input enforces pattern (error shown for invalid key such as `"Full Name"`).

#### `src/protoSchema.test.ts`

- Add converter test that string `pattern` in proto annotation is preserved in generated classic schema.

### 6. Documentation Updates

- Update `README.md` supported string-format list to include `hostname`, `ipv4`, `ipv6`, `uuid`, and `pattern`.
- Update `docs/ARCHITECTURE.md` supported business-rules format list.
- Update `docs/ARCHITECTURE.md` validation-boundaries note about supported formats.

## Verification

Run:

```bash
npm test
npm run lint
npm run test:acceptance
```

`npm run test:acceptance` is required because this change affects visible validation behavior in the demo/browser flow.

## Risks And Mitigations

- Risk: format behavior differs from user expectations (especially `hostname` and `ipv6` edge cases).
- Mitigation: add explicit valid/invalid fixtures in `validation.test.ts` and document semantics as Ajv-formats-driven.

- Risk: proto `key` pattern blocks previously used keys.
- Mitigation: choose regex compatible with existing sample keys and cover with test fixtures.

- Risk: UI tests become brittle around exact Ajv error wording.
- Mitigation: assert stable fragments and keywords where possible instead of entire error strings.

## Success Criteria

1. All listed formats are accepted as supported and validated at runtime.
2. `pattern` validation is enforced and visible in UI errors.
3. Proto-schema `key` is pattern-constrained to machine-friendly names.
4. Relevant tests are added and passing in unit and browser acceptance suites.
5. README and architecture docs reflect the expanded support contract.

## Status (2026-06-07)

- Completed.

## Implementation Notes (2026-06-07)

- Expanded supported format typing and helpers:
- `src/types.ts`: `SupportedStringFormat` now includes `hostname`, `ipv4`, `ipv6`, `uuid`.
- `src/schema.ts`: `supportedFormats` allowlist now includes the same formats.
- Annotated proto-schema key with machine-friendly regex:
- `src/sampleSchemas.ts`: `propertyKeyAnnotationSchema` now includes `pattern: "^[a-z][A-Za-z0-9_]*$"` and updated description text.
- Added validation and UI coverage:
- `src/validation.test.ts`: new tests for format validation (`hostname`, `ipv4`, `ipv6`, `uuid`), `pattern` validation, and sanitization retention of supported formats.
- `src/schema.test.ts`: new tests for `getSupportedFormat` coverage and `isLongUnformattedString` behavior for newly supported formats.
- `src/SchematicForm.test.tsx`: new UI tests for field-level + summary-level format/pattern errors and proto-schema key pattern enforcement.
- `src/protoSchema.test.ts`: converter test now explicitly verifies `pattern` preservation on string annotations.
- Updated docs:
- `README.md`: supported behavior table now includes `hostname`, `ipv4`, `ipv6`, `uuid`, and string `pattern`.
- `docs/ARCHITECTURE.md`: supported business-rules and validation boundaries updated for expanded format support.
- Verification results:
- `npm test`: passed.
- `npm run lint`: passed.
- `npm run test:acceptance`: passed (after running with permissions that allow local port binding for the Playwright web server).

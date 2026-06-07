# Proto-Schema Demo `oneOf` Construction Plan

## Summary

Enable the demo proto-schema authoring flow to create JSON Schema `oneOf` constructions as a first-class property annotation variant.

Today, proto annotations cover primitive/object/array variants only. This plan adds a dedicated proto `oneOf` variant, converts it to classic JSON Schema `oneOf`, updates the demo initial value to visibly demonstrate it, and adds focused tests for converter, renderer, and browser acceptance behavior.

## Problem Statement

The current proto authoring schema (`kitchenSinkSchema`) supports choosing one type variant per property annotation, but cannot author a property whose schema itself is a `oneOf` union. That blocks demo users from creating branching fields through the proto editor even though `SchematicForm` supports `oneOf` rendering and validation.

## Goals

- Add a proto annotation variant for authoring JSON Schema `oneOf`.
- Convert proto `oneOf` annotations into classic JSON Schema `oneOf` in `protoSchemaToJsonSchema`.
- Keep branch selector behavior aligned with existing Beta semantics (`anyOf` stays treated as `oneOf`; this scope adds `oneOf` authoring only).
- Update demo initial proto value to include at least one realistic `oneOf` property so the feature is visible on first load.
- Add automated tests for proto-to-classic conversion correctness.
- Add automated tests for authoring UI behavior in demo schema rendering.
- Add automated tests for end-to-end browser flow and generated preview schema/form behavior.

## Non-Goals

- No true `anyOf` authoring support in proto schema.
- No `allOf`, conditional schemas, dependencies, or UI schema introduction.
- No changes to persistence semantics or public `SchematicForm` API.
- No generated artifact edits (`dist/`, `storybook-static/`).

## Proposed Proto Shape

Introduce a dedicated proto annotation branch:

```ts
type ProtoOneOfAnnotation = {
  type: "oneOf";
  title?: string;
  description?: string;
  oneOf: ProtoPropertyAnnotation[];
};
```

Notes:
- `type: "oneOf"` is proto-internal and should not be copied to generated JSON Schema.
- Generated schema for this annotation should include `oneOf` only (plus optional shared annotation keys like `title`/`description`), not a literal schema `type: "oneOf"`.
- Each branch item reuses recursive `ProtoPropertyAnnotation`, so branch schemas can be string/number/integer/boolean/null/array/object (and, if desired later, nested `oneOf`).

### Discriminator Rule

- Keep proto variant discrimination `type`-based for consistency with existing proto annotation variants.
- Do not use `oneOf` key presence as the primary discriminator.
- Do not use `type: "array"` for this variant.

Rationale:
- `oneOf` is an array-valued keyword in generated JSON Schema, but that does not imply the resulting schema `type` is array.
- Reusing `type: "array"` would collide with the existing real array annotation variant and make converter branching ambiguous.

## Implementation Steps

### 1. Extend Proto Types And Converter

Update `src/protoSchema.ts`:

- Add `ProtoOneOfAnnotation` type and include it in `ProtoPropertyAnnotation`.
- In `protoAnnotationToJsonSchema`:
- Handle `annotation.type === "oneOf"` as a special conversion path.
- Emit `schema.oneOf = annotation.oneOf.map(...)`.
- Remove proto sentinel type from output (do not emit `type: "oneOf"`).
- Preserve `title` and `description` if set.
- Add defensive converter checks:
- Throw `ProtoSchemaConversionError` when `oneOf` is missing or empty for this variant.
- Include path context in error messages for easier demo debugging.

### 2. Add `oneOf` Variant To Proto Authoring Schema

Update `src/sampleSchemas.ts` `propertyAnnotationSchema.oneOf`:

- Add a new variant titled `One Of` (label copy can be finalized during implementation).
- Variant properties include `title` and `description`.
- Variant `type` enum is fixed to `["oneOf"]`.
- Variant `oneOf` is an array of recursive `$defs.propertyAnnotation` entries.
- Set `oneOf.minItems = 1`.
- `oneOf.items` should resolve through the same recursive annotation definition used by other variants.
- Require `["type", "oneOf"]` for this variant.

This keeps the UX consistent with existing type-variant selection in the demo.

### 3. Update Initial Demo Proto Value To Demonstrate `oneOf`

Update `kitchenSinkSchemaInitialValue` in `src/sampleSchemas.ts`:

- Add a property showing a practical union, for example key `preferredContact`.
- Use annotation `type: "oneOf"` with two branches (`string` email-format and `string` uri-format, or `string` vs `object` contact payload).
- Include branch titles/descriptions so the generated preview selector is readable.

Expected demo effect:
- The authoring form initially shows an existing property row using `One Of`.
- Submitting default data generates preview schema containing a real `oneOf` field and a branch selector in the generated form tab.

### 4. Keep Demo Submit Flow Intact

No structural change expected in `demo/main.tsx`; conversion is already centralized in `protoSchemaToJsonSchema`.

Only adjust demo assertions/tests if UI labels for the new initial row require it.

### 5. Documentation Alignment

Update docs that describe proto demo capabilities:

- `docs/plans/schematicform-proto-schema-demo-plan.md`: add note that proto annotations now include `oneOf`.
- `README.md` and `docs/ARCHITECTURE.md` update only if they explicitly enumerate proto demo authoring variants (not required if wording is already generic).

## Test Plan

### Unit: `src/protoSchema.test.ts`

Add tests:

1. Converts proto `type: "oneOf"` annotation to classic JSON Schema `oneOf` with converted child branches.
2. Preserves top-level annotation metadata (`title`, `description`) while omitting proto sentinel `type`.
3. Throws `ProtoSchemaConversionError` for empty `oneOf` branch list in proto variant.
4. Converts nested `oneOf` in object/array annotation trees without mutation of input object.

### Component/Schema Rendering: `src/SchematicForm.test.tsx`

Add or update tests around `kitchenSinkSchema`/`kitchenSinkSchemaInitialValue`:

1. Initial proto value renders one row with selected `One Of` property type.
2. That row renders an editable `oneOf` options array with recursive branch annotations.
3. Submit with incomplete oneOf branch configuration surfaces validation errors at the correct row/path (no schema compilation error).
4. Selecting and editing oneOf branch options does not corrupt sibling proto property rows.

### Browser Acceptance: `tests/browser/schematic-form.acceptance.ts`

Add scenario (or extend existing valid-submit scenario):

1. Demo loads with initial `One Of` property row present.
2. Submit valid proto schema and open preview drawer.
3. In preview form tab, assert generated field renders a branch selector for the union property.
4. In preview JSON tab, assert generated JSON contains `"oneOf"` at the expected property path.
5. Continue asserting no runtime console/page errors.

### Verification Commands

```bash
npm test
npm run lint
npm run test:acceptance
```

`npm run test:acceptance` should be run with escalation per repo execution notes.

## Risks And Mitigations

- Risk: proto sentinel `type: "oneOf"` accidentally leaks into generated schema.
- Mitigation: explicit converter test asserting absence of `type: "oneOf"` in output.

- Risk: recursive proto schema refs for `oneOf` branch items create unstable authoring UI.
- Mitigation: reuse existing `$defs.propertyAnnotation` recursion pattern and add focused rendering tests.

- Risk: initial demo value becomes too complex and destabilizes existing acceptance assertions by index.
- Mitigation: append new `oneOf` property near the end of `properties` and update tests to assert by pointer/key, not fragile row ordering where possible.

## Success Criteria

1. Demo users can author a property whose generated schema includes `oneOf`.
2. Generated preview JSON and preview form both demonstrate working branch behavior from proto-authored unions.
3. Default demo payload visibly includes at least one `oneOf` example out-of-the-box.
4. Unit, component, and browser acceptance tests cover conversion and UX regression risk.

## Status (2026-06-07)

- Completed.

## Implementation Notes (2026-06-07)

- Added proto `oneOf` annotation support in [protoSchema.ts](/Users/deuster/Documents/Projects/schematic-form/src/protoSchema.ts):
- Introduced `ProtoOneOfAnnotation` and included it in `ProtoPropertyAnnotation`.
- Implemented converter handling for `type: "oneOf"` that emits classic `oneOf` branches.
- Enforced non-empty branch arrays with `ProtoSchemaConversionError`.
- Ensured proto discriminator `type: "oneOf"` is not emitted into generated schema.

- Extended proto authoring schema and demo initial value in [sampleSchemas.ts](/Users/deuster/Documents/Projects/schematic-form/src/sampleSchemas.ts):
- Added a new `One Of` branch variant under `propertyAnnotationSchema.oneOf` with required `type` and `oneOf`.
- Configured recursive branch items through `$ref: "#/$defs/propertyAnnotation"`.
- Added `preferredContact` to `kitchenSinkSchemaInitialValue` using `type: "oneOf"` with two string-format branches.

- Added converter and regression coverage in [protoSchema.test.ts](/Users/deuster/Documents/Projects/schematic-form/src/protoSchema.test.ts):
- Conversion of oneOf annotation shape.
- Assertion that generated oneOf wrapper omits `type`.
- Error case for empty oneOf branch list.
- Nested oneOf conversion with input immutability check.

- Added UI-level proto schema tests in [SchematicForm.test.tsx](/Users/deuster/Documents/Projects/schematic-form/src/SchematicForm.test.tsx):
- Initial proto value now asserts selected `One Of` row rendering and nested branch controls.
- Added validation test for incomplete selected oneOf variant (`minItems` error on branches).

- Updated browser acceptance in [schematic-form.acceptance.ts](/Users/deuster/Documents/Projects/schematic-form/tests/browser/schematic-form.acceptance.ts):
- Updated default property count for added seeded oneOf row.
- Added startup assertions for seeded `preferredContact` oneOf controls.
- Extended preview assertions to confirm generated form branch selector and generated JSON includes `preferredContact` + `oneOf`.

- Verification:
- `npm test` passed.
- `npm run lint` passed.
- `npm run test:acceptance` passed.

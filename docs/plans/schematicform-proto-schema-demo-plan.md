# Proto-Schema Demo And Preview Plan

## Summary

Update the demo so users author a JSON Schema-shaped proto-schema object, submit it, and then preview the generated classic JSON Schema in a right-side drawer using a second `SchematicForm`.

The proto-schema keeps object properties as an ordered array of property definitions instead of the classic JSON Schema `properties` object plus root-level `required` array. Each proto property owns its `key`, `required`, and nested `propertyAnnotation`.

This is demo and helper work. It should not change the public `SchematicForm` rendering model unless an implementation bug is discovered during the work.

## Assumptions

- Use `properties` as the proto-schema field name. The earlier `properies` spelling was confirmed as a typo.
- Keep the existing nested item shape:

```ts
{
  key: string;
  required: boolean;
  propertyAnnotation: ProtoPropertyAnnotation;
}
```

- Keep `anyOf` treated as `oneOf` because that is the current Beta rule.
- Support the same practical JSON Schema subset already demonstrated by `SchematicForm`: object, array, string, number, integer, boolean, null, enum, defaults, formats, length/range constraints, `oneOf`/`anyOf`, and local recursive `$defs`/`$ref`.

## Target Proto-Schema Shape

The demo form schema should be a classic JSON Schema that validates this proto-schema value:

```ts
type ProtoSchemaObject = {
  $schema: "https://json-schema.org/draft/2020-12/schema";
  name?: string;
  title?: string;
  description?: string;
  type: "object";
  properties: ProtoProperty[];
  additionalProperties?: boolean;
};

type ProtoProperty = {
  key: string;
  required: boolean;
  propertyAnnotation: ProtoPropertyAnnotation;
};
```

Object annotations nested inside `propertyAnnotation` should use the same proto property array shape recursively:

```ts
type ProtoObjectAnnotation = {
  title?: string;
  description?: string;
  type: "object";
  default?: Record<string, unknown>;
  properties: ProtoProperty[];
  additionalProperties?: boolean;
};
```

Array annotations should point `items` at a recursive property annotation or property definition through `$defs`/`$ref`, depending on which produces the clearest form shape.

## Goals

- Replace the demo schema with a classic JSON Schema describing a proto-schema object.
- Add top-level proto-schema fields before the property array:
  - `$schema` with single enum option `"https://json-schema.org/draft/2020-12/schema"`
  - `name`
  - `title`
  - `description`
  - `type` with single enum option `"object"`
- Keep the proto-schema property array after those fields.
- Add `additionalProperties: boolean` after the property array.
- Ensure every nested object annotation inside the proto-schema schema uses proto-schema logic: array-based `properties`, per-item `key`, per-item `required`, and nested `propertyAnnotation`.
- Add a helper that converts a created proto-schema object into a classic JSON Schema object.
- On successful demo submit, convert the proto-schema to classic JSON Schema and open a right-side drawer containing a `SchematicForm` rendered with that converted schema.
- Preserve the existing state/debug panel or replace it with equivalent useful demo state without hiding the submitted proto-schema data.

## Non-Goals

- Do not add `uiSchema`.
- Do not broaden `SchematicForm` beyond the existing supported JSON Schema subset.
- Do not implement remote `$ref`, cross-document `$id` resolution, dependency schemas, conditional schemas, or true `anyOf` semantics.
- Do not edit generated `dist/` or `storybook-static/`.

## Implementation Steps

### 1. Introduce Proto-Schema Types And Converter

Add a helper module, likely `src/protoSchema.ts`, with exported types and conversion functions:

```ts
export function protoSchemaToJsonSchema(protoSchema: ProtoSchemaObject): JsonSchema;
export function protoPropertyToJsonSchema(property: ProtoProperty): JsonSchema;
```

Converter responsibilities:

- Copy root `name`, `title`, `description`, `type: "object"`, and `additionalProperties`.
- Convert proto `properties: ProtoProperty[]` into classic `properties: Record<string, JsonSchema>`.
- Build classic `required: string[]` from proto properties where `required === true`.
- Remove `required` when no properties are required.
- Preserve property order by writing `propertyOrdering` from the proto property array keys.
- Convert each property from `propertyAnnotation`.
- For object annotations, recursively convert nested proto property arrays into classic nested `properties` and `required`.
- For array annotations, convert `items` recursively.
- Preserve scalar constraints such as `default`, `enum`, `format`, `minLength`, `maxLength`, `pattern`, `minimum`, `maximum`, `multipleOf`, `minItems`, `maxItems`, and `uniqueItems` when present.
- Avoid mutating the proto-schema input.

Validation in this helper should be narrow and defensive:

- Ignore proto properties without a valid non-empty `key`.
- Decide whether duplicate keys are last-write-wins or rejected. Prefer returning a clear conversion error for duplicates if the demo can surface it cleanly.
- Omit undefined optional fields from the output instead of serializing them.

### 2. Replace The Demo Authoring Schema

Update `src/sampleSchemas.ts` so the current `kitchenSinkSchema` becomes a classic JSON Schema for authoring `ProtoSchemaObject`.

Expected root field ordering:

```ts
propertyOrdering: [
  "$schema",
  "name",
  "title",
  "description",
  "type",
  "properties",
  "additionalProperties",
]
```

Expected root properties:

- `$schema`: required string enum with only `"https://json-schema.org/draft/2020-12/schema"`.
- `name`: optional string annotation.
- `title`: optional string annotation.
- `description`: optional string annotation.
- `type`: required string enum with only `"object"`.
- `properties`: required array of proto property definitions.
- `additionalProperties`: optional boolean.

Keep recursive definitions in `$defs`:

- `$defs.property`: object with `key`, `required`, `propertyAnnotation`.
- `$defs.propertyAnnotation`: `oneOf` variants for string, number, integer, boolean, null, array, and object annotations.
- The object annotation variant must define `properties` as an array of `$defs.property`.
- The array annotation variant should define `items` recursively.

This step should replace current inconsistent places where a referenced recursive property omits `key` and `required` from `$defs.property`.

### 3. Update Demo Submit Flow

Update `demo/main.tsx`:

- Keep the left pane as the proto-schema authoring `SchematicForm`.
- Track latest proto-schema state for the debug panel.
- On valid submit, call `protoSchemaToJsonSchema`.
- Store the converted schema in React state.
- Open a right-side drawer.
- Render a second `SchematicForm` inside the drawer using the converted classic schema.
- Show conversion errors in the demo if conversion fails after form validation.

Use HeroUI drawer components if available in the installed HeroUI version. If the exact drawer API is not available, use the repo's existing CSS approach in `demo/styles.css` for an accessible fixed right-side panel with:

- close button
- `role="dialog"` or equivalent accessible labeling
- scrollable drawer body
- converted-schema preview form

Do not import new runtime dependencies just for the drawer.

### 4. Style The Demo Drawer

Update `demo/styles.css` only for demo-specific layout:

- Keep the left authoring form readable at desktop widths.
- Use a right-side drawer with stable width constraints and mobile fallback.
- Avoid changing package styles in `src/styles.css` unless the implementation reveals a library styling bug.
- Ensure the drawer does not cover the submit controls on narrow screens without an obvious close path.

### 5. Export Helper If Useful

Decide whether `protoSchemaToJsonSchema` should be public:

- If it is demo-only, import it directly from `src/protoSchema.ts` in `demo/main.tsx` and do not export from `src/index.ts`.
- If it is intended as package functionality, export it from `src/index.ts`, add public type exports, and mention it in README.

Prefer demo-only unless the user confirms this helper is part of the library API.

## Test Plan

### Unit Tests

Add `src/protoSchema.test.ts`:

- converts root `$schema`, `name`, `title`, `description`, `type`, `properties`, and `additionalProperties`
- converts required flags into classic `required`
- preserves property order through `propertyOrdering`
- recursively converts nested object properties
- recursively converts array item annotations
- preserves scalar constraints and enum values
- handles optional empty `required` by omitting it
- handles duplicate property keys according to the chosen rule

Update existing `src/SchematicForm.test.tsx` tests that cover `kitchenSinkSchema`:

- expect root fields `Name`, `Title`, `Description`, `Type`, `Schema` or `Properties`, and `Additional Properties`; verify `$schema` is materialized as a hidden required single-value enum
- verify added recursive property rows expose `Key`, `Required`, and `Property Type`
- verify nested object branch exposes a proto-style child `properties` array instead of classic object-shaped `properties`
- verify validation errors stay targeted and do not produce schema compilation errors

### Browser Acceptance

Update `tests/browser/schematic-form.acceptance.ts`:

- reset the demo draft key if it changes
- verify the demo loads with the proto-schema authoring form
- add a property, select a type, submit valid proto-schema data
- assert the right-side drawer opens
- assert the drawer contains a second `SchematicForm` generated from the converted classic schema
- verify recursive rows still add, move, remove, and preserve sibling values
- verify no browser runtime errors are reported

Run:

```bash
npm test
npm run lint
npm run test:acceptance
```

Run `npm run build` if the helper is exported from `src/index.ts`.

## Documentation Updates

Update README only if the helper becomes public package API or if the demo behavior is documented there.

Update `docs/ARCHITECTURE.md` only if the helper becomes part of the library module responsibilities. If it stays demo-only, no architecture update should be required beyond possibly mentioning `src/protoSchema.ts` as a demo support helper.

## Open Questions

- Should `protoSchemaToJsonSchema` be public package API or demo-only?
- Should duplicate proto property keys be rejected with a conversion error, or should later entries overwrite earlier entries?
- Should the generated preview drawer show only the rendered form, or also show the converted JSON Schema text for inspection?

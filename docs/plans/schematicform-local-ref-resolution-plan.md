# Local `$defs` And `$ref` Resolution Plan

## Summary

Add first-class support for local JSON Schema references so `SchematicForm` can render and validate schemas that reuse definitions through `#/$defs/...` and simple local JSON Pointer `$ref` values.

This plan covers recursive local references. It explicitly does not cover remote references, network schema loading, schema registries, cross-document `$id` lookup, or full JSON Schema composition beyond the existing Beta scope.

## Goals

- Render fields whose schema node is a local `$ref`.
- Support recursive schemas without eagerly expanding the full schema graph.
- Preserve current Beta rendering rules for resolved schemas: objects, arrays, enums, formats, display-only `type: "null"`, `oneOf`/`anyOf`, defaults, and required handling.
- Keep Ajv validation as the source of truth.
- Keep inactive branch values, draft persistence, array row metadata, and controlled/uncontrolled state semantics unchanged.
- Document the supported `$ref` subset in README and architecture docs.

## Non-Goals

- Remote `$ref` resolution.
- Fetching schemas over HTTP.
- Cross-file or cross-package reference registries.
- Full `$id` scope resolution.
- `allOf`, dependency, or conditional behavior beyond current Beta handling.
- Infinite UI expansion for recursive schemas.

## Supported Reference Shape

Support local JSON Pointer references inside the same schema document:

```json
{
  "$defs": {
    "field": {
      "type": "object",
      "properties": {
        "key": {"type": "string"},
        "children": {
          "type": "array",
          "items": {"$ref": "#/$defs/field"}
        }
      }
    }
  },
  "type": "array",
  "items": {"$ref": "#/$defs/field"}
}
```

Also support local root references such as `"#"` and local property references such as `"#/properties/profile"` when they point inside the same schema object.

Reject or ignore unsupported references safely:

- references that do not start with `#`
- invalid JSON Pointers
- pointers that resolve outside the schema document
- pointers that resolve to a boolean schema if the renderer cannot use it
- missing targets

Unsupported references should not crash rendering. They should produce a validation compilation error through Ajv or render nothing with a clear internal helper result.

## Rendering Model

Do not pre-dereference the schema tree. Full expansion is unsafe for recursive schemas because it can create infinite objects before form data exists.

Instead, add lazy local reference resolution:

- Keep the root schema available to schema helpers and render functions.
- Resolve one `$ref` at the current render node.
- Pass the resolved effective schema into existing rendering logic.
- Bound recursive rendering by data shape. Arrays render only existing rows plus an add action; objects render only declared properties of the current resolved schema.
- Track the current reference stack so direct cycles such as `"$ref": "#"` do not recurse forever while resolving a single node.

For schemas with `$ref` siblings, use a conservative merge rule:

- Resolve the referenced schema.
- Overlay supported sibling annotations and constraints from the referencing node.
- Preserve the referencing node's `title`, `description`, `default`, and local render-relevant constraints when present.
- Do not merge another sibling `$ref`.

This matches the practical expectation that:

```json
{
  "$ref": "#/$defs/field",
  "title": "Items",
  "description": "Recursive field definition for array items."
}
```

renders with the local title and description while using the referenced field shape.

## Implementation Changes

### 1. Add A Local Reference Resolver

Create a small module, likely `src/refResolver.ts`, with functions such as:

```ts
export type SchemaResolutionResult =
  | {ok: true; schema: JsonSchema; refStack: string[]}
  | {ok: false; reason: string};

export function resolveSchemaReference(
  rootSchema: JsonSchema,
  schema: JsonSchema,
  refStack?: string[],
): SchemaResolutionResult;
```

Responsibilities:

- Parse local JSON Pointer references.
- Decode `~0` and `~1`.
- Resolve against the original root schema.
- Detect repeated refs in the current resolution stack.
- Merge `$ref` siblings over the target schema.
- Return the original schema when there is no `$ref`.
- Avoid mutating caller-provided schema objects.

Do not make this module responsible for rendering decisions, path mutation, branch selection, validation issue mapping, or draft persistence.

### 2. Thread Resolver Context Through Rendering

Extend the internal `RendererContext` in `src/SchematicForm.tsx` with the root schema and a resolver helper.

At the start of render entry points, resolve the effective schema before calling existing schema helpers:

- `renderSchema`
- `renderArrayItemSchema`
- `renderBranchVariant`
- `materializeRequiredIntegerSliderValues`
- `materializeObjectRequiredIntegerSliderValues`
- `applyBranchSelections`
- default value helpers where needed

Keep the public `FieldRenderContext.schema` decision explicit:

- Prefer passing the effective resolved schema so custom renderers see the schema that drives built-in rendering.
- If consumers need the raw unresolved node later, add it in a separate field only after documenting the public API change.

### 3. Update Schema Helpers

Update `src/schema.ts` helper call sites so they operate on effective schemas. Avoid giving every helper implicit global root knowledge unless it materially simplifies the code.

Expected affected behavior:

- `getSchemaType({"$ref": "#/$defs/person"})` should effectively use the referenced `person` schema at render call sites.
- `defaultValueForSchema` should derive defaults through refs without infinite expansion.
- `defaultArrayItemValue` should support referenced `items`.
- `isArrayOfStringEnum` should detect referenced item schemas when an array item points to an enum definition.
- `getBranchSchemas` should detect referenced `oneOf`/`anyOf` nodes.

Prefer resolving at the boundary before calling helpers instead of rewriting every helper to know about references.

### 4. Update Validation Sanitization

`sanitizeSchemaForValidation` should preserve local `$ref` behavior while applying SchematicForm Beta sanitization inside reusable definitions.

Changes:

- Sanitize `$defs` entries recursively.
- Preserve `$ref` on referencing nodes.
- Preserve supported `$ref` siblings, sanitized where they are schema-shaped.
- Continue removing display-only `type: "null"` properties from object validation and `required`.
- Continue converting `anyOf` to `oneOf`.
- Continue ignoring `allOf`, dependencies, and conditional keywords.
- Verify whether the current Ajv setup accepts the schema draft used by sample schemas. If draft 2020-12 schemas with `$defs` fail compilation, switch validation to the appropriate Ajv draft export or normalize the declared draft in a documented way.

Do not resolve refs inside validation sanitization. Ajv should still own reference validation.

### 5. Preserve Branch And Array Semantics

Reference support must work with current branch and array metadata:

- Branch selection pointers remain data pointers, not schema pointers.
- `applyBranchSelections` should resolve refs lazily before looking for `oneOf`/`anyOf`.
- Recursive array items using a referenced branch schema should still set branch selection for newly added rows.
- Array row insert, remove, and move should keep rebasing branch metadata only by data pointer.

### 6. Documentation Updates

Update:

- `docs/ARCHITECTURE.md`
- `README.md`
- possibly `docs/plans/schematicform-beta-implementation-plan.md` to remove or qualify the deferred `$ref` note after implementation

Document:

- local `$defs`/`$ref` support
- recursive refs are supported lazily through data-bound rendering
- remote refs remain unsupported
- sibling `title`, `description`, and defaults on `$ref` nodes are honored by rendering
- unsupported refs may validate through Ajv only if Ajv can resolve them locally

## Test Plan

### Unit Tests

Add `src/refResolver.test.ts`:

- resolves `#/$defs/person`
- resolves `#`
- resolves escaped pointer segments using `~0` and `~1`
- returns a safe failure for missing refs
- returns a safe failure for remote refs
- overlays local `title`, `description`, and `default`
- detects direct resolution cycles without hanging

Update `src/schema.test.ts`:

- default values pass through local refs
- referenced enum item arrays are detected correctly
- referenced branch schemas expose branch metadata
- referenced object property order uses the referenced schema plus local annotations

Update `src/validation.test.ts`:

- sanitized `$defs` remove display-only `null` fields from referenced object validation
- `anyOf` inside `$defs` is converted to `oneOf`
- local `$ref` validation works for a referenced required object
- recursive local refs compile and validate bounded data

### React Tests

Update `src/SchematicForm.test.tsx`:

- renders a top-level array with `items: {"$ref": "#/$defs/field"}`
- renders a property with `"$ref": "#/$defs/person"`
- renders a `$ref` node using local sibling title and description
- adds nested recursive array rows without infinite rendering
- supports branch selection when `oneOf` is inside a referenced definition
- preserves branch value cache when recursive array rows are moved or removed
- submits only active data, not inactive branch cache

### Acceptance Tests

Run `npm run test:acceptance` if the demo schema exercises referenced recursive fields or if demo behavior changes.

Add a browser acceptance case only if the demo exposes recursive refs:

- add a referenced recursive row
- add a nested child row
- fill fields at both levels
- submit and verify data shape
- check console and network output

## Implementation Order

1. Add resolver utilities and unit tests.
2. Integrate resolver into default value and schema helper boundaries.
3. Integrate resolver into rendering paths.
4. Integrate resolver into branch selection application.
5. Update validation sanitization for `$defs`.
6. Add recursive rendering tests.
7. Update README and architecture docs.
8. Run `npm test` and `npm run lint`.
9. Run browser acceptance if the demo or browser-facing recursive behavior changes.

## Risks

- Recursive refs can hang if a resolver expands instead of resolving lazily.
- `$ref` sibling merge behavior can diverge between rendering and Ajv if not documented.
- Sanitizing `$defs` can break refs if definition keys are dropped or rewritten incorrectly.
- Ajv draft selection may need adjustment for schemas declaring draft 2020-12.
- Branch selection inside recursive arrays can expose pointer rebasing bugs.
- Schema fingerprinting will change if consumers switch from pre-expanded schemas to referenced schemas; persisted drafts should continue to be ignored on fingerprint mismatch.

## Acceptance Criteria

- Local `$ref` nodes render through built-in controls.
- Recursive local refs render only as users add data-bound rows and never hang the initial render.
- Referenced definitions validate through Ajv after sanitization.
- Remote refs remain unsupported and documented.
- Existing non-ref schemas render and validate exactly as before.
- `npm test` and `npm run lint` pass.

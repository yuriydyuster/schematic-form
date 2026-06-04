# Browser Draft Persistence And Branch Cache Plan

## Summary

Add opt-in draft persistence for uncontrolled `SchematicForm` instances so unfinished input survives browser refreshes, and add an internal branch value cache so `oneOf`/`anyOf` fields restore previously entered values when users switch back to a variant.

This should address two UX failures:

- Refreshing an unsubmitted form loses the current draft.
- Switching between `oneOf`/`anyOf` variants replaces the value at that path and loses inputs from the previously selected variant.

## Public API

Add a persistence option to `SchematicFormProps`:

```ts
export type SchematicFormDraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type SchematicFormPersistenceOptions = {
  key: string;
  storage?: "localStorage" | "sessionStorage" | SchematicFormDraftStorage;
  debounceMs?: number;
  clearOnValidSubmit?: boolean;
};

export type SchematicFormProps<TData = unknown> = {
  // existing props...
  persistence?: SchematicFormPersistenceOptions;
};
```

Defaults:

- `storage`: `"localStorage"`
- `debounceMs`: `250`
- `clearOnValidSubmit`: `true`
- Persistence hydrates uncontrolled forms only. Controlled forms keep `value` as the source of truth.

## Implementation Changes

- Store draft payloads as versioned JSON with `version`, `savedAt`, `schemaFingerprint`, `data`, `branchSelection`, and `branchValueCache`.
- Compute a deterministic schema fingerprint and ignore stored drafts when the fingerprint does not match the current schema.
- Restore drafts in a browser-only effect after mount, guarded so the initial default state does not overwrite an existing draft before hydration completes.
- Save draft updates when `data`, `branchSelection`, or `branchValueCache` changes; debounce normal writes and flush the latest payload on `pagehide`/unmount.
- Catch storage read/write/remove errors so unavailable storage, quota failures, or private browsing restrictions do not crash the form.
- Clear the persisted draft after a valid submit when `clearOnValidSubmit` is enabled; keep drafts after invalid submit.

For branch switching:

- Add internal `branchValueCache: Record<string, Record<string, unknown>>`.
- Before switching a branch, cache the current value at that branch pointer under the current selected branch index.
- When selecting a new branch, restore cached data for that branch if present; otherwise use the existing branch default behavior.
- Keep inactive branch cache out of public `data`, validation, `onChange`, `onStateChange`, and `onSubmit`.
- Update branch metadata paths when array items are inserted, removed, or moved so mixed `oneOf` array rows keep the correct selected variant and cached values.

## Test Plan

- Unit tests:
  - schema fingerprint is deterministic
  - draft payload parse rejects invalid JSON, wrong version, and schema mismatch
  - storage adapter handles local/session/custom storage and swallowed storage exceptions
  - branch cache restores previously entered values after switching away and back
  - branch metadata rebases correctly for array insert/remove/move
- React Testing Library tests:
  - uncontrolled form restores saved data after remount
  - missing `persistence` leaves current behavior unchanged
  - valid submit removes the saved draft
  - invalid submit keeps the saved draft
  - controlled form does not hydrate over the `value` prop
  - `oneOf`/`anyOf` inactive branch values restore without appearing in submitted data
- Browser acceptance scenario:
  - fill fields, choose a branch, enter branch data, refresh, confirm values and selected branch restore
  - switch branch, enter data, switch back, confirm prior branch input restores

## Assumptions

- Use the prompt-provided instructions as active repo guidance because `./AGENTS.md` is missing.
- Use explicit `persistence.key` rather than auto-generated keys to avoid collisions and accidental cross-form data restore.
- Prefer `localStorage` for refresh and browser-restart survival; `sessionStorage` remains available through the API for per-tab drafts.
- Do not add visible draft UI controls in this change.

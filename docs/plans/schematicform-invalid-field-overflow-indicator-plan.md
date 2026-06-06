# Invalid Field Overflow Indicator Plan

## Objective

Enhance the collapsed object summary UI to provide visual feedback when invalid form fields are hidden behind the overflow indicator (`...` chip).

Currently, when a collapsed object has more than 10 populated fields, only the first 10 are shown as chips and a `...` chip indicates there are more fields. This plan adds logic to turn the `...` chip red when **any of the hidden fields beyond the 10th are invalid**, alerting users that validation errors exist in the hidden portion.

## Current Behavior

- **Collapsed object summaries** show up to 10 field chips representing populated/invalid fields
- **Overflow indicator**: When `items.length > 10`, a `...` chip is rendered in `primary` variant (default color)
- **Invalid fields**: Rendered as `danger` soft chips (red color)
- **Architecture**: Collection logic in `collectCollapsedObjectSummaryItems()` gathers all items but returns only the first 10 to render

## Proposed Changes

### 1. Enhance `CollapsedObjectSummary` Type

**File**: `src/types.ts`

Update the `CollapsedObjectSummary` type to track overflow validity:

```typescript
export type CollapsedObjectSummary = {
  items: Array<{
    label: string;
    value?: string;
    invalid: boolean;
  }>;
  hasOverflow: boolean;
  hasInvalidOverflow?: boolean; // NEW: true if any hidden invalid fields exist
};
```

### 2. Update `getCollapsedObjectSummary()` Logic

**File**: `src/SchematicForm.tsx`

Modify `getCollapsedObjectSummary()` to detect invalid fields in the hidden overflow portion:

```typescript
function getCollapsedObjectSummary<TData>(
  schema: JsonSchema,
  path: PathSegment[],
  context: RendererContext<TData>,
  refStack: string[] = [],
): CollapsedObjectSummary {
  const items: CollapsedObjectSummary["items"] = [];
  collectCollapsedObjectSummaryItems(schema, path, getAtPath(context.data, path), false, context, refStack, items);
  
  const hasInvalidOverflow = items.length > collapsedObjectSummaryLimit
    ? items.slice(collapsedObjectSummaryLimit).some(item => item.invalid)
    : false;
  
  return {
    items: items.slice(0, collapsedObjectSummaryLimit),
    hasOverflow: items.length > collapsedObjectSummaryLimit,
    hasInvalidOverflow,
  };
}
```

### 3. Update `CollapsedObjectSummary` Component

**File**: `src/SchematicForm.tsx`

Modify the component to render the `...` chip with `danger` color when `hasInvalidOverflow` is true:

```typescript
function CollapsedObjectSummary({summary}: {summary: CollapsedObjectSummary}) {
  if (summary.items.length === 0 && !summary.hasOverflow) return null;
  return (
    <div className="schematic-form__object-summary" aria-label="Collapsed object values">
      {summary.items.map((item, index) => (
        <Chip
          className="schematic-form__object-summary-chip"
          color={item.invalid ? "danger" : "default"}
          key={`${item.label}-${item.value ?? ""}-${index}`}
          size="sm"
          title={item.value == null ? item.label : `${item.label}: ${item.value}`}
          variant={item.invalid ? "soft" : "primary"}
        >
          <ChipLabel>
            {trimSummaryText(item.label)}
            {item.value == null ? null : (
              <>
                {": "}
                <strong>{trimSummaryText(item.value)}</strong>
              </>
            )}
          </ChipLabel>
        </Chip>
      ))}
      {summary.hasOverflow ? (
        <Chip
          className="schematic-form__object-summary-chip"
          color={summary.hasInvalidOverflow ? "danger" : "default"}  // CHANGED
          size="sm"
          variant={summary.hasInvalidOverflow ? "soft" : "primary"}  // CHANGED
        >
          ...
        </Chip>
      ) : null}
    </div>
  );
}
```

## Styling Validation

The `...` chip styling will **exactly match** visible invalid field chips when `hasInvalidOverflow` is true.

### Current Invalid Field Chip Styling
Visible invalid fields render with:
- `color="danger"` – red/danger color from HeroUI theme
- `variant="soft"` – soft variant (muted background)
- `size="sm"` – small size (matches all summary chips)
- `className="schematic-form__object-summary-chip"` – semantic class

### Proposed Overflow Chip Styling (When Invalid)
When `hasInvalidOverflow` is true:
- `color="danger"` – **same**
- `variant="soft"` – **same**
- `size="sm"` – **same** (already set)
- `className="schematic-form__object-summary-chip"` – **same**

### Result
The red `...` chip will be **visually indistinguishable** from a regular invalid field chip. Users will perceive it as "this overflow contains an invalid field" through the color change alone, consistent with how visible invalid fields are shown.

### Default (Valid) Overflow Chip Styling
When `hasInvalidOverflow` is false:
- `color="default"` – default/neutral color
- `variant="primary"` – primary variant (bold)
- `size="sm"` – small size
- `className="schematic-form__object-summary-chip"` – semantic class

This preserves the current behavior: neutral `...` chip when hidden fields are valid or empty.

## Testing Strategy

### Unit Tests

**File**: `src/SchematicForm.collapse.test.tsx`

Add new test cases:

1. **Test: "shows red overflow indicator when hidden fields are invalid"**
   - Create schema with 15 fields
   - Set default value for 12 fields (fields 1-12 populated)
   - Mark field 11 or 12 as invalid via validation
   - Collapse the object
   - Assert: First 10 chips render, field 11 or 12 is one of them
   - Assert: `...` chip has `chip--danger` and `chip--soft` classes

2. **Test: "shows default overflow indicator when hidden fields are valid"**
   - Create schema with 15 fields
   - Set default value for all 15 fields (all populated, all valid)
   - Collapse the object
   - Assert: First 10 chips render (all valid, default color)
   - Assert: `...` chip has `chip--default` and `chip--primary` classes

3. **Test: "shows red overflow indicator when both visible and hidden fields are invalid"**
   - Schema with 12 fields
   - Set invalid values in fields 2, 3, and 11
   - Collapse and assert both visible invalid chips (fields 2, 3) and red `...` render

4. **Test: "shows default overflow when all hidden fields are empty (no overflow display)"**
   - Schema with 15 fields
   - Only populate fields 1-5
   - Collapse and assert no `...` chip (less than 10 items total)

### Browser Acceptance Tests

Add scenarios to `tests/browser/schematic-form.acceptance.ts`:

- Verify red `...` indicator is visually distinct (color change is observable in screenshot)
- Verify expanding a collapsed object with red `...` shows the hidden invalid fields
- Verify expanding after invalid submit shows all errors including those in overflow

## Implementation Notes

### No Validation Logic Changes

- Validation remains unchanged; this is purely UI interpretation
- Validation errors already computed via Ajv in `context.issueMap`
- No changes to validation.ts or validation.test.ts needed

### Backwards Compatibility

- Type addition is non-breaking (`hasInvalidOverflow` is optional)
- Existing consumer code rendering summaries requires no changes
- If `hasInvalidOverflow` is undefined, `...` chip renders with default styling (safe fallback)

### Performance

- Single pass through items array: `items.slice(collapsedObjectSummaryLimit).some(item => item.invalid)`
- O(n) where n = items beyond limit (typically small number, max array size)
- No additional schema traversals or validation runs

## Files Modified

1. `src/types.ts` – Add `hasInvalidOverflow` to `CollapsedObjectSummary` type
2. `src/SchematicForm.tsx` – Update three functions:
   - `getCollapsedObjectSummary()` – Compute `hasInvalidOverflow`
   - `CollapsedObjectSummary()` – Render red `...` chip when true
3. `src/SchematicForm.collapse.test.tsx` – Add four new test cases
4. `tests/browser/schematic-form.acceptance.ts` – Add acceptance scenarios (optional)

## Deliverables

- [ ] Plan review with user
- [ ] Implementation of type and logic changes
- [ ] Unit test coverage
- [ ] Browser acceptance test coverage (if applicable)
- [ ] Manual verification in demo app
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run test:acceptance` passes (if acceptance tests added)

## Success Criteria

1. Red `...` chip appears only when hidden fields contain invalid data
2. Default `...` chip appears when hidden fields are all valid or empty
3. All existing tests pass
4. New unit tests cover both red and default overflow states
5. Demo app visually confirms red indicator on complex schemas with 10+ fields

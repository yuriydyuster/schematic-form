# Chrome DevTools MCP Acceptance Checks

Run the demo server with:

```bash
npm run dev
```

Use Chrome DevTools MCP against the local Vite URL and verify:

- The demo page loads without console errors.
- Invalid submit focuses the first invalid field and displays the error summary.
- Nested object and array levels render full width without overlap.
- `Add Milestone` adds rows until `maxItems` is reached, and row move/remove actions preserve sibling values.
- `Payment method` branch selection switches between titled `anyOf` branches, with V1 treating `anyOf` as `oneOf`.
- Dropdown selected values render as tags, except the branch selector.
- The integer priority field renders as a horizontal slider.

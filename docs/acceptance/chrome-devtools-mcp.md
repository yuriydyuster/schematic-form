# Chrome DevTools MCP Manual Acceptance Checks

This document describes manual browser acceptance and agent debugging for the local SchematicForm demo. These checks complement Vitest and Playwright coverage; they are useful for exploratory focus behavior, layout, HeroUI popovers, and console/network inspection.

## Tool Roles

- Playwright owns repo-automated browser acceptance through `npm run test:acceptance`.
- Chrome DevTools MCP owns manual agent inspection, snapshots, console reads, network reads, and exploratory debugging.
- Do not use a normal user Chrome tab as MCP evidence.

## Start The Demo

```bash
npm run dev
```

Use the local URL printed by Vite, usually:

```text
http://127.0.0.1:5173/
```

## Correct MCP Workflow

Use the Chrome DevTools MCP browser context for all evidence. Do not drive a normal user Chrome tab and then expect MCP reads to reflect that tab.

Recommended sequence:

1. Call `mcp__chrome_devtools.list_pages` to see the MCP-controlled pages.
2. Call `mcp__chrome_devtools.new_page` with the local Vite URL. Prefer an `isolatedContext` name such as `"schematic-form-acceptance"` when available.
3. Call `mcp__chrome_devtools.take_snapshot` and use the returned accessibility-tree `uid` values for interactions.
4. Use `mcp__chrome_devtools.click`, `fill`, `fill_form`, `press_key`, or `type_text` against current snapshot `uid` values.
5. Take a fresh snapshot after each state-changing interaction. Old `uid` values can become stale after React rerenders or HeroUI popovers open.
6. Use `mcp__chrome_devtools.list_console_messages` with error/warn/issue filters before reporting results.
7. Use `mcp__chrome_devtools.list_network_requests` if load failures, missing assets, or unexpected requests are suspected.
8. Use `mcp__chrome_devtools.resize_page` or `emulate` for viewport checks.
9. Close extra MCP pages after the run when practical.

## Why The Browser Window Matters

The reliable case is a Chrome window or page controlled by the MCP automation connection, often visibly marked as being used by an automated tool. MCP snapshots, console messages, and network requests are scoped to the selected MCP page.

The unreliable case is opening or changing a normal user Chrome tab with shell commands, AppleScript, `open`, manual navigation, or a browser UI click. That tab may not be the selected MCP page, and MCP may return stale, empty, or unrelated information.

If the wrong browser opens:

- Stop using that tab for acceptance evidence.
- Call `list_pages`.
- Create a new MCP-controlled page with `new_page`, or select the correct MCP page with `select_page`.
- Navigate that MCP page to the local Vite URL.
- Retake the snapshot and repeat the check.

## Acceptance Checklist

Verify these behaviors in the MCP-controlled page:

- The demo page loads without console errors.
- The root `Project Intake` form and the `State` panel are visible.
- Invalid submit shows the error summary and focuses the first invalid field.
- Nested object and array levels render full width without overlap.
- `Add Milestone` adds rows until `maxItems` is reached.
- Milestone row move and remove actions preserve sibling values.
- `Payment method` branch selection switches between titled `anyOf` branches.
- `Fulfillment path` branch selection switches between titled `oneOf` branches.
- Beta behavior treats `anyOf` as `oneOf`: only the selected branch is active and validated.
- Mixed `oneOf` array items can switch between object, enum string, null, and boolean variants.
- Previously entered inactive branch values restore when switching back, but inactive values do not appear in submitted data.
- Dropdown selected values render through the HeroUI select value. There is no separate SchematicForm tag group.
- The integer priority field renders as a horizontal slider.
- Date, date-time, and time fields render through HeroUI date/time components rather than native date/time inputs.
- Draft persistence restores uncontrolled form values after reload when the schema fingerprint matches.
- A valid submit clears the persisted demo draft by default.

## Suggested Evidence To Report

For an acceptance run, report:

- Local URL tested.
- Viewport size.
- Console result, especially errors, warnings, and issues.
- Whether each checklist item passed or failed.
- Any exact failing control label or visible error text.

Do not commit screenshots, traces, or exported MCP artifacts unless the user asks for them.

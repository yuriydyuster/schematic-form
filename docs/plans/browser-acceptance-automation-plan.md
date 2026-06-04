# Browser Acceptance Automation Plan

## Summary

Status: implemented.

`test:acceptance` now runs automated Playwright browser assertions and returns pass/fail status. Chrome DevTools MCP remains the manual inspection and agent debugging tool.

## Tool Roles

- Playwright starts or connects to the Vite demo, launches Chromium, runs assertions, checks runtime errors, and exits with test status.
- Chrome DevTools MCP is for manual snapshots, console/network inspection, and exploratory agent debugging.
- CDP is the lower-level protocol family; using Playwright avoids maintaining a custom CDP harness in this repo.

## Implemented Changes

- `dev:acceptance` starts the Vite demo for manual checks.
- `test:acceptance:install` installs the Chromium browser binary.
- `test:acceptance` runs the Playwright suite.
- Browser tests cover demo load, runtime console errors, invalid-submit focus, array row operations, branch validation, and draft reload persistence.
- Documentation distinguishes Playwright automation from Chrome DevTools MCP inspection.

## Test Plan

- `npm test`
- `npm run lint`
- `npm run test:acceptance`
- Chrome DevTools MCP checklist remains available for exploratory verification.

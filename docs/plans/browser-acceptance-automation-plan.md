# Browser Acceptance Automation Plan

## Summary

The current `test:acceptance` npm script starts the Vite dev server but does not execute browser assertions or return a pass/fail result. This can confuse agents and developers because the command name sounds like an automated test.

Keep the current documentation-only round limited to docs. Implement the testing change later.

## Problem

- `npm run test:acceptance` runs `vite --host 127.0.0.1`.
- The command stays open as a server process.
- It does not drive Chrome, assert behavior, inspect console output, or exit with test status.
- Browser acceptance currently depends on a manual Chrome DevTools MCP workflow.
- Agents sometimes open or control a normal user Chrome tab, which can make MCP snapshots and console/network reads stale or unrelated.

## Goals

- Make acceptance testing semantics explicit and hard to misuse.
- Preserve Chrome DevTools MCP as the recommended manual inspection tool for agents.
- Add a deterministic automated browser test path that can pass or fail locally and in CI.

## Proposed Implementation

1. Rename the existing server-only script to something explicit, such as `dev:acceptance` or rely on `npm run dev`.
2. Add an automated browser test runner, likely Playwright, for core real-browser checks:
   - demo loads
   - no console errors
   - invalid submit shows the error summary and focuses the first invalid field
   - array rows add/move/remove correctly
   - branch selectors switch and validate selected branches only
   - draft persistence restores after reload
3. Add a new script such as `test:browser` or make `test:acceptance` run the automated suite.
4. Keep `docs/acceptance/chrome-devtools-mcp.md` for manual exploratory acceptance and agent debugging.
5. Update `AGENTS.md` and README after the script behavior changes.

## Test Plan

- `npm test` still passes.
- New browser test command starts or reuses the Vite server, runs assertions, and exits.
- Console errors fail the browser test unless explicitly allowlisted.
- The manual Chrome DevTools MCP checklist remains accurate for exploratory verification.

## Open Questions

- Should browser tests use Playwright for CI while Chrome DevTools MCP remains manual-only?
- Should the package keep the name `test:acceptance`, or should that name be reserved for manual acceptance notes?
- Should generated screenshots/videos be disabled by default to avoid repository noise?

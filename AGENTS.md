# AGENTS.md

## Read First

- Read this file at the start of every session in this repo.
- Read `docs/ARCHITECTURE.md` before making architectural or behavioral changes.
- Read the relevant plan in `docs/plans/` when continuing planned work.
- If user instructions conflict with these notes, follow the newest user instruction and call out the conflict.

## Project Summary

This repo is a React 19 and HeroUI v3 component library named `@schematic-form/react`. Its main component, `SchematicForm`, renders a supported JSON Schema subset into a form, validates with Ajv, emits public form state, and optionally persists uncontrolled drafts.

The package is not a full application. `demo/` is a local playground, `src/sampleSchemas.ts` supports demo/test coverage, and `src/index.ts` is the public library entry.

## Important Files

- `src/SchematicForm.tsx`: main component, recursive rendering, state, branch handling, draft hydration, submit/reset, focus behavior.
- `src/schema.ts`: schema interpretation for rendering.
- `src/validation.ts`: Ajv schema sanitization and error mapping.
- `src/persistence.ts`: draft payloads and browser/custom storage.
- `src/branchMetadata.ts`: branch pointer rebasing for array row operations.
- `src/paths.ts`: immutable nested data helpers and JSON Pointer utilities.
- `src/types.ts`: public and internal types.
- `src/styles.css`: package CSS entry.
- `demo/main.tsx`: Vite demo app.
- `docs/acceptance/chrome-devtools-mcp.md`: browser acceptance workflow.
- `docs/ARCHITECTURE.md`: architecture source of truth.

## Commands

- Install dependencies: `npm install`
- Run the demo: `npm run dev`
- Run tests: `npm test`
- Typecheck/lint: `npm run lint`
- Build package: `npm run build`
- Build Storybook: `npm run build:storybook`

`npm run test:acceptance` currently starts the Vite dev server only. It does not run an automated browser assertion suite.

## Development Rules

- Prefer existing architecture and helper modules over adding new abstractions.
- Keep schema interpretation, validation sanitization, path mutation, persistence, and branch metadata in their current modules unless there is a strong reason to move them.
- Do not introduce `uiSchema` or advanced JSON Schema behavior without updating architecture docs, README, tests, and a plan.
- Treat `anyOf` as `oneOf` in V1.
- Keep display-only `type: "null"` fields out of public data and validation.
- Preserve controlled form semantics: `value` is the source of truth and persistence must not hydrate over it.
- Persistence must stay best-effort; storage errors should not break the form.
- When a bug is discovered but the user requested documentation-only work, create a plan under `docs/plans/` instead of changing runtime code.

## Testing Expectations

Use focused tests for the affected layer:

- Rendering and interaction changes: update `src/SchematicForm.test.tsx`.
- Schema rendering rules: update `src/schema.test.ts`.
- Validation behavior: update `src/validation.test.ts`.
- Draft persistence: update `src/persistence.test.ts`.
- Path utilities: update `src/paths.test.ts`.
- Array branch metadata: update `src/branchMetadata.test.ts`.

Run at least `npm test` for behavioral changes and `npm run lint` for TypeScript-facing changes. For docs-only edits, `git diff --check` is usually enough unless the docs describe behavior that should be verified against tests.

## Chrome DevTools MCP Usage

Use Chrome DevTools MCP for browser acceptance checks. Do not rely on manually opened user browser tabs for MCP evidence.

Proper workflow:

1. Start the dev server with `npm run dev` and note the local URL printed by Vite.
2. Use MCP page tools, not shell browser commands, to create/select the browser context: `mcp__chrome_devtools.list_pages`, then `mcp__chrome_devtools.new_page` or `mcp__chrome_devtools.select_page`.
3. Prefer `new_page` with the local URL and an isolated context name for acceptance runs.
4. Use `mcp__chrome_devtools.take_snapshot` and interact through snapshot `uid` values with `click`, `fill`, `fill_form`, `press_key`, or `type_text`.
5. Take a fresh snapshot after every state-changing interaction because old `uid` values can become stale.
6. Use `list_console_messages` and `list_network_requests` on the selected MCP page before reporting acceptance results.
7. Use `resize_page` or `emulate` for viewport checks.
8. Close extra MCP pages when the run is done if that does not close the last page.

If Chrome opens a normal user tab instead of a window marked as controlled by automation, the MCP may not return reliable snapshots, console messages, or network state. In that case, stop using that tab for evidence, create/select an MCP-controlled page, and rerun the check there.

Avoid `open`, `xdg-open`, AppleScript, or manual Chrome navigation for acceptance evidence unless the user explicitly asks for manual browser control.

## Documentation Rules

- Keep README beginner-friendly and focused on what the library does, setup, supported schema behavior, and common usage.
- Keep `docs/ARCHITECTURE.md` concise but complete enough for future agents to understand module boundaries and data flow.
- Keep implementation plans in `docs/plans/` when work should be deferred.
- Do not edit generated output such as `dist/` or `storybook-static/` unless the user explicitly requests regenerated artifacts.

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
- Install browser test binaries: `npm run test:acceptance:install`
- Run automated browser acceptance: `npm run test:acceptance`

`npm run test:acceptance` runs Playwright against the local Vite demo and exits with pass/fail status. Chrome DevTools MCP remains the manual agent inspection tool.

## Development Rules

- Prefer existing architecture and helper modules over adding new abstractions.
- Keep schema interpretation, validation sanitization, path mutation, persistence, and branch metadata in their current modules unless there is a strong reason to move them.
- Do not introduce `uiSchema` or advanced JSON Schema behavior without updating architecture docs, README, tests, and a plan.
- Treat `anyOf` as `oneOf` in Beta.
- Keep display-only `type: "null"` fields out of public data and validation.
- Preserve controlled form semantics: `value` is the source of truth and persistence must not hydrate over it.
- Persistence must stay best-effort; storage errors should not break the form.
- Keep `SchematicForm.tsx` class names semantic-only with direct `schematic-form__*` selectors; use the local `cx(...)` helper only for conditional state classes or caller-provided `className`.
- Keep SchematicForm layout and visual styling in `src/styles.css` using Tailwind `@apply` and HeroUI theme tokens where possible; do not reintroduce Tailwind utility strings into `SchematicForm.tsx`.
- Preserve stable `schematic-form__*` selectors because tests and consumer CSS may target them.
- When a bug is discovered but the user requested documentation-only work, create a plan under `docs/plans/` instead of changing runtime code.

## Execution Lessons

- Parallelize only independent commands. Do not run dependent git commands (for example `git add` and `git commit`) in parallel; run them sequentially.
- Typical requested flow in this repo can be: create plan -> implement -> update the same plan with status/notes -> commit. Preserve that sequence unless user redirects.
- When a user asks to implement a plan in `docs/plans/`, append `Status` and `Implementation Notes` with the completion date in that same plan file after implementation and verification.
- Always run `npm run test:acceptance` with escalation so Playwright web server startup can bind local ports without sandbox-related flakes.
- After creating a commit, verify with `git status --short` and `git show --name-only HEAD` to confirm intended file scope.

## Testing Expectations

Use focused tests for the affected layer:

- Rendering and interaction changes: update `src/SchematicForm.test.tsx`.
- Schema rendering rules: update `src/schema.test.ts`.
- Validation behavior: update `src/validation.test.ts`.
- Draft persistence: update `src/persistence.test.ts`.
- Path utilities: update `src/paths.test.ts`.
- Array branch metadata: update `src/branchMetadata.test.ts`.

Run at least `npm test` for behavioral changes and `npm run lint` for TypeScript-facing changes. Run `npm run test:acceptance` when real browser behavior, focus, popovers, layout, or draft reloads are affected.

## Chrome DevTools MCP Usage

Use Chrome DevTools MCP for manual browser inspection and agent debugging. Do not use it as the repo-owned automated browser test runner; `npm run test:acceptance` owns that role through Playwright.

Do not rely on manually opened user browser tabs for MCP evidence.

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

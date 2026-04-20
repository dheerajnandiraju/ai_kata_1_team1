---
name: e2e-testing
description: >
  Guides E2E browser test authoring using Playwright via VS Code's agentic
  browser tools (v1.110). Only load this skill when the workflow is actively
  in the testing phase or when the user explicitly asks for E2E or browser
  testing. Do not load it during workflow startup, requirements, architecture,
  coding, or integration-testing.
user-invocable: true
disable-model-invocation: true
---

# E2E Testing Skill

## Phase Gate

Load this skill only when `testing-agent` is executing E2E work or when the
user explicitly asks to create or run browser-based end-to-end tests.

Do not load this skill during `/start-multi-agent-flow`, mode selection,
requirements, architecture, coding, or integration-testing.

You are authoring end-to-end browser tests for a full-stack application.

## Step 1 — Discover the App Entry Point

Use `#codebase` to find:
- Frontend start command (`npm run dev`, `vite`, `next dev`, `python manage.py runserver`)
- The port the frontend serves on (check `vite.config`, `next.config`, `.env`, `package.json`)
- Main routes/pages from the router config

## Step 2 — Start the App

Run the app with the terminal tools.

- Use sync mode for short start commands and async mode for long-running dev servers.
- On Windows PowerShell, use `npm.cmd` instead of `npm` when execution policy blocks `npm.ps1`.
- Confirm readiness with a real HTTP check or a stable ready log line, using whatever client already exists in the workspace shell.

## Step 3 — Critical User Flows to Test (always cover these)

### Auth Flow
1. Navigate to `/register` → fill form → submit
2. Verify redirect to dashboard or confirmation page
3. Navigate to `/login` → fill credentials → submit
4. Verify redirect to authenticated area
5. While unauthenticated, navigate to a protected route → verify redirect to `/login`
6. Log out → verify session is cleared

### Core Feature Flow (CRUD)
1. Create a resource (fill form, submit) → verify it appears in list/dashboard
2. Update it (click edit, change field, save) → verify update is reflected
3. Delete it → verify it is removed from the list

### Error Handling
1. Submit an empty required form → verify validation error messages appear (not a 500 page)
2. Submit invalid data (bad email, too-short password) → verify specific field-level errors
3. Navigate to a non-existent route → verify 404 or redirect, not a crash

## Step 4 — Running Tests with the Integrated Browser

Use `open_browser_page` to load the app, then interact with that page using browser tools and `run_playwright_code`.

Example verification on an existing page:

```javascript
// Covers: AC-03 (user can log in), AC-04 (dashboard visible after login)
await page.waitForURL('**/dashboard', { timeout: 5000 });
await page.screenshot({ path: 'docs/screenshots/dashboard.png', fullPage: true });

const heading = await page.locator('h1, h2, [role="heading"]').first().textContent();
return {
  status: 'PASS',
  heading: heading?.trim() ?? null
};
```

Use the browser interaction tools for navigation and form filling:
- `type_in_page` for fields
- `click_element` for buttons and links
- `navigate_page` for route transitions
- `read_page` to confirm rendered content before deeper assertions

**Label each test with its AC IDs in a comment** — this is required for the traceability matrix.

## Step 5 — Screenshot Key States

Always capture screenshots for the testing report at:
- Homepage (unauthenticated)
- Dashboard (after login)
- A create/edit form
- A list/table view
- A validation error state

Save all screenshots to `docs/screenshots/` and reference them in `docs/04-testing-report.md`.

Use `screenshot_page` for quick visual checks, or `page.screenshot()` inside `run_playwright_code` when the screenshot must be written to `docs/screenshots/` for the report.

## Step 6 — Accessibility Check (required)

After testing each major page, run an axe accessibility check on the current browser page.

Preferred approach:
1. Inject axe into the current page with `run_playwright_code`.
2. Run `axe.run()` via `page.evaluate()`.
3. Treat CRITICAL and SERIOUS violations as failures.
4. Treat MODERATE and MINOR violations as warnings.

Example pattern:

```javascript
await page.addScriptTag({
  url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js'
});

const results = await page.evaluate(async () => {
  return await window.axe.run();
});

return results.violations.map(violation => ({
  id: violation.id,
  impact: violation.impact,
  nodes: violation.nodes.length
}));
```

If a strict CSP blocks CDN injection, install `axe-core` locally and inject it from the workspace instead.

## Step 7 — Mapping All Tests to Acceptance Criteria

Every test MUST be mapped to at least one AC ID from `docs/01-requirements.md`. Tests without an AC mapping indicate a requirements gap — mark those ACs as `UNCOVERED` with an explanation.

## Step 8 — E2E Section in the Testing Report

Add this table to `docs/04-testing-report.md`:

```markdown
## E2E Test Results

| Test Case | AC IDs | Status | Screenshot |
|-----------|--------|--------|------------|
| Auth — register | AC-01 | PASS | screenshots/register.png |
| Auth — login | AC-03, AC-04 | PASS | screenshots/dashboard.png |
| Create resource | AC-07 | PASS | screenshots/create.png |
| Validation errors | AC-09 | PASS | screenshots/errors.png |
| 404 route | AC-10 | PASS | — |

## Accessibility Summary

| Page | CRITICAL | SERIOUS | MODERATE | MINOR |
|------|----------|---------|----------|-------|
| Homepage | 0 | 0 | 1 | 3 |
| Dashboard | 0 | 0 | 0 | 2 |
```

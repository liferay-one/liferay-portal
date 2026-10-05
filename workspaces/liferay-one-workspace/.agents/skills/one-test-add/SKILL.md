---

allowed-tools: [Bash, Glob, Grep, Read, Edit, Write]
description: Add a test to the Liferay One workspace at the right tier (JUnit, Vitest, Playwright integration, or Playwright e2e), following the established patterns. Use when the user asks to write, add, or scaffold a test for an endpoint, a route, or a UI flow.
name: one-test-add

---

# Add a One Workspace Test

Route the behavior to the fastest tier that can prove it, then follow the harness for that tier. Consult [`tests/TEST_PLAN.md`](../../tests/TEST_PLAN.md) for the prioritized backlog and [`tests/README.md`](../../tests/README.md) for conventions. Run the result with the `one-test` skill.

## 1. Choose the Tier

- Spring Boot logic (a controller's routing, status codes, and body mapping, or a branch in a service, converter, cron, or subscriber): **Unit (Spring Boot)** with JUnit 5, in `client-extensions/liferay-one-etc-spring-boot/src/test/java`.
- Custom element logic (a util, a route table, or a component rendered with mocked data): **Unit (Custom Element)** with Vitest, next to the source file under `client-extensions/liferay-one-custom-element/src`.
- The contract of an endpoint through the portal, or OAuth2 scope enforcement (`/o/one/v1`, headless): **Integration** with Playwright, in `tests/integration/specs`.
- A whole UI flow through the browser: **E2E** with Playwright, in `tests/e2e/specs`. Use E2E only when integration cannot show the behavior.

Decision heuristic: if a test can run without a portal, make it a unit test (JUnit or Vitest). If it can run without a browser, make it an integration test. Otherwise, make it an e2e test.

## 2. Follow the Matching Harness

### JUnit

Copy the closest existing test under `src/test/java`. Controllers use `MockMvcBuilders.standaloneSetup(...)` with no Spring context. Build services, converters, crons, and subscribers with `new`, wire them with `ReflectionTestUtils`, and give them Mockito collaborators.

### Vitest

Name the test after its source file (`string.ts` → `string.test.ts`) and import `describe`, `expect`, `it`, and `vi` from `vitest`. Globals are off. `src/testSetup.ts` already stubs `window.Liferay` and registers the `jest-dom` matchers; override a specific `Liferay` value with `vi.spyOn` or `vi.mock` inside the test. Render components with `@testing-library/react` and query by role or label.

### Playwright integration

The `apiTest`/`APIHelpers` harness (`integration/fixtures/apiTest.ts`) is the template.

- Import `apiTest as test` from `../fixtures/apiTest`. The `api` fixture (`APIHelpers`) wraps auth and JSON for the `/o/one/v1` Spring Boot endpoints behind OAuth2 scopes.
- `api.get/post/delete` assert success and return parsed JSON. For assertions on other statuses (validation, 404, 403), use `api.send(method, path, body)`, which returns the raw `APIResponse`.
- For unauthenticated and security checks, import `test` directly from `@playwright/test` and use the bare `request` fixture (no auth).

### Playwright e2e

The page objects under `tests/e2e/pages` and the `pagesTest` fixture are the template.

- Sign in with `liferayLogin` (`tests/e2e/utils/loginUtils.ts`), then drive the SPA through `SPAPage` rather than raw selectors, so a markup change needs an edit in one file only.
- Navigate with `gotoAndExpectRender` (`tests/e2e/utils/customElementUtils.ts`). It waits until the custom element renders, so the spec does not start before the SPA renders. `gotoStable` only waits for `domcontentloaded` and retries an aborted navigation once.
- Assert on what the user sees (`getByRole`, `getByText`), never on an internal class name.
- A persona spec reads its credentials from environment variables. Add those variables to `.env.example`. When the variables are absent, skip the spec and give a reason. Never fall back to the administrator, because the administrator's access would satisfy a row that expects a denial.

## 3. Link to the Plan

The plan under `tests/plan/` tracks every route, hook, client, module, endpoint, cron, subscriber, listener, and class by a stable ID. `plan:coverage` counts an item as covered only when a test references that ID.

- Reference the covered plan ID in the test with a bracketed `[REST-…]` / `[ROUTE-…]` / `[HOOK-…]` / `[CLS-…]` tag in the title or in a comment. A bare ID token also counts, so data driven tables need no extra annotation. One test may list several IDs. Find the ID in the matching `tests/plan/*.md` file.
- To add a new endpoint, route, cron, or subscriber, run `yarn plan:scaffold` first to generate its row. Then curate the Requirement and Priority.
- Confirm with `yarn plan:check` (plan covers the code, no orphan tags) and `yarn plan:report` (real versus uncovered).

## 4. Verify and Conform

Run the new test with the `one-test` skill and confirm that it passes. For a regression guard, also confirm that it fails when the behavior is broken. Then run the `format-source` skill so the new files match Liferay's coding standards before you commit.
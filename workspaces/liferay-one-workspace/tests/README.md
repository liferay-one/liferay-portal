---

description: Playwright integration + E2E tests for the Liferay One workspace.
name: tests

---

# Workspace Tests

Playwright covers the surface exposed after deployment in this workspace. Unit tests live with the code they exercise, not here. See [`Layout`](#layout).

All tests run against a local Liferay instance by default (`${BASE_URL}`, defaulting to `http://localhost:8080`). Tests reach the `liferay-one-etc-spring-boot` client extension directly at `${SPRING_BOOT_BASE_URL}` (defaulting to `http://localhost:58081`) for unauthenticated probes. All other requests go through the Liferay OAuth2 proxy under `/o/one/v1`.

## First Run Bootstrap

From the workspace root:

```bash
yarn bootstrap:tests      # Create .env, install deps, fetch Chromium
```

`bootstrap:tests` is idempotent, so it is safe to rerun on a fresh checkout. It runs `tests/scripts/bootstrap.sh`.

## Testing Strategy

There are four tiers. Each tier has one home and one trigger:

| Tier | Tooling | Lives In | When to Add |
|---|---|---|---|
| Unit (Spring Boot) | JUnit 5 (+ Spring MockMvc) | Colocated with source in `liferay-one-etc-spring-boot`: `src/test/java/**/*Test.java` | Spring logic with no portal: controllers (routes, status codes, bodies) via MockMvc; services, converters, crons, and subscribers via plain JUnit + Mockito. |
| Unit (Custom Element) | Vitest + Testing Library (jsdom) | Colocated with source in `liferay-one-custom-element`: `src/**/*.test.{ts,tsx}` | SPA logic with no portal: utils, route tables, and components rendered against a mocked `Liferay` global and mocked fetches. |
| Integration | Playwright `request` (API only, no browser) | `tests/integration` | Anything that depends on a booted portal: the `/o/one/v1` Spring Boot endpoints and OAuth2 scope enforcement. |
| E2E | Playwright (browser) | `tests/e2e` | Whole flows through the custom-element UI (Marketplace, Support, Admin). Use E2E only when integration cannot cover the behavior. Move behavior down to integration when possible. |

Decision heuristic: if it can run without booting the portal, it is a unit test (JUnit for Spring Boot, Vitest for the custom element). If it runs without a browser, it is an integration test. Otherwise, it is an E2E test.

## Unit (Spring Boot)

Java unit tests live under `src/test/java` inside `liferay-one-etc-spring-boot` and use JUnit 5. Tests use Spring's `MockMvc` for controllers. Tests use Mockito and `ReflectionTestUtils` for services, converters, crons, and the Pub/Sub subscriber, which they treat as plain classes. No test requires a running portal or a database.

Run from the Spring Boot extension directory:

```bash
cd client-extensions/liferay-one-etc-spring-boot
../../gradlew test
```

Or from the workspace root:

```bash
./gradlew :client-extensions:liferay-one-etc-spring-boot:test
```

Controller tests use `MockMvcBuilders.standaloneSetup(...)` to instantiate controllers directly, so no Spring application context loads. A test instantiates noncontroller classes (services, converters, crons, the subscriber) with `new`, sets their `@Value`/`@Autowired` fields with `ReflectionTestUtils`, and mocks their collaborators with Mockito. Add a test class under `src/test/java` for each controller, cron, subscriber, and logic-bearing service or converter you want to cover.

## Unit (Custom Element)

The custom element's unit tests use Vitest in a jsdom environment, configured by `client-extensions/liferay-one-custom-element/vitest.config.ts`. Name a test after the file it covers (`string.ts` → `string.test.ts`) and keep it next to that file under `src`. The config resolves the `~` alias and stubs `@liferay/oauth2-provider-web/client` exactly as the Vite dev server does.

`src/testSetup.ts` runs before every test file. It installs a permissive `window.Liferay` stub, because modules read `Liferay.ThemeDisplay` at import time. It registers the Testing Library `jest-dom` matchers. It unmounts rendered trees after each test. A test that depends on a specific `Liferay` value overrides it with `vi.spyOn` or `vi.mock`. Import `describe`, `expect`, `it`, and `vi` from `vitest` explicitly; globals are off.

Run from the workspace root:

```bash
yarn test:unit
```

Or from the custom element directory:

```bash
yarn test                        # Run once
yarn test:watch                  # Rerun on change
yarn test:coverage               # Write coverage/ (text summary, HTML, lcov)
```

Each run also writes a JUnit report to `TEST-frontend-js.xml`, the file name CI collects JavaScript unit results from.

## Layout

```
tests/
├── playwright.config.ts         # Two projects: integration + e2e
├── TEST_PLAN.md                 # The what-to-test companion to this file
├── tsconfig.json                # Typechecks the specs (CommonJS, for Playwright)
├── e2e/
│   ├── fixtures/                # Playwright test.extend wrappers
│   ├── pages/                   # Page object model
│   ├── specs/                   # *.spec.ts run by the e2e project
│   └── utils/                   # Login and navigation helpers
├── integration/
│   ├── fixtures/                # api fixture
│   ├── helpers/                 # APIHelpers — auth + JSON wrapping
│   └── specs/                   # *.spec.ts run by the integration project
├── plan.md                      # How the plan works: schema, IDs, commands
├── plan/                        # Structured plan rows, one file per surface
└── scripts/
    ├── bootstrap.sh             # Wired to `yarn bootstrap:tests`
    ├── checkCoverage.ts         # Wired to `yarn plan:coverage`
    ├── checkPlan.ts             # Wired to `yarn plan:check`
    ├── planReport.ts            # Wired to `yarn plan:report`
    ├── scaffoldPlan.ts          # Wired to `yarn plan:scaffold`
    ├── tsconfig.json            # Typechecks the plan tooling (ESM, Node type stripping)
    └── lib/                     # Shared plan, surface, and test index helpers
└── utils/
    └── constants.ts             # Admin credentials shared by both projects
```

## Running

From this `tests` directory:

```bash
yarn test:all                    # Both projects
yarn test:integration            # Integration only (no browser)
yarn test:e2e                    # E2E only
yarn test:ui                     # Playwright UI mode
yarn test:report                 # Open the last HTML report
yarn typecheck                   # Typecheck the specs and the plan tooling
```

Or, from the workspace root:

```bash
yarn test:all
yarn test:integration
yarn test:e2e
yarn test:unit                   # Vitest in the custom element
yarn typecheck                   # Typecheck the specs and the plan tooling
```

Run a single spec:

```bash
yarn playwright test integration/specs/<name>.spec.ts
```

Both projects pass when no specs exist (`--pass-with-no-tests`). The scripts stay green while the team writes the suites.

> Only a unit suite may own a script named `test`. The Liferay Node plugin turns the `test` script of a project into a `packageRunTest` task. The CI `workspaces-js-unit` batch and the workspace unit test validation run this task with no portal. CI also stops at the first `package.json` with a `test` script and skips everything below it. So the custom element owns `test` (Vitest). This package and the workspace root expose the Playwright suites only under `test:*` names. Run the suites on demand through the scripts above, after the portal is up.
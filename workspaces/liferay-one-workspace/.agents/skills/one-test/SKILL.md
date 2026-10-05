---

allowed-tools: [Bash, Glob, Grep, Read]
description: Run the Liferay One workspace test suites — Spring Boot JUnit, custom element Vitest, and Playwright integration and e2e. Use when the user asks to run tests, check tests pass, or verify a change before a PR.
name: one-test

---

# Run One Workspace Tests

Four tiers cover this workspace. Run from the workspace root (`workspaces/liferay-one-workspace`). See [`tests/README.md`](../../tests/README.md) for layout and [`tests/TEST_PLAN.md`](../../tests/TEST_PLAN.md) for what each tier owns.

## 1. Pick the Tiers

| Tier | Command | Needs a running portal? |
|---|---|---|
| Unit (Spring Boot) | `./gradlew :client-extensions:liferay-one-etc-spring-boot:test` | No |
| Unit (Custom Element) | `yarn test:unit` | No |
| Integration (Playwright `request`) | `yarn test:integration` | Yes |
| E2E (Playwright browser) | `yarn test:e2e` | Yes |

Run only the tiers that are relevant to the change:

- Run JUnit for a change under `liferay-one-etc-spring-boot`.
- Run Vitest for a change under `liferay-one-custom-element`.
- Run the Playwright tiers when the behavior shows only through a booted portal.

Integration proves the contract of an endpoint and its OAuth2 scope enforcement. E2E proves a whole UI flow through the browser. Use e2e only when integration cannot show the behavior. The unit tiers need no portal, so skip step 3 when only they run.

## 2. First Run

If the workspace `.env` or the Playwright browser is missing:

```bash
yarn bootstrap:tests
```

The command is idempotent. It creates `.env` from `.env.example`, installs dependencies, and fetches Chromium.

## 3. Portal Precondition

The Playwright tiers run against a booted portal. Confirm the environment is up first:

```bash
docker ps --format '{{.Names}}\t{{.Status}}'
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/c/portal/status   # expect 200
curl -s http://localhost:58081/ready                                              # expect READY
```

If the environment is not up, start it with the `one-env-up` skill. If `8080` returns `200` but a `/o/one/v1` test fails on authentication, the spec needs OAuth2 scopes. Populate `OAUTH_CLIENT_ID`/`OAUTH_CLIENT_SECRET` with `scripts/bootstrap/extract_oauth_credentials.sh <oauth-app-name>`. The basic auth admin path does not carry custom scopes.

## 4. Run a Single Test

```bash
(cd tests && yarn playwright test integration/specs/<name>.spec.ts)
(cd client-extensions/liferay-one-custom-element && yarn test src/utils/<name>.test.ts)
./gradlew :client-extensions:liferay-one-etc-spring-boot:test --tests '<TestClassName>'
```

## 5. Report

State which tiers ran and the pass and fail counts. On failure, also state the failing test name and the relevant assertion or stack line. For portal backed failures, check `<bundles>/logs` and the Spring Boot container logs (`docker logs liferay-one-etc-spring-boot`) before you conclude that the test is wrong.

To see which planned routes, endpoints, crons, and subscribers have real tests, run `yarn plan:report`. Run `yarn plan:check` to confirm that the plan still matches the code.
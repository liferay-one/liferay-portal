# Testing Plan

Every SPA route, hook, API client, context provider, and logic module in the custom element, and every REST endpoint, cron, subscriber, startup listener, service, converter, synchronizer, permission checker, and other class in the Spring Boot extension, carries a row with a stable ID. Tests cite those IDs. Two scripts keep the plan and the tests in agreement:

- **`checkPlan`** — the plan covers the code. It enumerates the real code surface and fails on anything that ships without a row.
- **`checkCoverage`** — the tests cover the plan. It scans the suites for plan IDs and reports how far the suite is from go live.

The business and technical requirements in [`../specs/`](../specs/) sit one layer above the plan. Each requirement cites the plan IDs that prove it, and `checkPlan` fails when a citation matches no plan item. See [`../specs/README.md`](../specs/README.md).

## Files

One file per surface, scaffolded from the code and then curated by hand.

| File | Surface | Source anchor |
| --- | --- | --- |
| [`classes.md`](./plan/classes.md) | Every other Spring Boot class | `class:<Class>` |
| [`clients.md`](./plan/clients.md) | Custom-element API clients and data models | `client:<path>` |
| [`converters.md`](./plan/converters.md) | Spring Boot converters | `converter:<Class>` |
| [`crons.md`](./plan/crons.md) | Spring Boot scheduled tasks | `cron:<method>` |
| [`flows.md`](./plan/flows.md) | End to end and cross cutting journeys | `spec:<area>#<slug>` |
| [`hooks.md`](./plan/hooks.md) | Custom-element React hooks | `hook:<path>` |
| [`listeners.md`](./plan/listeners.md) | Spring Boot startup listeners | `listener:<Class>#<method>` |
| [`modules.md`](./plan/modules.md) | Custom-element context providers and logic modules | `context:<path>`, `module:<path>` |
| [`permissions.md`](./plan/permissions.md) | Spring Boot permission checkers | `permission:<Class>` |
| [`rest.md`](./plan/rest.md) | Spring Boot REST endpoints | `rest:<METHOD>:<path>` |
| [`routes.md`](./plan/routes.md) | Custom-element SPA routes | `route:<group>:<path>` |
| [`services.md`](./plan/services.md) | Spring Boot services | `service:<Class>` |
| [`subscribers.md`](./plan/subscribers.md) | Spring Boot Pub/Sub subscribers | `subscriber:<Class>` |
| [`synchronizers.md`](./plan/synchronizers.md) | Spring Boot JSM synchronizers and sync models | `synchronizer:<Class>` |

A custom-element `<path>` is relative to `src`, with no extension. The ID drops the `pages`, `components`, `context`, `hooks`, `services`, and `utils` folders from the path to stay short.

`checkCoverage` infers coverage from file names, so most tests need no tag. A `<Class>Test.java` covers the row of `<Class>`, and it covers a listener row when it calls the listener method. A `<name>.test.ts` next to a custom-element module covers the row of that module.

## Row Schema

Every table uses this header:

```
| ID | Requirement | Type | Priority | Status | Source |
```

- **ID** — generated from the Source when `scaffoldPlan` first adds the row. After that the ID does not change, even when the Source changes. Tests reference it, so do not edit it.
- **Requirement** — what "tested" means for this item. Curate freely.
- **Type** — `unit`, `integration`, or `e2e`.
- **Priority** — `P0` gates go live, then `P1` and `P2`.
- **Status** — `planned` counts toward go live and needs a test. `deferred` and `n/a` do not count in the denominator.
- **Source** — the code anchor. `checkPlan` reconciles every prefix against the code except `spec:`, which is curated by hand.

### When a Code Anchor Changes

A renamed endpoint, route, or class shows in `checkPlan` as one STALE row (the old anchor) and one GAP (the new anchor). Do these steps to keep the ID, the curated columns, and every test tag that cites the ID:

1. Edit the Source of the stale row to the new anchor.

1. Run `yarn plan:scaffold`.

1. Run `yarn plan:check`.

If you ran `scaffoldPlan` first, the GAP is already a new row with default text. Two rows then share one Source, and `checkPlan` reports a duplicate Source. Run `scaffoldPlan` again. It keeps the row with curated text and drops the default row. `scaffoldPlan` never deletes a stale row. Delete the row by hand when the code is gone.

## Linking a Test to the Plan

Put the ID in the test title, so it reaches the test report too:

```ts
test('[ROUTE-ADMIN-MP-ORDERS] renders the orders table', async () => { ... });
```

```java
@DisplayName("[REST-POST-ENTITLEMENTS-GENERATE] generates an entitlement")
```

`checkCoverage` scans for tokens shaped like IDs, so any framework works. One test may cite several IDs. The brackets are a convention, not syntax. A bare token counts too. A data driven table that holds `planId: 'OBJ-LICENSEKEY'` needs no extra annotation.

## Commands

From `workspaces/liferay-one-workspace`:

```bash
yarn plan:check       # Does the plan cover the code? (CI gate)
yarn plan:coverage    # Does every item have a test, stubs included?
yarn plan:report      # Real versus pending versus uncovered
yarn plan:scaffold    # Reconcile after a code change; preserves curation
```

`plan:check` also enforces a floor on requirement traceability: the share of plan items, other than `n/a` rows, that a requirement in [`../specs/`](../specs/) cites. The floor lives in the `--min-traced` argument of `plan:check` in `tests/package.json`. Raise it each time an area file lands, and never lower it. `plan:coverage` shows traceability for each plan file, and `plan:coverage --list` names every untraced item. `plan:report` marks each requirement as verified, partial, or unverified from the tests of the plan items it cites.

`plan:coverage` counts any reference, so a pending stub scores the same as a real test. It answers "is every item tracked?". `plan:report` looks at *which* file covers each item and separates real tests from stubs. It writes per item traceability to `tests/test-results/plan-report.md`. `checkCoverage` also takes `--list` to name every uncovered item and `--min <pct>` to fail under a threshold.

## What `checkPlan` Reports

- **GAP** — code with no row. Run `yarn plan:scaffold`, then curate the new row.
- **STALE** — a row with no code. `scaffold` drops it on the next run.
- **ORPHAN** — a test tag matching no row, usually a typo or a renamed ID. It counts toward nothing, so it fails the check.
- **DANGLING** — a row's own prose citing an ID that matches no row, usually left behind by a rename. Nothing else catches it, because prose is not a test tag.

Both ID checks fire only on tags whose prefix is a real plan prefix (`ROUTE-`, `REST-`), so unrelated hyphenated tokens are ignored. A wildcard (`ROUTE-ADMIN-*`), an elision (`…-COMPLETE-UPLOAD`), and the leading part of a real ID all read as abbreviations rather than errors.
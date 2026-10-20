---

description: Coverage plan mapping the Spring Boot and custom element features to a test tier.
name: test-plan

---

# Liferay One Test Plan

This is the *what to test* companion to [`README.md`](./README.md) (the *how to test*). It lists the behavior of the two client extensions under test: the Spring Boot REST service and the custom element SPA. It assigns each item to the fastest tier that can prove it, with a priority and concrete cases.

The [LPD-87600](https://liferay.atlassian.net/browse/LPD-87600) platform launch increased the surface of these two extensions. The structured plan under [`plan/`](./plan/) now tracks **708 enumerable code items**.

In liferay-one-etc-spring-boot:

- 129 REST endpoints
- 14 crons
- 5 subscribers
- 6 startup listeners
- 69 services
- 15 converters
- 18 synchronizers and sync models
- 7 permission checkers
- 89 other classes (utils, license, usage strategies, Pub/Sub, XML, and models)

In liferay-one-custom-element:

- 87 SPA routes
- 107 hooks
- 68 API clients and data models
- 8 context providers
- 86 logic modules (utils, schemas, and resolvers)

The plan also holds the hand curated cross cutting flows. Since the first version, the plan tracks these feature areas: trials and provisioning (E04/E05/E07), project management (E09/E10), account and organization management and Okta identity sync (E15), Salesforce opportunity sync (E11), license keys and subscriptions, commerce tax (E25), and AI Hub purchase and provisioning. Each flow in [`plan/flows.md`](./plan/flows.md) names its owning Epic. This traces the plan back to the initiative.

> Scope is limited to these two client extensions. For Spring Boot, that covers every class except exceptions, constants, and the Spring application and cache configuration. For the custom element, it covers routes, hooks, API clients, context providers, and every logic module. The routes and the flows cover components and pages, so the plan does not list them one by one. Other surfaces (site pages, Objects, roles, external integration contracts) are out of scope. This file and [`plan/`](./plan/) do not track them.
>
> One surface in scope is **not scannable**. The `liferay-one-etc-cron` client extension ships as a prebuilt jar, and this workspace has no source for it. So `checkPlan` does not list its scheduled jobs. See the note atop [`plan/flows.md`](./plan/flows.md).

There are four tiers, from the fastest to the slowest:

- **Unit (Spring Boot)** tests Spring logic. Use MockMvc for controllers. Use Mockito for services, converters, crons, and subscribers.
- **Unit (Custom Element)** tests custom element logic that needs neither a portal nor a browser: utils, route tables, and components rendered in jsdom.
- **Integration (Playwright `request`)** tests anything that needs a booted portal.
- **E2E (Playwright browser)** tests whole UI flows.

Assign every test to the fastest tier that can still prove the behavior.

Priorities: **P0** is a revenue, data integrity, or security path that must not break without notice. **P1** is core feature behavior. **P2** is edge cases and polish.

## Coverage Snapshot

The harness for every tier is in place. The team is still writing the suites. Run `yarn plan:report` for the live per item status and `yarn plan:coverage` for the go live percentage. This table records only where each surface stands.

| Surface | Tier | Status |
|---|---|---|
| Spring Boot REST controllers, crons, subscribers, services & converters | Unit (Spring Boot) | ◷ partial — `src/test/java/**` in `liferay-one-etc-spring-boot`; see [`plan/`](./plan/) for the uncovered rows |
| Custom element SPA routes, utils & components | Unit (Custom Element) | ⬚ harness ready — `vitest.config.ts` and `src/testSetup.ts` in `liferay-one-custom-element`, no tests yet |
| Spring Boot endpoints through the portal (`/ready`, 401 contract, OAuth2 scopes) | Integration (Playwright `request`) | ⬚ harness ready — `integration/fixtures/apiTest.ts`, no specs yet |
| Whole UI journeys through the custom element | E2E (Playwright browser) | ⬚ harness ready — `e2e/fixtures`, `e2e/pages`, `e2e/utils`, no specs yet |
| Journeys needing external systems, seeded commerce data, or an entitled persona | Integration / E2E | ⊘ deferred — see [`plan/flows.md`](./plan/flows.md) for each blocker |

Coverage in [`plan/`](./plan/) means *a test references the ID*. It is a traceability signal. It does not prove that the test is strong. [`plan.md`](./plan.md) explains how a test cites an ID.

---

## 1. Spring Boot REST — `/o/one/v1`

Controller request and response shaping (routing, status codes, validation, body mapping) is **Unit (Spring Boot)**. Test it with MockMvc `standaloneSetup` and mock the service and integration collaborators. End to end behavior through the OAuth2 proxy (scope enforcement, account membership filtering, real Object reads) is **Integration**.

| Endpoint | Tier | Pri | Cases |
|---|---|---|---|
| `GET /ready` | Unit | P1 | 200 + body `READY`. |
| `GET /accounts/{erc}/jira/object-key` | Unit + Integration | P1 | Valid ERC → object key; unknown ERC → 404; missing `customer.read` scope → 403. |
| `GET /jira/accounts/{erc}/business-events` | Unit + Integration | P1 | Returns list; empty account → `[]`; `ticket.read` enforced. |
| `GET …/business-events/{id}` | Unit | P1 | Found → DTO; missing → 404. |
| `GET …/business-events/{id}/versions` | Unit | P2 | Returns version history ordered by timestamp. |
| `POST …/business-events` | Unit | P1 | Valid body → created + returns list; malformed body → 400; `ticket.write` enforced. |
| `PUT …/business-events/{id}` | Unit | P1 | Updates fields; unknown id → 404. |
| `DELETE …/business-events/{id}` | Unit | P1 | Deletes; unknown id → 404; idempotent redelete. |
| `GET /jira/accounts/{erc}/tickets?ticketIds=` | Unit + Integration | P1 | Returns tickets; filters by id list when provided. |
| `GET /jira/business-events/fields/{field}/options` | Unit | P2 | Returns enumerated options for the asset field. |
| `POST /ticket-attachments/initiate-upload` | Unit | **P0** | Valid → Draft row + resumable session URL; file > 50 MB → 400; closed ticket → 400; disallowed MIME → 400; missing body fields → 400. |
| `POST /ticket-attachments/{id}/complete-upload` | Unit | **P0** | MD5 matches GCS → state Approved + Jira comment posted; MD5 mismatch → object deleted + error; already Approved → 409; Jira post fails → draft comment stored for retry. |
| `GET /ticket-attachments/by-id/{id}/download` | Unit + Integration | **P0** | Member → signed URL (≤15 min expiry); nonmember → 403; missing → 404. |
| `GET /ticket-attachments/by-external-reference-code/{erc}/download` | Unit | P1 | Same as the by ID endpoint, but it resolves the attachment through the ERC. |
| `DELETE /ticket-attachments/{id}` | Unit | P1 | Flips to Trashed; GCS delete deferred to cron; returns 200. |
| `GET /tickets/{id}/ticket-attachments/upload-access-check` | Unit | P1 | Open + member → 200; closed → 400; nonmember → 403; missing ticket → 404. |
| `GET /tickets/{id}/ticket-attachments/download-access-check` | Unit | P1 | Member → 200 (closed allowed); nonmember → 403; missing → 404. |
| `POST /entitlements/generate?commerceOrderItemId=` | Unit + Integration | **P0** | Creates one Entitlement per EntitlementDefinition for the product; **idempotent** on rerun; unknown order item → 400. |

> The attachment upload and download paths and the entitlement generation path are P0. They gate customer data and what a customer may use. Verify the permission and idempotency branches first.

The table above lists the original core set of endpoints. The controller now exposes **129 endpoints**. The authoritative row by row list is [`plan/rest.md`](./plan/rest.md). The endpoint groups added since the core set, by feature area, are:

- Trials and provisioning (`/trial…`, `/liferay-data-platform…`, E04/E05/E07).
- Project management and project scoped Jira (`/projects/…`, `/jira/projects/{erc}/…`, E09/E10). The Jira business event and ticket endpoints moved from `/jira/accounts/` to `/jira/projects/`.
- Account, user, and organization management (`/accounts/{erc}/user-accounts/…`, `/organizations/…`, and the `object/action/{account,user,organization}/*` handlers, E15).
- Okta identity sync (`…/sync-with-okta`, `…/sync-from-okta`, E15).
- License keys and subscriptions (`/license-keys/…`, `/common-license-keys`).
- Commerce tax (`/commerce-orders/{id}/calculate-tax`, E25).
- AI Hub (`object/action/ai/hub/tokens`).

Treat license key generation and download, trial provisioning, tax calculation, and the account, user, and organization object actions as **P0**. Like the core set, they gate money, access, or identity.

---

## 2. Scheduled Tasks & Async Subscribers

Test crons and the Pub/Sub subscribers at the handler level as **Unit (Spring Boot)** tests. Instantiate the bean, inject mocked collaborators with `ReflectionTestUtils`, invoke the method directly, and assert the side effect calls. Never wait on the wall clock. Never call a live broker. Seed due rows and invoke the method through a booted portal as an optional **Integration** layer when it adds confidence. The full row by row list is in [`plan/crons.md`](./plan/crons.md) and [`plan/subscribers.md`](./plan/subscribers.md). The highlights below show the P0 paths and the tasks that the platform launch added.

| Task | Tier | Pri | Cases |
|---|---|---|---|
| `scheduledSendExpiringLicenseKeyEmails` | Unit | P1 | Keys in the 30, 14, or 0 day window → one templated email per user; nothing due → no send; email API failure logged, loop continues. |
| `scheduledCleanUp` (ticket attachments) | Unit | P1 | Trashed rows → GCS object + Liferay row deleted; GCS failure → row retained + error logged. |
| `scheduledDeleteTicketAttachment` | Unit | P1 | Drains pending hard deletes; idempotent on rerun. |
| `scheduledUpdateTicketAttachmentDraftCommentBody` | Unit | P1 | Rows with a draft comment → Jira retried; success clears the draft; failure leaves it for the next run. |
| `scheduledAssetObjectsCacheEviction` | Unit | P2 | Cache evicted on schedule so stale Jira asset objects are not served. |
| `scheduledProcessTrials` (E04/E05, E07) | Unit | P1 | Expires + notifies in progress trials, then provisions on hold trials; one phase failing does not abort the other; idempotent on rerun. |
| `syncAccountRoles` / `syncOrganizationRoles` (E15) | Unit | P1 | Mirrors every account/org role to JSM on schedule + at app ready; per role failure logged, loop continues; idempotent. |
| `syncProductVersions` (E11) | Unit | P2 | Refreshes the product version cache from the releases feed; HTTP/parse failure logged without overwriting the last good cache. |
| `SalesforceObjectPubsubSubscriber` (E11) | Unit | **P0** | Valid event → upserts products/SKUs/price entries **idempotently**; duplicate → dropped; parse error → no partial write. |
| `SalesforceOpportunityPubsubSubscriber` (E11) | Unit | **P0** | Opportunity event → upserts order/contract **idempotently**; replay deduped; parse error → no partial write. |
| `OktaUsersPubsubSubscriber` / `OktaAppCreatedPubsubSubscriber` (E15) | Unit | P1 | Upserts Liferay users + org role associations idempotently; duplicate deduped; parse error → no partial write. |

> The Salesforce subscribers are P0: they are the inbound revenue data path. Verify the idempotency and dedupe branches first.

---

## 3. Custom Element UI (React)

Default to a **Unit (Custom Element)** test with Vitest and Testing Library and with mocked `Liferay.Util.fetch`/SWR. Render a page or component. Assert that it renders fetched data, validates forms, and shows errors. Use **E2E** only for one happy path per page group that exercises routing and real headless calls.

| Page group | Tier | Pri | Key flows |
|---|---|---|---|
| AccountSelector | Unit + E2E | P1 | Loads memberships; default preselected; switching changes account context in subsequent calls; accounts without a role hidden. |
| MyAccount (Subscriptions, Orders, Billing & Usage, Details, Team) | Unit + E2E | P1 | Subscription state transitions; license key generate/download; SaaS versus Composable usage branch; invoice download; team role assignment + enforcement; checkout cart. |
| ProductPurchase | Unit + E2E | **P0** | Catalog loads; purchase form validation (seats/qty/required); payment → CommerceOrder with correct line items, price, tax; confirmation. |
| PublisherDashboard | Unit + E2E | P1 | Profile load + edit validation; asset/logo upload (GCS); publish state transitions; sales summary refresh. |
| Support (Attachments, BusinessEvents) | Unit + E2E | P1 | Attachment upload progress + resumable handling; download via signed URL; business event create posts to Jira Assets; heat tag filter/sort. |
| Admin (Apps, Solutions, Trials, Environments, Publishers, Orders, Payments, Finance, etc.) | Unit + E2E | P1/P2 | Tables paginate/sort/filter on large datasets; inline edit + validation; **admin only pages reject nonadmin with 403**; network/5xx → user facing error. |

Cross cutting UI unit cases (P1): OAuth2 token refresh and expiry; empty state and error state rendering; `RestrictedFeatureMessage` shown when entitlement or permission is absent.

---

## 4. End to End Flows & Cross Cutting Requirements

The multi surface user journeys are listed in [`plan/flows.md`](./plan/flows.md). Each journey is tagged with its owning [LPD-87600](https://liferay.atlassian.net/browse/LPD-87600) Epic. The plan marks a journey `planned` when a local environment can prove it. The plan marks a journey `deferred`, and names the blocker, in any of these cases:

- The journey writes to or reads from an external system (Jira, GCS, Salesforce, Okta, provisioning/console).
- The journey needs seeded commerce data.
- The journey needs a user provisioned with an entitlement that the seed administrator lacks.

A journey with no target spec yet is marked **spec-not-staged**. This marking documents every coded flow.

| Requirement | Tier | Pri | Status |
|---|---|---|---|
| Unauthenticated → 401 on every endpoint but `/ready` | Integration | P0 | ⬚ planned |
| Entitlement gated page groups render the Restricted Page | E2E | P1 | ⬚ planned |
| Every custom element route mounts + renders (fresh local smoke) | E2E | P1 | ⬚ planned |
| Checkout (free/paid), ticket upload/download, business event lifecycle, publisher onboarding, account team, license generation/expiry, Salesforce sync | E2E / Integration | P0/P1 | ⊘ deferred — need external stubs, seeded data, or an entitled user |
| Trials & provisioning, project lifecycle + membership, account/org provisioning, Okta identity sync, license free key/subscriptions, tax calculation, AI Hub purchase | E2E / Integration | P0/P1 | ⊘ deferred — spec-not-staged; need proxy + provisioning/Okta/commerce stubs |
| OAuth2 scope enforcement (403 on missing scope) | Integration | P0 | ⊘ deferred — needs an OAuth2 app to mint a scoped token |

Unlocking the deferred journeys needs environment work. For the SPA happy paths, add a provisioning fixture that grants the test user the gating entitlement or role. For the Jira, GCS, Salesforce, Okta, provisioning, and commerce journeys, add external system stubs or seeded commerce data.

---

## Execution Order (Recommended)

1. **P0 unit tests** — ticket attachment upload/download, entitlement generation, and the Salesforce subscriber's idempotency branches. These tests run fastest and cover the highest risk.

1. **Remaining Spring Boot unit tests** — every other endpoint, cron, service, and converter's contract, validation, and error branches.

1. **Integration happy paths** per Spring endpoint behind OAuth2 scopes.

1. **ProductPurchase + MyAccount unit flows** — revenue path.

1. **Custom element route unit tests** across the remaining page groups.

1. **E2E smoke per page group**.
# End-to-End Flows & Cross-Cutting Requirements

The per-surface files ([`routes.md`](./routes.md), [`rest.md`](./rest.md),
[`crons.md`](./crons.md), [`subscribers.md`](./subscribers.md),
[`services.md`](./services.md), [`converters.md`](./converters.md)) track the
**cheap unit coverage** — one row per code symbol, proven in isolation with
JUnit + Mockito. This file tracks the **real, in-action coverage**:
the integration (`request` against a booted portal) and e2e (browser through
the custom element) tests that exercise those same symbols for real, as the
multi-surface user journeys they belong to.

Journeys use `spec:` Source anchors, which `checkPlan` intentionally does not
enumerate — curate these rows by hand. Each journey names the [LPD-87600](https://liferay.atlassian.net/browse/LPD-87600)
Epic (E01–E26, with gaps) and, where known, the specific story that owns it, in parentheses
in the Requirement column, so the plan traces back to the platform-launch
initiative.

> **Ticket tagging (LPD-87600).** The One Liferay Platform launch is initiative
> [LPD-87600](https://liferay.atlassian.net/browse/LPD-87600). Its ~30 Epics map
> onto the journeys below: E04/E05 + E07 (provisioning/trials), E09/E10 (project
> management), E11 (Salesforce), E13/E14 (support UI), E15 (account/org/identity),
> E16 (admin UI), E18 (marketplace/product discovery), E20 (utilization), E25
> (Stripe tax). The per-surface files reference the same Epics in their
> Requirement text where a row belongs to a distinct feature area.

Most journeys are implemented in code but cannot run end to end against a local
environment yet. Three structural blockers dominate:

- **No `/o/one/v1` proxy locally.** The Spring Boot endpoints enforce OAuth2
  scopes through a proxy path the local portal does not expose, so the
  positive-path REST tests cannot authenticate. Only the unauthenticated
  negative path and `/ready` are reachable directly at `:58081`.
- **External systems and seeded data.** The journeys read from or write to Jira,
  Google Cloud Storage, Salesforce Pub/Sub, Okta, and the provisioning/console
  backends, or need seeded commerce data.
- **The seeding gap: no entitled non-admin user.** `scripts/seed/` provisions
  nobody who can walk a gated journey as the persona it belongs to, so the gated
  page groups render the Restricted Page for `test@liferay.com` and ten journeys
  below stop at the door. It is one fix, not ten, and the same one that leaves
  the LPD-95398 permission matrix dormant. Concretely, what the seed is missing:
  no user holds `C_ACCOUNT_BUYER`, `L_ACCOUNT_MEMBER`, or
  `C_PARTNER_ACCOUNT_ADMIN`; no membership in
  `08-project-membership.batch-engine-data.json` uses `C_PROJECT_REQUESTER`, only
  `C_PROJECT_ADMIN` and `C_PROJECT_USER`; `member@customer.com` is role-less but
  belongs to both ACCNT-001 projects, so it cannot serve the "no project
  membership" case; and ACCNT-001 carries only two projects, so there is no third
  to stand in for `ONE_UNASSIGNED_PROJECT_ERC`. Journeys blocked on it say
  "Deferred on the seeding gap" so the shared root cause reads as one line of
  work.

Such journeys are marked `deferred` with the precise blocker, so they stay
tracked without dragging down the go-live denominator. Requirements that are
provable locally today are `planned`, and are expected to carry a real test.

No integration or e2e spec is authored yet. Where a journey's Requirement names
a `Target spec`, that is the file under `integration/specs` or `e2e/specs` its
test should land in, so related journeys share one spec. Journeys marked
**spec-not-staged** have no target yet; they were captured when the code surface
for trials, projects, organizations, Okta identity sync, license keys, tax, AI
Hub, SEO Studio, the Digital Sales Room, and app license keys landed.

When a deferred journey's spec is written ahead of its blocker, wrap it in
`test.describe.fixme` so it is collected and skipped rather than run, and
document the blocker and the environment variables it needs in the spec header.
Pin order-dependent journeys (business-event create→edit→delete, Salesforce
upsert→dedupe→deactivate) with `test.describe.configure({mode: 'serial'})` so a
failed first step skips the rest instead of cascading.

> **Out-of-scan surface.** The `liferay-one-etc-cron` client extension ships as a
> prebuilt jar (`dist/liferay-one-etc-cron.zip`) with no source in this
> workspace, so its scheduled tasks are **not enumerated** by `checkPlan` and are
> **not** tracked as rows. Its sibling in `liferay-marketplace-workspace`
> (`MarketplaceCommandLineRunner`) runs trial processing, pending-order
> completion, most-purchased-products aggregation, Koroneiki project linking,
> publisher sales-summary aggregation, and feedback requests — treat the One
> `etc-cron` as covering the same class of scheduled jobs until its source is
> vendored here and can be scanned.

## Authentication & Access

| ID | Requirement | Type | Priority | Status | Source |
| --- | --- | --- | --- | --- | --- |
| AUTH-UNAUTHENTICATED | Every Spring Boot endpoint rejects an unauthenticated caller with 401 before any controller or outbound Jira/GCS/commerce call runs, except the five the exclude list makes public (`/ready`, `/invitations/accept`, and three `/cloud/…` paths), which assert the inverse and so pin that list in place. Because the filter chain answers 401 on any path, each route is also probed with a token and a verb that neither it nor any route sharing its path maps, so a 405 whose Allow header lists the methods of every route matching that path proves the route exists rather than merely 404ing into a 401. Those probes need the `liferay-one-etc-spring-boot-oahs` secret in `SPRING_BOOT_OAUTH_CLIENT_SECRET` and skip without it (LPD-87600 platform) | integration | P0 | planned | spec:auth#unauthenticated-rejected |
| AUTH-OAUTH2-SCOPES | A token signed by the portal but issued to an application outside the six trusted ERCs is refused | integration | P0 | deferred | spec:auth#oauth2-scope-enforcement |
| FLOW-RESTRICTED-PAGE | Entitlement-gated page groups (Admin, My Account) mount the SPA but render the Restricted Page view for a user without the entitlement — proves the custom element mounts and routes in-browser and the access gate holds (LPD-92707, LPD-92706) | e2e | P1 | planned | spec:flow#restricted-page |
| FLOW-SPA-RENDER-SMOKE | Every custom-element route across all seven page groups mounts the `liferay-one-custom-element` web component and renders a first header or visible content (gated groups render the restricted view, missing-data routes render an empty state) — a fresh-local health check that the React app boots and renders on every route, runnable today against a spun-up local with the seed admin. Target spec: `e2e/specs/customElementRender.spec.ts` (E06, LPD-88260) | e2e | P1 | planned | spec:flow#spa-render-smoke |

## Role-Based Access Control (LPD-95398)

The LPD-95398 permissions matrix — what each account-level and project-level role may view (👁), act on (✅), or is denied (❌) across the Account Management area. Every row drives `e2e/specs/rolePermissionsMatrix.spec.ts`, one `test` per matrix cell.

| ID | Requirement | Type | Priority | Status | Source |
| --- | --- | --- | --- | --- | --- |
| FLOW-ROLE-ACCOUNT-PERMISSIONS | Deferred on the seeding gap — one user per account role (Account Admin, Partner Account Admin, Account Buyer, Account Member, null) on a shared account, none of which the seed provisions. Enforces the account-level matrix (LPD-95398): Account Details edit gated to admins, Account Members hidden from a Buyer-only user, Orders denied to a null role, Projects denied to Buyer/null. Target spec: `e2e/specs/rolePermissionsMatrix.spec.ts` (E15, LPD-88258) | e2e | P1 | deferred | spec:flow#role-account-permissions |
| FLOW-ROLE-PROJECT-PERMISSIONS | Deferred on the seeding gap — one user per project role (Project Admin, Project Requester, Project User) plus an Account Admin on a shared project; the seed grants no Project Requester. Enforces the project-level matrix (LPD-95398): project details view for all, member management gated to Admins, Business Events / Ticket Attachments / support-ticket submission full for Requester and view-only for Project User. Target spec: `e2e/specs/rolePermissionsMatrix.spec.ts` (E09/E10, LPD-88261/LPD-88252) | e2e | P1 | deferred | spec:flow#role-project-permissions |
| FLOW-ROLE-NULL-PROJECT-ACCESS | Deferred on the seeding gap — a null-role user with no project membership and a second null-role user assigned to exactly one project; the seed's only role-less user belongs to every project on its account. Enforces the null-role project-access rules (LPD-95398): account-level pages only when unassigned, account-level plus the assigned project when assigned, and an unassigned project is not displayed in navigation. Target spec: `e2e/specs/rolePermissionsMatrix.spec.ts` (LPD-92707) | e2e | P1 | deferred | spec:flow#role-null-project-access |

## Commerce: Purchase, Checkout & Entitlements

| ID | Requirement | Type | Priority | Status | Source |
| --- | --- | --- | --- | --- | --- |
| FLOW-PRODUCT-PURCHASE-ENTRY | Deferred on the seeding gap — an entitled buyer with a purchasable product. Drives the ProductPurchase wizard (`ROUTE-PRODUCT-PURCHASE-*`) from account selection through summary; the wizard branches per product type (DXP, LDP, CMP, DSR, AI Hub), so it also exercises the GA purchase/provisioning epics. Target spec: `e2e/specs/productPurchase.spec.ts` (E18, LPD-88250; GA products: DSR LPD-79893, CMP LPD-82399, LDP LPD-95794) | e2e | P0 | deferred | spec:flow#product-purchase-entry |
| FLOW-PRODUCT-PURCHASE-CONTRACT | Spec-not-staged — the contract step (`ROUTE-PRODUCT-PURCHASE-CONTRACT`) lists the selected project's contracts newest first, holds the buyer on the step until one is chosen, renders the no-contract invitation when the project has none, and carries the chosen contract onto the resulting order so the purchase is attributed to it. The step is emitted only in the ai-hub-open-beta flow, so the journey needs a seeded project with contracts and one without, on top of the seeding gap (E18, LPD-88250) | e2e | P1 | deferred | spec:flow#product-purchase-contract |
| FLOW-CHECKOUT-FREE | Deferred on the seeding gap, plus commerce completion. Free-app checkout completes a CommerceOrder and triggers entitlement generation (`REST-POST-ENTITLEMENTS-GENERATE`). Target spec: `e2e/specs/productPurchase.spec.ts` (E18, LPD-88250; GA products: DSR LPD-79893, CMP LPD-82399, LDP LPD-95794) | e2e | P0 | deferred | spec:flow#checkout-free |
| FLOW-CHECKOUT-PAID | Deferred on the seeding gap, plus a payment-provider stub. Paid-app checkout adds the license and payment-method steps and reaches payment before completing the order. Target spec: `e2e/specs/productPurchase.spec.ts` (E18, LPD-88250; tokens via Stripe MIT, LPD-93643; GA products: DSR LPD-79893, CMP LPD-82399, LDP LPD-95794) | e2e | P0 | deferred | spec:flow#checkout-paid |
| FLOW-TAX-CALCULATION | Spec-not-staged — `REST-POST-COMMERCE-ORDERS-COMMERCEORDERID-CALCULATE-TAX` applies the tax-applicability rules (`SVC-COMMERCEORDERSERVICE`: business account taxed only when billed to Ireland; person account across the European country set; untaxed otherwise) to a CommerceOrder; the rule branches are unit-covered, the in-action path needs a seeded order behind the proxy (E25, LPD-88264) | integration | P1 | deferred | spec:flow#tax-calculation |
| FLOW-AI-HUB-PURCHASE | Spec-not-staged — AI Hub purchase wizard (`ROUTE-PRODUCT-PURCHASE-AI-HUB-FORM`, `…-AI-HUB-OPEN-BETA-FORM`) completes an order, the `ai/hub/tokens` object action grants tokens, and `AIHubService` provisions the tenant; needs an entitled user + AI Hub backend stub (LPD-90605) | e2e | P0 | deferred | spec:flow#ai-hub-purchase |
| FLOW-SEO-STUDIO-SIGNUP | SEO Studio Beta is sold only to accounts that already hold an AI Hub order. The account step opens the requirements modal instead of advancing, and the signup form refuses the submit with the not eligible view when the selected project has no completed and provisioned AI Hub order; both let an eligible account through. Both branches are unit covered with a stubbed lookup in `AccountSelection.test.tsx` and `SEOStudioForm.test.tsx`. The rest of the signup (project selection, the form on `ROUTE-PRODUCT-PURCHASE-SEO-STUDIO-FORM`, and the SEO_STUDIO order it places) is e2e and waits on the seeding gap (E18, LPD-102451) | unit | P0 | planned | spec:flow#seo-studio-signup |
| FLOW-DIGITAL-SALES-ROOM-SIGNUP | Spec-not-staged — a dsr product sends the buyer from account selection straight to the Digital Sales Room form (`ROUTE-PRODUCT-PURCHASE-DSR-FORM`), which records the workspace and activation-key details on a DSR order and keeps a DSR Request linked to it for the sales team, then `REST-POST-DIGITAL-SALES-ROOM-PROVISIONING-ORDERID` turns the order's settings into an Analytics Cloud project keyed by the account external reference code — reusing the workspace an account already holds, never minting a second one on a redelivered request, and cancelling the order with the error when Analytics Cloud refuses. The controller branches are unit-covered; the in-action path needs an Analytics Cloud stub on top of the seeding gap (E18, LPD-102451) | integration | P0 | deferred | spec:flow#digital-sales-room-signup |
| FLOW-CMP-CONTACT-SALES | No test yet — Content Marketing Platform is sold through the sales team at GA, so a cmp product must never offer self-service checkout: the product display page renders Contact Sales in place of Get App, a buyer who reaches the purchase flow by its URL lands on that same invitation rather than account selection, and the invitation lists the developer, trial, and production tiers resolved from the SKU license usage type options. All three are SPA unit targets; the remaining half — a CMP GA order delivering the module package from the Download tab instead of the Liferay bundle list — needs a seeded GA order and is e2e (E18, LPD-102451) | unit | P1 | planned | spec:flow#cmp-contact-sales |
| FLOW-ENTITLEMENT-GENERATION | Deferred — needs seeded commerce order items (the controller branch is unit-covered). Generates one Entitlement per EntitlementDefinition, idempotently, via `REST-POST-ENTITLEMENTS-GENERATE` and the commerce-order-item object action. Target spec: `integration/specs/entitlementGeneration.spec.ts` (LPD-89424, LPD-89274) | integration | P0 | deferred | spec:flow#entitlement-generation |
| FLOW-SALESFORCE-ORDER-SYNC | Deferred — inbound Salesforce Pub/Sub upsert; needs a broker/stub. `SalesforceObjectPubsubSubscriber` upserts Commerce price entries, products, and SKUs idempotently and dedupes duplicates; `SalesforceOpportunityPubsubSubscriber` upserts the order/contract from an opportunity event; both handlers are unit-covered. Target spec: `integration/specs/salesforceOrderSync.spec.ts` (E11, LPD-88254) | integration | P0 | deferred | spec:flow#salesforce-order-sync |

## Account, Organizations & Identity

| ID | Requirement | Type | Priority | Status | Source |
| --- | --- | --- | --- | --- | --- |
| FLOW-MY-ACCOUNT-OVERVIEW | Deferred on the seeding gap — projects, orders, and billing render for an entitled member. Drives the MyAccount route group (`ROUTE-MY-ACCOUNT-*`). Target spec: `e2e/specs/myAccount.spec.ts` (E15, LPD-88258; E10, LPD-88252) | e2e | P1 | deferred | spec:flow#my-account-overview |
| FLOW-ACCOUNT-TEAM-MEMBERS | Deferred on the seeding gap — the members to invite, re-role, and remove are exactly the users the seed does not provision. Account team invite, assign-role, and remove on `ROUTE-MY-ACCOUNT-ACCOUNT-MEMBERS`, with role enforcement, via the `accounts/{erc}/user-accounts*` endpoints. Target spec: `e2e/specs/myAccount.spec.ts` (E15, LPD-88258) | e2e | P1 | deferred | spec:flow#account-team-members |
| FLOW-ACCOUNT-PROVISIONING | Spec-not-staged — the account object actions (`REST-POST-OBJECT-ACTION-ACCOUNT-CREATE`/`-UPDATE`/`-DELETE`) provision, mutate, and tear down an account and its downstream records (contacts, addresses, JSM sync) idempotently; needs the proxy + seeded objects (E15, LPD-88258) | integration | P0 | deferred | spec:flow#account-provisioning |
| FLOW-ORGANIZATION-SYNC | Spec-not-staged — organization object actions and the `organizations/*` endpoints create/update/delete an organization, assign account and organization-role memberships, and mirror to JSM (`…/sync-to-jsm`) and Okta (`…/sync-from-okta`); needs the proxy + JSM/Okta stubs (E15, LPD-88258, LPD-89425) | integration | P1 | deferred | spec:flow#organization-sync |
| FLOW-OKTA-IDENTITY-SYNC | Spec-not-staged — inbound Okta Pub/Sub (`SUB-OKTAUSERSPUBSUBSUBSCRIBER`, `SUB-OKTAAPPCREATEDPUBSUBSUBSCRIBER`) and the `user-accounts/{userId}/sync-with-okta` endpoint upsert Liferay users and org-role associations idempotently; the handlers are unit-covered, the in-action path needs a Pub/Sub broker + Okta stub (E15, LPD-88258, LPD-89425) | integration | P1 | deferred | spec:flow#okta-identity-sync |

## Project Management (E09/E10)

| ID | Requirement | Type | Priority | Status | Source |
| --- | --- | --- | --- | --- | --- |
| FLOW-PROJECT-LIFECYCLE | Spec-not-staged — a project is created and its scoped pages (products, applications, orders, downloads, business events) render for a member; drives `ROUTE-MY-ACCOUNT-PROJECT*` and the project-scoped Jira business-events endpoints (`/jira/projects/{erc}/...`); needs an entitled member + seeded project (E09/E10, LPD-88261/LPD-88252) | e2e | P1 | deferred | spec:flow#project-lifecycle |
| FLOW-PROJECT-MEMBERSHIP | Spec-not-staged — project member management on `ROUTE-MY-ACCOUNT-PROJECT-MEMBERS`: add/remove a member and assign a project role via `projects/{projectId}/user-accounts/{userId}/account-roles`, with `ProjectMembershipService` guarding duplicates and orphan rows; needs a provisioned member + project (E09/E10, LPD-88261/LPD-88252) | e2e | P1 | deferred | spec:flow#project-membership |

## Licensing & Subscriptions

| ID | Requirement | Type | Priority | Status | Source |
| --- | --- | --- | --- | --- | --- |
| FLOW-LICENSE-GENERATION | Deferred — needs subscription data and the signer. Generates a signed license key tied to a subscription (`CommonLicenseKeyService`, ported KeyGeneratorImpl/LicenseKeyExporter). Target spec: `integration/specs/licenseLifecycle.spec.ts` (LPD-89421/LPD-89422/LPD-89423) | integration | P0 | deferred | spec:flow#license-generation |
| FLOW-LICENSE-FREE-KEY | Spec-not-staged — free license issuance: `REST-POST-LICENSE-KEYS-TYPE-FREE` mints a free key after `…-TYPE-FREE-DOMAINS-CHECK` validates the domain, and `GET /license-keys/{licenseKeyId}/download` streams it; needs subscription/domain seed data (LPD-89423, LPD-89429) | integration | P0 | deferred | spec:flow#license-free-key |
| FLOW-APP-LICENSE-KEY-LIFECYCLE | Spec-not-staged — the endpoint group LPD-103395 added runs as one lifecycle: `REST-POST-APP-LICENSE-KEYS` mints a key against an entitlement, `REST-GET-APP-LICENSE-KEYS-APPLICENSEKEYID` and `…-DOWNLOAD` read it back and stream its XML, and `REST-PUT-APP-LICENSE-KEYS-ACTIVATE` / `…-DEACTIVATE` flip it, every one gated by the administrator role and scoped to app keys — create refuses the portal product id, and activation resolves and checks every identifier before it writes any of them, so one rejected id leaves the batch untouched rather than half applied. The handler branches are unit-covered; proving the role gate and the scope in action needs the `/o/one/v1` proxy, an administrator token, and a seeded entitlement (LPD-103395) | integration | P0 | deferred | spec:flow#app-license-key-lifecycle |
| FLOW-SUBSCRIPTION-LICENSE-SYNC | Spec-not-staged — the `license-keys/subscriptions` GET/POST/PUT/DELETE endpoints and `common-license-keys` create keep SubscriptionEntry and CommonLicenseKey in sync with provisioning; needs the proxy + migrated subscription data (LPD-89420/LPD-89427/LPD-89428) | integration | P1 | deferred | spec:flow#subscription-license-sync |
| FLOW-LICENSE-EXPIRATION-EMAIL | Deferred — the expiry cron (`CRON-SCHEDULEDSENDEXPIRINGLICENSEKEYEMAILS`) queues 30/14/0-day templated emails per subscribed user; the cron body is unit-covered in `SubscriptionEntryServiceScheduledSendExpiringLicenseKeyEmailsTest`. Target spec: `integration/specs/licenseLifecycle.spec.ts` (LPD-89428) | integration | P1 | deferred | spec:flow#license-expiration-email |
| FLOW-LICENSE-REVOCATION | Spec-only — no license-key revocation endpoint or action is implemented yet. Target spec: `integration/specs/licenseLifecycle.spec.ts` (LPD-89428) | integration | P1 | deferred | spec:flow#license-revocation |

## Support: Tickets & Business Events (E13/E14)

| ID | Requirement | Type | Priority | Status | Source |
| --- | --- | --- | --- | --- | --- |
| FLOW-BUSINESS-EVENT-LIFECYCLE | Deferred — business events are backed by Jira Assets; needs a Jira stub. Create, edit, delete, and activity-history across `ROUTE-BUSINESS-EVENTS-*` and the project-scoped JiraRestController business-events CRUD, versions, field options, and project object-key endpoints. Target spec: `e2e/specs/businessEvents.spec.ts` (E13/E14, LPD-88255) | e2e | P1 | deferred | spec:flow#business-event-lifecycle |
| FLOW-TICKET-UPLOAD | Deferred — needs Jira and GCS stubs. Attachment upload initiates a GCS resumable session (`REST-POST-TICKET-ATTACHMENTS-INITIATE-UPLOAD`), completes with an MD5 check and posts a Jira comment (`…-COMPLETE-UPLOAD`), with the draft-comment retry cron (`CRON-SCHEDULEDUPDATETICKETATTACHMENTDRAFTCOMMENTBODY`) as fallback; drives `ROUTE-TICKET-ATTACHMENTS-NEW*` and the upload access check. Target spec: `e2e/specs/ticketUpload.spec.ts` (E13/E14, LPD-88255) | e2e | P1 | deferred | spec:flow#ticket-attachment-upload |
| FLOW-TICKET-DOWNLOAD | Deferred — needs a GCS stub. Signed-URL download (≤15 min expiry) enforces member vs non-member access checks (`REST-GET-TICKETS-…-DOWNLOAD-ACCESS-CHECK`, by-id and by-ERC download); non-member → 403, missing → 404. Target spec: `integration/specs/ticketAttachmentDownload.spec.ts` (E13/E14, LPD-88255) | integration | P1 | deferred | spec:flow#ticket-attachment-download |
| FLOW-TICKET-ATTACHMENT-RETENTION | Deferred — needs Jira and GCS stubs. Attachment retention lifecycle: `scheduledCleanUp` deletes the record and the storage object of each attachment on a ticket closed 7 to 8 days ago (`CRON-SCHEDULEDCLEANUP`), and `scheduledDeleteTicketAttachment` separately hard deletes trashed attachments from GCS and then their records (`CRON-SCHEDULEDDELETETICKETATTACHMENT`), idempotently. Target spec: `integration/specs/ticketAttachmentRetention.spec.ts` (E13/E14, LPD-88255) | integration | P1 | deferred | spec:flow#ticket-attachment-retention |

## Publisher (E18)

| ID | Requirement | Type | Priority | Status | Source |
| --- | --- | --- | --- | --- | --- |
| FLOW-PUBLISHER-ONBOARDING | Deferred on the seeding gap (here an entitled publisher), plus a GCS stub for logo/asset upload. Publisher edits the profile and uploads a logo, then views published apps, published solutions, and the sales summary across `ROUTE-PUBLISHER-DASHBOARD-*`. Target spec: `e2e/specs/publisherDashboard.spec.ts` (E18, LPD-88250) | e2e | P1 | deferred | spec:flow#publisher-onboarding |

## Admin, Trials & Provisioning (E07/E16/E20)

| ID | Requirement | Type | Priority | Status | Source |
| --- | --- | --- | --- | --- | --- |
| FLOW-ADMIN-DASHBOARD | Deferred on the seeding gap — the Marketplace admin dashboard renders for entitled staff, which the seed admin is not. Drives the Admin route group (`ROUTE-ADMIN-*`): tables paginate/sort/filter, inline edit, and non-admin rejection. Target spec: `e2e/specs/adminDashboard.spec.ts` (E16, LPD-88257) | e2e | P1 | deferred | spec:flow#admin-dashboard |
| FLOW-TRIAL-PROVISIONING | Deferred — trial provisioning is now implemented (`REST-POST-TRIAL-PROVISIONING-ORDERID`, `CRON-SCHEDULEDPROCESSTRIALS`, `Provisioning*Service`). Availability and domain checks (`REST-GET-TRIAL-AVAILABILITY`, `REST-GET-TRIAL-DOMAIN-AVAILABILITY-PROJECTPREFIX`) gate the start; provisioning creates the tenant. Needs the provisioning/console backend stub. Target spec: `integration/specs/trialProvisioning.spec.ts` (E07, LPD-88259; LPD-97677 Phase 1 provisioning) | integration | P0 | deferred | spec:flow#trial-provisioning |
| FLOW-TRIAL-EXPIRY | Deferred — trial expiry/extension is now implemented (`REST-POST-TRIAL-EXPIRE-ORDERID`, `REST-POST-TRIAL-EXTEND-ID`, `REST-DELETE-TRIAL-ORDERID`, and the expiry/notify branches of `CRON-SCHEDULEDPROCESSTRIALS`). Needs the provisioning backend stub + seeded trials. Target spec: `integration/specs/trialProvisioning.spec.ts` (E07, LPD-88259) | integration | P1 | deferred | spec:flow#trial-expiry |

## Utilization, Console & Publisher Analytics (E07/E18/E20)

Adjacent flows surfaced by auditing the sibling `liferay-customer-workspace` and
`liferay-marketplace-workspace`, whose code has close analogs in One (some of it
in the unscannable `liferay-one-etc-cron`). Captured so no coded flow is
undocumented; all are **spec-not-staged**.

| ID | Requirement | Type | Priority | Status | Source |
| --- | --- | --- | --- | --- | --- |
| FLOW-CONSOLE-ANALYTICS-PROVISIONING | Spec-not-staged — after a trial/purchase completes, `SVC-CONSOLESERVICE` and `SVC-ANALYTICSCLOUDSERVICE` provision the console project and Analytics Cloud workspace and `ProvisioningAssignmentService` wires roles/Okta groups, driving `ROUTE-PRODUCT-PURCHASE-PROVISIONING`; the service branches are unit-covered, the in-action path needs the console/analytics backend stub (E07, LPD-88259; E20, LPD-88249) | integration | P1 | deferred | spec:flow#console-analytics-provisioning |
| FLOW-UTILIZATION-TRACKING | Spec-not-staged — project resource utilization/overage is computed and rendered in the project item detail (`buildUtilizationSections`, `resolveUtilizationProfile`) per the E20 profile; there is no backend utilization object yet, so this is a frontend-only unit target on the utilization builder plus an e2e render check once an entitled member is provisioned (E20, LPD-88249) | unit | P2 | deferred | spec:flow#utilization-tracking |
| FLOW-PUBLISHER-SALES-SUMMARY | Spec-not-staged — publisher paid orders aggregate into quarterly sales summaries and render on the Publisher Dashboard via `PublisherSalesSummaries` on `ROUTE-PUBLISHER-DASHBOARD-*`; the aggregation job lives in the unscannable `liferay-one-etc-cron` (analog: marketplace `MarketplaceCommandLineRunner._processPublisherSalesSummary`), so only the SPA render is testable here until that source is vendored (E18, LPD-88250) | e2e | P2 | deferred | spec:flow#publisher-sales-summary |

## Not-Yet-Built Epics (phase-completion tracking)

Epics under LPD-87600 whose runtime feature has **no code in the two client
extensions yet**. Unlike the deferred journeys above — which are implemented but
cannot run locally — these are `planned` on purpose so they sit in the go-live
denominator, each covered only by a `test.fixme` stub in `pendingFlows.spec.ts`.
`plan:report` therefore classifies them **⏳ pending** (counted, not real), so the
GO-LIVE (real) percentage measures how much of the phase is actually finished:
when each epic lands, replace its stub with a real test and the number climbs.

| ID | Requirement | Type | Priority | Status | Source |
| --- | --- | --- | --- | --- | --- |
| FLOW-CONSUMPTION-METERING | Not built yet — per-account and per-project usage is metered and aggregated into billable consumption records on the billing cycle. Pending stub: `integration/specs/pendingFlows.spec.ts` (E24, LPD-88265) | integration | P0 | planned | spec:flow#consumption-metering |
| FLOW-CONSUMPTION-BILLING | Not built yet — aggregated consumption converts to Stripe charges/invoice lines, with overage above the plan allowance billed and idempotent on re-run. Pending stub: `integration/specs/pendingFlows.spec.ts` (E24, LPD-88265) | integration | P0 | planned | spec:flow#consumption-billing |
| FLOW-MULTI-CURRENCY-CHECKOUT | Not built yet — catalog prices and checkout totals render in the account's currency and the resulting CommerceOrder persists that currency. Pending stub: `e2e/specs/pendingFlows.spec.ts` (E26, LPD-88263) | e2e | P1 | planned | spec:flow#multi-currency-checkout |
| FLOW-LOCALIZATION | Not built yet — the custom element renders localized labels and formats per the user's locale across the page groups. Pending stub: `e2e/specs/pendingFlows.spec.ts` (E26, LPD-88263) | e2e | P1 | planned | spec:flow#localization |

## Surface coverage matrix

Proof that the journeys above collectively exercise every unit-tested surface in
action. This table is informational — `checkPlan` does not parse it (it is not
a six-column plan table). "Status" is the real-test status, not the unit-test
status; every surface here already has unit coverage in its per-surface file.

| Unit-tested surface | Exercised in action by | Real-test status | Blocker to run locally |
| --- | --- | --- | --- |
| `/ready` | `REST-GET-READY` (`springBootReady.spec.ts`) | ✅ covered | none |
| Every protected endpoint — unauthenticated 401 | `AUTH-UNAUTHENTICATED` | ✅ covered | the route existence probes need the oahs secret |
| Every protected endpoint — scoped 403 / 200 | `AUTH-OAUTH2-SCOPES` + the per-journey rows | ⊘ deferred | `/o/one/v1` proxy + scoped OAuth2 token |
| Gated page groups mount + gate | `FLOW-RESTRICTED-PAGE` | ✅ covered | none |
| `ROUTE-ADMIN-*` | `FLOW-ADMIN-DASHBOARD` | ⊘ deferred | seeding gap |
| `ROUTE-MY-ACCOUNT-*` | `FLOW-MY-ACCOUNT-OVERVIEW`, `FLOW-ACCOUNT-TEAM-MEMBERS` | ⊘ deferred | seeding gap |
| `ROUTE-MY-ACCOUNT-PROJECT*`, `…-PROJECT-MEMBERS` | `FLOW-PROJECT-LIFECYCLE`, `FLOW-PROJECT-MEMBERSHIP` | ⊘ deferred | seeding gap + seeded project |
| `ROUTE-PRODUCT-PURCHASE-*` (+ AccountSelector) | `FLOW-PRODUCT-PURCHASE-ENTRY`, `FLOW-CHECKOUT-FREE`, `FLOW-CHECKOUT-PAID`, `FLOW-AI-HUB-PURCHASE` | ⊘ deferred | seeding gap + commerce/payment/AI Hub stub |
| `ROUTE-PRODUCT-PURCHASE-CONTRACT` | `FLOW-PRODUCT-PURCHASE-CONTRACT` | ⊘ deferred | seeding gap + seeded contracts |
| `ROUTE-PRODUCT-PURCHASE-SEO-STUDIO-FORM` (+ the AI Hub prerequisite gate) | `FLOW-SEO-STUDIO-SIGNUP` | ✅ covered | the gate is unit covered; seeding gap for the journey |
| `ROUTE-PRODUCT-PURCHASE-DSR-FORM` + `REST-POST-DIGITAL-SALES-ROOM-PROVISIONING-ORDERID` | `FLOW-DIGITAL-SALES-ROOM-SIGNUP` | ⊘ deferred | Analytics Cloud stub |
| CMP contact-sales substitution + license tiers + Download tab package | `FLOW-CMP-CONTACT-SALES` | ⊘ uncovered | none for the substitution; seeded GA order for the Download tab |
| `REST-*-APP-LICENSE-KEYS-*` (create, read, download, activate, deactivate) | `FLOW-APP-LICENSE-KEY-LIFECYCLE` | ⊘ deferred | proxy + administrator token + seeded entitlement |
| `ROUTE-PUBLISHER-DASHBOARD-*` | `FLOW-PUBLISHER-ONBOARDING` | ⊘ deferred | seeding gap + GCS stub |
| `ROUTE-TICKET-ATTACHMENTS-*` | `FLOW-TICKET-UPLOAD`, `FLOW-TICKET-DOWNLOAD` | ⊘ deferred | Jira + GCS stubs |
| `ROUTE-BUSINESS-EVENTS-*` | `FLOW-BUSINESS-EVENT-LIFECYCLE` | ⊘ deferred | Jira stub |
| Jira business-events CRUD (project-scoped), versions, field options, object-key | `FLOW-BUSINESS-EVENT-LIFECYCLE` | ⊘ deferred | Jira stub |
| Jira tickets list (project-scoped) | `FLOW-TICKET-UPLOAD`, `FLOW-TICKET-DOWNLOAD` | ⊘ deferred | Jira stub |
| Jira product-versions (`CRON-SYNCPRODUCTVERSIONS`) | `FLOW-BUSINESS-EVENT-LIFECYCLE` | ⊘ deferred | releases feed stub |
| Entitlement generation + commerce-order-item object action | `FLOW-ENTITLEMENT-GENERATION`, `FLOW-CHECKOUT-FREE` | ⊘ deferred | seeded commerce order items |
| Commerce tax calculation (`SVC-COMMERCEORDERSERVICE`) | `FLOW-TAX-CALCULATION` | ⊘ deferred | seeded order behind proxy |
| Account/user/organization object actions + `organizations/*`, `accounts/*/user-accounts/*` | `FLOW-ACCOUNT-PROVISIONING`, `FLOW-ACCOUNT-TEAM-MEMBERS`, `FLOW-ORGANIZATION-SYNC` | ⊘ deferred | proxy + JSM/Okta stubs |
| Okta subscribers + `sync-with-okta` / `sync-from-okta` | `FLOW-OKTA-IDENTITY-SYNC` | ⊘ deferred | Pub/Sub broker + Okta stub |
| License-key generation/download, `license-keys/*`, `common-license-keys` | `FLOW-LICENSE-GENERATION`, `FLOW-LICENSE-FREE-KEY`, `FLOW-SUBSCRIPTION-LICENSE-SYNC` | ⊘ deferred | signer + migrated subscription data |
| Trial provisioning/expiry endpoints + `CRON-SCHEDULEDPROCESSTRIALS` + `Provisioning*Service` | `FLOW-TRIAL-PROVISIONING`, `FLOW-TRIAL-EXPIRY` | ⊘ deferred | provisioning/console backend stub |
| `SVC-CONSOLESERVICE`, `SVC-ANALYTICSCLOUDSERVICE` | `FLOW-CONSOLE-ANALYTICS-PROVISIONING` | ⊘ deferred | console/analytics backend stub |
| Ticket-attachment initiate/complete upload | `FLOW-TICKET-UPLOAD` | ⊘ deferred | Jira + GCS stubs |
| Ticket-attachment download (by-id, by-ERC) + access checks | `FLOW-TICKET-DOWNLOAD` | ⊘ deferred | GCS + Jira stubs |
| `CRON-SCHEDULEDSENDEXPIRINGLICENSEKEYEMAILS` | `FLOW-LICENSE-EXPIRATION-EMAIL` | ⊘ deferred | seeded subscription/license data |
| `CRON-SCHEDULEDCLEANUP`, `CRON-SCHEDULEDDELETETICKETATTACHMENT` | `FLOW-TICKET-ATTACHMENT-RETENTION` | ⊘ deferred | Jira + GCS stubs |
| `CRON-SCHEDULEDUPDATETICKETATTACHMENTDRAFTCOMMENTBODY` | `FLOW-TICKET-UPLOAD` (retry fallback) | ⊘ deferred | Jira stub |
| `CRON-SYNCACCOUNTROLES`, `CRON-SYNCORGANIZATIONROLES` | `FLOW-ORGANIZATION-SYNC` (JSM mirror) | ⊘ deferred | JSM stub |
| `SUB-SALESFORCEOBJECTPUBSUBSUBSCRIBER`, `SUB-SALESFORCEOPPORTUNITYPUBSUBSUBSCRIBER` | `FLOW-SALESFORCE-ORDER-SYNC` | ⊘ deferred | Pub/Sub broker + Salesforce message stub |
| `CRON-SCHEDULEDASSETOBJECTSCACHEEVICTION` | — (internal Spring cache evict; no user journey) | ⚠ unit-only | n/a — not a user journey |
| `object/action/user/delete` (subscription cleanup cascade) | — (internal object action; no user journey) | ⚠ unit-only | n/a — not a user journey |

Two surfaces have no in-action journey by design — a Spring cache eviction and an
internal user-delete cascade are pure mechanics with no user-facing flow, so unit
coverage is sufficient. Everything else is exercised by a journey above and is
unblocked by the same environment work: closing the seeding gap with users that
hold the gating entitlement and role, an OAuth2 app for scoped tokens behind a
local `/o/one/v1` proxy, and external-system stubs (Jira, GCS, Salesforce
Pub/Sub, Okta, Analytics Cloud, provisioning/console) or seeded commerce data.
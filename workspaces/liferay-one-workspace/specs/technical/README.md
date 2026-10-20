# Technical Specs

This directory records the technical rules that apply to every feature, how the workspace is built, and what Liferay One exchanges with each external system. The row schema, the checks, and the steps to add an area are in [`../README.md`](../README.md).

## Requirements

Each file holds `TECH-<AREA>-<NNN>` rows, organized by quality attribute.

| File | Area Code | Covers |
| --- | --- | --- |
| `security.md` | `SECURITY` | Query escaping, CSRF tokens, and link schemes |
| `reliability.md` | `RELIABILITY` | Malformed data, values that cannot be fetched, startup failures, concurrency, and list bounds |
| `performance.md` | `PERFORMANCE` | Browser caching |

## Integrations

`integrations/` holds one contract file for each external system. A contract states what Liferay One sends to the system, what it expects back, and what breaks when either side changes. Each file uses the same row schema, with its own area code.

| File | Area Code | Covers |
| --- | --- | --- |
| `integrations/ai-hub.md` | `AIHUB` | AI Hub accounts, the SEO&AEO Studio Beta add on, and prepaid token quota blocks |
| `integrations/console.md` | `CONSOLE` | Liferay Cloud Console, Analytics Cloud, trial portal instances, the DataOps Metrics API, and the releases feed |
| `integrations/gcs.md` | `GCS` | Google Cloud Storage for ticket attachments |
| `integrations/jira.md` | `JIRA` | Jira Service Management issues and the JSM asset schema |
| `integrations/okta.md` | `OKTA` | Okta reads over REST, Okta changes over Pub/Sub, groups, and the Cloud Native app |
| `integrations/payments.md` | `PAYMENTS` | Payment through the PayPal integration of Liferay Commerce, and the fixed rate tax calculation. The plan names Stripe, but the code does not call it. |
| `integrations/salesforce.md` | `SALESFORCE` | Salesforce messages over Pub/Sub, and the Google Cloud function that creates opportunities |

## Architecture

These files are prose. `plan:check` does not read them, so they can become stale. The object definitions in `client-extensions/liferay-one-batch/batch/` and the controllers in `client-extensions/liferay-one-etc-spring-boot` are the source of truth for ERCs, fields, list types, and endpoints.

| File | Covers |
| --- | --- |
| [`workspace.md`](./workspace.md) | The shell layout, the client extensions, and the naming conventions |
| [`data-model.md`](./data-model.md) | The entity index, the ERC and friendly URL registry, and the field mappings |
| [`object-model.md`](./object-model.md) | Every object, relationship, and soft link, with a diagram and the 2026-10-15 audit |
| [`consumable-products.md`](./consumable-products.md) | How a metered product joins the monthly usage reports, and the seed data that a new one needs |
| [`events-and-jobs.md`](./events-and-jobs.md) | Every object action, scheduled job, Pub/Sub subscriber, and notification template, and the chains between them |
| [`licensing.md`](./licensing.md) | The key types and families, how each key is generated and validated, and the licensing objects |
| [`order-to-entitlement.md`](./order-to-entitlement.md) | How each kind of order is created and turns into entitlements, keys, and environments |
| [`permissions.md`](./permissions.md) | The roles, the object permission matrix, guest access, the frontend gates, and the checks on each sidecar endpoint |
| [`provisioning.md`](./provisioning.md) | How an environment is built from zero, the batch file dependencies, which layer owns each kind of data, and what each reset rebuilds |
| [`route-api-map.md`](./route-api-map.md) | Each page and route of the custom element, the endpoints it calls, and the callers of each sidecar endpoint |
| [`salesforce-data-flow.md`](./salesforce-data-flow.md) | Each Salesforce message, its field mapping to Liferay objects, and the matching, retry, and null rules |
| [`system-context.md`](./system-context.md) | The users, the containers, every external system, how each connection authenticates, and the deployment topology |

A script generated the tables in `events-and-jobs.md`, `permissions.md`, `provisioning.md`, `route-api-map.md`, and `salesforce-data-flow.md` on 2026-10-16. When the code changes, these tables become stale, the same as the prose. For the current API surface and route map, read the code: the Spring Boot controllers under `client-extensions/liferay-one-etc-spring-boot`, and the service layer and `src/pages/` under `client-extensions/liferay-one-custom-element`.
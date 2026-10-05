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

For the API surface and the page and route map, read the code: the Spring Boot controllers under `client-extensions/liferay-one-etc-spring-boot`, and the service layer and `src/pages/` under `client-extensions/liferay-one-custom-element`.
# AI Hub Integration

This file is the contract between Liferay One and AI Hub. Liferay One creates an AI Hub account for an AI Hub order, adds the SEO&AEO Studio Beta add on to an AI Hub account, and buys prepaid token quota blocks for a token order. A change on either side to an endpoint, a request field, a response field, or the OAuth2 application breaks these rules. The feature rules that use this integration belong to [Purchasing and Orders](../../business/purchasing-and-orders.md) and [Usage and Utilization](../../business/usage-and-utilization.md), and this file cites them by ID.

The systems are AI Hub, which is a Liferay DXP, and the Liferay One Spring Boot service. The actors are the order completion flow of the service, the nightly job that completes settled orders, and the buyer who sends the AI Hub form.

Terms used in this file:

- **AI Hub account**: the account entry on AI Hub that holds one customer hub. AI Hub gives its numeric ID as `accountEntryId`.
- **AI Hub form**: the `aiHubForm` object in the order metadata. It holds `aiHubAccountName` and `administratorEmailAddress`.
- **AI Hub environment**: the Environment object entry in Liferay One that records one AI Hub account for a project or an account.
- **Quota block**: a prepaid number of Liferay tokens that AI Hub adds to an AI Hub account.
- **Order metadata**: the `order-metadata` custom field of a Commerce order, a JSON document.

## Connection and Configuration

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-AIHUB-001 | Liferay One calls AI Hub below the base URL in `external.ai.hub.oauth2.headless.server.home.page.url`. It sends a JSON `POST` to `/o/ai-hub/v1.0/provisioning` and to `/o/ai-hub-pricing/v1.0/accounts/{accountEntryId}/quota-blocks/purchase`. It calls no other AI Hub endpoint. | P0 | LPD-98248, LPD-102570 | `SVC-AIHUBSERVICE` |
| TECH-AIHUB-002 | Liferay One sends a bearer token of the OAuth2 application `external-ai-hub`, which it gets with the client credentials grant. The client ID, the client secret, and the token URI come from the `external-ai-hub.oauth2.headless.server.client.id`, `external-ai-hub.oauth2.headless.server.client.secret`, and `external-ai-hub.oauth2.token.uri` properties. `external-ai-hub` must be in `liferay.oauth.application.external.reference.codes`. Liferay One uses the same token again until 60 seconds before it expires. | P0 | LPD-98248 | `SVC-AIHUBSERVICE` |
| TECH-AIHUB-003 | Each AI Hub call stops when the answer gives no data for five minutes, as TECH-RELIABILITY-005 states. | P1 | LPD-88277 | `CLS-HTTPTIMEOUTUTIL` |
| TECH-AIHUB-004 | When a call fails before an answer arrives, for example a refused connection or the timeout of TECH-AIHUB-003, Liferay One sends the same request again. It sends it 3 more times at most, 5 seconds apart. An HTTP error answer is not sent again. When the last attempt fails, the error goes to the caller. | P1 | LPD-98248 | `SVC-AIHUBSERVICE` |

## AI Hub Accounts

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-AIHUB-010 | When an `AI_HUB` order completes, Liferay One provisions an AI Hub account. The order must hold an AI Hub form. The request gives `accountEntryName` from `aiHubAccountName`, an empty `addOns` array, and one entry in `userAccounts`. The request also gives `tier` when the order metadata has one. | P0 | LPD-102570 | `SVC-COMMERCEORDERSERVICE`, `FLOW-AI-HUB-PURCHASE` |
| TECH-AIHUB-011 | Each entry in `userAccounts` gives `emailAddress`, `firstName`, and `lastName`. The email address is the `administratorEmailAddress` of the form. The names come from the Liferay user with that email address. When no such user exists, the names are `AI Hub` and `Administrator`. | P1 | LPD-102570 | `SVC-COMMERCEORDERSERVICE` |
| TECH-AIHUB-012 | When the order metadata has a `salesforceProjectId`, the request gives it as `accountEntryExternalReferenceCode`. Liferay One provisions nothing when that project does not exist or belongs to another account. | P0 | LPD-102570 | `SVC-COMMERCEORDERSERVICE` |
| TECH-AIHUB-013 | AI Hub returns JSON with `accountEntryId`. Liferay One writes it to `aiHubAccountEntryId` in the order metadata. It also writes an AI Hub environment with a `PUT` by external reference code. The code is `AI-HUB-` plus the Salesforce project ID, or `AI-HUB-` plus the account external reference code when the order has no project. The environment holds the AI Hub account ID in `externalEnvironmentId` and the base URL of TECH-AIHUB-001 in `aiHubURL`. | P0 | LPD-102570, LPD-108750 | `SVC-AIHUBSERVICE`, `SVC-COMMERCEORDERSERVICE` |
| TECH-AIHUB-014 | Liferay One provisions the AI Hub account after it marks the order completed. When AI Hub returns an HTTP error, Liferay One logs the response body and changes nothing more. The order stays completed with no AI Hub account, and nothing tries again. | P0 | LPD-102570 | `SVC-AIHUBSERVICE` |

## SEO&AEO Studio Beta

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-AIHUB-020 | A settled `SEO_STUDIO` order adds the add on `seoStudio` to the AI Hub account of its project. The request uses the provisioning endpoint of TECH-AIHUB-001. It gives the Salesforce project ID as `accountEntryExternalReferenceCode`, and the `aiHubAccountName` and `tier` of the latest completed AI Hub order of the same project. REQ-ORDERS-130 states the purchase rule. | P1 | LPD-105834 | `SVC-COMMERCEORDERSERVICE`, `FLOW-SEO-STUDIO-SIGNUP` |
| TECH-AIHUB-021 | The administrator email address comes from the `seoStudioForm` of the order, or from the AI Hub form of the AI Hub order when the order has none. Liferay One cancels the order and records the reason in `seoStudioError` when the project has no provisioned AI Hub or no administrator email address exists. | P1 | LPD-105834 | `SVC-COMMERCEORDERSERVICE` |
| TECH-AIHUB-022 | Liferay One writes the AI Hub answer to `seoStudio` in the order metadata and then completes the order. When AI Hub returns an HTTP error, the order stays pending, and the nightly job of settled orders tries again. An order that already holds `seoStudio` completes with no second request. | P1 | LPD-105834 | `SVC-COMMERCEORDERSERVICE` |

## Prepaid Quota Blocks

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-AIHUB-030 | A settled `AI_HUB_TOKEN` order buys one quota block. The request body gives `size` and `transactionId`. The size is the sum of the default quantity of the active `aiTokenBlock` entitlement definition of each SKU, times the quantity of its order item. The transaction ID is the Commerce order ID. REQ-USAGE-071 states the rule. | P0 | LPD-90605, LPD-102570 | `SVC-AIHUBSERVICE`, `SVC-COMMERCEORDERSERVICE`, `FLOW-AI-HUB-PURCHASE` |
| TECH-AIHUB-031 | The `accountEntryId` in the path is the `externalEnvironmentId` of the AI Hub environment of TECH-AIHUB-013. The order does not complete when that environment does not exist, belongs to another account, or has no AI Hub account ID. REQ-USAGE-073 states the rule. | P0 | LPD-90605, LPD-108750 | `SVC-COMMERCEORDERSERVICE` |
| TECH-AIHUB-032 | After a purchase, Liferay One writes `aiHubQuotaBlockSize` to the order metadata. An order that holds this key buys no second block. REQ-USAGE-072 states the rule. | P0 | LPD-90605 | `SVC-AIHUBSERVICE`, `SVC-COMMERCEORDERSERVICE` |
| TECH-AIHUB-033 | When AI Hub returns an HTTP error or an empty answer, the purchase fails, and the order does not complete. Liferay One then creates no Salesforce opportunity for the order. The next completion attempt tries the purchase again. | P0 | LPD-102570 | `SVC-AIHUBSERVICE`, `SVC-COMMERCEORDERSERVICE` |

## Known Risks

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-AIHUB-090 | Known risk: the retry of TECH-AIHUB-004 sends a `POST` again after a timeout, also when AI Hub received the first request. AI Hub must accept a repeated provisioning request for the same account, and must use `transactionId` to refuse a second purchase of the same block. One call with four attempts can hold the calling thread for more than 20 minutes. | P1 | — | — |
| TECH-AIHUB-091 | Known risk: `external.ai.hub.oauth2.headless.server.home.page.url` has an empty default. With no value, Liferay One sends the AI Hub requests to its own Liferay DXP, which does not have the AI Hub endpoints. | P2 | — | — |
| TECH-AIHUB-092 | Known gap: the AI Hub service replaces the response filter of the other Liferay One services. A 403 answer from AI Hub is therefore not logged with its body. | P2 | — | — |

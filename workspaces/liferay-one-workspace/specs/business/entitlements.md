# Entitlements

This area covers the right to a product that a purchase gives an account or a project. It includes how the system creates entitlements from commerce order items, the entitlement definitions that act as templates for each SKU, the dates and the state of an entitlement, the two conventions for entitlement names, how account level and project level entitlements attribute to projects and contracts, and the project item detail pages that depend on entitlements. The products and applications list that reads orders belongs to the projects area. License key quotas belong to the licensing area.

The actors are a customer user, a project member, the global administrator roles, Salesforce, and the system processes that react to commerce events (object actions and scheduled jobs).

Terms used in this file:

- **Entitlement**: one grant of a product capability to an account, and optionally to a project and a contract. An entitlement has a name, a quantity, a grant type, a start date, and an end date.
- **Entitlement definition**: the template that says which entitlements one SKU grants. A definition links to its SKU by the SKU external reference code.
- **Order item**: one line of a commerce order. Its custom fields carry the start date, the end date, and the effective end date of the purchase.
- **Effective end date**: an earlier end date that a renewal, an amendment, or a deletion in Salesforce sets on an order item. The original end date stays as it was.
- **Account level entitlement**: an entitlement that belongs to an account and to no project.
- **One Time Purchases**: the pseudo project and pseudo contract that hold the orders and entitlements that no project or project contract owns. See [`glossary.md`](../glossary.md).

## Entitlement Generation

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ENTITLEMENTS-001 | When a commerce order item is created, the system creates one entitlement for each active entitlement definition of the SKU of that order item. | P0 | LPD-89424, LPD-103716 | `REST-POST-OBJECT-ACTION-COMMERCE-ORDER-ITEM-ENTITLEMENT-GENERATION`, `SVC-ENTITLEMENTSERVICE`, `FLOW-ENTITLEMENT-GENERATION`, `FLOW-CHECKOUT-FREE` |
| REQ-ENTITLEMENTS-002 | A definition that names product options applies only to an order item with the same value for each of those options. The system compares option keys without regard to case. | P0 | LPD-89424 | `SVC-ENTITLEMENTSERVICE`, `CLS-ENTITLEMENTDEFINITION`, `CLS-COMMERCEORDERITEMUTIL` |
| REQ-ENTITLEMENTS-003 | The system creates no entitlement for a canceled order item, for an order item that does not exist, or for a SKU that has no active definition. | P0 | LPD-89424 | `SVC-ENTITLEMENTSERVICE`, `REST-POST-ENTITLEMENTS-GENERATE`, `CLS-COMMERCEORDERITEMUTIL` |
| REQ-ENTITLEMENTS-004 | Generation is safe to repeat. The external reference code of an entitlement is the order item ID and the definition ID. The system refuses a second entitlement for the same order item and definition. | P0 | LPD-89274 | `SVC-ENTITLEMENTSERVICE`, `FLOW-ENTITLEMENT-GENERATION` |
| REQ-ENTITLEMENTS-005 | Generation is not all or nothing. When the system cannot create the entitlement of one definition, it logs the failure and creates the entitlements of the other definitions. | P1 | LPD-89424 | `SVC-ENTITLEMENTSERVICE` |
| REQ-ENTITLEMENTS-006 | The quantity of an entitlement is the default quantity of its definition multiplied by the quantity of the order item. The entitlement copies the name, the grant type, the maximum quantity, and the product options from its definition. | P0 | LPD-100375 | `SVC-ENTITLEMENTSERVICE` |
| REQ-ENTITLEMENTS-007 | An entitlement copies the overage rate and the overage SKU from its definition when the system grants it. A later change to the definition does not change the price of an existing entitlement. A rate of zero or less, or a rate without a SKU, means that the entitlement has no overage price. | P0 | LPD-99837 | `SVC-ENTITLEMENTSERVICE`, `CLS-OVERAGEPRICING` |
| REQ-ENTITLEMENTS-008 | A system process can ask for the entitlements of one order item by the ID of the order item. This request follows the same rules as the object action and is safe to repeat. | P1 | LPD-89424 | `REST-POST-ENTITLEMENTS-GENERATE`, `FLOW-CHECKOUT-FREE` |
| REQ-ENTITLEMENTS-009 | The Enterprise-Wide product has no active entitlement definition, so its opportunity line creates an order item and no entitlement. Entitlements that the system gave to a project before this rule stay as they are. The other lines of the deal grant as usual: an opportunity line to the purchasing project, and a project entitlement line to the project of its header. | P0 | LPD-107900 | — |

## Entitlement Dates

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ENTITLEMENTS-010 | A new entitlement starts on the start date and ends on the end date of its order item. A missing date leaves the entitlement open on that side. | P0 | LPD-89424 | `SVC-ENTITLEMENTSERVICE`, `CLS-COMMERCEORDERITEMUTIL` |
| REQ-ENTITLEMENTS-011 | When an order item changes, the system updates the dates and the quantity of all of its entitlements. The new end date is the earlier of the end date and the effective end date of the order item. The new quantity is the quantity of the order item times the default quantity of the entitlement definition. | P0 | LPD-102591, LPD-107900 | `REST-POST-OBJECT-ACTION-COMMERCE-ORDER-ITEM-ENTITLEMENT-UPDATE`, `SVC-ENTITLEMENTSERVICE`, `CLS-COMMERCEORDERITEMUTIL` |
| REQ-ENTITLEMENTS-012 | An entitlement never ends before it starts. When the new end date comes before the start date, the system uses the start date as the end date. | P0 | LPD-102591 | `REST-POST-OBJECT-ACTION-COMMERCE-ORDER-ITEM-ENTITLEMENT-UPDATE`, `SVC-ENTITLEMENTSERVICE` |
| REQ-ENTITLEMENTS-013 | A date update writes only the dates that changed. It changes nothing when the order item does not exist. | P1 | LPD-102591 | `REST-POST-OBJECT-ACTION-COMMERCE-ORDER-ITEM-ENTITLEMENT-UPDATE`, `SVC-ENTITLEMENTSERVICE` |
| REQ-ENTITLEMENTS-014 | A renewal applies to the approved order items of the same project and the same SKU. A project entitlement line renews the order items of its own project. When such an order item has an effective end date after the renewal start date, the system moves it back to the renewal start date. A renewal that starts before the end date of the order item changes nothing and adds a warning. | P0 | LPD-89686, LPD-107900 | `SVC-PROVISIONINGORDERSERVICE` |
| REQ-ENTITLEMENTS-015 | When an amendment changes the dates of an approved order item in the same opportunity family, the system sets the effective end date to the amended end date. It never moves an effective end date later. It adds a warning when the amended end date differs from the original end date. | P0 | LPD-89686 | `SVC-PROVISIONINGORDERSERVICE` |
| REQ-ENTITLEMENTS-016 | When Salesforce deletes a project entitlement or one of its line items, the system ends the matching order items at the current time. It does not move an effective end date that is already in the past. | P0 | LPD-102591 | `SVC-PROVISIONINGPROJECTENTITLEMENTSERVICE` |
| REQ-ENTITLEMENTS-017 | An update of an order item changes only the entitlements of that order item. It never changes an entitlement of another order item, such as a project entitlement order item of the same deal. | P0 | LPD-107900 | `SVC-ENTITLEMENTSERVICE` |

## Entitlement State

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ENTITLEMENTS-020 | An entitlement is active from its start date until its end date. An entitlement without a start date has started. An entitlement without an end date never expires. | P0 | LPD-90495 | `CLS-ENTITLEMENT`, `SVC-ENTITLEMENTSERVICE` |
| REQ-ENTITLEMENTS-021 | The termination status of an entitlement is active, suspended, or terminated. An entitlement without a termination status is active. | P0 | — | `CLS-ENTITLEMENT` |
| REQ-ENTITLEMENTS-022 | When an account holds the same cloud product through more than one entitlement, the system reports the entitlement that is furthest from termination. A customer that still holds a subscription never sees it as terminated. | P0 | — | `REST-POST-CLOUD-ENVIRONMENTS-ENVIRONMENTID-MANIFEST`, `CLS-ENTITLEMENT` |
| REQ-ENTITLEMENTS-023 | The subscription state of an account is the best state of its entitlements, in the order active, unactivated, and expired. An entitlement that starts in the future is unactivated. | P1 | — | `SVC-ENTITLEMENTSERVICE`, `CLS-LICENSEKEYCSVEXPORTER` |
| REQ-ENTITLEMENTS-024 | A cloud environment lists the active, cloud enabled products of its account, with one entry for each product. Only a user who can activate environments of that project can read the list. An unknown environment answers not found. | P0 | — | `REST-GET-CLOUD-ENVIRONMENTS-ENVIRONMENTID-ENTITLEMENTS`, `PERM-ENVIRONMENTACTIVATIONPERMISSION` |

## Entitlement Definitions

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ENTITLEMENTS-030 | An entitlement definition links to its SKU by the SKU external reference code, never by the product. The product code differs in each environment, but the SKU code does not. | P0 | LPD-103716 | `CLS-ENTITLEMENTDEFINITION`, `SVC-ENTITLEMENTSERVICE` |
| REQ-ENTITLEMENTS-031 | An inactive definition grants no new entitlements. The entitlements that it granted before stay as they are. | P0 | LPD-89424 | `SVC-ENTITLEMENTSERVICE` |
| REQ-ENTITLEMENTS-032 | For each approved paid marketplace app, the system keeps one generated definition for each published SKU that has a license usage type option. The name of the definition is the product name and the SKU. The external reference code of the definition is the SKU external reference code. A generated definition for a SKU whose license usage type is trial has a license key duration of 30 days. The reconciliation sets it on such a definition that has no duration and never changes a duration that is set. | P1 | LPD-99898, LPD-106163, LPD-108684 | `REST-POST-OBJECT-ACTION-COMMERCE-PRODUCT-DEFINITION-UPDATE`, `CRON-RECONCILEENTITLEMENTDEFINITIONS`, `CLS-COMMERCESKUUTIL` |
| REQ-ENTITLEMENTS-033 | When a person already created a definition for a SKU, the system does not generate a second definition for that SKU. | P1 | LPD-99898 | `CRON-RECONCILEENTITLEMENTDEFINITIONS` |
| REQ-ENTITLEMENTS-034 | The system deactivates a generated definition when its SKU is not published or no longer exists. It activates the definition again when the SKU is published again. The system never deletes a definition. | P0 | LPD-99898 | `CRON-RECONCILEENTITLEMENTDEFINITIONS`, `REST-POST-OBJECT-ACTION-COMMERCE-PRODUCT-DEFINITION-UPDATE` |
| REQ-ENTITLEMENTS-035 | Each day at 03:00, the system reconciles the definitions of every approved product. Only one reconciliation runs at a time. A failure for one product does not stop the other products. | P1 | LPD-99898, LPD-106163 | `CRON-RECONCILEENTITLEMENTDEFINITIONS` |
| REQ-ENTITLEMENTS-036 | A change to a catalog product generates definitions only when the product is approved. An event without the product data changes nothing and logs a warning. | P2 | LPD-106163 | `REST-POST-OBJECT-ACTION-COMMERCE-PRODUCT-DEFINITION-UPDATE` |

## Entitlement Names

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ENTITLEMENTS-040 | The name of an entitlement is a matching key that the system copies from its definition. The system does not change or normalize it. | P0 | — | `SVC-ENTITLEMENTSERVICE` |
| REQ-ENTITLEMENTS-041 | Usage capacity matches entitlement names as machine keys, for example `apv`, `malu`, `sites`, `ram`, `vcpu`, `storage`, `api-requests`, and `events`. An entitlement with another spelling adds nothing to the capacity of a project. | P0 | — | `CLS-SAASUSAGESTRATEGY`, `CLS-EXPERIENCEUSAGESTRATEGY`, `CLS-LDPUSAGESTRATEGY`, `CLS-LDPEVENTALLOTMENT`, `CLS-ENTITLEMENTUTIL` |
| REQ-ENTITLEMENTS-042 | Cloud and support checks match entitlement names as display labels, for example "Up to 5 Production Pods", "Liferay Cloud Native - Standard Operations Bundle", and "Gold Support". An entitlement with a machine key does not satisfy these checks. | P0 | — | `CLS-CLUSTERNODESUTIL`, `SVC-PROVISIONINGEMAILSERVICE`, `REST-POST-CLOUD-ENVIRONMENTS-ENVIRONMENTID-MANIFEST` |

## Project Attribution

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ENTITLEMENTS-050 | An entitlement belongs to the account of its order. It belongs to a project only when the order names a Salesforce project. Otherwise it is an account level entitlement. | P0 | LPD-99336 | `SVC-ENTITLEMENTSERVICE` |
| REQ-ENTITLEMENTS-051 | An entitlement belongs to the contract that its order names. When a contract syncs later, the system links each entitlement of the order without a contract to that contract. It links each entitlement without a project to the project of the contract. It never replaces an existing link. | P0 | — | `SVC-CONTRACTSERVICE` |
| REQ-ENTITLEMENTS-052 | A project shows the One Time Purchases group when it holds entitlements outside its own contracts. A project without contracts of its own shows the account level contracts instead. | P0 | — | `HOOK-USEPROJECTCOMMERCE` |
| REQ-ENTITLEMENTS-053 | When a user filters a project by a contract, the project shows only the products and applications that it holds under that contract. One Time Purchases shows only the items that the project does not hold under any of its contracts. | P0 | — | `HOOK-USEPROJECTITEMS`, `HOOK-USEPROJECTCOMMERCE` |
| REQ-ENTITLEMENTS-054 | The account shows a One Time Purchases project only when it has orders without a project or account level entitlements under account level contracts. | P1 | — | `CTX-PROJECTCONTEXT` |
| REQ-ENTITLEMENTS-055 | An account has an active experience offering when it holds an unexpired entitlement to one of the experience offering products. Such an account does not see the separate cloud native activation tab. | P1 | — | `MOD-MYACCOUNT-PROJECTS-RESOLVEPRODUCTTABCONFIG` |

## Project Item Detail Pages

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ENTITLEMENTS-060 | A project member opens a product or an application of the project at its own address. When the project does not hold that item, the page shows that it found no results. | P1 | — | `ROUTE-MY-ACCOUNT-PRODUCTERC`, `ROUTE-MY-ACCOUNT-APPLICATIONERC` |
| REQ-ENTITLEMENTS-061 | The detail page shows the details and orders tabs for every item. It shows the activation, download, environment, and utilization tabs only when the profile of the product allows them. | P1 | — | `MOD-MYACCOUNT-PROJECTS-RESOLVEPRODUCTTABCONFIG` |
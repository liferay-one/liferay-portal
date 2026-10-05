# Sales and CRM

This area covers how the system and Salesforce keep the sales record and the customer record in step. It includes the opportunities and the Salesforce objects that come in over Pub/Sub, the delivery and dead letter rules of Pub/Sub, the opportunities that the system sends to Salesforce for Marketplace orders, the Digital Sales Room, and the products that only the sales team sells. The account setup that an opportunity starts belongs to [Trials and Provisioning](./trials-and-provisioning.md). The admin pages for Pub/Sub belong to Administration.

The actors are Salesforce, the Pub/Sub subscribers of the system, a buyer, the Liferay sales team, and the dead letter notification recipient.

Terms used in this file:

- **Opportunity**: a Salesforce deal. A closed won opportunity becomes one order in the system.
- **Line item**: one product on an opportunity. A line item with a quantity of zero or less amends the items of an earlier opportunity.
- **Object message**: a Pub/Sub message that carries Salesforce accounts, contracts, price book entries, products, projects, or project entitlements.
- **Dead letter topic**: the Pub/Sub topic that receives a message after every delivery attempt fails.
- **DSR**: the Digital Sales Room, a product that runs on an Analytics Cloud workspace.

## Opportunity Sync

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-SALES-001 | The system provisions an opportunity only when its product family contains E, P, or S, and only when it has line items. A renewal opportunity is provisioned only at the stage Closed Lost. Every other opportunity is provisioned only at the stage Closed Won. The system ignores all other opportunities. | P0 | LPD-88254 | `SUB-SALESFORCEOPPORTUNITYPUBSUBSUBSCRIBER`, `FLOW-SALESFORCE-ORDER-SYNC` |
| REQ-SALES-002 | One opportunity gives one order, keyed by the opportunity ID. A message that comes again updates the same order and the same order items. It never adds a second order. The system completes the order once, with no payment. | P0 | LPD-88254 | `SUB-SALESFORCEOPPORTUNITYPUBSUBSUBSCRIBER`, `FLOW-SALESFORCE-ORDER-SYNC` |
| REQ-SALES-003 | The system creates or updates the account from the Salesforce account and sets the currency of the account. An opportunity without an account provisions nothing. When another account already uses the same name, the system records a warning. | P0 | LPD-101694 | `SUB-SALESFORCEOPPORTUNITYPUBSUBSUBSCRIBER` |
| REQ-SALES-004 | The order uses the latest contract of the opportunity. When the contract has no project, the system attaches it to the project of the opportunity. A missing contract is a warning. | P0 | LPD-92221 | `SUB-SALESFORCEOPPORTUNITYPUBSUBSUBSCRIBER` |
| REQ-SALES-005 | A line item with a quantity of zero or less is an amendment. It shortens the matching items of the earlier opportunity that it amends. An amendment without the ID of that earlier opportunity is a warning and changes nothing. | P0 | LPD-92221 | `CLS-SALESFORCEOPPORTUNITYLINEITEM`, `SVC-PROVISIONINGORDERSERVICE` |
| REQ-SALES-006 | A line item whose Salesforce product has no SKU is a warning, and the system skips that line. Line items in different currencies make the order use US dollars and add a warning. A date without a time is midnight UTC. | P1 | LPD-103716 | `SUB-SALESFORCEOPPORTUNITYPUBSUBSUBSCRIBER`, `CLS-SALESFORCEOPPORTUNITYLINEITEM` |
| REQ-SALES-007 | The system records a warning for an existing business opportunity without a project, for a new business opportunity whose project already exists, and for a line that ends on a different date than its contract. A warning never stops the provisioning. | P1 | — | `SUB-SALESFORCEOPPORTUNITYPUBSUBSUBSCRIBER`, `SVC-PROVISIONINGISSUESERVICE` |
| REQ-SALES-008 | Each record of an opportunity message processes alone. A failed record opens an error issue in Jira and does not stop the other records. The system acknowledges the message, so Pub/Sub does not deliver it again. | P0 | LPD-88254 | `SUB-SALESFORCEOPPORTUNITYPUBSUBSUBSCRIBER`, `SVC-PROVISIONINGISSUESERVICE` |

## Salesforce Object Sync

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-SALES-010 | Object messages keep the accounts, contracts, price book entries, products, projects, and project entitlements of the system the same as in Salesforce. Each write is keyed by the Salesforce ID, so a message that comes again changes nothing a second time. | P0 | LPD-88254, LPD-103716 | `SUB-SALESFORCEOBJECTPUBSUBSUBSCRIBER`, `FLOW-SALESFORCE-ORDER-SYNC`, `SVC-PROJECTSERVICE` |
| REQ-SALES-011 | Only a Salesforce account with an active subscription becomes an account in the system. | P1 | — | `SUB-SALESFORCEOBJECTPUBSUBSUBSCRIBER` |
| REQ-SALES-012 | The system keeps one price list for each price book and currency, and only for the supported currencies. A deleted price book entry removes its price entry. The system skips an entry with no price book or with a product that has no SKU. | P0 | LPD-99156 | `SUB-SALESFORCEOBJECTPUBSUBSUBSCRIBER` |
| REQ-SALES-013 | A product that Salesforce deletes becomes inactive. The system never deletes it. | P1 | — | `SUB-SALESFORCEOBJECTPUBSUBSUBSCRIBER` |
| REQ-SALES-014 | When a record of an object message fails, the system still processes the other records. Then it rejects the message, so Pub/Sub delivers it again. | P0 | LPD-88254 | `SUB-SALESFORCEOBJECTPUBSUBSUBSCRIBER`, `CLS-BASEPUBSUBSUBSCRIBER` |

## Message Delivery

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-SALES-020 | A subscriber acknowledges a message only after it processes the message with no error. Otherwise the subscriber rejects the message so that Pub/Sub delivers it again. | P0 | LPD-89441 | `CLS-BASEPUBSUBSUBSCRIBER`, `CLS-MESSAGE` |
| REQ-SALES-021 | A subscription that the system creates delivers messages in order and allows 30 seconds to process each one. After 5 failed delivery attempts, Pub/Sub moves the message to the dead letter topic. The system creates the dead letter topic when it does not exist. | P1 | LPD-93686 | `CLS-BASEPUBSUBSUBSCRIBER`, `CLS-BASEPUBSUBCLIENT` |
| REQ-SALES-022 | For each message in the dead letter topic, the system emails the configured recipient. The email gives the source subscription, the number of attempts, the attributes, and the payload. With no recipient, the system sends no email. A failure to report does not stop the subscriber. | P1 | LPD-93686 | `SUB-DEADLETTERPUBSUBSUBSCRIBER`, `CLS-BASEDEADLETTERPUBSUBSUBSCRIBER` |
| REQ-SALES-023 | A configuration setting turns each subscriber on or off. A subscriber without a Google Cloud project ID does not start. | P2 | LPD-89441 | `CLS-BASEPUBSUBSUBSCRIBER` |
| REQ-SALES-024 | The system uses explicit service account credentials only when all 4 credential settings have values. Otherwise it uses the default credentials of the runtime. | P2 | — | `CLS-SERVICEACCOUNTCREDENTIALSPROVIDER` |
| REQ-SALES-025 | The system uses one publisher for each topic. A failure to publish is logged and returned to the caller. A shutdown stops every publisher, even when one of them fails to stop. | P2 | — | `CLS-BASEPUBSUBPUBLISHER` |

## Outbound Opportunities

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-SALES-030 | When a Marketplace order for a Salesforce project completes, the system creates one Salesforce opportunity for it and records its ID on the order. An order that already has an opportunity ID gets no second opportunity. An order without a Salesforce project gets no opportunity. | P0 | LPD-98248, LPD-102570 | `SVC-SALESFORCESERVICE` |
| REQ-SALES-031 | An opportunity from the Marketplace is an existing business deal with a single year term. It closes on the order date. Each line item gives the SKU, the quantity, and the price. | P1 | LPD-98248 | `SVC-SALESFORCESERVICE` |
| REQ-SALES-032 | A line item ends 3 months after the order for a limited beta, 1 month after the order for a trial license, and 1 year after the order for all other licenses. A token line item has no dates. A money order payment is an offline payment. | P1 | LPD-102570 | `SVC-SALESFORCESERVICE`, `CLS-COMMERCEORDERUTIL` |
| REQ-SALES-033 | The system does not create an opportunity for an order without a billing country. The completion of that order stops with an error. | P1 | — | `SVC-SALESFORCESERVICE` |
| REQ-SALES-034 | An AI Hub order gets its opportunity while the order is pending. The primary contact is the AI Hub administrator from the form. The system handles one opportunity request for each order at a time. | P0 | LPD-102570 | `SVC-SALESFORCESERVICE`, `FLOW-AI-HUB-PURCHASE` |

## Digital Sales Room

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-SALES-040 | The system provisions a Digital Sales Room only for a DSR order whose payment is complete or not required. An order without a workspace name fails. | P0 | LPD-102451 | `REST-POST-DIGITAL-SALES-ROOM-PROVISIONING-ORDERID`, `FLOW-DIGITAL-SALES-ROOM-SIGNUP` |
| REQ-SALES-041 | A DSR workspace is an Analytics Cloud workspace keyed by the account. The owner is the workspace owner from the DSR settings, or the order creator when the settings name no owner. The owner also gets the incident reports, unless the settings name other contacts. | P1 | LPD-102451 | `REST-POST-DIGITAL-SALES-ROOM-PROVISIONING-ORDERID` |
| REQ-SALES-042 | When the workspace is ready, the system records it on the order and completes the order. When Analytics Cloud refuses the workspace, the system records the error on the order and cancels the order. | P0 | LPD-102451 | `REST-POST-DIGITAL-SALES-ROOM-PROVISIONING-ORDERID`, `FLOW-DIGITAL-SALES-ROOM-SIGNUP` |
| REQ-SALES-043 | A DSR purchase records a DSR request linked to the order for the sales team. The request holds the workspace and the server details. A failed DSR request does not stop the purchase. | P1 | LPD-102451 | `CLIENT-COMMERCE-PRODUCTPURCHASEDSR`, `FLOW-DIGITAL-SALES-ROOM-SIGNUP` |
| REQ-SALES-044 | The DSR form needs a workspace name of 3 or more characters and at least one of a host name, an IP address, or a MAC address. Each IP address and MAC address is on its own line and well formed. | P1 | LPD-102451 | `MOD-SCHEMAS-ADMINSCHEMAS`, `ROUTE-PRODUCT-PURCHASE-DSR-FORM`, `CLIENT-COMMERCE-PRODUCTPURCHASEDSR` |
| REQ-SALES-045 | A DSR order that a Salesforce opportunity provisions gets its workspace by the rules of REQ-PROVISIONING-054 and REQ-PROVISIONING-055. | P1 | LPD-104271 | `SVC-PROVISIONINGANALYTICSCLOUDSERVICE` |

## Contact Sales

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-SALES-050 | Only the sales team sells the Content Marketing Platform, the Digital Sales Room, and the Liferay Data Platform. For these products, the purchase flow shows the contact sales page in place of checkout. This also applies when the buyer opens the purchase URL directly. | P0 | LPD-102451, LPD-104271 | `FLOW-CMP-CONTACT-SALES`, `MOD-PRODUCTUTILS` |
| REQ-SALES-051 | The contact sales page names the product, lists the license tiers of its purchasable SKUs, and links to the Liferay contact sales page. The tiers are in the order developer, trial, production, and standard. | P2 | LPD-102451 | `FLOW-CMP-CONTACT-SALES`, `MOD-LICENSETIERUTILS` |
| REQ-SALES-052 | A solution product that is not a prebuilt trial shows the contact sales page. | P2 | — | `ROUTE-PRODUCT-PURCHASE-SOLUTION` |

## Not Yet Built

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-SALES-060 | A buyer can send a contact sales request with a name, an email address, an account name, the apps requested, and comments. The form rules and the request object exist, but no page sends the request yet. | P2 | — | `MOD-SCHEMAS-COMMERCESCHEMAS` |
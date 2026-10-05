# Salesforce Integration

This file is the contract between Liferay One and Salesforce. Salesforce sends opportunities and object records to Liferay One through Google Cloud Pub/Sub. Liferay One sends Marketplace opportunities back to Salesforce through an HTTP function on Google Cloud. A change to a topic, a field name, a literal value, or a response field on either side breaks the rules in this file. The feature rules that use this data belong to [Sales and CRM](../../business/sales-and-crm.md), and this file cites them by ID.

The systems are Salesforce, the Pub/Sub project that carries Salesforce data, the marketplace function, and the Liferay One Spring Boot service. The actors are the Pub/Sub subscribers of the service, the order completion flow, and the dead letter notification recipient.

Terms used in this file:

- **Opportunity message**: a Pub/Sub message that carries one or more Salesforce opportunities with their account, project, line items, and project contact roles.
- **Object message**: a Pub/Sub message that carries records of one Salesforce object type and one action.
- **Flattened field**: a field of a related Salesforce record that the message gives as one key with a period, for example `Owner.Email`.
- **Marketplace function**: the HTTP function on Google Cloud that creates a Salesforce opportunity for Liferay One.
- **Order metadata**: the `order-metadata` custom field of a Commerce order, a JSON document that holds the Salesforce IDs of the order.

## Connection and Configuration

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-SALESFORCE-001 | Liferay One reads Salesforce data only from Pub/Sub. It does not call the Salesforce REST API directly. It receives opportunity messages and object messages on two separate subscriptions. | P1 | LPD-89686, LPD-89623 | `SUB-SALESFORCEOPPORTUNITYPUBSUBSUBSCRIBER`, `SUB-SALESFORCEOBJECTPUBSUBSUBSCRIBER` |
| TECH-SALESFORCE-002 | Each subscriber reads its Google Cloud project ID, its subscription name, its topic, and its on or off switch from the `liferay.one.salesforce.opportunity.pubsub.subscriber.*` and `liferay.one.salesforce.object.pubsub.subscriber.*` properties. Pub/Sub credentials follow TECH-SALES-024. | P1 | LPD-89029 | `CLS-BASEPUBSUBSUBSCRIBER`, `CLS-SERVICEACCOUNTCREDENTIALSPROVIDER` |
| TECH-SALESFORCE-003 | Liferay One does not create the Salesforce topics or the Salesforce subscriptions. The owner of the Pub/Sub project creates them. Message ordering, the acknowledgement deadline, and the dead letter policy of TECH-SALES-021 apply only when that owner sets them. | P1 | LPD-93686 | `CLS-BASEPUBSUBSUBSCRIBER` |
| TECH-SALESFORCE-004 | The marketplace function uses Google identity tokens. Liferay One signs a token with the service account key in `liferay.one.salesforce.gcf.service.account.key`, for the audience in `liferay.one.salesforce.gcf.audience`. It sends the token as a bearer token, and uses it again until 60 seconds before it expires. | P0 | LPD-98248 | `SVC-SALESFORCESERVICE` |

## Opportunity Message Schema

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-SALESFORCE-010 | An opportunity message is UTF-8 JSON with a `records` array. Each record holds an `opportunity` object. A record can also hold `account`, `project`, an `opportunityLineItems` array, and a `projectContactRoles` array. Liferay One ignores the message attributes. | P0 | LPD-89686 | `SUB-SALESFORCEOPPORTUNITYPUBSUBSUBSCRIBER`, `CLS-MESSAGE` |
| TECH-SALESFORCE-011 | Every field uses its Salesforce API name. A related field is a flattened field, for example `Owner.Email`. Liferay One reads a missing field as an empty value and logs no error. So a renamed field breaks the sync with no warning. | P0 | LPD-89686 | `CLS-SALESFORCEOPPORTUNITYLINEITEM` |
| TECH-SALESFORCE-012 | Liferay One reads these opportunity fields: `Id`, `AccountId`, `Name`, `StageName`, `Type`, `Product_Family__c`, `Project__c`, `Has_Renewal__c`, `Sold_By__c`, `Pricebook2Id`, `First_Line_Support__c`, `Reseller__r.Name`, `SBQQ__AmendedContract__r.SBQQ__Opportunity__c`, `Owner.Email`, `Owner.FirstName`, and `Owner.LastName`. | P0 | LPD-89686, LPD-92221 | — |
| TECH-SALESFORCE-013 | Salesforce keeps these literal values: the stage names `Closed Won` and `Closed Lost`, and the types `New Business`, `Existing Business`, `New Project Existing Business`, and `Renewal`. Stage names match with case. Types match with no regard to case. `Product_Family__c` contains the letter E, P, or S for a product that Liferay One provisions. | P0 | LPD-88254 | `SUB-SALESFORCEOPPORTUNITYPUBSUBSUBSCRIBER` |
| TECH-SALESFORCE-014 | Each line item gives `Id`, `Product2Id`, `Product2.Name`, `Quantity`, `UnitPrice`, `TotalPrice`, `CurrencyIsoCode`, `ServiceDate`, `End_Date__c`, `Product_Type__c`, `Cloud_Region__c`, `Machine_Type__c`, and `Number_of_Pods__c`. Dates use the `yyyy-MM-dd` form, and Liferay One reads them as midnight UTC. | P0 | LPD-89686, LPD-103716 | `CLS-SALESFORCEOPPORTUNITYLINEITEM` |
| TECH-SALESFORCE-015 | The account gives `Id`, `Name`, `CurrencyIsoCode`, `Account_Tier__c`, `Owner.Email`, and contact details. The billing and shipping addresses come from the `AccountAddress_Billing_Address__r.*` and `AccountAddress_Shipping_Address__r.*` fields of the opportunity, not from the account. | P0 | LPD-101694 | — |
| TECH-SALESFORCE-016 | Each project contact role gives `Contact_Role__c`, `Project__c`, `Contact__r.Email`, `Contact__r.FirstName`, and `Contact__r.LastName`. These values become users and project roles in Liferay One. | P0 | LPD-89686 | `SVC-PROVISIONINGCONTACTSERVICE` |

## Object Message Schema

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-SALESFORCE-020 | An object message is UTF-8 JSON with an `action`, a `salesforceObjectName`, and a `records` array. A message without one of these 3 keys fails as a whole. | P0 | LPD-89623 | `SUB-SALESFORCEOBJECTPUBSUBSUBSCRIBER` |
| TECH-SALESFORCE-021 | Liferay One handles the object names `Account`, `Contract`, `PricebookEntry`, `Product2`, `Project__c`, `ProjectEntitlement__c`, and `ProjectEntitlementLineItem__c`. It logs any other name and acknowledges the message with no change. | P1 | LPD-89623, LPD-102591 | `SUB-SALESFORCEOBJECTPUBSUBSUBSCRIBER` |
| TECH-SALESFORCE-022 | The action `delete` removes a price entry, makes a product inactive, and deletes a project entitlement or its line item. The action `update` updates a contract. Liferay One never deletes a contract. Every other contract action goes to the create path. | P0 | LPD-95476, LPD-102591 | `SUB-SALESFORCEOBJECTPUBSUBSUBSCRIBER`, `SVC-CONTRACTSERVICE` |
| TECH-SALESFORCE-023 | An account record gives `Active_Subscription__c` and the `Billing*` and `Shipping*` address fields of the account. Liferay One ignores an account record when `Active_Subscription__c` is not true. | P1 | LPD-95476 | `SUB-SALESFORCEOBJECTPUBSUBSUBSCRIBER` |
| TECH-SALESFORCE-024 | A contract record gives `Id`, `AccountId`, `StartDate`, `EndDate`, `ContractTerm`, `SBQQ__Opportunity__c`, and `SBQQ__RenewalOpportunity__c`. Liferay One skips a contract without an ID or an account ID, and logs a warning. | P0 | LPD-95476, LPD-92221 | `SVC-CONTRACTSERVICE` |
| TECH-SALESFORCE-025 | A price book entry gives `Id`, `Pricebook2Id`, `Product2Id`, `CurrencyIsoCode`, `UnitPrice`, and `IsActive`. The currency is one of AUD, BRL, EUR, GBP, INR, JPY, SGD, or USD. Liferay One ignores an entry in any other currency. | P0 | LPD-99156 | `SUB-SALESFORCEOBJECTPUBSUBSUBSCRIBER` |
| TECH-SALESFORCE-026 | A product record gives `Id`, `Name`, `Description`, and `Product_Group__c`. A project record gives `Id`, `Account__c`, `Name`, and the workspace, data center, version, email domain, and security contact fields of the project. | P1 | LPD-95476, LPD-103716 | — |
| TECH-SALESFORCE-027 | A project entitlement record gives `Id`, `Project__c`, and `Purchasing_Opportunity__c`. Its line items give `Product2__c`, `Quantity__c`, and `Start_Date__c`. | P0 | LPD-102591 | `SVC-PROVISIONINGPROJECTENTITLEMENTSERVICE` |

## Identifiers

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-SALESFORCE-030 | The Salesforce ID of a record is the external reference code of its copy in Liferay One. This applies to accounts, contracts, projects, orders, and price entries. A change of a Salesforce ID gives a second record in Liferay One. | P0 | LPD-89686, LPD-95476 | `SUB-SALESFORCEOPPORTUNITYPUBSUBSUBSCRIBER`, `SVC-CONTRACTSERVICE`, `SVC-PROJECTSERVICE` |
| TECH-SALESFORCE-031 | A Salesforce product links to a Liferay One SKU through its `Product2Id`. A line item or a price book entry for a product with no SKU changes nothing, and Liferay One logs a warning. | P0 | LPD-103716 | `SUB-SALESFORCEOPPORTUNITYPUBSUBSUBSCRIBER`, `SUB-SALESFORCEOBJECTPUBSUBSUBSCRIBER` |
| TECH-SALESFORCE-032 | Liferay One keeps one price list for each price book and currency. The external reference code of the price list is `SALESFORCE_PRICE_LIST_<Pricebook2Id>_<currency>`. | P0 | LPD-99156 | `SUB-SALESFORCEOBJECTPUBSUBSUBSCRIBER`, `SVC-COMMERCEPRICEENTRYSERVICE` |

## Delivery and Acknowledgement

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-SALESFORCE-040 | Liferay One acknowledges every opportunity message, also when a record fails or the payload is not valid JSON. It opens an error issue in Jira for each failure, as TECH-SALES-008 states. Pub/Sub never delivers that message again. | P0 | LPD-88254 | `SUB-SALESFORCEOPPORTUNITYPUBSUBSUBSCRIBER`, `SVC-PROVISIONINGISSUESERVICE` |
| TECH-SALESFORCE-041 | Liferay One rejects an object message when one or more records fail, after it processes the other records. Pub/Sub then delivers the whole message again, so the records that passed are written again. | P0 | LPD-89623 | `SUB-SALESFORCEOBJECTPUBSUBSUBSCRIBER`, `CLS-BASEPUBSUBSUBSCRIBER` |
| TECH-SALESFORCE-042 | A message that Pub/Sub delivers again must give the same result. Every write is an upsert keyed by the Salesforce ID. An opportunity that comes again updates its order, and sends the assigned welcome email in place of the first welcome email. | P0 | LPD-88254, LPD-89686 | `SUB-SALESFORCEOPPORTUNITYPUBSUBSUBSCRIBER`, `SUB-SALESFORCEOBJECTPUBSUBSUBSCRIBER`, `FLOW-SALESFORCE-ORDER-SYNC` |
| TECH-SALESFORCE-043 | Liferay One does not compare the age of records. When Pub/Sub delivers an old version of a record after a new one, the old version replaces the new one. Salesforce must publish the changes to one record in order. | P1 | — | `SUB-SALESFORCEOBJECTPUBSUBSUBSCRIBER` |
| TECH-SALESFORCE-044 | The dead letter subscriber reads the attributes `CloudPubSubDeadLetterSourceSubscription` and `CloudPubSubDeadLetterSourceDeliveryCount` that Pub/Sub adds. Its settings are `liferay.one.dead.letter.pubsub.subscriber.*` and `liferay.one.dead.letter.notification.recipient`. | P1 | LPD-93686 | `SUB-DEADLETTERPUBSUBSUBSCRIBER`, `CLS-BASEDEADLETTERPUBSUBSUBSCRIBER` |

## Outbound Opportunities

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-SALESFORCE-050 | To create an opportunity, Liferay One sends a JSON `POST` to `/marketplace-api/v1/opportunities` on the base URL in `liferay.one.salesforce.gcf.base.url`. The body gives `accountId`, `closeDate`, `marketplaceDealId`, `opportunityCurrency`, `paymentMethodType`, `billingAddress`, `primaryContact`, `project`, and `lineItems`. It also gives the fixed values `Marketplace Integration` as the owner, `Single Year` as the term, and `Existing Business` as the type. | P0 | LPD-98248, LPD-102570 | `SVC-SALESFORCESERVICE` |
| TECH-SALESFORCE-051 | The `accountId` is the external reference code of the account, which is the Salesforce account ID. The `marketplaceDealId` is the Commerce order ID. The `project.projectId` is the `salesforceProjectId` of the order metadata. | P0 | LPD-98248 | `SVC-SALESFORCESERVICE` |
| TECH-SALESFORCE-052 | Each line item gives the SKU as `productId`, the `quantity`, the `unitPrice`, and the order type `New`. A line item that is not an AI Hub token also gives a `startDate` and an `endDate`. Dates use the `yyyy-MM-dd` form in UTC. | P0 | LPD-98248, LPD-102570 | `SVC-SALESFORCESERVICE`, `CLS-COMMERCEORDERUTIL` |
| TECH-SALESFORCE-053 | The billing address gives the country and the state as their default locale names, not as codes. The street is the first street line and the second street line, joined by a space. | P1 | LPD-98248 | `SVC-SALESFORCESERVICE` |
| TECH-SALESFORCE-054 | The project block depends on the order type. An AI Hub order gives the AI Hub account name and one contact with the role `AI Hub Administrator`. An AI Hub token order gives no contacts. Other orders give the provisioning form fields and one contact with the role `LDP Administrator`. | P1 | LPD-102570 | `SVC-SALESFORCESERVICE` |
| TECH-SALESFORCE-055 | The function returns JSON with `data.opportunityId` and a `data.lineItems` array of `id` and `productId`. The opportunity ID becomes the external reference code of the order. Each line item ID becomes the external reference code of the order item with the same SKU. | P0 | LPD-102570 | `SVC-SALESFORCESERVICE`, `SVC-COMMERCEORDERSERVICE` |
| TECH-SALESFORCE-056 | When the function returns an HTTP error, Liferay One logs the request and the response body. It then stops the order completion with an error, and it does not try again by itself. | P0 | LPD-98248 | `SVC-SALESFORCESERVICE`, `SVC-COMMERCEORDERSERVICE` |
| TECH-SALESFORCE-057 | Liferay One sends no second request for an order whose metadata already holds a `salesforceOpportunityId`. It records the ID in the metadata only after the function answers. | P0 | LPD-102570 | `SVC-COMMERCEORDERSERVICE`, `FLOW-AI-HUB-PURCHASE` |
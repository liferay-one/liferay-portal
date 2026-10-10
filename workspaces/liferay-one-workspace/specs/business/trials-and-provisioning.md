# Trials and Provisioning

This area covers how the system sets up the software that a customer buys or tries. It includes solution trials and SSA trials, trial expiry and extension, cloud app installs through Console and through a connected DXP, Liferay Data Platform workspaces, AI Hub tenants, cloud native environments and their quotas, the cloud manifest and add on packages, and the account setup that a Salesforce opportunity starts. The activation of a cloud environment belongs to [Licensing and Activation](./licensing-and-activation.md), and the provisioning of a Digital Sales Room belongs to [Sales and CRM](./sales-and-crm.md).

The actors are a buyer, a customer user, the account administrator, an SSA user, an SSA administrator, the global administrator roles (Administrator and Provisioning Administrator), a connected DXP, a cloud native environment, and the scheduled jobs of the system.

Terms used in this file:

- **Solution trial**: a 7 day trial of a prebuilt solution that a buyer starts from the Marketplace. Its order type is `SOLUTIONS7`.
- **SSA trial**: a demonstration trial that Liferay sales staff create from the SSA dashboard. Its order type is `SSA_SAAS`.
- **Seat**: one live trial portal instance. The number of seats has a fixed maximum.
- **Console project**: a project in Liferay Cloud Console that holds the environments where an app runs.
- **Deployment**: one install of a cloud app into one Console project.
- **Analytics Cloud workspace**: the workspace that a Liferay Data Platform order or a Digital Sales Room order uses. An account has one, keyed by the external reference code of the account.
- **Environment quota**: the number of cloud native environments of one type that the active entitlements of a project allow.

## Trial Start

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-PROVISIONING-001 | A buyer starts a solution trial from a prebuilt trial product. The system places the trial order and then starts the provisioning of the trial. A solution product that is not a prebuilt trial shows the contact sales page. | P1 | LPD-88259 | `CLIENT-COMMERCE-PRODUCTPURCHASESOLUTIONTRIAL`, `HOOK-USESSAPRODUCT`, `ROUTE-PRODUCT-PURCHASE-SOLUTION`, `FLOW-TRIAL-PROVISIONING` |
| REQ-PROVISIONING-002 | When the trial account check is on, an account that already holds a trial order cannot start another trial. | P1 | — | `HOOK-PRODUCTPURCHASE-USETRIALORDERS` |
| REQ-PROVISIONING-003 | The system provisions a trial only for a solution trial order or an SSA trial order. It refuses an order of any other type and an order that does not exist. | P0 | LPD-90604 | `REST-POST-TRIAL-PROVISIONING-ORDERID` |
| REQ-PROVISIONING-004 | The number of live trial instances has a maximum, which is 50 by default. At the maximum, the system puts a new trial order on hold and does not fail it. | P0 | LPD-88259 | `REST-POST-TRIAL-PROVISIONING-ORDERID`, `REST-GET-TRIAL-AVAILABILITY`, `FLOW-TRIAL-PROVISIONING` |
| REQ-PROVISIONING-005 | The next steps page tells the buyer that the trial is on hold when no seat is free. When the availability check fails, the page does not say that the trial is on hold. | P2 | — | `CLIENT-COMMERCE-PRODUCTPURCHASESOLUTIONTRIAL`, `CLIENT-SPRING-BOOT-TRIAL` |
| REQ-PROVISIONING-006 | A trial gets one portal instance and one Console project. The host name of the trial is its project ID followed by the trial domain. A solution trial also deploys the trial app to the Console project. An SSA trial does not. | P1 | LPD-88259 | `REST-POST-TRIAL-PROVISIONING-ORDERID`, `SVC-CONSOLESERVICE` |
| REQ-PROVISIONING-007 | A trial lasts 7 days, unless the trial settings of the order give a different number of days. The system records the start date, the end date, and the host name on the order. | P1 | — | `REST-POST-TRIAL-PROVISIONING-ORDERID` |
| REQ-PROVISIONING-008 | Trial setup is all or nothing. When the Console project fails, the system deletes the Console project and the portal instance, records the error on the order, and cancels the order. When the portal instance fails, the system cancels the order. | P0 | LPD-90604 | `REST-POST-TRIAL-PROVISIONING-ORDERID`, `FLOW-TRIAL-PROVISIONING` |
| REQ-PROVISIONING-009 | The trial creator gets one email when provisioning starts and one email when the trial is ready, unless the trial settings turn the emails off. A failed email does not stop the provisioning. The system invites each address in the trial settings to the Console project as an administrator. A failed invitation does not stop the other invitations. | P2 | LPD-90604 | `REST-POST-TRIAL-PROVISIONING-ORDERID`, `SVC-CONSOLESERVICE` |

## Trial Lifecycle

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-PROVISIONING-010 | Every 6 hours, the system checks each solution trial and SSA trial that is in progress. A trial after its end date expires. A trial that ends within 1 day gets one expiry notice email. A failure on one trial does not stop the check of the other trials. | P1 | LPD-88274, LPD-88259 | `CRON-SCHEDULEDPROCESSTRIALS`, `FLOW-TRIAL-EXPIRY` |
| REQ-PROVISIONING-011 | In the same run, the system provisions the solution trials that are on hold, one trial for each free seat. It stops when no seat is free. A failure in the expiry phase does not stop this phase. | P1 | LPD-88274 | `CRON-SCHEDULEDPROCESSTRIALS`, `REST-GET-TRIAL-AVAILABILITY` |
| REQ-PROVISIONING-012 | When a trial expires, the system completes its order with no payment. Then it deletes the Console project and the portal instance of the trial. | P1 | LPD-90604 | `REST-POST-TRIAL-EXPIRE-ORDERID`, `REST-DELETE-TRIAL-ORDERID`, `FLOW-TRIAL-EXPIRY` |
| REQ-PROVISIONING-013 | An administrator can delete a trial from the trials page. The system deletes the Console project and the portal instance. When the order has no trial host name, the system deletes only the Console project. | P1 | — | `REST-DELETE-TRIAL-ORDERID`, `ROUTE-ADMIN-TRIALS` |
| REQ-PROVISIONING-014 | The trials page shows the used seats out of the maximum, and the number of solution trials in total, in progress, on hold, and expired. The page refreshes every 60 seconds while a trial is processing or on hold, and every 240 seconds at other times. | P2 | — | `HOOK-ADMIN-TRIALS-USETRIALMETRICS`, `ROUTE-ADMIN-TRIALS` |

## Trial Extension

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-PROVISIONING-020 | Only an extension request with the status approved or auto approved extends a trial. The extension adds the number of days in the request to the current end date. A request with any other status changes nothing. A trial with no end date cannot be extended. | P0 | LPD-106746 | `REST-POST-TRIAL-EXTEND-ID`, `FLOW-TRIAL-EXPIRY` |
| REQ-PROVISIONING-021 | The first extension of an SSA trial is approved automatically and takes effect at once. Each later extension needs the approval of an SSA administrator. An extension is from 1 to 90 days and states a reason of 3 or more characters. | P1 | LPD-106746 | `HOOK-ADMIN-SSADASHBOARD-USESSAACTIONS`, `HOOK-ADMIN-SSADASHBOARD-USESSATRIALSEXTEND`, `MOD-SCHEMAS-ADMINSCHEMAS` |
| REQ-PROVISIONING-022 | Only an SSA administrator can view, approve, or reject a pending extension request. A trial that has a pending request cannot get a new extension request. | P1 | LPD-106746 | `HOOK-ADMIN-SSADASHBOARD-USESSAACTIONS` |

## SSA Trials

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-PROVISIONING-030 | An SSA user and an SSA administrator can open the SSA demo page. Only an SSA administrator can open the SSA environments page and manage SSA users. A global administrator has the rights of an SSA administrator. | P0 | — | `ROUTE-ADMIN-MY-SSA-SAAS-DEMO`, `ROUTE-ADMIN-SSA-SAAS-ENVIRONMENTS`, `ROUTE-ADMIN-MANAGE-SSA-SAAS-USERS`, `CLIENT-MODELS-USERACCOUNTMODEL`, `CLIENT-MODELS-MARKETPLACEUSERACCOUNT`, `CTX-ONECONTEXTPROVIDER` |
| REQ-PROVISIONING-031 | An SSA user can have at most 3 SSA trials in progress at a time. An SSA administrator has no limit. | P1 | — | `HOOK-ADMIN-SSADASHBOARD-USESSADASHBOARDOUTLET`, `ROUTE-ADMIN-MY-SSA-SAAS-DEMO` |
| REQ-PROVISIONING-032 | An SSA trial needs a project ID of 3 or more letters and digits, a duration from 1 to 90 days, and a site initializer. The system refuses a project ID when another trial instance already uses its host name. | P1 | — | `MOD-SCHEMAS-ADMINSCHEMAS`, `REST-GET-TRIAL-DOMAIN-AVAILABILITY-PROJECTPREFIX`, `MOD-SCHEMAS-ZODSCHEMA` |
| REQ-PROVISIONING-033 | A user can open or expire an SSA trial only while the trial is in progress. | P1 | — | `HOOK-ADMIN-SSADASHBOARD-USESSAACTIONS`, `ROUTE-ADMIN-DETAILS-ORDERID` |
| REQ-PROVISIONING-034 | An SSA administrator gives each invited SSA user at least one SSA role. When an SSA administrator removes the SSA roles of a user, the user keeps all other roles. | P0 | — | `HOOK-ADMIN-SSADASHBOARD-USEMANAGEUSERACTIONS`, `MOD-SCHEMAS-ADMINSCHEMAS`, `MOD-ADMIN-SSADASHBOARD-GETFILTEREDITEMS` |

## Cloud App Installs

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-PROVISIONING-040 | A buyer can install a cloud app only from a cloud app order that the buyer can access. The payment of the order must be complete or not required. Otherwise the system refuses the install and changes nothing. | P0 | LPD-101678 | `REST-POST-CONSOLE-PROVISIONING-ORDERID`, `REST-POST-COMMERCE-ORDERS-COMMERCEORDERID-COMPLETE-CLOUD-APP` |
| REQ-PROVISIONING-041 | The target of an install must be a Console project that the Console account of the buyer can see. The system refuses any other project. | P0 | LPD-101678 | `REST-POST-CONSOLE-PROVISIONING-ORDERID`, `REST-GET-CONSOLE-PROJECTS-USAGE` |
| REQ-PROVISIONING-042 | Each order item allows as many deployments as its quantity. The system refuses an install when all of them are in use. The installs of one order run one at a time. | P0 | LPD-101678 | `SVC-CLOUDAPPSERVICE`, `CLS-CLOUDPROVISIONINGUTIL` |
| REQ-PROVISIONING-043 | While an install runs, the order shows the deployment as in progress. When the install fails, the system removes that deployment, and the number of used deployments does not change. | P1 | LPD-101678 | `SVC-CLOUDAPPSERVICE`, `CLS-CLOUDPROVISIONINGUTIL`, `MOD-MYACCOUNT-PROJECTS-APPPROVISIONING-PROVISIONING` |
| REQ-PROVISIONING-044 | A user with access to the order can uninstall a deployment. After the uninstall, the number of used deployments equals the number of remaining deployments. | P1 | LPD-101678 | `REST-POST-CONSOLE-UNINSTALL-APP-ORDERID`, `SVC-CLOUDAPPSERVICE` |
| REQ-PROVISIONING-045 | The app provisioning table shows one row for each purchased unit. A row is in progress, installed, ready to install, or expired. A subscription expires 1 year after the order date. A perpetual license does not expire. | P1 | LPD-101678 | `HOOK-MYACCOUNT-PROJECTS-APPPROVISIONING-USEPROVISIONINGDATA`, `MOD-MYACCOUNT-PROJECTS-APPPROVISIONING-PROVISIONING`, `MOD-PARSEPROJECTID` |
| REQ-PROVISIONING-046 | A user can install only a ready row, and can uninstall only an installed row. A user with no Console projects gets an alert in place of the install page. | P1 | — | `HOOK-MYACCOUNT-PROJECTS-APPPROVISIONING-USEPROVISIONINGACTIONS` |
| REQ-PROVISIONING-047 | The install page offers only a Console project that has an extension environment and enough free CPU and RAM for the requirements of the app. | P1 | — | `ROUTE-MY-ACCOUNT-APPLICATIONERC-INSTALL-ORDERID`, `MOD-MYACCOUNT-PROJECTS-CLOUDAPPINSTALL` |
| REQ-PROVISIONING-048 | A connected DXP can install a cloud app for its user. The system first completes the order when its payment is settled. The system refuses the install when the Console account of the user has no project with the given ID. | P0 | LPD-103883 | `REST-POST-DXP-PROVISIONING-ORDERID`, `REST-GET-DXP-PROJECT-USAGE` |
| REQ-PROVISIONING-049 | A user sees the usage of only the Console projects of the Console account of the user. A request for another project returns not found. | P0 | LPD-103883 | `REST-GET-CONSOLE-PROJECTS-USAGE`, `REST-GET-DXP-PROJECT-USAGE` |

## Liferay Data Platform Workspaces

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-PROVISIONING-050 | The system provisions a Liferay Data Platform workspace only for a Liferay Data Platform order whose payment is complete or not required. An order without a workspace name fails. | P0 | LPD-90606, LPD-102451 | `REST-POST-LIFERAY-DATA-PLATFORM-PROVISIONING-ORDERID` |
| REQ-PROVISIONING-051 | An account has at most one Analytics Cloud workspace. A new order for an account that already has a workspace reuses that workspace. | P0 | LPD-102451 | `REST-POST-LIFERAY-DATA-PLATFORM-PROVISIONING-ORDERID`, `SVC-PROVISIONINGANALYTICSCLOUDSERVICE`, `SVC-ANALYTICSCLOUDSERVICE` |
| REQ-PROVISIONING-052 | When the workspace is ready, the system records it on the order and completes the order. When Analytics Cloud refuses the workspace, the system records the error on the order and cancels the order. | P0 | LPD-102451 | `REST-POST-LIFERAY-DATA-PLATFORM-PROVISIONING-ORDERID` |
| REQ-PROVISIONING-053 | A workspace request has a name of 3 or more characters, valid domains, and at least one valid incident contact. The owner is the workspace owner on the order, or the buyer when the order names no owner. A friendly URL starts with exactly one slash. | P1 | LPD-90606 | `MOD-SCHEMAS-ADMINSCHEMAS`, `CLIENT-COMMERCE-PRODUCTPURCHASELDP`, `ROUTE-PRODUCT-PURCHASE-PROVISIONING` |
| REQ-PROVISIONING-054 | When a Salesforce opportunity provisions a Liferay Data Platform order or a Digital Sales Room order, the system creates the workspace from the Salesforce project. The project must give a workspace name and a data center location. Otherwise the system records a warning and creates no workspace. | P1 | LPD-104271 | `SVC-PROVISIONINGANALYTICSCLOUDSERVICE`, `FLOW-CONSOLE-ANALYTICS-PROVISIONING` |
| REQ-PROVISIONING-055 | For a workspace from a Salesforce opportunity, the owner is the administrator contact of the product. Without that contact, the owner is the first security contact, and then the owner of the opportunity. An unknown data center location uses the default United States west location. A failure records the error on the order and does not stop the opportunity. | P1 | LPD-104271 | `SVC-PROVISIONINGANALYTICSCLOUDSERVICE` |

## AI Hub

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-PROVISIONING-060 | An AI Hub purchase needs the AI Hub form. The order records the form, and records the project only when the buyer chooses one. | P0 | LPD-102570 | `CLIENT-COMMERCE-PRODUCTPURCHASEAIHUB`, `ROUTE-PRODUCT-PURCHASE-AI-HUB-FORM`, `FLOW-AI-HUB-PURCHASE` |
| REQ-PROVISIONING-061 | An AI Hub open beta purchase also records the chosen contracts, the project, and the tier on the order. The buyer chooses the project and the contract before the open beta form. | P0 | LPD-102570 | `CLIENT-COMMERCE-PRODUCTPURCHASEAIHUBOPENBETA`, `ROUTE-PRODUCT-PURCHASE-AI-HUB-OPEN-BETA-FORM`, `ROUTE-PRODUCT-PURCHASE-PROJECT`, `ROUTE-PRODUCT-PURCHASE-CONTRACT` |
| REQ-PROVISIONING-062 | When an AI Hub order completes, the system provisions an AI Hub tenant with the account name and the administrator from the form. When the order names a Salesforce project, the project must belong to the account of the order. Otherwise the system provisions nothing. | P0 | LPD-102570 | `SVC-AIHUBSERVICE`, `FLOW-AI-HUB-PURCHASE` |
| REQ-PROVISIONING-063 | After the tenant is ready, the system records an AI Hub application for the account. When the order names a project, the system also records an active AI Hub environment for the project. The environment links to the contract only when the contract belongs to that project. | P1 | LPD-102570 | `SVC-AIHUBSERVICE`, `HOOK-MYACCOUNT-PROJECTS-LICENSEKEYS-GENERATEACTIVATIONKEY-USEHASWORKSPACE` |
| REQ-PROVISIONING-064 | A token purchase is for a project that holds a completed AI Hub order. When the token order settles, the system adds a prepaid quota block to the AI Hub of that project. When no AI Hub exists for the project, the token order stays open. | P0 | LPD-102570 | `CLIENT-COMMERCE-PRODUCTPURCHASEAIHUBTOKEN`, `HOOK-PRODUCTPURCHASE-USEAIHUBORDERS`, `REST-POST-COMMERCE-ORDERS-COMMERCEORDERID-COMPLETE-SETTLED`, `CRON-COMPLETESETTLEDORDERS` |
| REQ-PROVISIONING-065 | The system tries each AI Hub request and each Console request up to 3 more times, with 5 seconds between attempts. A failed AI Hub provisioning does not undo the completed order. | P1 | — | `SVC-AIHUBSERVICE`, `SVC-CONSOLESERVICE` |
| REQ-PROVISIONING-066 | The AI Hub product page and the purchase flow use the first catalog product of the AI Hub solution type. | P2 | — | `HOOK-USEAIHUBPRODUCT` |

## Environments

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-PROVISIONING-070 | A project has one environment quota for each of the 3 cloud native types: nonproduction, production, and UAT. The quota is the sum of the active entitlements of the matching name. An unlimited entitlement gives an unlimited quota. REQ-LICENSING-110 uses this quota to issue activation codes. | P0 | LPD-102450 | `SVC-ENVIRONMENTQUOTASERVICE`, `CLS-ENVIRONMENTQUOTA` |
| REQ-PROVISIONING-071 | Only an environment that activated uses the quota. An activation code that no environment used does not. The available count is never below zero. | P0 | LPD-102450 | `SVC-ENVIRONMENTQUOTASERVICE`, `CLS-ENVIRONMENTQUOTA` |
| REQ-PROVISIONING-072 | A quota or an environment request links to a contract only when the matching entitlements come from exactly one contract. | P1 | — | `SVC-ENVIRONMENTQUOTASERVICE`, `SVC-ENVIRONMENTSERVICE` |
| REQ-PROVISIONING-073 | A project has at most one pending cloud native environment of each type. Two parallel requests for the same type get the same pending environment. | P0 | — | `SVC-ENVIRONMENTSERVICE`, `REST-POST-CLOUD-PROJECTS-PROJECTEXTERNALREFERENCECODE-ENVIRONMENTS-ACTIVATION-CODES` |
| REQ-PROVISIONING-074 | When a Salesforce opportunity with a cloud native product and a contract provisions an account that has no cloud native environment, the system creates one pending environment of each type, each with its own activation code. A later opportunity creates no more. A failure on one type does not stop the other types. | P1 | LPD-99120 | `SVC-PROVISIONINGENVIRONMENTSERVICE`, `SVC-ENVIRONMENTSERVICE` |
| REQ-PROVISIONING-075 | The environment list of a project shows only the environments of the selected account that belong to that project. With no project, the list is empty. | P1 | — | `HOOK-USEPROJECTENVIRONMENTS`, `MOD-MYACCOUNT-PROJECTS-FILTERENVIRONMENTSBYPROJECT` |
| REQ-PROVISIONING-076 | The activation code page lists the environment types of a project in a fixed order. | P2 | — | `HOOK-MYACCOUNT-PROJECTS-LICENSEKEYS-GENERATEACTIVATIONKEY-USECLOUDNATIVEACTIVATIONCODES`, `REST-GET-CLOUD-PROJECTS-PROJECTEXTERNALREFERENCECODE-ENVIRONMENTS-ACTIVATION-CODES`, `CLIENT-SPRING-BOOT-CLOUD` |
| REQ-PROVISIONING-077 | The environment profile of a product decides the activation fields. Only the PaaS and SaaS profiles ask for environment administrators. A product with an unknown profile has no profile. | P1 | — | `MOD-MYACCOUNT-PROJECTS-CLOUDACTIVATIONFIELDSUTILS`, `MOD-MYACCOUNT-PROJECTS-RESOLVEENVIRONMENTPROFILE`, `SVC-CLOUDACTIVATIONREQUESTSERVICE`, `MOD-SCHEMAS-PROJECTSCHEMAS` |
| REQ-PROVISIONING-078 | A project has a workspace when one of its environments is an AI Hub or Analytics Cloud environment with a workspace name. | P2 | — | `HOOK-MYACCOUNT-PROJECTS-LICENSEKEYS-GENERATEACTIVATIONKEY-USEHASWORKSPACE` |
| REQ-PROVISIONING-079 | The offline environment list of a project shows only its active offline cloud native environments. Only a user with the environment activation permission on the project can see it. | P1 | — | `REST-GET-CLOUD-PROJECTS-PROJECTEXTERNALREFERENCECODE-ENVIRONMENTS-OFFLINE`, `PERM-ENVIRONMENTACTIVATIONPERMISSION`, `CLS-ENVIRONMENT` |

## Cloud Manifest and Add-ons

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-PROVISIONING-080 | An environment lists the cloud enabled products that its account holds active entitlements to. Only a user with the environment activation permission on the project of the environment can see the list. The system refuses an environment that has no project. | P0 | LPD-102450 | `REST-GET-CLOUD-ENVIRONMENTS-ENVIRONMENTID-ENTITLEMENTS`, `PERM-ENVIRONMENTACTIVATIONPERMISSION` |
| REQ-PROVISIONING-081 | When an account holds the same product more than once, the system reports the entitlement that is furthest from termination. | P1 | — | `REST-GET-CLOUD-ENVIRONMENTS-ENVIRONMENTID-ENTITLEMENTS`, `REST-POST-CLOUD-ENVIRONMENTS-ENVIRONMENTID-MANIFEST` |
| REQ-PROVISIONING-082 | An environment gets its manifest without a user session, so a valid signature from the environment is the only gate. The request must name a DXP version. The account must hold a cloud native entitlement. | P0 | — | `REST-POST-CLOUD-ENVIRONMENTS-ENVIRONMENTID-MANIFEST`, `CLS-CLOUDNATIVESIGNATUREVALIDATOR` |
| REQ-PROVISIONING-083 | The manifest gives a production virtual cluster license to a production environment and a non production virtual cluster license to other types. The license uses the term of the cloud native entitlement, or 1 year from today when the entitlement has no end date. | P0 | — | `REST-POST-CLOUD-ENVIRONMENTS-ENVIRONMENTID-MANIFEST` |
| REQ-PROVISIONING-084 | An environment can download an add on package without a user session only when its signature is valid and its account is entitled to the product. Otherwise the system refuses the download. | P0 | — | `REST-POST-CLOUD-PRODUCTS-EXTERNALREFERENCECODE-VIRTUAL-ENTRY-VIRTUALENTRYID-DOWNLOAD`, `CLS-CLOUDNATIVESIGNATUREVALIDATOR` |

## Account Setup from Salesforce

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-PROVISIONING-090 | For each contact of the Salesforce project, the system creates a user when none exists. The system adds the user to the account with the role of the contact. The system skips Liferay email addresses and users who are already in the account. | P0 | LPD-89441 | `SVC-PROVISIONINGCONTACTSERVICE` |
| REQ-PROVISIONING-091 | The first user that the system adds to an account with no users becomes the account administrator. This does not happen when the opportunity names an account administrator contact. | P0 | — | `SVC-PROVISIONINGCONTACTSERVICE` |
| REQ-PROVISIONING-092 | Each new contact becomes a project user of the Salesforce project. A renewal opportunity adds no contacts. | P1 | — | `SVC-PROVISIONINGCONTACTSERVICE`, `SUB-SALESFORCEOPPORTUNITYPUBSUBSUBSCRIBER` |
| REQ-PROVISIONING-093 | For a new business opportunity, every verified user with a customer account role gets a welcome email. For an existing business opportunity, only the new users get one. A user gets a welcome email only when verified and when the account holds a support or partner entitlement. | P1 | — | `SVC-PROVISIONINGEMAILSERVICE` |
| REQ-PROVISIONING-094 | The provisioning address of the support region of the account sends the welcome email. When the accounts of the user are in different regions, the global address sends it. | P2 | — | `SVC-PROVISIONINGEMAILSERVICE` |
| REQ-PROVISIONING-095 | An account with a PaaS Experience product gets one cloud native subdomain of 8 lowercase letters. No two accounts share a subdomain. The system tries at most 20 times to find a free subdomain. Then it requests the Okta application once. | P1 | LPD-107697 | `SVC-PROVISIONINGSUBDOMAINSERVICE` |
| REQ-PROVISIONING-096 | A renewal or an amendment never extends an earlier order item. It can only move the effective end date of an approved item to an earlier date. A renewal that starts before the end of an earlier item records a warning and leaves the item unchanged. | P0 | LPD-92221 | `SVC-PROVISIONINGORDERSERVICE` |
| REQ-PROVISIONING-097 | A Salesforce project entitlement creates one order for its project, from the order of its purchasing opportunity. Its line items become order items, and the order completes with no payment. When the purchasing order does not exist yet, the system fails the record so that the message comes again. | P0 | LPD-102591 | `SVC-PROVISIONINGPROJECTENTITLEMENTSERVICE`, `SUB-SALESFORCEOBJECTPUBSUBSUBSCRIBER` |
| REQ-PROVISIONING-098 | When Salesforce deletes a project entitlement or one of its line items, the system ends the matching order items now. It never moves an earlier effective end date to a later date. | P0 | LPD-102591 | `SVC-PROVISIONINGPROJECTENTITLEMENTSERVICE` |
| REQ-PROVISIONING-099 | For each new opportunity that is not a partner product family, the system opens one Jira issue for the provisioning team. The issue lists the account, the opportunity, the products, and every warning of the run. A record that fails opens an error issue. | P1 | — | `SVC-PROVISIONINGISSUESERVICE`, `SUB-SALESFORCEOPPORTUNITYPUBSUBSUBSCRIBER` |

## Distributed Deals

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-PROVISIONING-100 | The opportunity line items of a record always become order items of the purchasing order and grant their entitlements to its project. Each project entitlement line item becomes an order item of its own order and grants its entitlements to the project that its header names. Neither path removes what the other grants. | P0 | LPD-107900 | `SVC-PROVISIONINGPROJECTENTITLEMENTSERVICE`, `SUB-SALESFORCEOPPORTUNITYPUBSUBSUBSCRIBER` |
| REQ-PROVISIONING-101 | A project entitlement without line items grants nothing. A record with project entitlement line items and no opportunity line items is still provisioned. A replay of that record opens no second Jira issue and sends no second welcome email. | P0 | LPD-107900 | `SVC-PROVISIONINGPROJECTENTITLEMENTSERVICE`, `SUB-SALESFORCEOPPORTUNITYPUBSUBSUBSCRIBER` |
| REQ-PROVISIONING-102 | A project entitlement order carries the name of its own project. | P1 | LPD-107900 | `SVC-PROVISIONINGPROJECTENTITLEMENTSERVICE`, `SUB-SALESFORCEOPPORTUNITYPUBSUBSUBSCRIBER` |
| REQ-PROVISIONING-103 | A project entitlement line whose SKU has no active entitlement definition still becomes an order item, and the system adds a warning. | P1 | LPD-107900 | `SVC-PROVISIONINGPROJECTENTITLEMENTSERVICE` |
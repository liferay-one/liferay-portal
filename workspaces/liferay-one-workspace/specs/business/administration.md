# Administration

This area covers the back office of Liferay One. It includes the admin page and its sections, the Pub/Sub tools, the synchronization actions that only an administrator can start, the marketplace and finance views, the review of publisher requests, the oversight of trials and SaaS demos, and the upload of common license keys. The rules of each domain belong to that domain's area: trials to PROVISIONING, publishers to PUBLISHER, license keys to LICENSING, usage reports to USAGE, and the JSM sync to SUPPORT. This file states who can use each tool and what the tool shows and controls.

The actors are the Administrator, the Provisioning Administrator, the Finance Administrator, Liferay Staff, the SSA Administrator, and the SSA User.

Terms used in this file:

- **Admin page**: the hidden site page that holds every admin section.
- **Admin section**: one entry of the admin navigation, for example Marketplace Summary or Pub/Sub.
- **Back office endpoint**: a Spring Boot endpoint that only a global administrator can call.
- **Global administrator**: a user with the Administrator or the Provisioning Administrator role.
- **SSA account**: the account that holds the SaaS demos of the Solution Sales team. The SSA Administrator and SSA User roles apply only in this account.
- **SaaS demo**: a trial environment that a member of the SSA account creates for a sales demonstration.

## Access to the Admin Area

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ADMIN-001 | Only an Administrator, a Finance Administrator, or a Liferay Staff user can view the admin page. A guest, a site member, and a signed in user without one of these roles cannot view it. The navigation does not show the page. | P0 | LPD-107296 | `FLOW-ADMIN-DASHBOARD` |
| REQ-ADMIN-002 | Only an Administrator can use the Marketplace Summary, Marketplace Orders, Marketplace Apps, Marketplace Solutions, Publishers, Publisher Requests, 7 Days Trials, Pub/Sub, and Activation Key Uploads sections. | P0 | LPD-107296 | `MOD-ROUTEUTILS`, `ROUTE-ADMIN-MP-SUMMARY`, `ROUTE-ADMIN-MP-ORDERS`, `ROUTE-ADMIN-MP-APPS`, `ROUTE-ADMIN-MP-SOLUTIONS`, `ROUTE-ADMIN-PUBLISHERS`, `ROUTE-ADMIN-PUBLISHER-REQUESTS`, `ROUTE-ADMIN-TRIALS`, `ROUTE-ADMIN-PUB-SUB`, `ROUTE-ADMIN-ACTIVATION-KEY-UPLOADS` |
| REQ-ADMIN-003 | Only an Administrator or a Finance Administrator can use the Marketplace Finance Orders and Marketplace Payments sections. | P0 | LPD-107296 | `MOD-ROUTEUTILS`, `ROUTE-ADMIN-MP-FINANCE-ORDERS`, `ROUTE-ADMIN-MP-PAYMENTS` |
| REQ-ADMIN-004 | Only an SSA Administrator or an Administrator can use the SaaS Environments and Manage SSA SaaS Users sections. An SSA Administrator or an SSA User can use the My SaaS Demos section and the trial details. | P0 | LPD-107296, LPD-89753 | `MOD-ROUTEUTILS`, `CLIENT-MODELS-USERACCOUNTMODEL`, `ROUTE-ADMIN-SSA-SAAS-ENVIRONMENTS`, `ROUTE-ADMIN-MANAGE-SSA-SAAS-USERS`, `ROUTE-ADMIN-MY-SSA-SAAS-DEMO`, `ROUTE-ADMIN-DETAILS-ORDERID` |
| REQ-ADMIN-005 | The admin page opens the first section that the user can use. When the user can use no section, the page shows an access required message. | P1 | LPD-107296 | `ROUTE-ADMIN-MP-SUMMARY`, `MOD-ROUTEUTILS`, `FLOW-ADMIN-DASHBOARD` |
| REQ-ADMIN-006 | A detail page has the same access rule as its list section. An address that the user cannot use, or that does not exist, goes back to the first section. | P1 | LPD-107296 | `ROUTE-ADMIN-MP-APPS-PRODUCTID`, `ROUTE-ADMIN-MP-SOLUTIONS-PRODUCTID`, `ROUTE-ADMIN-MP-FINANCE-ORDERS-ORDERID`, `ROUTE-ADMIN-MP-PAYMENTS-ENTRYID`, `MOD-ROUTEUTILS` |
| REQ-ADMIN-007 | The admin navigation lists the list sections only. It never lists a detail page. | P2 | — | `MOD-ROUTEUTILS` |
| REQ-ADMIN-008 | Only a global administrator can call a back office endpoint. The service refuses every other caller with status 403 before it does any work. | P0 | LPD-89437 | `PERM-ADMINPERMISSION`, `REST-GET-ADMIN-PUBSUB-SUBSCRIBERS`, `REST-POST-ADMIN-PUBSUB-DISPATCH`, `REST-POST-ADMIN-JIRA-TEAM-ROLES-SYNC`, `REST-POST-ADMIN-LDP-EVENT-USAGE-REPORTS-GENERATE` |

## Pub/Sub Tools

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ADMIN-010 | A global administrator can list the subscribers that consume a topic. The list gives the topic and the name of each subscriber. A subscriber without a topic is not listed. | P1 | LPD-89437 | `REST-GET-ADMIN-PUBSUB-SUBSCRIBERS`, `ROUTE-ADMIN-PUB-SUB` |
| REQ-ADMIN-011 | A global administrator can send a message to every subscriber of a topic. The message has a payload and optional attributes. The system removes the line breaks from the payload. | P1 | LPD-89437 | `REST-POST-ADMIN-PUBSUB-DISPATCH`, `CLS-MESSAGE` |
| REQ-ADMIN-012 | Each attribute is one line in the form name=value. A line without a name before the equal sign gives status 400, and the system sends nothing. | P1 | LPD-89437 | `REST-POST-ADMIN-PUBSUB-DISPATCH` |
| REQ-ADMIN-013 | A topic without a subscriber gives status 404. When a subscriber fails, the request gives status 502 and names the subscriber. | P1 | LPD-89437 | `REST-POST-ADMIN-PUBSUB-DISPATCH` |
| REQ-ADMIN-014 | The Pub/Sub section shows its form only to a global administrator. Any other user sees an access required message. After a send, the section shows success or the problem detail from the service. | P1 | LPD-99658 | `HOOK-USEHASADMINPERMISSIONS`, `ROUTE-ADMIN-PUB-SUB` |
| REQ-ADMIN-015 | When the subscriber of the selected topic is known, the Pub/Sub section offers sample messages for it. A sample fills the payload and the attributes with a message in the shape that the subscriber reads, so that the administrator changes only the fields to test. Each sample gets new IDs, and the IDs in one sample refer to each other. A dead letter sample also sets the source subscription and delivery count attributes. | P2 | LPD-88257 | `MOD-ADMIN-PUBSUB-GETPUBSUBSAMPLES`, `ROUTE-ADMIN-PUB-SUB` |

## Back Office Actions

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ADMIN-020 | A global administrator can force the sync of the first line support team role to JSM. The answer gives the object ID of that role. When the role is missing in JSM, the sync creates it again. | P1 | LPD-90495, LPD-99486 | `REST-POST-ADMIN-JIRA-TEAM-ROLES-SYNC`, `SYNC-TEAMROLESYNCHRONIZER` |
| REQ-ADMIN-021 | A global administrator can generate the Liferay Data Platform usage reports for one month. Without a month, the system uses the previous month in UTC. A month that is not in the `yyyy-MM` format gives status 400. | P1 | LPD-99837 | `REST-POST-ADMIN-LDP-EVENT-USAGE-REPORTS-GENERATE`, `SVC-LDPEVENTUSAGEREPORTSERVICE` |
| REQ-ADMIN-022 | The system generates usage reports only for a completed month. The current month or a future month gives status 400. | P1 | LPD-107012 | `REST-POST-ADMIN-LDP-EVENT-USAGE-REPORTS-GENERATE`, `SVC-LDPEVENTUSAGEREPORTSERVICE` |
| REQ-ADMIN-023 | A global administrator can push one account, one organization, or one user to JSM on demand. The account details page shows this action only to a global administrator. | P1 | LPD-89437 | `REST-POST-ACCOUNTS-EXTERNALREFERENCECODE-SYNC-TO-JSM`, `REST-POST-ORGANIZATIONS-ORGANIZATIONID-SYNC-TO-JSM`, `REST-POST-USER-ACCOUNTS-USERID-SYNC-TO-JSM`, `HOOK-USEHASADMINPERMISSIONS` |
| REQ-ADMIN-024 | Only a global administrator can link an account to an organization, unlink it, or assign or remove an organization role. Each change also updates JSM. | P0 | LPD-89437 | `REST-POST-ORGANIZATIONS-ORGANIZATIONID-ACCOUNTS-ACCOUNTID`, `REST-DELETE-ORGANIZATIONS-ORGANIZATIONID-ACCOUNTS-ACCOUNTID`, `REST-POST-ORGANIZATIONS-ORGANIZATIONID-USER-ACCOUNTS-USERID-ORGANIZATION-ROLES-ORGANIZATIONROLEID`, `REST-DELETE-ORGANIZATIONS-ORGANIZATIONID-USER-ACCOUNTS-USERID-ORGANIZATION-ROLES-ORGANIZATIONROLEID` |
| REQ-ADMIN-025 | Only a global administrator can add a user to an account by email address with account roles. | P0 | — | `REST-POST-ACCOUNTS-EXTERNALREFERENCECODE-USER-ACCOUNTS-BY-EMAIL-ADDRESS-EMAILADDRESS-ACCOUNT-ROLES` |
| REQ-ADMIN-026 | Only a global administrator can sync a user with Okta or sync an organization from its Okta group. | P0 | LPD-89441 | `REST-POST-USER-ACCOUNTS-USERID-SYNC-WITH-OKTA`, `REST-POST-ORGANIZATIONS-ORGANIZATIONID-SYNC-FROM-OKTA` |

## Marketplace Oversight

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ADMIN-030 | The Marketplace Summary shows the number of accounts and orders, and their growth for a week or a month against the period before it. Growth has 2 decimals, and it is 0 when the period before has no data. | P1 | LPD-91578 | `ROUTE-ADMIN-MP-SUMMARY`, `HOOK-ADMIN-MPSUMMARY-USEACCOUNTSMETRICS`, `HOOK-ADMIN-MPSUMMARY-USEORDERMETRICS` |
| REQ-ADMIN-031 | The order total on the Marketplace Summary adds only the completed orders. It also shows the orders of the current month and the current year. | P1 | LPD-91578 | `HOOK-ADMIN-MPSUMMARY-USEORDERMETRICS` |
| REQ-ADMIN-032 | The Marketplace Summary compares each indicator with its annual target. It groups the products by catalog and lists the projects that use the marketplace. | P2 | LPD-91578 | `HOOK-ADMIN-MPSUMMARY-USEKPI` |
| REQ-ADMIN-033 | The Marketplace Apps section shows the apps that wait for review and the apps that were published recently. It counts the approved apps and the apps in review for a week or a month. | P1 | LPD-91704 | `ROUTE-ADMIN-MP-APPS`, `ROUTE-ADMIN-MP-APPS-PRODUCTID`, `HOOK-ADMIN-APPS-USEAPPSMETRICS` |
| REQ-ADMIN-034 | The Marketplace Solutions section lists the solutions and shows the detail of each one. The detail shows company data only when the solution has a company email. A detail block that cannot be read shows as empty. | P2 | LPD-91705 | `ROUTE-ADMIN-MP-SOLUTIONS`, `ROUTE-ADMIN-MP-SOLUTIONS-PRODUCTID`, `MOD-ADMIN-SOLUTIONS-SOLUTIONDETAIL-PARSESOLUTIONDETAIL` |
| REQ-ADMIN-035 | The Marketplace Orders section lists the marketplace orders for the Administrator. | P2 | LPD-91692 | `ROUTE-ADMIN-MP-ORDERS` |

## Finance

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ADMIN-040 | The Finance Orders section lists only the orders with a total above zero, newest first. | P1 | LPD-89821 | `ROUTE-ADMIN-MP-FINANCE-ORDERS` |
| REQ-ADMIN-041 | A finance user can mark an order as paid. The list does not offer this for an order that is canceled, already paid, or that needs no payment. | P0 | LPD-89821 | `ROUTE-ADMIN-MP-FINANCE-ORDERS` |
| REQ-ADMIN-042 | The order detail offers the mark as paid action only for an order whose payment is failed, pending, or payment pending. | P0 | LPD-89821 | `ROUTE-ADMIN-MP-FINANCE-ORDERS-ORDERID` |
| REQ-ADMIN-043 | The Payments section lists the publisher sales summaries by quarter. Each row gives the apps sold, the total, the net price, the marketplace commission, the publisher payout, and the status. | P1 | LPD-89821 | `ROUTE-ADMIN-MP-PAYMENTS`, `HOOK-USEPUBLISHERSALESSUMMARYOBJECT` |
| REQ-ADMIN-044 | A finance user can mark a publisher payout as paid. The system records who marked it and when. The action is not offered for a payout that is already paid. | P0 | LPD-103679 | `ROUTE-ADMIN-MP-PAYMENTS`, `ROUTE-ADMIN-MP-PAYMENTS-ENTRYID` |
| REQ-ADMIN-045 | The payment detail exports its order lines to a CSV file. Each line gives the item, the account, the quantity, the price, the VAT, the price with tax, and the currency. | P2 | — | `ROUTE-ADMIN-MP-PAYMENTS-ENTRYID`, `HOOK-USEPUBLISHERSALESSUMMARYOBJECT` |

## Publishers

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ADMIN-050 | The Publishers section lists the supplier accounts, newest first. | P2 | LPD-91717 | `ROUTE-ADMIN-PUBLISHERS` |
| REQ-ADMIN-051 | The Publisher Requests section lists the requests to become a publisher, newest first. The Administrator can approve or decline an open request. A request that is already decided shows no action. | P1 | LPD-91722 | `ROUTE-ADMIN-PUBLISHER-REQUESTS` |

## Trials

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ADMIN-060 | The 7 Days Trials section shows each trial and the free trial capacity. It refreshes every 60 seconds while a trial is processing or on hold, and every 240 seconds otherwise. | P1 | LPD-91516 | `ROUTE-ADMIN-TRIALS`, `HOOK-ADMIN-TRIALS-USETRIALMETRICS` |
| REQ-ADMIN-061 | The Administrator can delete a trial after a confirmation. The delete removes the order and the trial environment. | P1 | LPD-91516 | `ROUTE-ADMIN-TRIALS`, `REST-DELETE-TRIAL-ORDERID` |

## SaaS Demos

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ADMIN-070 | My SaaS Demos shows only the demos that the user created. An SSA User can have at most 3 demos in progress. An SSA Administrator has no limit. | P1 | LPD-89753 | `ROUTE-ADMIN-MY-SSA-SAAS-DEMO`, `HOOK-ADMIN-SSADASHBOARD-USESSADASHBOARDOUTLET` |
| REQ-ADMIN-071 | The SaaS Environments section shows every demo of the SSA account to the SSA Administrator. | P1 | LPD-89753 | `ROUTE-ADMIN-SSA-SAAS-ENVIRONMENTS` |
| REQ-ADMIN-072 | A user can open or expire a demo only while it is in progress. | P1 | LPD-89753 | `HOOK-ADMIN-SSADASHBOARD-USESSAACTIONS`, `REST-POST-TRIAL-EXPIRE-ORDERID` |
| REQ-ADMIN-073 | The first extension of a demo is approved at once. Each later extension is a request that an SSA Administrator must approve. A demo cannot get a new request while one is pending. | P0 | LPD-89753 | `HOOK-ADMIN-SSADASHBOARD-USESSAACTIONS`, `HOOK-ADMIN-SSADASHBOARD-USESSATRIALSEXTEND`, `REST-POST-TRIAL-EXTEND-ID` |
| REQ-ADMIN-074 | Only an SSA Administrator can see and decide a pending extension request. | P0 | LPD-89753 | `HOOK-ADMIN-SSADASHBOARD-USESSAACTIONS` |
| REQ-ADMIN-075 | The Manage SSA SaaS Users section lists the users of the SSA account with their SSA roles and their last login. An SSA Administrator can give a user the SSA Administrator or SSA User role. | P0 | LPD-89753 | `ROUTE-ADMIN-MANAGE-SSA-SAAS-USERS`, `MOD-ADMIN-SSADASHBOARD-GETFILTEREDITEMS`, `PERM-ACCOUNTPERMISSION` |
| REQ-ADMIN-076 | When an SSA Administrator removes all roles of a user, the system removes only the SSA roles. The other account roles of the user stay. | P0 | LPD-89753 | `HOOK-ADMIN-SSADASHBOARD-USEMANAGEUSERACTIONS` |

## Activation Key Uploads

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ADMIN-080 | The Administrator uploads common license keys for 2 product families: Commerce takes XML files and Enterprise Search takes JSON files. One upload can hold more than one file. | P0 | LPD-101369 | `ROUTE-ADMIN-ACTIVATION-KEY-UPLOADS`, `REST-POST-COMMON-LICENSE-KEYS`, `CLIENT-SPRING-BOOT-COMMONLICENSEKEYS` |
| REQ-ADMIN-081 | The section tells the Administrator when a file was already uploaded. It lists the keys of each family 20 per page. | P1 | LPD-101369 | `ROUTE-ADMIN-ACTIVATION-KEY-UPLOADS`, `REST-POST-COMMON-LICENSE-KEYS` |
| REQ-ADMIN-082 | Only a global administrator can upload or delete a common license key. The section asks for a confirmation before a delete. | P0 | LPD-101369 | `REST-POST-COMMON-LICENSE-KEYS`, `REST-DELETE-COMMON-LICENSE-KEYS-COMMONLICENSEKEYID`, `ROUTE-ADMIN-ACTIVATION-KEY-UPLOADS` |
| REQ-ADMIN-083 | Only a global administrator can create, read, download, activate, or deactivate an app license key. | P0 | LPD-103395 | `REST-POST-APP-LICENSE-KEYS`, `REST-GET-APP-LICENSE-KEYS-APPLICENSEKEYID`, `REST-GET-APP-LICENSE-KEYS-APPLICENSEKEYID-DOWNLOAD`, `REST-PUT-APP-LICENSE-KEYS-ACTIVATE`, `REST-PUT-APP-LICENSE-KEYS-DEACTIVATE`, `FLOW-APP-LICENSE-KEY-LIFECYCLE` |

## Not Yet Built

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ADMIN-090 | Only an Administrator or an SSA Administrator can delete, expire, or extend a trial through the service. The trial endpoints check no role yet, so any caller with a trusted token can do these actions. | P0 | — | `REST-DELETE-TRIAL-ORDERID`, `REST-POST-TRIAL-EXPIRE-ORDERID`, `REST-POST-TRIAL-EXTEND-ID` |
| REQ-ADMIN-091 | When a trial delete fails, the Administrator sees the failure. The section ignores the failure and shows no message yet. | P1 | — | `ROUTE-ADMIN-TRIALS` |
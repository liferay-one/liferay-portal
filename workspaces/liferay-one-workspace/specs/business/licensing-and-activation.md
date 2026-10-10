# Licensing and Activation

This area covers how a customer gets the right to run Liferay software and keeps that right current. It includes license keys, activation keys, common license keys that administrators upload, app license keys, free DXP licenses, expiration notices, and the activation of cloud environments.

The actors are a customer user, the project administrator, the account administrator, the account Partner Manager, Liferay Staff, and the global roles that manage keys (Administrator, Provisioning Administrator, and Provisioning Member).

Terms used in this file:

- **Activation key**: a group of license keys that a project generates in one request. The license keys in an activation key activate, deactivate, and renew as one unit.
- **License key**: one signed license file for one product and one server.
- **Entitlement**: one grant of a product to an account, and optionally to a project and a contract. For licensing, an entitlement sets the number of activations that the project can use. See [`glossary.md`](../glossary.md).
- **Complimentary key**: a short, free key that Liferay gives for a stated purpose, outside the paid activations.
- **Common license key**: a license file that an administrator uploads for a whole product family, for example Commerce or Enterprise Search.

## Access to Keys

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-LICENSING-001 | A user can see the license keys and activation keys of an account only when the user is a member of the account, belongs to an organization that shares the account, or holds a global role. Liferay Staff can see keys but cannot change them. | P0 | — | `PERM-LICENSEKEYPERMISSION`, `REST-GET-ACCOUNTS-EXTERNALREFERENCECODE-LICENSE-KEYS`, `REST-GET-LICENSE-KEYS-LICENSEKEYID`, `REST-GET-ACTIVATION-KEYS-ACTIVATIONKEYID` |
| REQ-LICENSING-002 | To activate, deactivate, or extend a license key, a user needs an account role that manages license keys, or a global role other than Liferay Staff. | P0 | — | `PERM-LICENSEKEYPERMISSION`, `REST-PUT-LICENSE-KEYS-ACTIVATE`, `REST-PUT-LICENSE-KEYS-DEACTIVATE`, `REST-POST-LICENSE-KEYS-EXTEND` |
| REQ-LICENSING-003 | When an account does not allow self provisioning, its own users cannot change its keys. Only a global role that can change keys can do so for that account. | P0 | — | `PERM-LICENSEKEYPERMISSION`, `REST-POST-LICENSE-KEYS-EXTEND` |
| REQ-LICENSING-004 | To generate activation keys for a project, a user must be an Administrator, Liferay Staff, the account administrator of the project's account, an administrator of the project, or the account Partner Manager. | P0 | — | `PERM-ENVIRONMENTACTIVATIONPERMISSION`, `HOOK-MYACCOUNT-PROJECTS-USEHASACTIVATIONPERMISSION`, `REST-POST-ACTIVATION-KEYS-GENERATE` |
| REQ-LICENSING-005 | A bulk change to license keys checks the permission on every key before it changes any key. One denied key stops the whole request. A request can name at most 100 keys. | P0 | — | `REST-PUT-LICENSE-KEYS-ACTIVATE`, `REST-PUT-LICENSE-KEYS-DEACTIVATE`, `REST-POST-LICENSE-KEYS-EXTEND` |
| REQ-LICENSING-006 | A download or an export contains only the keys that the user can see. A CSV export neutralizes any value that a spreadsheet can run as a formula. | P0 | — | `REST-GET-LICENSE-KEYS-DOWNLOAD`, `REST-GET-LICENSE-KEYS-DOWNLOAD-ZIP`, `REST-GET-LICENSE-KEYS-EXPORT`, `REST-GET-ACCOUNTS-EXTERNALREFERENCECODE-LICENSE-KEYS-EXPORT`, `CLS-LICENSEKEYCSVEXPORTER` |

## Activation Key Generation

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-LICENSING-010 | A project generates an activation key against one subscription entitlement that it holds. The keys start and end on the dates of that subscription. | P0 | — | `REST-POST-ACTIVATION-KEYS-GENERATE`, `SVC-LICENSEKEYGENERATIONSERVICE` |
| REQ-LICENSING-011 | Each entitlement allows a fixed number of activations. Every active license key uses one activation. The system refuses a request for more servers than any selected product has activations left. | P0 | — | `SVC-LICENSEKEYGENERATIONSERVICE`, `MOD-MYACCOUNT-PROJECTS-LICENSEKEYS-GENERATEACTIVATIONKEY` |
| REQ-LICENSING-012 | A request names at least one server. A request that is not complimentary also names at least one product of the bundle. | P0 | — | `SVC-LICENSEKEYGENERATIONSERVICE` |
| REQ-LICENSING-013 | The data on a key is valid before the system signs the key. The end date comes after the start date. The name and the owner are 75 characters or fewer, and the description is 255 characters or fewer. A virtual cluster has at least one node. IP and MAC addresses are well formed and unique. Backup, limited, per user, and production keys identify their servers. | P0 | — | `CLS-LICENSEKEYVALIDATOR`, `MOD-MYACCOUNT-PROJECTS-LICENSEKEYS-GENERATEACTIVATIONKEY` |
| REQ-LICENSING-014 | Liferay issues some key types itself, and customers cannot request them. Only an administrator can generate a key of such a type. | P1 | — | `REST-POST-ACTIVATION-KEYS-GENERATE`, `SVC-LICENSEKEYTYPESERVICE` |
| REQ-LICENSING-015 | Generation is all or nothing. When one license key fails, the system deactivates the new activation key, and the key that the request renews stays active. | P0 | — | `SVC-LICENSEKEYGENERATIONSERVICE` |
| REQ-LICENSING-016 | DXP 7.3 and later run without an activation key. Versions 7.2 and earlier need one. | P0 | — | `MOD-MYACCOUNT-PROJECTS-REQUIRESACTIVATIONKEY` |
| REQ-LICENSING-017 | The generate form offers only the products, the key types, and the versions that the project is entitled to, with the activations left for each. An error on the form names the cause. | P1 | — | `ROUTE-MY-ACCOUNT-GENERATE`, `REST-GET-ACTIVATION-KEYS-SUMMARY`, `HOOK-MYACCOUNT-PROJECTS-LICENSEKEYS-GENERATEACTIVATIONKEY-USEGENERATEACTIVATIONKEYFORM`, `SVC-LICENSEENTRYSERVICE`, `MOD-MYACCOUNT-PROJECTS-TOERRORMESSAGEKEY` |
| REQ-LICENSING-018 | A license key file holds the product, the key type, the start and end dates, the servers, and the limits that its license type allows. A production key never uses a nonproduction license entry. | P0 | — | `CLS-LICENSEKEYGENERATOR`, `CLS-LICENSEKEYEXPORTER`, `CLS-LICENSEKEYTYPE`, `CLS-SERVERINFOUTIL`, `CLS-DOCUMENT`, `CLS-ELEMENT`, `CLS-SAXREADERUTIL`, `FLOW-LICENSE-GENERATION` |

## Renewal

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-LICENSING-020 | A renewal generates a new activation key for the same project. After all of the new license keys exist, the system deactivates the old activation key. The license keys of the old key do not count against the activations of the renewal. | P0 | — | `REST-POST-ACTIVATION-KEYS-GENERATE`, `SVC-LICENSEKEYGENERATIONSERVICE`, `HOOK-MYACCOUNT-PROJECTS-LICENSEKEYS-GENERATEACTIVATIONKEY-USERENEWSOURCE` |
| REQ-LICENSING-021 | A project cannot renew an activation key that belongs to another project. Nobody can renew a complimentary key. | P0 | — | `REST-GET-ACTIVATION-KEYS-GENERATE-FORM`, `REST-POST-ACTIVATION-KEYS-GENERATE` |
| REQ-LICENSING-022 | The key list marks a key as new for 15 days after it is created, and as due for renewal during the 90 days before it expires. | P1 | — | `HOOK-USEPROJECTACTIVATIONKEYS` |
| REQ-LICENSING-023 | A user can renew a key only when the key belongs to an activation key and is not permanent. Only an administrator can renew a virtual cluster key. | P1 | — | `MOD-MYACCOUNT-PROJECTS-ISRENEWABLEKEY` |

## Complimentary Keys

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-LICENSING-030 | A project can generate a complimentary key only when its account allows complimentary keys. | P0 | — | `SVC-LICENSEKEYGENERATIONSERVICE`, `SVC-LICENSEKEYGENERATEFORMSERVICE`, `CLS-ACCOUNTUTIL` |
| REQ-LICENSING-031 | A project has at most one active complimentary key at a time. | P0 | — | `SVC-LICENSEKEYGENERATIONSERVICE`, `SVC-LICENSEKEYGENERATEFORMSERVICE` |
| REQ-LICENSING-032 | A complimentary key covers exactly one server and states a purpose of 255 characters or fewer. It lasts the license key duration of its entitlement definition, counted from its start date. When the definition sets no duration (empty or 0), it lasts 30 days after its start date. The key does not expire after the subscription end date: when the end date of the subscription comes before the end of the duration, the key expires on the end date of the subscription. The start date must be before the end date of the subscription. Otherwise the system refuses the key with a validation error. It uses only an entitlement that grants complimentary keys, and such an entitlement grants no other key. | P0 | LPD-108684 | `SVC-LICENSEKEYGENERATIONSERVICE` |
| REQ-LICENSING-033 | Only an administrator can deactivate a complimentary activation key. Nobody can activate it again. | P0 | — | `REST-PATCH-ACTIVATION-KEYS-ACTIVATIONKEYID-ACTIVE`, `CLS-ACTIVATIONKEY` |

## Activation State

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-LICENSING-040 | The license keys of an activation key activate and deactivate together. A user cannot change one of them alone. | P0 | — | `REST-PATCH-LICENSE-KEYS-LICENSEKEYID-ACTIVE`, `REST-PATCH-ACTIVATION-KEYS-ACTIVATIONKEYID-ACTIVE`, `HOOK-MYACCOUNT-PROJECTS-LICENSEKEYS-USEACTIVATIONKEYACTIONS` |
| REQ-LICENSING-041 | An activation key download contains only its active license keys. A key with no active license keys has nothing to download. | P0 | — | `REST-GET-ACTIVATION-KEYS-ACTIVATIONKEYID-DOWNLOAD` |
| REQ-LICENSING-042 | A key shows as not activated, active, or expired, from its dates. A key that expires 80 years or more after it starts shows as permanent. | P1 | — | `HOOK-USEPROJECTACTIVATIONKEYS`, `MOD-MYACCOUNT-PROJECTS-ISPERMANENTKEY` |
| REQ-LICENSING-043 | A user can download a single license key only when the key uses license format version 2 or later. | P1 | — | `REST-GET-LICENSE-KEYS-LICENSEKEYID-DOWNLOAD` |
| REQ-LICENSING-044 | The key list groups license keys under their activation key and shows each key as on premise, cluster, or virtual cluster. A cluster key shows its maximum number of cluster nodes. | P1 | — | `HOOK-USEACTIVATIONKEYLICENSEKEYS`, `MOD-MYACCOUNT-PROJECTS-GETKEYTYPE`, `ROUTE-MY-ACCOUNT-LICENSEKEYERC`, `CLS-ACTIVATIONKEY`, `CLS-LICENSEKEY`, `SVC-ACTIVATIONKEYSERVICE`, `CLIENT-SPRING-BOOT-ACTIVATIONKEYS`, `CLIENT-SPRING-BOOT-LICENSEKEYS` |
| REQ-LICENSING-045 | A ZIP download of several license keys gives each key file a unique name. | P2 | — | `REST-GET-LICENSE-KEYS-DOWNLOAD-ZIP`, `CLS-LICENSEKEYEXPORTER` |

## Extension

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-LICENSING-050 | Only an active license key that an entitlement backs can be extended. The new expiration date cannot come before the new start date. | P0 | — | `REST-POST-LICENSE-KEYS-EXTEND` |

## Developer Keys

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-LICENSING-060 | A project can download a developer key or a developer cluster key for DXP 7.4 and later, for a product that the project holds an active entitlement to. The key comes from the project's entitlement for the requested key type, developer or developer cluster, of that product. A complimentary entitlement never grants it. The key lasts the license key duration of that entitlement's definition, counted from the download. When the definition sets no duration (empty or 0), the key expires on the end date of the entitlement. When the entitlement has no end date either, the download is refused. | P1 | LPD-108684 | `REST-GET-LICENSE-KEYS-DEVELOPER-DOWNLOAD`, `SVC-LICENSEKEYGENERATIONSERVICE` |

## Free DXP Licenses

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-LICENSING-070 | An owner gets one free license key for each domain. A second request for the same owner and domain fails, and the purchase form checks this before the order is placed. | P0 | LPD-89423, LPD-89429 | `REST-POST-LICENSE-KEYS-TYPE-FREE`, `REST-POST-LICENSE-KEYS-TYPE-FREE-DOMAINS-CHECK`, `FLOW-LICENSE-FREE-KEY` |
| REQ-LICENSING-071 | Issuing the free key completes its order with no payment, unless the order is already complete. The system then requests the activation key for the order. | P0 | LPD-89423 | `REST-POST-LICENSE-KEYS-TYPE-FREE`, `CLIENT-COMMERCE-PRODUCTPURCHASEDXPFREE` |
| REQ-LICENSING-072 | The purchase flow shows the activation key form only for free DXP products. | P1 | — | `ROUTE-PRODUCT-PURCHASE-ACTIVATION-KEY-FORM` |

## Common License Keys

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-LICENSING-080 | An administrator uploads license files for a product family. Each file becomes one common license key. The system reads the dates and the environment type (production, non production, or backup) from the file. | P0 | LPD-89421 | `REST-POST-COMMON-LICENSE-KEYS`, `CLS-COMMONLICENSEKEYPARSER`, `SVC-COMMONLICENSEKEYSERVICE` |
| REQ-LICENSING-081 | An upload stops at the first bad file. A file name that already exists is a conflict, and a file that is not a valid license names the file in the error. | P0 | LPD-89421 | `REST-POST-COMMON-LICENSE-KEYS` |
| REQ-LICENSING-082 | A user can list or download the common license keys of a product family only with a global administrator role, or with an active entitlement to that family on one of the user's accounts. | P0 | — | `PERM-COMMONLICENSEKEYPERMISSION`, `REST-GET-COMMON-LICENSE-KEYS`, `REST-GET-COMMON-LICENSE-KEYS-COMMONLICENSEKEYID-DOWNLOAD` |
| REQ-LICENSING-083 | Only an administrator can delete a common license key. | P0 | — | `REST-DELETE-COMMON-LICENSE-KEYS-COMMONLICENSEKEYID` |

## App License Keys

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-LICENSING-090 | Only an administrator can create, read, download, activate, or deactivate an app license key. | P0 | LPD-103395 | `REST-POST-APP-LICENSE-KEYS`, `REST-GET-APP-LICENSE-KEYS-APPLICENSEKEYID`, `REST-GET-APP-LICENSE-KEYS-APPLICENSEKEYID-DOWNLOAD`, `REST-PUT-APP-LICENSE-KEYS-ACTIVATE`, `REST-PUT-APP-LICENSE-KEYS-DEACTIVATE`, `FLOW-APP-LICENSE-KEY-LIFECYCLE` |
| REQ-LICENSING-091 | An app license key is for an app only. The system refuses an app license key for the portal product, and refuses a request that does not name the product and the owner. | P0 | LPD-103395 | `REST-POST-APP-LICENSE-KEYS`, `FLOW-APP-LICENSE-KEY-LIFECYCLE` |
| REQ-LICENSING-092 | A bulk activation or deactivation of app license keys checks every key first. One key that does not resolve leaves all of the keys unchanged. | P0 | LPD-103395 | `REST-PUT-APP-LICENSE-KEYS-ACTIVATE`, `REST-PUT-APP-LICENSE-KEYS-DEACTIVATE`, `FLOW-APP-LICENSE-KEY-LIFECYCLE` |

## Expiration Notices

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-LICENSING-100 | A user can subscribe to expiration notices for any license key or activation key that the user can see. The system checks every key before it changes any subscription. | P1 | LPD-89420, LPD-89427 | `REST-PUT-LICENSE-KEYS-SUBSCRIPTIONS`, `REST-DELETE-LICENSE-KEYS-SUBSCRIPTIONS`, `REST-GET-LICENSE-KEYS-SUBSCRIPTIONS`, `REST-PUT-ACTIVATION-KEYS-SUBSCRIPTIONS`, `REST-DELETE-ACTIVATION-KEYS-SUBSCRIPTIONS`, `REST-GET-ACTIVATION-KEYS-SUBSCRIPTIONS`, `HOOK-MYACCOUNT-PROJECTS-LICENSEKEYS-USEACTIVATIONKEYSUBSCRIPTION`, `FLOW-SUBSCRIPTION-LICENSE-SYNC` |
| REQ-LICENSING-101 | Each day at midnight, each subscribed user gets one email for each active key that expires in 30 days, in 14 days, or on that day. A key gets these emails only when it started more than 60 days before the email date, so a complimentary key gets none. | P1 | LPD-89428 | `CRON-SCHEDULEDSENDEXPIRINGLICENSEKEYEMAILS`, `SVC-SUBSCRIPTIONENTRYSERVICE`, `FLOW-LICENSE-EXPIRATION-EMAIL` |
| REQ-LICENSING-102 | When a user is deleted, the system removes all of the user's subscriptions. | P1 | — | `REST-POST-OBJECT-ACTION-USER-DELETE` |
| REQ-LICENSING-103 | A failed email to one user does not stop the emails to the other users. Known defect: the daily run has no error handling, so the first failed email stops the run. | P1 | LPD-89428 | `CRON-SCHEDULEDSENDEXPIRINGLICENSEKEYEMAILS`, `SVC-SUBSCRIPTIONENTRYSERVICE` |
| REQ-LICENSING-104 | The subscription prompt states the same schedule that the system uses. Known defect: the prompt says 15 days before expiration, but the email goes 14 days before. | P2 | — | — |

## Cloud Environment Activation

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-LICENSING-110 | A project gets one activation code for each cloud environment that its entitlements allow. A new code first reuses a pending environment of that type. When there is no pending environment and no quota is left, the system refuses the request. | P0 | — | `REST-GET-CLOUD-PROJECTS-PROJECTEXTERNALREFERENCECODE-ENVIRONMENTS-ACTIVATION-CODES`, `REST-POST-CLOUD-PROJECTS-PROJECTEXTERNALREFERENCECODE-ENVIRONMENTS-ACTIVATION-CODES`, `SVC-PROVISIONINGENVIRONMENTSERVICE` |
| REQ-LICENSING-111 | A project can request activation of an environment only once. A disaster recovery environment needs the disaster recovery entitlement. A PaaS environment needs a valid list of administrators. | P0 | — | `REST-POST-CLOUD-ENVIRONMENTS-ACTIVATION-REQUEST`, `SVC-CLOUDACTIVATIONREQUESTSERVICE`, `SVC-ENVIRONMENTSERVICE`, `REST-GET-CLOUD-PROJECTS-PROJECTEXTERNALREFERENCECODE-ENTITLEMENTS-DISASTER-RECOVERY`, `HOOK-MYACCOUNT-PROJECTS-USEHASDISASTERRECOVERYENTITLEMENT` |
| REQ-LICENSING-112 | An environment activates itself without a user session, so the activation code and a valid signature are the only gate. An activation code is 32 characters and unique. | P0 | — | `REST-POST-CLOUD-ENVIRONMENTS-ENVIRONMENTID-ACTIVATION`, `CLS-ACTIVATIONCODEUTIL`, `CLS-CLOUDNATIVESIGNATUREVALIDATOR` |
| REQ-LICENSING-113 | An environment that cannot reach the activation service can activate from an offline bundle, with the same rules as an online request. | P1 | — | `REST-POST-CLOUD-ENVIRONMENTS-OFFLINE-ACTIVATION`, `REST-POST-CLOUD-ENVIRONMENTS-ENVIRONMENTID-OFFLINE-ACTIVATION-BUNDLE` |

## Not Yet Built

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-LICENSING-120 | An administrator can revoke a license key. No endpoint or action does this yet. | P1 | LPD-89428 | `FLOW-LICENSE-REVOCATION` |
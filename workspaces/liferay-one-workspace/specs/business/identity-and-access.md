# Identity and Access

This area covers who a user is and what that user can reach. It includes sign in, the authentication of calls to the Spring Boot service, the wizard that connects a Liferay DXP to a Liferay One account, the Okta identity sync, the role catalog, the permission checks for accounts, projects, and orders, the account and project role matrix, the pages that need a project, and what a guest can read.

The actors are a guest, a signed in user, the account roles (Account Administrator, Account Member, Account Requester, Account Buyer, and the six partner roles), the project roles (Project Admin, Project Requester, and Project User), the global roles (Administrator, Provisioning Administrator, Provisioning Member, Finance Administrator, and Liferay Staff), and Okta, which sends identity events.

Terms used in this file:

- **Global role**: a regular role that applies to the whole company, for example Administrator or Liferay Staff.
- **Account role**: a role that a user holds in one account. It grants nothing in any other account.
- **Project role**: the role of a project membership. It is Project Admin, Project Requester, or Project User.
- **Shared organization**: an organization that a user belongs to and that an account is also linked to.
- **Trusted application**: one of the six OAuth2 applications whose access tokens the Spring Boot service accepts.
- **Okta group**: a group in Okta that an organization is linked to through an organization property.

## Sign In

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ACCESS-001 | The My Account, product purchase, ticket attachment, and DXP authorization pages need a signed in user. The system sends a signed out visitor to the sign in page. After sign in, the visitor returns to the same path, query, and fragment. | P0 | LPD-95398 | `HOOK-USEREQUIRESIGNIN`, `FLOW-SPA-RENDER-SMOKE` |
| REQ-ACCESS-002 | For a signed out visitor, the pages do not request the user account and do not preload account, project, or order data. | P1 | — | `CTX-ONECONTEXTPROVIDER`, `MOD-PRELOADAPPDATA` |
| REQ-ACCESS-003 | A guest cannot view the My Account, ticket attachments, large file uploader, product purchase, next steps, license agreement, authorize, and admin pages. Every signed in user can view the first seven of these pages. | P0 | LPD-95398 | — |
| REQ-ACCESS-004 | Only a user with the Marketplace Publisher role can view the Publisher Dashboard page. | P1 | LPD-95398 | — |
| REQ-ACCESS-005 | The navigation menus show a page only to the users who can view that page. | P1 | LPD-95398 | `FLOW-SPA-RENDER-SMOKE` |

## Service Authentication

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ACCESS-010 | The Spring Boot service refuses a request without a valid access token with status 401. It refuses the request before it reads or changes any data. | P0 | LPD-87600 | `AUTH-UNAUTHENTICATED` |
| REQ-ACCESS-011 | Exactly five paths accept a request without a token: the readiness probe, the invitation acceptance, the environment activation, the environment manifest, and the virtual entry download. Each of these paths applies its own check. | P0 | LPD-87600 | `AUTH-UNAUTHENTICATED`, `REST-GET-INVITATIONS-ACCEPT` |
| REQ-ACCESS-012 | The service accepts only an access token that the portal signed and that the portal issued to one of the six trusted applications. It refuses a token from any other application. | P0 | LPD-88258 | `AUTH-OAUTH2-SCOPES` |
| REQ-ACCESS-013 | When a user does not have permission, the service answers with status 403 and a fixed message. The message does not say whether the resource exists. The service logs the subject of the token. | P0 | — | `AUTH-OAUTH2-SCOPES`, `PERM-ADMINPERMISSION` |
| REQ-ACCESS-014 | When the service cannot read the user account of a token, it refuses the request with status 403. It does not answer with a server error. | P0 | — | — |
| REQ-ACCESS-015 | The readiness probe answers `READY` without a token, so that the hosting platform can check the service. | P2 | — | `AUTH-UNAUTHENTICATED` |
| REQ-ACCESS-016 | The pages call the Spring Boot service with the access token of the signed in user. When the service refuses a call, the page receives the status and the problem detail of the refusal. | P0 | — | `CLIENT-SPRING-BOOT-OAUTH2CLIENT` |

## DXP Connection Authorization

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ACCESS-020 | The authorization wizard starts only with an authorization code and a connection origin. The origin must be a bare URL origin, with no path and no trailing slash. Without both values, the wizard shows an error and connects nothing. | P0 | LPD-103883 | `MOD-OAUTH2AUTHORIZE`, `ROUTE-OAUTH2-AUTHORIZE-CONGRATULATIONS` |
| REQ-ACCESS-021 | The wizard shows the origin of the DXP that asks for access. It tells the user to continue only when the user started the connection from that DXP. | P0 | LPD-103883 | `MOD-OAUTH2AUTHORIZE` |
| REQ-ACCESS-022 | The wizard lists only the accounts that the user is a member of. When the user has exactly one account, the wizard selects it. The user cannot connect a business account that has no default billing address. | P1 | LPD-103883 | — |
| REQ-ACCESS-023 | The wizard lists the Liferay Cloud projects of the user. The user can select only a project that has an extension environment. When the user has exactly one project and it qualifies, the wizard selects it and goes to the environment step. | P1 | LPD-103883 | `ROUTE-OAUTH2-AUTHORIZE-PROJECT-SELECTION`, `MOD-OAUTH2AUTHORIZE` |
| REQ-ACCESS-024 | When no project of the user qualifies, the user can connect the account without a project. When a project is selected, the user must select one of its environments before the Connect action is available. | P1 | LPD-103883 | `ROUTE-OAUTH2-AUTHORIZE-PROJECT-SELECTION`, `ROUTE-OAUTH2-AUTHORIZE-ENVIRONMENT-SELECTION` |
| REQ-ACCESS-025 | A wizard step that needs an earlier choice sends the user back to the step that makes that choice. | P2 | LPD-103883 | `ROUTE-OAUTH2-AUTHORIZE-ENVIRONMENT-SELECTION`, `ROUTE-OAUTH2-AUTHORIZE-CONGRATULATIONS` |
| REQ-ACCESS-026 | On connect, the system records which account authorized which DXP origin. Then it sends the code, the service address, the account, the user, the channel, the site, and the cloud project to the DXP window. It sends this data only to the connecting origin, and only once. | P0 | LPD-103883 | `ROUTE-OAUTH2-AUTHORIZE-CONGRATULATIONS` |
| REQ-ACCESS-027 | Account Administrators, Account Members, organization users, Project Admins, and Project Requesters can record a DXP authorization. Every signed in user can get a token from a trusted application. | P0 | — | — |

## Okta Identity Sync

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ACCESS-030 | Okta is the source of the first name, the last name, the UUID, and the verified state of a user. A sync copies each value that Okta has. A sync never clears a value that Okta does not have. | P0 | LPD-89441 | `SVC-OKTASERVICE`, `CLS-OKTAUSER` |
| REQ-ACCESS-031 | A user is verified when the Okta status is ACTIVE, LOCKED_OUT, PASSWORD_EXPIRED, RECOVERY, or SUSPENDED. A sync never removes the verified state. | P0 | LPD-89441 | `CLS-OKTAUSER`, `SVC-OKTASERVICE` |
| REQ-ACCESS-032 | Only a 404 from Okta means that the contact does not exist. Any other failure means that Okta is unavailable. The system does not create a contact because of an outage. | P0 | LPD-98505 | `SVC-OKTASERVICE` |
| REQ-ACCESS-033 | When Okta has no contact for a user, the system asks Okta to create one. The contact carries the UUID of the user. A user without a UUID gets the external reference code of the user as the UUID. | P0 | LPD-89441 | `SVC-OKTASERVICE` |
| REQ-ACCESS-034 | When the system adds a user to an account, an account role, an organization, or a project, it makes sure that the Okta contact is active. It creates a missing contact and activates a deprovisioned contact. An Okta outage does not stop the assignment. | P0 | LPD-98505 | `SVC-USERASSIGNMENTSERVICE`, `SVC-OKTASERVICE` |
| REQ-ACCESS-035 | When Okta reports that a user is created or activated, the system syncs that user. When Okta reports a profile or password change, the system syncs the user. It sends the verified welcome email the first time that the user becomes verified. | P0 | LPD-91399 | `SUB-OKTAUSERSPUBSUBSUBSCRIBER`, `FLOW-OKTA-IDENTITY-SYNC` |
| REQ-ACCESS-036 | When Okta reports that a user is deactivated, or that a user left the Employees group, the system removes the user from every account and every organization. | P0 | LPD-91399 | `SUB-OKTAUSERSPUBSUBSUBSCRIBER`, `FLOW-OKTA-IDENTITY-SYNC` |
| REQ-ACCESS-037 | When Okta adds a user to an Okta group, the system adds the user to the organization that is linked to that group. When Okta removes the user, the system removes the user from that organization. The system ignores a group that no organization is linked to, and an email that no user has. | P0 | LPD-91399 | `SUB-OKTAUSERSPUBSUBSUBSCRIBER`, `FLOW-OKTA-IDENTITY-SYNC` |
| REQ-ACCESS-038 | Only an administrator can sync a user with Okta. The sync updates the user from Okta. Then it adds the user to each linked organization of the user's Okta groups, and removes the user from each linked organization that the user left. Organizations without an Okta group do not change. | P0 | LPD-89441 | `REST-POST-USER-ACCOUNTS-USERID-SYNC-WITH-OKTA`, `SVC-USERASSIGNMENTSERVICE`, `FLOW-OKTA-IDENTITY-SYNC` |
| REQ-ACCESS-039 | Only an administrator can sync an organization from Okta. After the sync, the members of the organization are the members of its Okta group that have a user. Emails match without regard to case. An organization without an Okta group gives a 404. | P0 | LPD-89441 | `REST-POST-ORGANIZATIONS-ORGANIZATIONID-SYNC-FROM-OKTA`, `SVC-OKTASERVICE`, `FLOW-ORGANIZATION-SYNC` |

## Cloud Native Okta Application

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ACCESS-040 | When Okta reports a new Cloud Native application for an account, the system records the application on the account. An account keeps its first application. The system ignores a later report that names a different application. | P1 | LPD-107697 | `SUB-OKTAAPPCREATEDPUBSUBSUBSCRIBER` |
| REQ-ACCESS-041 | The system refuses an application report without an account key or an application ID, and a report for an account that does not exist. | P1 | LPD-107697 | `SUB-OKTAAPPCREATEDPUBSUBSUBSCRIBER` |
| REQ-ACCESS-042 | Each account user with the Cloud Native Contact role has access to the Cloud Native application of the account. The system grants the access when the user gets the role, and removes it when the user loses the role. A failure for one user does not stop the others. | P1 | LPD-107697 | `SUB-OKTAAPPCREATEDPUBSUBSUBSCRIBER`, `SVC-USERASSIGNMENTSERVICE` |

## Roles

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ACCESS-050 | The role catalog has 49 roles: 33 account roles, 13 regular roles, and 3 site roles. Every environment gets the same catalog. | P0 | LPD-91159 | — |
| REQ-ACCESS-051 | The role import matches a role by its external reference code and updates only the fields that it sends. A built in Liferay role keeps its Liferay external reference code. One failed role does not stop the import of the other roles. | P0 | LPD-91159 | — |
| REQ-ACCESS-052 | Administrator and Provisioning Administrator are the global administrators for the back office operations. The service refuses these operations to any other role and to a user without roles. | P0 | — | `PERM-ADMINPERMISSION`, `HOOK-USEHASADMINPERMISSIONS`, `HOOK-MYACCOUNT-PROJECTS-USEHASADMINPERMISSION` |
| REQ-ACCESS-053 | Administrator and Liferay Staff pass every account, project, and order check. For license keys, Liferay Staff can only view. | P0 | — | `PERM-ACCOUNTPERMISSION`, `PERM-PROJECTPERMISSION`, `PERM-COMMERCEORDERPERMISSION`, `PERM-LICENSEKEYPERMISSION` |
| REQ-ACCESS-054 | A Finance Administrator can view every account, its addresses, every order, every payment, and every catalog. A Finance Administrator can manage orders and can update publisher sales summaries. | P0 | LPD-107296 | — |
| REQ-ACCESS-055 | A Provisioning Administrator can open the Control Panel and can view every account, user, catalog product, activation key, license key, and Liferay bundle in it. A Provisioning Administrator can change an account and its custom fields, its addresses, and its domains, and can add users to it and remove users from it. A Provisioning Administrator can open the Pub/Sub and activation key uploads sections of the admin page. A Provisioning Administrator can select any account in My Account and can view and manage its projects, members, project permissions, and orders as an Administrator does. A Provisioning Member can view users and can add, change, and delete ticket attachments. | P0 | LPD-104034 | — |
| REQ-ACCESS-056 | The pages count an account role only in the current account, and an SSA role only in the SSA account. An Administrator is also an SSA administrator. A user without account data has no account role. | P0 | — | `CLIENT-MODELS-USERACCOUNTMODEL`, `CLIENT-MODELS-MARKETPLACEUSERACCOUNT`, `CLS-USERACCOUNTUTIL` |
| REQ-ACCESS-057 | Five roles mark a user as a Liferay worker on an account: Customer Experience Manager, Liferay Sales, Primary Contact, Secondary Contact, and Solution Architect. Other users are customers. | P2 | — | `CLS-EMPLOYEEROLES` |

## Account Access

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ACCESS-060 | An account role grants access only to the account where the user holds it. A role in another account grants nothing. | P0 | — | `PERM-ACCOUNTPERMISSION`, `CLS-USERACCOUNTUTIL` |
| REQ-ACCESS-061 | Only an Account Administrator, a Partner Account Admin, or an SSA Administrator of the account can manage the members of the account. Membership in a shared organization does not grant this. | P0 | — | `PERM-ACCOUNTPERMISSION`, `REST-PUT-ACCOUNTS-EXTERNALREFERENCECODE-USER-ACCOUNTS-USERID-ACCOUNT-ROLES` |
| REQ-ACCESS-062 | An Account Administrator, an Account Member, and an Account Requester can view the account. An Account Administrator and an Account Requester can also change its support data. | P0 | — | `PERM-ACCOUNTPERMISSION` |
| REQ-ACCESS-063 | A member of a shared organization can view and change the account, but cannot manage its members. | P0 | — | `PERM-ACCOUNTPERMISSION`, `PERM-PROJECTPERMISSION` |
| REQ-ACCESS-064 | A user can see an order only when the order belongs to an account of the user. The system refuses an order that does not exist or that has no account. | P0 | — | `PERM-COMMERCEORDERPERMISSION` |

## Account Role Matrix

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ACCESS-070 | In My Account, the account managers are the Account Administrator, the Partner Account Admin, and the Administrator. Only an account manager can invite, change, or remove account members. | P0 | LPD-95398 | `MOD-MYACCOUNT-ACCOUNTMEMBERS-ACCOUNTROLES`, `FLOW-ROLE-ACCOUNT-PERMISSIONS` |
| REQ-ACCESS-071 | A user whose account role is Account Buyer and not also Account Member cannot open the account members page. The members tab is not shown to that user. | P1 | LPD-95398 | `MOD-MYACCOUNT-ACCOUNTMEMBERS-ACCOUNTROLES`, `FLOW-ROLE-ACCOUNT-PERMISSIONS` |
| REQ-ACCESS-072 | A user without an account role in the current account cannot open the account orders. | P1 | LPD-95398 | `MOD-MYACCOUNT-ACCOUNTMEMBERS-ACCOUNTROLES`, `FLOW-ROLE-ACCOUNT-PERMISSIONS` |
| REQ-ACCESS-073 | An account manager can assign 9 account roles: the 3 standard roles and the 6 partner roles. The system refuses an assignment when a role name has no role in the account. | P1 | LPD-95398 | `MOD-MYACCOUNT-ACCOUNTMEMBERS-ACCOUNTROLES` |

## Project Access

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ACCESS-080 | The Account Administrator of the project's account has full access to the project. The system refuses every project request when the project or its account does not exist. | P0 | — | `PERM-PROJECTPERMISSION` |
| REQ-ACCESS-081 | Every project role can view the project. A Project Admin and a Project Requester can also change support data, such as tickets and attachments. Only a Project Admin can manage project members. | P0 | LPD-95398 | `PERM-PROJECTPERMISSION`, `FLOW-ROLE-PROJECT-PERMISSIONS`, `HOOK-BUSINESSEVENTS-USEHASALLEVENTSPERMISSIONS` |
| REQ-ACCESS-082 | A user who can manage the members of an account can also manage the members of each project of that account. | P0 | — | `PERM-PROJECTPERMISSION` |
| REQ-ACCESS-083 | An Account Administrator and an Administrator see every project of the account. Every other user sees only the projects where the user has a membership. A project without a membership of the user is not shown in the navigation. | P0 | LPD-95398, LPD-92707 | `HOOK-MYACCOUNT-PROJECTS-USEUSERPROJECTS`, `FLOW-ROLE-NULL-PROJECT-ACCESS` |
| REQ-ACCESS-084 | A user without an account role and without a project membership sees only the account pages. When that user gets one project membership, the user also sees that project. | P1 | LPD-95398, LPD-92707 | `FLOW-ROLE-NULL-PROJECT-ACCESS`, `HOOK-MYACCOUNT-PROJECTS-USEUSERPROJECTS` |

## Restricted Pages

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ACCESS-090 | When the current account has no project, the account members and project members pages show a restricted feature message instead of their content. | P1 | LPD-92707 | `HOOK-MYACCOUNT-PROJECTS-USEHASPROJECT`, `FLOW-RESTRICTED-PAGE` |
| REQ-ACCESS-091 | Every page that needs a project uses one shared condition: the account has at least one project. The condition counts the projects of the account, not the memberships of the user. | P1 | LPD-92706, LPD-92707 | `HOOK-MYACCOUNT-PROJECTS-USEHASPROJECT`, `FLOW-RESTRICTED-PAGE` |
| REQ-ACCESS-092 | A route that the role of the user cannot access does not exist for that user. Its address goes back to the start, and the navigation does not show it. | P0 | LPD-107296 | `MOD-ROUTEUTILS`, `FLOW-RESTRICTED-PAGE` |

## Guest Access

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ACCESS-100 | A guest can read the publisher details and the custom field definitions. A guest cannot read any other object. | P0 | — | — |
| REQ-ACCESS-101 | A guest can view the Become a Publisher page. | P2 | — | — |
| REQ-ACCESS-102 | Every signed in user can read the entitlement definitions, the environments, the Liferay bundles, the usage definitions, the usage events, and the publisher details of the company. | P0 | — | — |
| REQ-ACCESS-103 | Every signed in user can submit a Digital Sales Room request and a free DXP activation key request. | P1 | — | — |

## Not Yet Built

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ACCESS-110 | Each endpoint requires its own OAuth2 scope, and a valid token without that scope gets status 403. No endpoint checks a scope yet. The service checks only the application that issued the token. | P0 | LPD-88258 | `AUTH-OAUTH2-SCOPES` |
| REQ-ACCESS-111 | Only an account manager can edit the account details. The account details page has no edit action yet. | P1 | LPD-95398 | `FLOW-ROLE-ACCOUNT-PERMISSIONS` |
| REQ-ACCESS-112 | A user whose account role is Account Buyer, or who has no account role, cannot open the projects. The pages do not apply this rule yet. A project membership still shows the project. | P1 | LPD-95398 | `FLOW-ROLE-ACCOUNT-PERMISSIONS` |
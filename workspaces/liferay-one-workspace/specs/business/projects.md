# Projects

This area covers the projects of a customer account and what a project shows in My Account. It includes project access, project membership and the 3 project roles, the Project Members page, project navigation and the One Time Purchases pseudo project, contracts and the contract filter, the Products, Applications, and Orders data of a project, the tabs of a project item and the rules that show or hide each tab, and the copy of a project in Jira Service Management (JSM).

The actors are a project member (Project Admin, Project Requester, or Project User), the account administrator, the other account managers (Partner Account Admin and SSA Administrator), a member of an organization that shares the account, Liferay Staff, and the Administrator role. Salesforce is an actor when it sends contracts and project contacts.

Terms used in this file:

- **Project**: a unit of work inside an account. Contracts, entitlements, orders, environments, and members attach to a project.
- **Project role**: Project Admin (`C_PROJECT_ADMIN`), Project Requester (`C_PROJECT_REQUESTER`), or Project User (`C_PROJECT_USER`). A project membership gives one user one project role on one project.
- **Account manager**: a user who holds the Account Administrator, Partner Account Admin, or SSA Administrator role on the account.
- **Account level contract**: a contract of the account that is not linked to a project.
- **One Time Purchases**: a pseudo project and a pseudo contract that hold the orders and entitlements that no project or project contract owns.
- **Project item**: a product or an application that the project bought. The `project-item-type` product specification says which of the two it is.
- **Profile**: a product specification that selects what one tab of a project item shows. A profile of `none` hides the tab.

License keys and activation keys on the Activation page belong to [Licensing and Activation](./licensing-and-activation.md). The content of the Environment tab belongs to the PROVISIONING area, and the content of the Utilization tab belongs to the USAGE area.

## Project Access

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-PROJECTS-001 | A user can view a project when the user holds any project role on it or is the Account Administrator of its account. A member of a shared organization, an Administrator, and Liferay Staff can also view it. | P0 | LPD-89441, LPD-95398 | `PERM-PROJECTPERMISSION`, `REST-GET-PROJECTS-EXTERNALREFERENCECODE-JIRA-OBJECT-KEY`, `FLOW-ROLE-PROJECT-PERMISSIONS` |
| REQ-PROJECTS-002 | The project update right covers support work, project invitations, and the JSM push. Project Admin, Project Requester, the Account Administrator, a member of a shared organization, an Administrator, and Liferay Staff have it. A Project User does not. | P0 | LPD-89441, LPD-95398 | `PERM-PROJECTPERMISSION`, `REST-POST-PROJECTS-EXTERNALREFERENCECODE-SYNC-TO-JSM`, `FLOW-ROLE-PROJECT-PERMISSIONS` |
| REQ-PROJECTS-003 | To manage the members of a project, a user must be its Project Admin, an account manager of its account, an Administrator, or Liferay Staff. Membership in a shared organization does not give this right. | P0 | LPD-89441, LPD-95398 | `PERM-PROJECTPERMISSION`, `REST-POST-PROJECTS-PROJECTID-USER-ACCOUNTS-USERID-ACCOUNT-ROLES-ACCOUNTROLEEXTERNALREFERENCECODE`, `REST-PUT-PROJECTS-PROJECTID-USER-ACCOUNTS-USERID-ACCOUNT-ROLES-ACCOUNTROLEEXTERNALREFERENCECODE`, `REST-DELETE-PROJECTS-PROJECTID-USER-ACCOUNTS-USERID-ACCOUNT-ROLES-ACCOUNTROLEEXTERNALREFERENCECODE` |
| REQ-PROJECTS-004 | When a project does not exist or has no account, only an Administrator or Liferay Staff passes a project permission check. | P0 | — | `PERM-PROJECTPERMISSION` |
| REQ-PROJECTS-005 | In My Account, the Account Administrator and an Administrator see every project of the account. Every other user sees only the projects where the user holds a project role. | P0 | LPD-92707, LPD-95398 | `HOOK-MYACCOUNT-PROJECTS-USEUSERPROJECTS`, `FLOW-ROLE-NULL-PROJECT-ACCESS` |
| REQ-PROJECTS-006 | The project list shows the projects of the account by name, at most 200. | P1 | — | `HOOK-MYACCOUNT-PROJECTS-USEUSERPROJECTS` |
| REQ-PROJECTS-007 | A page that needs a project shows a restricted message when the account has no project. This check counts every project of the account, not only the projects of the user. | P1 | LPD-92707, LPD-92706 | `HOOK-MYACCOUNT-PROJECTS-USEHASPROJECT`, `FLOW-RESTRICTED-PAGE`, `ROUTE-MY-ACCOUNT-PROJECT-MEMBERS` |

## Project Membership

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-PROJECTS-010 | A project membership uses one of the 3 project roles. The system refuses a request for any other role. | P0 | — | `REST-POST-PROJECTS-PROJECTID-USER-ACCOUNTS-USERID-ACCOUNT-ROLES-ACCOUNTROLEEXTERNALREFERENCECODE`, `REST-PUT-PROJECTS-PROJECTID-USER-ACCOUNTS-USERID-ACCOUNT-ROLES-ACCOUNTROLEEXTERNALREFERENCECODE`, `MOD-MYACCOUNT-PROJECTMEMBERS-PROJECTROLES` |
| REQ-PROJECTS-011 | A user can get a project role without account membership. The system then also adds the user to the account of the project. | P0 | — | `SVC-USERASSIGNMENTSERVICE`, `SVC-PROJECTMEMBERSHIPSERVICE`, `REST-POST-PROJECTS-PROJECTID-USER-ACCOUNTS-USERID-ACCOUNT-ROLES-ACCOUNTROLEEXTERNALREFERENCECODE` |
| REQ-PROJECTS-012 | Project membership changes are idempotent. A role that the user already holds is not added twice. A removal of a role that the user does not hold changes nothing. | P1 | — | `SVC-PROJECTMEMBERSHIPSERVICE`, `REST-DELETE-PROJECTS-PROJECTID-USER-ACCOUNTS-USERID-ACCOUNT-ROLES-ACCOUNTROLEEXTERNALREFERENCECODE`, `FLOW-PROJECT-MEMBERSHIP` |
| REQ-PROJECTS-013 | A project role change leaves the user with exactly the requested role on that project. The system removes every other project role of the user on that project. | P0 | — | `REST-PUT-PROJECTS-PROJECTID-USER-ACCOUNTS-USERID-ACCOUNT-ROLES-ACCOUNTROLEEXTERNALREFERENCECODE` |
| REQ-PROJECTS-014 | A project membership change updates the project, the account, the user, and the role assignment in JSM. A JSM failure is logged and does not undo the change in Liferay. | P1 | LPD-102712 | `SVC-USERASSIGNMENTSERVICE`, `SYNC-ACCOUNTUSERACCOUNTROLESYNCHRONIZER` |
| REQ-PROJECTS-015 | A user who can invite to a project can invite a person to that project only. The accepted invitation gives the person the project role and adds the person to the account. | P0 | LPD-98505 | `REST-POST-ACCOUNTS-EXTERNALREFERENCECODE-INVITATIONS`, `SVC-ACCOUNTINVITATIONACCEPTANCESERVICE` |
| REQ-PROJECTS-016 | The Project Members page lists each project of the account with its members by name. Members with no name come last. A member with a role that is not a project role does not show. | P1 | LPD-95394 | `HOOK-MYACCOUNT-PROJECTMEMBERS-USEPROJECTMEMBERS`, `ROUTE-MY-ACCOUNT-PROJECT-MEMBERS`, `FLOW-PROJECT-MEMBERSHIP` |
| REQ-PROJECTS-017 | On the Project Members page, an account manager can manage every project, and a Project Admin can manage that project. When a project has members and no Project Admin, the page tells users to contact the account administrator. | P1 | LPD-95394, LPD-95398 | `HOOK-MYACCOUNT-PROJECTMEMBERS-USEPROJECTMEMBERS`, `ROUTE-MY-ACCOUNT-PROJECT-MEMBERS` |
| REQ-PROJECTS-018 | The page shows a cloud contact designation only for an account role that a project product names. The `project-contacts-role-ercs` specification holds these names. | P1 | LPD-95394 | `HOOK-MYACCOUNT-PROJECTMEMBERS-USEPROJECTMEMBERS`, `MOD-MYACCOUNT-PROJECTMEMBERS-PROJECTROLES` |

## Project Navigation

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-PROJECTS-020 | One Time Purchases shows as an extra project only when the account has an item with no project. Such an item is a placed order or an entitlement. | P1 | LPD-90955 | `CTX-PROJECTCONTEXT` |
| REQ-PROJECTS-021 | When a link names a project that the user cannot see, the system opens the default project. The default project is the last project that the user viewed, else the first project. | P1 | LPD-90955 | `CTX-PROJECTCONTEXT`, `MOD-MYACCOUNT-PROJECTS-RESOLVEDEFAULTPROJECT`, `ROUTE-MY-ACCOUNT-PROJECT`, `ROUTE-MY-ACCOUNT-PROJECTERC`, `FLOW-PROJECT-LIFECYCLE` |
| REQ-PROJECTS-022 | The system remembers the last viewed project only when the user can see that project. The project cookie is separate for each user and account. | P1 | — | `CTX-PROJECTCONTEXT`, `MOD-MYACCOUNT-PROJECTS-PROJECTCOOKIEUTILS`, `MOD-MYACCOUNT-PROJECTS-RESOLVEPROJECTERC`, `HOOK-MYACCOUNT-PROJECTS-USESELECTEDPROJECT` |
| REQ-PROJECTS-023 | A project opens on its Products page. When it has no products and has applications, it opens on Applications. When it has neither, and One Time Purchases has applications, it opens those applications. | P1 | LPD-90955 | `ROUTE-MY-ACCOUNT-PRODUCTS`, `ROUTE-MY-ACCOUNT-APPLICATIONS` |
| REQ-PROJECTS-024 | A product or an application of a project has its own detail page. An unknown path under Products or Applications returns to the list. An item that the project does not hold shows no results. | P1 | LPD-88252 | `ROUTE-MY-ACCOUNT-PRODUCTERC`, `ROUTE-MY-ACCOUNT-APPLICATIONERC`, `FLOW-MY-ACCOUNT-OVERVIEW` |
| REQ-PROJECTS-025 | A link to a project uses the site path and the external reference code of the project. | P2 | — | `MOD-ROUTERPATH` |
| REQ-PROJECTS-026 | When a signed in user opens My Account, the system loads the project, contract, entitlement, product, and order data in advance. It does this once for each route. | P2 | LPD-99898 | `MOD-PRELOADAPPDATA` |

## Contracts and the Contract Filter

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-PROJECTS-030 | The contracts of a project are the contracts linked to it. When a project has no contract, the account level contracts apply to it. | P0 | LPD-88252 | `HOOK-USEPROJECTCOMMERCE` |
| REQ-PROJECTS-031 | A contract is future before its start date, expired after its end date, and active otherwise. | P1 | LPD-88252 | `HOOK-USEPROJECTCOMMERCE`, `CLS-CONTRACT` |
| REQ-PROJECTS-032 | The default contract is the active contract with the highest spend limit. When no contract is active, it is the contract with the highest spend limit. A selected contract resets when the user changes project. | P1 | LPD-88252 | `HOOK-USEPROJECTCOMMERCE`, `CTX-PROJECTCONTEXT` |
| REQ-PROJECTS-033 | The contract list of a project adds a One Time Purchases entry when the project has an entitlement outside its own contracts. | P0 | LPD-90955 | `HOOK-USEPROJECTCOMMERCE` |
| REQ-PROJECTS-034 | The Products and Applications lists show only the items that the selected contract entitles. One Time Purchases also shows items that no project contract entitles. The lists are not filtered when the project uses account level contracts. | P0 | LPD-90955, LPD-99898 | `HOOK-USEPROJECTITEMS` |
| REQ-PROJECTS-035 | A renewal contract keeps the project of the contract that it renews when the order names no project. An update never replaces a project link that a contract already has. | P0 | LPD-92221, LPD-89686 | `SVC-CONTRACTSERVICE` |
| REQ-PROJECTS-036 | When a contract arrives, each entitlement of its order with no contract or no project gets the contract and the project. The system refuses a renewal chain that matches more than one contract. | P0 | LPD-92221, LPD-89686 | `SVC-CONTRACTSERVICE`, `CLS-CONTRACT` |
| REQ-PROJECTS-037 | The project pages read at most 2,000 catalog products. They read at most 50 account level contracts when they look for entitlements with no project. | P1 | LPD-99898 | `HOOK-USEPROJECTCOMMERCE` |

## Products, Applications, and Orders

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-PROJECTS-040 | The Products and Applications lists come from the placed orders of the account. An order belongs to the project whose name it carries in its project name field, else in its first Koroneiki project. | P0 | LPD-90955 | `HOOK-USEPROJECTITEMS`, `HOOK-USEPROJECTORDERS` |
| REQ-PROJECTS-041 | One Time Purchases holds only the placed orders that name no project. | P0 | LPD-90955 | `HOOK-USEPROJECTITEMS`, `CTX-PROJECTCONTEXT` |
| REQ-PROJECTS-042 | The `project-item-type` specification of a product decides whether the product is a product or an application, with no regard to case. An order item with no such type, or with no catalog product, does not show. | P1 | LPD-88252 | `MOD-MYACCOUNT-PROJECTS-RESOLVEPROJECTITEMTYPE`, `MOD-MYACCOUNT-PROJECTS-PROJECTITEMSUTILS` |
| REQ-PROJECTS-043 | Each product shows once in the list, with the start date and status of the first order that holds it. The status is active when the order has none. | P1 | LPD-88252 | `MOD-MYACCOUNT-PROJECTS-PROJECTITEMSUTILS`, `HOOK-USEPROJECTITEMS` |
| REQ-PROJECTS-044 | The Orders tab of a project shows the orders that carry the project name. An order with no total shows $0.00. An AI Hub token order does not supply the order details of a product. | P1 | — | `HOOK-USEPROJECTORDERS` |

## Project Item Tabs

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-PROJECTS-050 | Every project item has a Details tab and an Orders tab. The tabs always show in this order: Details, Utilization, Environment, Activation, Download, Orders, and Help and Support. | P1 | LPD-90056, LPD-88252 | `MOD-MYACCOUNT-PROJECTS-RESOLVEPRODUCTTABCONFIG` |
| REQ-PROJECTS-051 | The product specification of a profile decides each other tab. A missing or unknown profile value counts as none, and a profile of none hides its tab. | P1 | LPD-90056 | `MOD-MYACCOUNT-PROJECTS-RESOLVEPROFILE`, `MOD-MYACCOUNT-PROJECTS-RESOLVEENVIRONMENTPROFILE`, `MOD-MYACCOUNT-PROJECTS-RESOLVEUTILIZATIONPROFILE`, `MOD-MYACCOUNT-PROJECTS-RESOLVEPRODUCTTABCONFIG` |
| REQ-PROJECTS-052 | A valid activation profile on the product wins. Otherwise an application gets app licenses for a client extension, composite app, DXP app, or unknown app type. A cloud app gets app provisioning, and other app types get none. A product gets none. | P1 | LPD-88252 | `MOD-MYACCOUNT-PROJECTS-RESOLVEACTIVATIONPROFILE`, `MOD-MYACCOUNT-PROJECTS-GETAPPTYPE` |
| REQ-PROJECTS-053 | The Activation tab is hidden for the license key profiles, because those keys show on the Activation page of the project. The license key profiles are app licenses, DXP portal, keys list, and licenses. | P1 | LPD-88252 | `MOD-MYACCOUNT-PROJECTS-RESOLVEPRODUCTTABCONFIG`, `ROUTE-MY-ACCOUNT-ACTIVATION` |
| REQ-PROJECTS-054 | The Activation tab of a cloud native product is hidden when the account has an active entitlement to an experience offering. | P1 | LPD-88252 | `MOD-MYACCOUNT-PROJECTS-RESOLVEPRODUCTTABCONFIG`, `HOOK-USEPROJECTCOMMERCE` |
| REQ-PROJECTS-055 | A download profile other than none on the product wins. Otherwise a client extension, composite app, DXP app, or low code configuration app gets the app download. Every other item gets none. | P1 | LPD-88252 | `MOD-MYACCOUNT-PROJECTS-RESOLVEDOWNLOADPROFILE`, `MOD-MYACCOUNT-PROJECTS-GETAPPTYPE` |
| REQ-PROJECTS-056 | An application always gets the basic details. A product uses its details profile, else the environment instance details when it is in the Platform category, else the basic details. | P1 | LPD-88252 | `MOD-MYACCOUNT-PROJECTS-RESOLVEDETAILSPROFILE` |
| REQ-PROJECTS-057 | The Help and Support tab shows when the product has a Learn URL. It also shows for an application that has at least one support link specification. | P2 | LPD-92999 | `MOD-MYACCOUNT-PROJECTS-RESOLVEPRODUCTTABCONFIG` |
| REQ-PROJECTS-058 | The Environment tab follows one of 6 environment profiles, and the Utilization tab follows one of 5 utilization profiles. Any other value hides the tab. | P1 | LPD-90056 | `MOD-MYACCOUNT-PROJECTS-RESOLVEENVIRONMENTPROFILE`, `MOD-MYACCOUNT-PROJECTS-RESOLVEUTILIZATIONPROFILE` |

## Projects in JSM

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-PROJECTS-060 | A user with the project update right can push the project to JSM on request. | P1 | LPD-89437 | `REST-POST-PROJECTS-EXTERNALREFERENCECODE-SYNC-TO-JSM`, `SYNC-ACCOUNTSYNCHRONIZER` |
| REQ-PROJECTS-061 | The JSM copy of a project lists its members as workers and customers. The sync skips a membership whose user no longer exists. | P1 | LPD-102860 | `SYNC-PROJECTSYNCMODEL`, `SYNC-ACCOUNTSYNCHRONIZER` |
| REQ-PROJECTS-062 | The system refuses to sync a project that has no account. | P0 | LPD-89437 | `SYNC-ACCOUNTSYNCHRONIZER` |
| REQ-PROJECTS-063 | When the sync cannot read the roles or the members of a project, it leaves the matching JSM values unchanged. | P0 | LPD-102860 | `SYNC-PROJECTSYNCMODEL` |
| REQ-PROJECTS-064 | A user with the project view right can read the JSM object key of the project. | P2 | — | `REST-GET-PROJECTS-EXTERNALREFERENCECODE-JIRA-OBJECT-KEY` |
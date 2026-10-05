# Accounts and Organizations

This area covers the customer accounts of Liferay One and the people in them. It includes account creation, account members and account roles, account invitations, partner account classification, the account selector, the My Account pages for account details and account members, postal addresses and contacts, organizations, and the sync of accounts, organizations, users, and roles to Jira Service Management (JSM).

The actors are a signed in user, an invited person who is not signed in, the account administrator, the other account managers (Partner Account Admin and SSA Administrator), a member of an organization that shares an account, Liferay Staff, and the global administrator roles (Administrator and Provisioning Administrator). Liferay itself is an actor when an object action calls the system after a change to an account, a user, an organization, an address, or an invitation.

Terms used in this file:

- **Account manager**: a user who holds the Account Administrator, Partner Account Admin, or SSA Administrator role on an account.
- **Global administrator**: a user with the Administrator or Provisioning Administrator role.
- **Shared organization**: an organization that an account is linked to. The members of the organization get access to the account.
- **Account invitation**: a pending offer to join an account, or one project of the account, that the system sends by email.
- **Partner account**: an account that holds at least one product that Liferay marks as a partner product.
- **Reserved Liferay domain**: one of the 8 email domains that Liferay uses for its own staff, for example `liferay.com`.
- **JSM asset**: the copy of an account, a team (organization), a contact (user), a role, or a role assignment in the JSM asset schema.

## Account Access

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ACCOUNTS-001 | A user can view an account and its pending invitations when the user holds the Account Administrator, Account Member, or Account Requester role on it. A member of a shared organization, an Administrator, and Liferay Staff can also view it. | P0 | LPD-89441 | `PERM-ACCOUNTPERMISSION`, `REST-GET-ACCOUNTS-EXTERNALREFERENCECODE-INVITATIONS`, `REST-GET-ACCOUNTS-EXTERNALREFERENCECODE-JIRA-OBJECT-KEY` |
| REQ-ACCOUNTS-002 | An account manager, an Administrator, or Liferay Staff can add a member, remove a member, or change the roles of a member. Membership in a shared organization does not give this right. | P0 | LPD-89441, LPD-95398 | `PERM-ACCOUNTPERMISSION`, `REST-PUT-ACCOUNTS-EXTERNALREFERENCECODE-USER-ACCOUNTS-USERID-ACCOUNT-ROLES`, `REST-DELETE-ACCOUNTS-EXTERNALREFERENCECODE-USER-ACCOUNTS-USERID`, `CLS-USERACCOUNTUTIL` |
| REQ-ACCOUNTS-003 | To send, resend, or revoke an account invitation, a user needs the Account Administrator or Account Requester role on the account. A member of a shared organization, an Administrator, and Liferay Staff can also do this. | P0 | LPD-98505 | `PERM-ACCOUNTPERMISSION`, `REST-POST-ACCOUNTS-EXTERNALREFERENCECODE-INVITATIONS`, `REST-POST-ACCOUNTS-EXTERNALREFERENCECODE-INVITATIONS-ACCOUNTINVITATIONID-RESEND`, `REST-DELETE-ACCOUNTS-EXTERNALREFERENCECODE-INVITATIONS-ACCOUNTINVITATIONID` |
| REQ-ACCOUNTS-004 | When a My Account link names an account that is not the current account, the system makes that account current and reloads the page. When the user cannot read that account, the page shows a no access message. | P0 | LPD-88258 | `CTX-ACCOUNTCONTEXT`, `MOD-SETCURRENTACCOUNT`, `ROUTE-MY-ACCOUNT-ACCOUNTERC`, `FLOW-MY-ACCOUNT-OVERVIEW` |

## Account Creation and Addresses

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ACCOUNTS-010 | A signed in user can create a business account or a person account. The system refuses any other account type. The creator becomes a member and the Account Administrator of the new account. | P0 | — | `REST-POST-ACCOUNTS`, `CLIENT-SPRING-BOOT-ACCOUNTS` |
| REQ-ACCOUNTS-011 | A new account keeps only its name, tax ID, logo, postal addresses, and Contact Email custom field from the request. The first postal address becomes the default billing address. | P1 | — | `REST-POST-ACCOUNTS`, `CLIENT-SPRING-BOOT-ACCOUNTS` |
| REQ-ACCOUNTS-012 | When a user adds a postal address to an account that has no default billing address, that address becomes the default billing address. | P1 | LPD-94957 | `REST-POST-OBJECT-ACTION-POSTAL-ADDRESS-CREATE` |
| REQ-ACCOUNTS-013 | The system sets the currency of an account from the country of its billing address. It sets the currency only once and never replaces a currency that the account already has. | P1 | LPD-94957, LPD-101694 | `SVC-COMMERCEACCOUNTCURRENCYSERVICE`, `REST-POST-OBJECT-ACTION-POSTAL-ADDRESS-CREATE`, `REST-POST-OBJECT-ACTION-ACCOUNT-CREATE`, `REST-POST-OBJECT-ACTION-ACCOUNT-UPDATE` |
| REQ-ACCOUNTS-014 | The account currency is one of AUD, BRL, EUR, GBP, INR, JPY, SGD, and USD. A country with no currency mapping, or a currency that is not active, leaves the account with no currency. | P1 | LPD-94957 | `SVC-COMMERCEACCOUNTCURRENCYSERVICE` |
| REQ-ACCOUNTS-015 | A failure to set the account currency does not stop the sync of the account to JSM. | P1 | LPD-94957 | `REST-POST-OBJECT-ACTION-ACCOUNT-CREATE`, `REST-POST-OBJECT-ACTION-ACCOUNT-UPDATE` |
| REQ-ACCOUNTS-016 | The Account Details page shows the primary postal address of the account. When no address is primary, it shows the first address. | P2 | — | `HOOK-USEACCOUNTDETAILS`, `ROUTE-MY-ACCOUNT-ACCOUNT-DETAILS` |

## Account Members and Roles

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ACCOUNTS-020 | An account always keeps at least one account manager. The system refuses a role change or a removal that leaves the account with no account manager. The Account Members page warns before it removes the last administrator. | P0 | LPD-103503 | `REST-PUT-ACCOUNTS-EXTERNALREFERENCECODE-USER-ACCOUNTS-USERID-ACCOUNT-ROLES`, `REST-DELETE-ACCOUNTS-EXTERNALREFERENCECODE-USER-ACCOUNTS-USERID`, `HOOK-MYACCOUNT-ACCOUNTMEMBERS-USEACCOUNTMEMBERACTIONS`, `FLOW-ACCOUNT-TEAM-MEMBERS` |
| REQ-ACCOUNTS-021 | A role change replaces the account roles of a member with the requested set. Each requested role must exist. The user must already be a member of the account. | P0 | LPD-103503 | `REST-PUT-ACCOUNTS-EXTERNALREFERENCECODE-USER-ACCOUNTS-USERID-ACCOUNT-ROLES`, `SVC-ACCOUNTROLESERVICE`, `CLS-USERACCOUNTUTIL` |
| REQ-ACCOUNTS-022 | When a member leaves an account, the system also removes the project memberships of the member in that account. It also removes the expiration notice subscriptions of the member for the activation keys of that account. | P0 | — | `REST-DELETE-ACCOUNTS-EXTERNALREFERENCECODE-USER-ACCOUNTS-USERID`, `SVC-USERASSIGNMENTSERVICE`, `HOOK-MYACCOUNT-ACCOUNTMEMBERS-USEACCOUNTMEMBERACTIONS` |
| REQ-ACCOUNTS-023 | Only a global administrator can add a user to an account by email address with account roles. The system refuses a reserved Liferay domain, an unknown role, and a role that the user already holds. | P0 | LPD-89441 | `REST-POST-ACCOUNTS-EXTERNALREFERENCECODE-USER-ACCOUNTS-BY-EMAIL-ADDRESS-EMAILADDRESS-ACCOUNT-ROLES`, `SVC-EMAILADDRESSVALIDATORSERVICE` |
| REQ-ACCOUNTS-024 | When no user has the email address, the request must give a first name and a last name, and the system creates the user. The system sends a welcome email only when the request adds the user to the account for the first time. | P1 | — | `REST-POST-ACCOUNTS-EXTERNALREFERENCECODE-USER-ACCOUNTS-BY-EMAIL-ADDRESS-EMAILADDRESS-ACCOUNT-ROLES` |
| REQ-ACCOUNTS-025 | Account membership and role assignment are idempotent. A membership or a role that the user already has changes nothing and sends no email. | P1 | — | `SVC-USERASSIGNMENTSERVICE` |
| REQ-ACCOUNTS-026 | When a user gets or loses a partner account role, the system emails a partner user update. The partner roles are Partner Manager, Partner Marketing User, Partner Member, Partner Sales User, and Partner Technical User. A failed email does not stop the change. | P1 | — | `SVC-USERASSIGNMENTSERVICE` |
| REQ-ACCOUNTS-027 | When the account has a Cloud Native Okta application, the Cloud Native Contact role gives the user access to that application. Removal of the role removes the access. A failure is logged and does not stop the role change. | P1 | LPD-107697 | `SVC-USERASSIGNMENTSERVICE` |
| REQ-ACCOUNTS-028 | Before the system adds a user to an account or an organization, it activates the Okta contact of the user. | P1 | LPD-98505 | `SVC-USERASSIGNMENTSERVICE` |
| REQ-ACCOUNTS-029 | The Account Members page lists the members with their account roles, and the pending invitations. It hides an account invitation for an email address that already belongs to a member. A removal confirmation names the projects that the member belongs to. | P1 | LPD-95390 | `HOOK-MYACCOUNT-ACCOUNTMEMBERS-USEACCOUNTMEMBERS`, `HOOK-MYACCOUNT-ACCOUNTMEMBERS-USEACCOUNTMEMBERACTIONS`, `ROUTE-MY-ACCOUNT-ACCOUNT-MEMBERS` |

## Account Invitations

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ACCOUNTS-030 | An invitation names an email address, a given name, and a family name. The email address must be valid and must not use a reserved Liferay domain. The invite form takes 1 to 10 people and refuses the same email address twice. | P0 | LPD-98505 | `REST-POST-ACCOUNTS-EXTERNALREFERENCECODE-INVITATIONS`, `SVC-EMAILADDRESSVALIDATORSERVICE`, `MOD-SCHEMAS-ACCOUNTSCHEMAS` |
| REQ-ACCOUNTS-031 | The system refuses an account invitation for a person who is already a member. A project invitation names a project of the same account and one of the 3 project roles. The person must not already hold that role. | P0 | LPD-98505 | `REST-POST-ACCOUNTS-EXTERNALREFERENCECODE-INVITATIONS` |
| REQ-ACCOUNTS-032 | Every account role that an invitation names must exist. One unknown role refuses the whole invitation. | P0 | LPD-98505 | `REST-POST-ACCOUNTS-EXTERNALREFERENCECODE-INVITATIONS`, `CLS-ACCOUNTINVITATION` |
| REQ-ACCOUNTS-033 | An account has at most one pending invitation for each email address and project. A second invitation updates the pending one and sends a new link. The old link then stops working. | P1 | LPD-98505 | `REST-POST-ACCOUNTS-EXTERNALREFERENCECODE-INVITATIONS`, `SVC-ACCOUNTINVITATIONSERVICE` |
| REQ-ACCOUNTS-034 | An invitation link expires 30 days after the system sends it. A resend sends a new link with a new 30 day period. An invitation with no readable expiration date counts as expired. | P1 | LPD-98505 | `SVC-ACCOUNTINVITATIONSERVICE`, `REST-POST-ACCOUNTS-EXTERNALREFERENCECODE-INVITATIONS-ACCOUNTINVITATIONID-RESEND`, `CLS-ACCOUNTINVITATION` |
| REQ-ACCOUNTS-035 | A user can resend or revoke only a pending invitation of the named account. The system answers not found for an accepted invitation or an invitation of another account. A project invitation needs the project update right. | P0 | LPD-98505 | `REST-DELETE-ACCOUNTS-EXTERNALREFERENCECODE-INVITATIONS-ACCOUNTINVITATIONID`, `REST-POST-ACCOUNTS-EXTERNALREFERENCECODE-INVITATIONS-ACCOUNTINVITATIONID-RESEND`, `PERM-PROJECTPERMISSION` |
| REQ-ACCOUNTS-036 | The invitation email names the account, the inviter, and the first name of the person. A project invitation also names the project. The system escapes every name before it puts the name in the email. | P1 | LPD-98505 | `SVC-ACCOUNTINVITATIONEMAILSERVICE` |
| REQ-ACCOUNTS-037 | The accept link works without sign in, so the token is the only proof. The answer is invalid for a missing, malformed, or unknown token, accepted for a used token, and expired after the expiration date. | P0 | LPD-98505 | `REST-GET-INVITATIONS-ACCEPT`, `CLIENT-SPRING-BOOT-INVITATIONS`, `AUTH-UNAUTHENTICATED` |
| REQ-ACCOUNTS-038 | After acceptance, the system creates the user when no user has the email address. It then adds the user to the account, assigns the invitation roles, and assigns the project role when the project still exists. | P0 | LPD-98505 | `SVC-ACCOUNTINVITATIONACCEPTANCESERVICE`, `REST-POST-OBJECT-ACTION-ACCOUNT-INVITATION-ACCEPTED` |
| REQ-ACCOUNTS-039 | The system provisions only an invitation that is accepted. It checks every invitation role before it changes anything, so an unknown role leaves the user and the account unchanged. | P0 | LPD-98505 | `SVC-ACCOUNTINVITATIONACCEPTANCESERVICE`, `REST-POST-OBJECT-ACTION-ACCOUNT-INVITATION-ACCEPTED` |

## Partner Accounts

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ACCOUNTS-040 | An account is a partner account when at least one product that its contracts entitle has the `partner-product` specification set to true. The account type field does not decide this. | P0 | LPD-95390 | `HOOK-MYACCOUNT-ACCOUNTMEMBERS-USEACCOUNTTYPE` |
| REQ-ACCOUNTS-041 | A standard account offers the Account Administrator, Account Buyer, and Account Member roles. A partner account offers the 6 partner roles. A partner account that also has a project is hybrid and offers all 9 roles. | P1 | LPD-95390 | `HOOK-MYACCOUNT-ACCOUNTMEMBERS-USEACCOUNTTYPE`, `MOD-MYACCOUNT-ACCOUNTMEMBERS-ACCOUNTROLES` |
| REQ-ACCOUNTS-042 | In My Account, a user is an account manager with the Account Administrator or Partner Account Admin role on the current account. An Administrator is also one. | P0 | LPD-95398 | `MOD-MYACCOUNT-ACCOUNTMEMBERS-ACCOUNTROLES`, `CLIENT-MODELS-USERACCOUNTMODEL` |
| REQ-ACCOUNTS-043 | The pages list the account roles of a member once each, in a fixed order. Standard roles come first, then partner roles. | P2 | LPD-95390 | `MOD-MYACCOUNT-ACCOUNTMEMBERS-ACCOUNTROLES` |

## Account Selector and My Account Pages

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ACCOUNTS-050 | A user who holds Account Buyer and not Account Member cannot open the Account Members page, and its tab is hidden. An account manager can always open it. | P1 | LPD-95398 | `MOD-MYACCOUNT-ACCOUNTMEMBERS-ACCOUNTROLES`, `ROUTE-MY-ACCOUNT-ACCOUNT-MEMBERS`, `FLOW-ROLE-ACCOUNT-PERMISSIONS` |
| REQ-ACCOUNTS-051 | The account section of My Account holds the Account Details, Account Members, and Project Members pages under one set of tabs. A link to one of these pages without an account opens it for the current account. | P1 | LPD-88258 | `ROUTE-MY-ACCOUNT-ACCOUNT-DETAILS`, `ROUTE-MY-ACCOUNT-ACCOUNT-MEMBERS`, `ROUTE-MY-ACCOUNT-PROJECT-MEMBERS`, `ROUTE-MY-ACCOUNT-ACCOUNTERC` |
| REQ-ACCOUNTS-052 | The Account Details page shows the Sync to JSM action only to a global administrator. | P2 | LPD-89437 | `HOOK-USEHASADMINPERMISSIONS`, `ROUTE-MY-ACCOUNT-ACCOUNT-DETAILS` |
| REQ-ACCOUNTS-053 | The account selector is hidden for a user who is not signed in or has no current account. It is read only when the user has exactly one account. A search matches account names. | P1 | LPD-88258 | `HOOK-USEACCOUNTS` |
| REQ-ACCOUNTS-054 | A switch in the account selector makes the selected account current and reloads the page. In My Account, the user stays on the same account page. A project page returns to the start of the new account. | P1 | LPD-92498 | `MOD-SETCURRENTACCOUNT`, `HOOK-USEACCOUNTS` |
| REQ-ACCOUNTS-055 | An account with no logo shows a placeholder image. | P2 | — | `MOD-GETACCOUNTIMAGE` |

## Organizations

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ACCOUNTS-060 | Only a global administrator can link an account to an organization or unlink it. Only a global administrator can assign or remove an organization role. | P0 | LPD-89441 | `REST-POST-ORGANIZATIONS-ORGANIZATIONID-ACCOUNTS-ACCOUNTID`, `REST-DELETE-ORGANIZATIONS-ORGANIZATIONID-ACCOUNTS-ACCOUNTID`, `REST-POST-ORGANIZATIONS-ORGANIZATIONID-USER-ACCOUNTS-USERID-ORGANIZATION-ROLES-ORGANIZATIONROLEID`, `REST-DELETE-ORGANIZATIONS-ORGANIZATIONID-USER-ACCOUNTS-USERID-ORGANIZATION-ROLES-ORGANIZATIONROLEID`, `PERM-ADMINPERMISSION` |
| REQ-ACCOUNTS-061 | A link between an account and an organization gives each member of the organization view and update access to the account and its projects. It does not give the right to manage members. | P0 | LPD-89441 | `PERM-ACCOUNTPERMISSION`, `PERM-PROJECTPERMISSION`, `FLOW-ORGANIZATION-SYNC` |
| REQ-ACCOUNTS-062 | A link or an unlink also updates the team assignment of the account in JSM. A JSM failure is logged and does not undo the link. | P1 | LPD-89437 | `REST-POST-ORGANIZATIONS-ORGANIZATIONID-ACCOUNTS-ACCOUNTID`, `REST-DELETE-ORGANIZATIONS-ORGANIZATIONID-ACCOUNTS-ACCOUNTID`, `SYNC-ACCOUNTORGANIZATIONSYNCHRONIZER` |
| REQ-ACCOUNTS-063 | A global administrator can align the members of an organization with its linked Okta group. An organization with no Okta group gives a not found answer. | P0 | LPD-89425 | `REST-POST-ORGANIZATIONS-ORGANIZATIONID-SYNC-FROM-OKTA`, `FLOW-ORGANIZATION-SYNC` |
| REQ-ACCOUNTS-064 | The Okta group alignment adds each group member that has a Liferay user, and removes each organization member that is not in the group. It compares email addresses with no regard to case. It skips a group member with no Liferay user. | P0 | LPD-89425 | `REST-POST-ORGANIZATIONS-ORGANIZATIONID-SYNC-FROM-OKTA`, `SVC-ORGANIZATIONSERVICE` |
| REQ-ACCOUNTS-065 | When a user leaves an organization, the system also removes the organization role assignments of the user in JSM. | P1 | LPD-89437 | `SVC-USERASSIGNMENTSERVICE`, `SVC-ORGANIZATIONSERVICE`, `SYNC-ORGANIZATIONUSERACCOUNTROLESYNCHRONIZER` |
| REQ-ACCOUNTS-066 | An organization role change updates the role assignment in JSM. A JSM failure is logged and does not undo the role change. | P1 | LPD-89437 | `SVC-ROLESERVICE`, `SVC-USERASSIGNMENTSERVICE`, `SYNC-ORGANIZATIONUSERACCOUNTROLESYNCHRONIZER`, `CONV-JIRAORGANIZATIONCONVERTER` |

## Users and Contacts

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ACCOUNTS-070 | An email address can be a contact unless it uses a reserved Liferay domain and no Okta user has it. | P1 | LPD-103504 | `REST-GET-CONTACTS-CONTACTEMAILADDRESS-VALIDATE`, `SVC-EMAILADDRESSVALIDATORSERVICE` |
| REQ-ACCOUNTS-071 | A global administrator can sync one user with Okta. The system then adds the user to each organization whose linked Okta group holds the user. It removes the user from each other organization that has a linked Okta group. | P0 | LPD-89425 | `REST-POST-USER-ACCOUNTS-USERID-SYNC-WITH-OKTA`, `SVC-USERASSIGNMENTSERVICE` |
| REQ-ACCOUNTS-072 | When Salesforce sends the contacts of a project, the system skips a contact with no email address or with a reserved Liferay domain. It creates the user when no user has the email address. | P0 | LPD-89686 | `SVC-PROVISIONINGCONTACTSERVICE` |
| REQ-ACCOUNTS-073 | The first contact that joins an account with no users becomes the Account Administrator. This does not apply when the contact list names an Account Administrator. | P0 | LPD-89686 | `SVC-PROVISIONINGCONTACTSERVICE` |
| REQ-ACCOUNTS-074 | Each new contact gets the account role that Salesforce names and the Project User role on the project. An unknown role gives a warning, and the contact still joins. A failure on one contact does not stop the others. | P1 | LPD-89686 | `SVC-PROVISIONINGCONTACTSERVICE` |
| REQ-ACCOUNTS-075 | When a user is deleted, the system deletes the contact and the role assignments of the user in JSM. | P1 | LPD-89437 | `REST-POST-OBJECT-ACTION-USER-DELETE`, `SYNC-USERACCOUNTSYNCHRONIZER` |

## JSM Sync

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ACCOUNTS-080 | When Liferay creates or updates an account, an organization, or a user, the system syncs it to JSM. | P0 | LPD-89437 | `REST-POST-OBJECT-ACTION-ACCOUNT-CREATE`, `REST-POST-OBJECT-ACTION-ACCOUNT-UPDATE`, `REST-POST-OBJECT-ACTION-ORGANIZATION-CREATE`, `REST-POST-OBJECT-ACTION-ORGANIZATION-UPDATE`, `REST-POST-OBJECT-ACTION-USER-CREATE`, `REST-POST-OBJECT-ACTION-USER-UPDATE`, `FLOW-ACCOUNT-PROVISIONING` |
| REQ-ACCOUNTS-081 | When Liferay deletes an account or an organization, the system first removes its role and team assignments in JSM, and then deletes its JSM asset. A failed assignment removal is logged and does not stop the delete. | P0 | LPD-89437 | `REST-POST-OBJECT-ACTION-ACCOUNT-DELETE`, `REST-POST-OBJECT-ACTION-ORGANIZATION-DELETE`, `SYNC-ACCOUNTSYNCHRONIZER`, `SYNC-ORGANIZATIONSYNCHRONIZER` |
| REQ-ACCOUNTS-082 | When the account of a create or update event no longer exists, the system logs the event and changes nothing. | P1 | LPD-89437 | `REST-POST-OBJECT-ACTION-ACCOUNT-CREATE`, `REST-POST-OBJECT-ACTION-ACCOUNT-UPDATE` |
| REQ-ACCOUNTS-083 | Only a global administrator can push an account, an organization, or a user to JSM on request. | P0 | LPD-89437 | `REST-POST-ACCOUNTS-EXTERNALREFERENCECODE-SYNC-TO-JSM`, `REST-POST-ORGANIZATIONS-ORGANIZATIONID-SYNC-TO-JSM`, `REST-POST-USER-ACCOUNTS-USERID-SYNC-TO-JSM`, `PERM-ADMINPERMISSION` |
| REQ-ACCOUNTS-084 | When the sync cannot read a source value, it leaves the matching JSM value unchanged. It never writes an empty list in place of a value that it could not read. | P0 | LPD-102860 | `SYNC-ACCOUNTSYNCMODEL`, `SYNC-USERACCOUNTSYNCMODEL`, `SYNC-ORGANIZATIONSYNCMODEL`, `SYNC-ACCOUNTSYNCHRONIZER`, `SYNC-USERACCOUNTSYNCHRONIZER` |
| REQ-ACCOUNTS-085 | A user with one of the 5 employee roles is a worker on the account in JSM. The employee roles are Customer Experience Manager, Liferay Sales, Primary Contact, Secondary Contact, and Solution Architect. Every other user is a customer. | P0 | LPD-89437 | `SYNC-ACCOUNTSYNCMODEL`, `CLS-EMPLOYEEROLES`, `SYNC-USERACCOUNTBUCKET` |
| REQ-ACCOUNTS-086 | The sync removes a JSM role or team assignment that Liferay no longer has. It keeps an assignment that an account role or a project membership still grants. It keeps an assignment that changed after the sync started. | P0 | LPD-101045, LPD-107180, LPD-102712 | `SYNC-ACCOUNTUSERACCOUNTROLESYNCHRONIZER`, `SYNC-ACCOUNTORGANIZATIONSYNCHRONIZER`, `SYNC-ORGANIZATIONUSERACCOUNTROLESYNCHRONIZER` |
| REQ-ACCOUNTS-087 | One failed project, user, role, or organization step is logged, and the sync continues with the next one. | P1 | LPD-89437 | `SYNC-ACCOUNTSYNCHRONIZER`, `SYNC-ACCOUNTUSERACCOUNTSYNCHRONIZER`, `SYNC-ORGANIZATIONUSERACCOUNTSYNCHRONIZER`, `SYNC-ORGANIZATIONSYNCHRONIZER`, `SYNC-USERACCOUNTSYNCHRONIZER` |
| REQ-ACCOUNTS-088 | Two syncs never write the same JSM asset at the same time. The system holds a lock for each account, organization, and user key while it writes. | P1 | LPD-90495 | `SYNC-ACCOUNTSYNCHRONIZER`, `SYNC-ORGANIZATIONSYNCHRONIZER`, `SYNC-USERACCOUNTSYNCHRONIZER`, `SVC-JIRAASSETSERVICE` |
| REQ-ACCOUNTS-089 | A change to an account membership, an account role, or an organization membership in Liferay updates JSM at once. A JSM failure is logged and does not undo the change in Liferay. | P1 | LPD-89437 | `SVC-USERASSIGNMENTSERVICE`, `SYNC-ACCOUNTUSERACCOUNTSYNCHRONIZER`, `SYNC-ORGANIZATIONUSERACCOUNTSYNCHRONIZER` |

## JSM Role Catalog and Cleanup

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ACCOUNTS-090 | Each Sunday at midnight, and when the service starts, the system copies every account role and organization role to JSM as a contact role. One failed role is logged, and the copy continues. | P1 | LPD-88258 | `CRON-SYNCACCOUNTROLES`, `CRON-SYNCORGANIZATIONROLES`, `SYNC-ACCOUNTROLESYNCHRONIZER`, `SYNC-ORGANIZATIONROLESYNCHRONIZER`, `LSN-ACCOUNTROLESYNCHRONIZER-ONAPPLICATIONREADY`, `LSN-ORGANIZATIONROLESYNCHRONIZER-ONAPPLICATIONREADY` |
| REQ-ACCOUNTS-091 | Each hour, and when the service starts, the system makes sure that the first line support team role exists in JSM. It creates the role once when it is missing. A global administrator can start this check on request. | P1 | — | `CRON-SYNCTEAMROLES`, `SYNC-TEAMROLESYNCHRONIZER`, `LSN-TEAMROLESYNCHRONIZER-ONAPPLICATIONREADY`, `REST-POST-ADMIN-JIRA-TEAM-ROLES-SYNC` |
| REQ-ACCOUNTS-092 | Each day at 02:00, the system removes each JSM assignment whose account, project, team, contact, or role no longer exists. Only one cleanup runs at a time. | P1 | LPD-89437 | `CRON-RECONCILEORPHANEDASSIGNMENTS`, `SYNC-ORPHANEDASSIGNMENTRECONCILER` |
| REQ-ACCOUNTS-093 | The JSM account asset holds the name, description, code, tier, contact information, website, status, and dates of the account. The status is Active only for an active account, and Closed otherwise. | P1 | LPD-89437 | `CONV-ACCOUNTCONVERTER`, `CONV-POSTALADDRESSCONVERTER`, `CLS-JIRAASSETOBJECT` |
| REQ-ACCOUNTS-094 | An organization is a team in JSM, and a user is a contact. Each role assignment is a separate JSM asset that links a role, a contact, and an account, a project, or a team. | P1 | LPD-89437 | `CONV-TEAMCONVERTER`, `CONV-CONTACTCONVERTER`, `CONV-CONTACTROLECONVERTER`, `CONV-TEAMROLECONVERTER`, `CONV-ACCOUNTCONTACTROLEASSIGNMENTCONVERTER`, `CONV-ACCOUNTTEAMROLEASSIGNMENTCONVERTER`, `CONV-TEAMCONTACTROLEASSIGNMENTCONVERTER` |
| REQ-ACCOUNTS-095 | The JSM contact of a user holds the phone numbers of the user. It also holds the active entitlements of the user's accounts and the links to other systems. A phone number is Mobile when its type says mobile, and Other otherwise. | P2 | LPD-89437 | `SYNC-USERACCOUNTSYNCMODEL`, `CONV-PHONECONVERTER`, `CONV-ENTITLEMENTCONVERTER`, `CONV-EXTERNALLINKCONVERTER` |

## Not Yet Built

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ACCOUNTS-100 | Only an account manager can edit the account details. The Account Details page has no edit action yet. | P1 | LPD-95398 | `FLOW-ROLE-ACCOUNT-PERMISSIONS` |
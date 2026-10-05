# Jira Integration

This file is the contract between Liferay One and Jira. It states what Liferay One sends to Jira Service Management (JSM) and to JSM Assets, what it expects back, and which names on the Jira side it depends on. A change on either side that breaks a row here breaks the support tickets, the ticket attachments, the business events, or the JSM sync. The feature rules are in `support.md` (SUPPORT) and `accounts-and-organizations.md` (ACCOUNTS). This file does not repeat them.

The systems are the `liferay-one-etc-spring-boot` service, the Jira Cloud REST API, and the JSM Assets REST API. The actors are the Jira service account of Liferay One, the scheduled jobs of the service, and the Liferay support team.

Terms used in this file:

- **Jira site**: the Jira Cloud site in `liferay.one.jira.url`. The service reads and writes issues and comments there.
- **Assets API**: the JSM Assets REST API at `https://api.atlassian.com/jsm/assets/workspace/<workspace ID>/v1`. `liferay.one.jira.workspace.id` gives the workspace ID.
- **Asset schema**: the set of object types in JSM Assets. The sync schema has the name in `liferay.one.jira.asset.schema.name`. The business event schema has the fixed name Business Events.
- **External key**: the attribute that links an asset object to its Liferay record. For most object types it is the External Key attribute.
- **AQL**: the Assets query language. The service uses it to find asset objects.
- **JQL**: the Jira query language. The service uses it to find issues.
- **ERC**: the external reference code of a Liferay record.

## Connection and Authentication

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-JIRA-001 | The service calls the Jira REST API version 3 on the Jira site for issues and comments. It calls the Assets API for asset objects. | P0 | LPD-90495 | `SVC-JIRAISSUESERVICE`, `CLS-JIRAASSETPERSISTENCE` |
| TECH-JIRA-002 | Every Jira call and every Assets call uses HTTP Basic authentication with one service account. The email address comes from `liferay.one.jira.api.email.address` and the API token from `liferay.one.jira.api.token`. The service never sends the token of a user to Jira. TECH-SUPPORT-074 records the rule for business events. | P0 | LPD-90495 | `CLS-BASEJIRASERVICE` |

## Support Issues

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-JIRA-010 | To list the tickets of a project, the service sends a JQL search to `/rest/api/3/search/jql`. The query selects the issues whose Organization field refers to the asset object with the External Key of the project ERC. It asks for the key, labels, status, and summary fields only. | P1 | LPD-90459 | `SVC-JIRAISSUESERVICE`, `REST-GET-JIRA-PROJECTS-EXTERNALREFERENCECODE-TICKETS` |
| TECH-JIRA-011 | The ticket query leaves out the statuses Closed, Closed (FLS), Solved (FLS), Inactive, Solution Accepted, and Solution Proposed. It keeps only the issues whose request type field is General Request. `liferay.one.jira.issue.support.hc.field.request.type` names that field. A rename of one of these values in Jira changes the list and gives no error. | P1 | LPD-90459 | `SVC-JIRAISSUESERVICE` |
| TECH-JIRA-012 | A search asks for 100 issues on each page. It follows the `nextPageToken` value until Jira returns none. When a page fails, the search logs a warning and returns the issues that it already has. | P1 | LPD-90495 | `SVC-JIRAISSUESERVICE` |
| TECH-JIRA-013 | The service reads one ticket from `/rest/api/3/issue/<key>`. It takes the first value of the organization field in `liferay.one.jira.issue.support.hc.field.organization`, and reads that asset object. The External Key of that object is the project ERC of the ticket. TECH-SUPPORT-012 records the rule. | P0 | LPD-90456 | `SVC-JIRAISSUESERVICE`, `CONV-JIRAORGANIZATIONCONVERTER`, `REST-GET-TICKETS-TICKETID-TICKET-ATTACHMENTS-UPLOAD-ACCESS-CHECK` |
| TECH-JIRA-014 | A ticket with no organization value, or with an organization object that the service cannot read, gives a Jira organization error. Every other failed read gives no ticket. The caller then reports an invalid ticket number, also when Jira is not available. | P1 | LPD-90456 | `SVC-JIRAISSUESERVICE`, `HOOK-TICKETATTACHMENTS-USECHECKATTACHMENTACCESS` |
| TECH-JIRA-015 | The service treats a ticket as closed only when Jira returns the exact status name Closed, Closed (FLS), or Solution Accepted. TECH-SUPPORT-005 states the rule. A ticket link uses `liferay.one.jira.project.support.fls.url` when the key starts with the project key in `liferay.one.jira.project.support.fls`, and `liferay.one.jira.project.support.hc.url` for every other key. | P1 | LPD-90456 | `CLS-JIRASUPPORTISSUE`, `SVC-JIRAISSUESERVICE` |

## Comments and Created Issues

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-JIRA-020 | When a ticket attachment completes, the service posts one comment to `/rest/api/3/issue/<key>/comment`. The body is in the Atlassian Document Format. It links to the attachment page on the Liferay One portal. | P1 | LPD-90456 | `REST-POST-TICKET-ATTACHMENTS-TICKETATTACHMENTID-COMPLETE-UPLOAD`, `CLS-JIRADOCUMENTUTIL`, `FLOW-TICKET-UPLOAD` |
| TECH-JIRA-021 | When Jira refuses the comment or does not answer, the service stores the complete comment body on the attachment record. It answers with status 202 and the code `COMMENT_POST_FAILED_RETRYING`. TECH-SUPPORT-028 states the retry rule for the user. | P1 | LPD-90456 | `REST-POST-TICKET-ATTACHMENTS-TICKETATTACHMENTID-COMPLETE-UPLOAD`, `CRON-SCHEDULEDUPDATETICKETATTACHMENTDRAFTCOMMENTBODY` |
| TECH-JIRA-022 | Each hour, the retry job posts at most 500 stored comments. It clears each stored comment after Jira accepts it. When Jira accepts a comment but the clear fails, the next run posts the same comment again. | P2 | LPD-90456 | `CRON-SCHEDULEDUPDATETICKETATTACHMENTDRAFTCOMMENTBODY` |
| TECH-JIRA-023 | For a provisioning error or an invoiced opportunity, the service creates an issue with `/rest/api/3/issue` in the Help Center project. `liferay.one.jira.issue.provisioning.id` gives the issue type, and `liferay.one.jira.request.provisioning.id` gives the request type. TECH-PROVISIONING-099 and TECH-SALES-008 state when. | P1 | LPD-89686 | `SVC-PROVISIONINGISSUESERVICE` |
| TECH-JIRA-024 | A created issue sets the organization and offering fields to asset references in the form `<workspace ID>:<object ID>`. The object IDs come from `liferay.one.jira.organization.provisioning.id` and `liferay.one.jira.issue.provisioning.offering.id`. An error issue carries the labels `auto-generated` and `provisioning-error`. Its description holds the full message payload and the stack trace. | P1 | LPD-89686 | `SVC-PROVISIONINGISSUESERVICE` |

## Asset Schema and Cache

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-JIRA-030 | The sync schema holds the object types Account, Team, Contact, Contact Role, Team Role, Account Contact Role Assignment, Account Team Role Assignment, Team Contact Role Assignment, Entitlement, External Link, Phone, and Postal Address. The Business Events schema holds Business Event, Business Event Version, and Product Version. The service finds each type by its exact name. | P0 | LPD-90495 | `CLS-JIRAASSETSCHEMALOADER`, `CLS-BASEJIRAASSETOBJECTCONVERTER` |
| TECH-JIRA-031 | The service reads the schema list from `objectschema/list`, 100 schemas at a time, until Jira sets `isLast`. It reads the types and the attributes of a schema from the Assets API. A missing schema, a missing type, or an empty answer stops the request with an error. TECH-SUPPORT-071 records the rule. | P0 | LPD-90495 | `CLS-JIRAASSETSCHEMALOADER`, `CLS-JIRAASSETPERSISTENCE` |
| TECH-JIRA-032 | The service maps each attribute name to its attribute ID at run time. When the schema does not have a name that the service uses, the service logs an error and drops that value. The write still sends the other attributes, so a renamed attribute stops its value with no failed request. | P0 | LPD-90495 | `CLS-JIRAASSETOBJECT` |
| TECH-JIRA-033 | The service reads the choices of a select attribute from the comma separated `options` text of the schema. It drops a value that is not a choice and logs a warning. A choice must not contain a comma. TECH-SUPPORT-070 records the rule. | P1 | LPD-90495 | `CLS-JIRAASSETSCHEMALOADER`, `CLS-JIRAASSETOBJECT` |
| TECH-JIRA-034 | The service keeps the type IDs, the attribute IDs, the attribute choices, the business event field choices, and the product versions in memory. Each cache holds at most 1,000 entries. A job clears all five caches each day at midnight, so a schema change in Jira takes effect after the next midnight or a restart. | P1 | LPD-90495 | `CRON-SCHEDULEDASSETOBJECTSCACHEEVICTION`, `SVC-JIRABUSINESSEVENTSERVICE` |

## Asset Object Operations

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-JIRA-040 | The service searches with AQL through `object/aql`, 100 objects on each page, until Jira sets `last` or returns an empty page. Each query starts with the schema name and the type name. | P1 | LPD-90495 | `CLS-JIRAASSETPERSISTENCE`, `CLS-AQLUTIL` |
| TECH-JIRA-041 | The AQL builder puts each text value in double quotes, and escapes each backslash and double quote in it. It writes an object ID and a boolean value with no quotes. The business event history passes an event ID only after the service confirms that the ID is a number. | P0 | LPD-90495 | `CLS-AQLUTIL`, `SVC-JIRABUSINESSEVENTSERVICE` |
| TECH-JIRA-042 | The service creates an object with `object/create`, and reads, updates, and deletes it with `object/<id>`. A write body holds the `objectTypeId` and an `attributes` list. Each attribute has an `objectTypeAttributeId` and a list of `objectAttributeValues`. | P1 | LPD-90495 | `CLS-JIRAASSETPERSISTENCE`, `CLS-JIRAASSETOBJECT` |
| TECH-JIRA-043 | An upsert finds the object by its external key. It creates the object when none exists, and it updates the first match otherwise. When two objects share an external key, the service uses the first one and logs a warning. TECH-SUPPORT-072 records the rule. | P0 | LPD-89437 | `SVC-JIRAASSETSERVICE` |
| TECH-JIRA-044 | The service finds referenced objects by external key, with at most 50 keys in each AQL query. It creates a missing team, contact, external link, or postal address before it links to it. | P1 | LPD-99654 | `SVC-JIRAASSETSERVICE`, `SYNC-ACCOUNTSYNCHRONIZER` |
| TECH-JIRA-045 | The service holds a lock for each type and external key while it reads and writes the object. The lock is in the memory of one service instance. TECH-ACCOUNTS-088 records the rule. | P1 | LPD-98505 | `CLS-KEYEDLOCK`, `SVC-JIRAASSETSERVICE` |
| TECH-JIRA-046 | The role job skips an update when the External Updated At value in Jira equals the new value. An assignment write skips an object whose External Updated At value is on or after the start of the sync. The service compares both values as text, so Jira must return the value exactly as the service wrote it. | P0 | LPD-89437 | `SVC-JIRAASSETSERVICE`, `SYNC-ACCOUNTROLESYNCHRONIZER`, `SYNC-ACCOUNTUSERACCOUNTROLESYNCHRONIZER` |
| TECH-JIRA-047 | The service does not remove a role assignment object. It sets Deleted to true and sets a new External Updated At value. It removes accounts, teams, contacts, and business events with a delete. JSM has no batch update, so the service updates each assignment alone. | P1 | LPD-100046 | `SVC-JIRAASSETSERVICE`, `SYNC-ACCOUNTORGANIZATIONSYNCHRONIZER`, `SYNC-ORGANIZATIONSYNCHRONIZER` |
| TECH-JIRA-048 | Only a delete tries again. It tries 3 more times after a server error, a 429 response, or a connection error, and waits from 500 milliseconds to 2 seconds before each try. A 404 response counts as success. A create, an update, or a search does not try again. | P1 | LPD-100046 | `CLS-JIRAASSETPERSISTENCE` |
| TECH-JIRA-049 | When a create or an update fails, the service logs the Jira error and the full request body, and then throws. The body can hold names, email addresses, and phone numbers. | P1 | LPD-90495 | `CLS-JIRAASSETPERSISTENCE` |

## Asset Data Mapping

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-JIRA-050 | An Account object has the External Key of the account ERC. A project is also an Account object, with the External Key of the project ERC. The Organization field of a ticket and the Account attribute of a business event refer to the Account object of the project. | P0 | LPD-89437 | `CONV-ACCOUNTCONVERTER`, `SYNC-ACCOUNTSYNCHRONIZER`, `CONV-JIRAORGANIZATIONCONVERTER` |
| TECH-JIRA-051 | A Team object has the External Key of the organization ERC. A Contact has the user ERC, a Contact Role has the role ERC, and an External Link has the property ERC. The Team Role for First Line Support has the fixed External Key KOR-594575. | P0 | LPD-89437 | `CONV-TEAMCONVERTER`, `CONV-CONTACTCONVERTER`, `CONV-CONTACTROLECONVERTER`, `CONV-EXTERNALLINKCONVERTER`, `CONV-TEAMROLECONVERTER` |
| TECH-JIRA-052 | Three types use another attribute as the key. An Entitlement uses Name, which is the display name of the entitlement definition. A Phone uses Number, and a Postal Address uses ID, which is the Liferay address ID. A new display name or number makes a new object, and the old object stays. | P1 | LPD-89437 | `CONV-ENTITLEMENTCONVERTER`, `CONV-PHONECONVERTER`, `CONV-POSTALADDRESSCONVERTER` |
| TECH-JIRA-053 | A role assignment object uses Name as its key, in the form `<role key>;<contact or team key>;<account or team key>`. It also stores each of the 3 keys in its own attribute. A Liferay ERC must not contain a semicolon. | P0 | LPD-89437 | `CONV-ACCOUNTCONTACTROLEASSIGNMENTCONVERTER`, `CONV-ACCOUNTTEAMROLEASSIGNMENTCONVERTER`, `CONV-TEAMCONTACTROLEASSIGNMENTCONVERTER` |
| TECH-JIRA-054 | The Type attribute of a Contact Role must offer Team, Account Worker, and Account Customer. An organization role is Team. One of the 5 employee roles is Account Worker. Every other role is Account Customer. | P1 | LPD-88258 | `CONV-CONTACTROLECONVERTER`, `CLS-EMPLOYEEROLES` |
| TECH-JIRA-055 | The service writes External Created At and External Updated At as UTC text in the form `yyyy-MM-dd'T'HH:mm:ss` plus the offset. A null value leaves the attribute out of the write, so Jira keeps its value. An empty list sends no values, so Jira clears the attribute. TECH-ACCOUNTS-084 depends on this difference. | P0 | LPD-102860 | `CLS-BASEJIRAASSETOBJECTCONVERTER`, `CLS-JIRAASSETOBJECT`, `SYNC-ACCOUNTSYNCMODEL` |
| TECH-JIRA-056 | A business event update does not send the Account or the Author attribute. Current Version and New Version refer to Product Version objects. The service never writes a Business Event Version object. It reads the history from the versions whose Business Event attribute is the event, by Updated, newest first. | P1 | LPD-90459 | `CONV-JIRABUSINESSEVENTCONVERTER`, `CONV-JIRABUSINESSEVENTVERSIONCONVERTER`, `SVC-JIRABUSINESSEVENTSERVICE` |

## Scheduled Jobs

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-JIRA-060 | The role jobs run on `liferay.one.jira.account.role.sync.cron` and `liferay.one.jira.organization.role.sync.cron`, each Sunday at midnight. The team role job runs on `liferay.one.jira.team.role.sync.cron`, each hour. The cleanup of assignments runs on `liferay.one.jira.orphaned.assignment.reconcile.cron`, each day at 02:00. TECH-ACCOUNTS-090 to TECH-ACCOUNTS-092 state what they do. | P1 | LPD-88258 | `CRON-SYNCACCOUNTROLES`, `CRON-SYNCORGANIZATIONROLES`, `CRON-SYNCTEAMROLES`, `CRON-RECONCILEORPHANEDASSIGNMENTS` |
| TECH-JIRA-061 | The role jobs, the team role job, and the cleanup of assignments also run once when the service starts. A Jira failure at start is logged and does not stop the service. | P1 | LPD-99486 | `LSN-ACCOUNTROLESYNCHRONIZER-ONAPPLICATIONREADY`, `LSN-ORGANIZATIONROLESYNCHRONIZER-ONAPPLICATIONREADY`, `LSN-TEAMROLESYNCHRONIZER-ONAPPLICATIONREADY`, `LSN-ORPHANEDASSIGNMENTRECONCILER-ONAPPLICATIONREADY` |
| TECH-JIRA-062 | The cleanup of assignments depends on JSM. When JSM deletes an object, it must clear each reference to that object. The job looks for live assignments with an empty reference, and marks as deleted those whose Liferay record is gone. | P1 | LPD-100047 | `SYNC-ORPHANEDASSIGNMENTRECONCILER`, `CRON-RECONCILEORPHANEDASSIGNMENTS` |
| TECH-JIRA-063 | The retention job runs at 00:00 and 12:00. It searches both support projects for issues in a closed status that changed to that status between 8 and 7 days before the run. It asks for the key field only. TECH-SUPPORT-040 states what it deletes. | P0 | LPD-90456 | `CRON-SCHEDULEDCLEANUP`, `FLOW-TICKET-ATTACHMENT-RETENTION` |

## Not Yet Built

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-JIRA-090 | The service escapes the project ERC and each ticket key before it puts them in a JQL query or a REST path. Today it puts both into the query and the path unchanged. | P0 | — | `SVC-JIRAISSUESERVICE` |
| TECH-JIRA-091 | Each Jira call and each Assets call stops after a fixed time limit. Today the service sets no response timeout, so a slow Jira holds the sync lock with no limit. | P1 | — | — |
| TECH-JIRA-092 | When a retention search fails, the job fails the run. Today the search returns an empty or partial list. The window is one day, so 2 failed runs in a row leave those attachments in storage. | P0 | — | `CRON-SCHEDULEDCLEANUP` |
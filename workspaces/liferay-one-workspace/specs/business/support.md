# Support

This area covers how a customer gets help from Liferay support through Liferay One. It includes the support tickets of a project, the large file attachments that a user adds to a ticket, the retention of those files, the business events that a project plans with support, the Jira asset objects that store business events, and the help and support tab of a project product. The sync of accounts, users, organizations, and roles to Jira Service Management belongs to the ACCOUNTS area, in `accounts-and-organizations.md`.

The actors are a project member, the project administrator, the project requester, the account administrator, Liferay Staff, the global Administrator and Provisioning Member roles, and the Liferay support team.

Terms used in this file:

- **Ticket**: an issue in the Help Center or First Line Support project of Jira Service Management. A ticket belongs to the support organization of one project.
- **Closed ticket**: a ticket with the status Closed, Closed (FLS), or Solution Accepted.
- **Ticket attachment**: a large file that a user adds to a ticket through Liferay One instead of through Jira. The file is in Google Cloud Storage, and a ticket attachment record tracks it.
- **Draft comment**: the Jira comment for a ticket attachment that the system could not post. The system keeps it and tries again.
- **Business event**: a planned change for a project, for example an upgrade or a go live date. The system stores each business event as an asset object in Jira Assets.
- **Asset object**: one record in Jira Assets, with attributes that the Jira schema defines.

## Support Tickets

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-SUPPORT-001 | A user can see the tickets of a project only when the user can view the project. | P0 | LPD-90459 | `REST-GET-JIRA-PROJECTS-EXTERNALREFERENCECODE-TICKETS`, `CLIENT-SPRING-BOOT-JIRA` |
| REQ-SUPPORT-002 | The ticket list of a project shows the open general requests of the support organization of that project. The list leaves out solved tickets and closed tickets. | P1 | LPD-90459 | `REST-GET-JIRA-PROJECTS-EXTERNALREFERENCECODE-TICKETS`, `SVC-JIRAISSUESERVICE`, `CLIENT-SPRING-BOOT-JIRA` |
| REQ-SUPPORT-003 | A request for the ticket list can also name the tickets that a business event refers to. The list then includes those tickets. When the request fails, the business event shows no tickets. | P1 | LPD-90459 | `REST-GET-JIRA-PROJECTS-EXTERNALREFERENCECODE-TICKETS`, `HOOK-BUSINESSEVENTS-USEPROJECTTICKETS`, `MOD-BUSINESSEVENTS-PARSEASSOCIATEDTICKETS` |
| REQ-SUPPORT-004 | Each ticket links to the support portal of its Jira project. A First Line Support ticket opens in the First Line Support portal. Every other ticket opens in the Help Center portal. | P2 | — | `HOOK-USEJIRATICKETURL`, `SVC-JIRAISSUESERVICE`, `CLS-JIRASUPPORTISSUE` |
| REQ-SUPPORT-005 | The system treats a ticket as closed only when its status is Closed, Closed (FLS), or Solution Accepted. A solved ticket that is not in one of these statuses is not closed. | P1 | LPD-90456 | `CLS-JIRASUPPORTISSUE` |
| REQ-SUPPORT-006 | The support region and the support language of an account follow the Liferay entity that sells to the account. An account with no selling entity gets the Global region and English. | P1 | — | `CLS-SUPPORTREGIONUTIL`, `CLS-SUPPORTLANGUAGEUTIL` |
| REQ-SUPPORT-007 | Liferay Brazil gives Portuguese support in Brazil and Spanish support in other countries. Liferay China gives Chinese support in China and English support in other countries. Liferay Japan gives Japanese support. Liferay Spain gives Spanish support, except in Cyprus, Greece, Italy, and Portugal, where it gives English support. | P1 | — | `CLS-SUPPORTLANGUAGEUTIL` |
| REQ-SUPPORT-008 | Liferay Spain routes the accounts in Cyprus, Greece, and Italy to the Hungary support region. It routes all of its other accounts to the Spain region. | P1 | — | `CLS-SUPPORTREGIONUTIL` |

## Ticket Attachment Access

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-SUPPORT-010 | To upload, complete, or delete a ticket attachment, a user must be able to update the project that owns the ticket. A user with the Provisioning Member role can do this for every ticket. | P0 | LPD-95398 | `REST-GET-TICKETS-TICKETID-TICKET-ATTACHMENTS-UPLOAD-ACCESS-CHECK`, `REST-POST-TICKET-ATTACHMENTS-INITIATE-UPLOAD`, `REST-POST-TICKET-ATTACHMENTS-TICKETATTACHMENTID-COMPLETE-UPLOAD`, `REST-DELETE-TICKET-ATTACHMENTS-TICKETATTACHMENTID`, `FLOW-ROLE-PROJECT-PERMISSIONS` |
| REQ-SUPPORT-011 | To download a ticket attachment, a user must be able to view the project that owns the ticket. A user with the Provisioning Member role can download the attachments of every ticket. | P0 | LPD-95398 | `REST-GET-TICKETS-TICKETID-TICKET-ATTACHMENTS-DOWNLOAD-ACCESS-CHECK`, `REST-GET-TICKET-ATTACHMENTS-BY-ID-ID-DOWNLOAD`, `REST-GET-TICKET-ATTACHMENTS-BY-EXTERNAL-REFERENCE-CODE-EXTERNALREFERENCECODE-DOWNLOAD`, `FLOW-TICKET-DOWNLOAD` |
| REQ-SUPPORT-012 | The system finds the project of a ticket through the support organization of the ticket in Jira. When the ticket does not exist, the system refuses the request and reports an invalid ticket number. | P0 | LPD-90456 | `SVC-JIRAISSUESERVICE`, `REST-GET-TICKETS-TICKETID-TICKET-ATTACHMENTS-UPLOAD-ACCESS-CHECK`, `REST-GET-TICKETS-TICKETID-TICKET-ATTACHMENTS-DOWNLOAD-ACCESS-CHECK`, `HOOK-TICKETATTACHMENTS-USECHECKATTACHMENTACCESS` |
| REQ-SUPPORT-013 | A user cannot add a file to a closed ticket. A user can still download the files of a closed ticket until the system deletes them. | P1 | LPD-90456 | `REST-GET-TICKETS-TICKETID-TICKET-ATTACHMENTS-UPLOAD-ACCESS-CHECK`, `REST-GET-TICKETS-TICKETID-TICKET-ATTACHMENTS-DOWNLOAD-ACCESS-CHECK`, `REST-POST-TICKET-ATTACHMENTS-INITIATE-UPLOAD` |
| REQ-SUPPORT-014 | The attachment page checks access before it shows the uploader or the downloader. An upload page without a ticket number shows an invalid ticket number. A download link to an attachment that does not exist shows an invalid attachment. | P1 | LPD-90456 | `HOOK-TICKETATTACHMENTS-USECHECKATTACHMENTACCESS`, `ROUTE-TICKET-ATTACHMENTS-NEW`, `ROUTE-TICKET-ATTACHMENTS-NEW-TICKETID`, `ROUTE-TICKET-ATTACHMENTS-TICKETID`, `ROUTE-TICKET-ATTACHMENTS-ID-TICKETATTACHMENTID`, `ROUTE-TICKET-ATTACHMENTS-ERC-TICKETATTACHMENTERC` |
| REQ-SUPPORT-015 | Each failure has a stated reason that the page can show: forbidden access, invalid ticket number, closed ticket, attachment not found, file not found in storage, file server unavailable, Jira organization error, or unexpected error. | P2 | LPD-90456 | `HOOK-TICKETATTACHMENTS-USECHECKATTACHMENTACCESS`, `REST-GET-TICKET-ATTACHMENTS-BY-ID-ID-DOWNLOAD` |
| REQ-SUPPORT-016 | Before an upload starts, the user must confirm that the file contains no personal data. Liferay support can then read the file from any support location. | P0 | LPD-90456 | `FLOW-TICKET-UPLOAD` |

## Ticket Attachment Upload

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-SUPPORT-020 | An upload starts as a draft attachment for one ticket and one project. The file goes straight from the browser to Google Cloud Storage, and does not pass through Liferay One. | P1 | LPD-90456 | `REST-POST-TICKET-ATTACHMENTS-INITIATE-UPLOAD`, `SVC-GOOGLECLOUDSTORAGESERVICE`, `SVC-TICKETATTACHMENTSERVICE`, `FLOW-TICKET-UPLOAD` |
| REQ-SUPPORT-021 | The system identifies a file by its name, its ticket, and its MD5 checksum. A second upload of the same file resumes the draft attachment and does not create a new one. | P1 | LPD-90456 | `REST-POST-TICKET-ATTACHMENTS-INITIATE-UPLOAD`, `SVC-TICKETATTACHMENTSERVICE`, `HOOK-TICKETATTACHMENTS-USETICKETATTACHMENTSINITIATEUPLOAD`, `MOD-TICKETATTACHMENTS-GENERATEFILEMD5`, `HOOK-TICKETATTACHMENTS-USEGENERATEFILEMD5` |
| REQ-SUPPORT-022 | The system refuses a file that the ticket already has as a completed attachment. The user sees that the attachment already exists. | P1 | LPD-90456 | `REST-POST-TICKET-ATTACHMENTS-INITIATE-UPLOAD`, `HOOK-TICKETATTACHMENTS-USETICKETATTACHMENTSINITIATEUPLOAD`, `HOOK-TICKETATTACHMENTS-USEGCSUPLOADFILE` |
| REQ-SUPPORT-023 | The browser sends a file in parts of 25 MB. An interrupted upload continues from the last byte that storage received. The browser tries a failed part again up to five times, and waits longer before each try. | P1 | LPD-90456 | `HOOK-TICKETATTACHMENTS-USEGCSUPLOADFILE`, `HOOK-TICKETATTACHMENTS-USEGCSGETUPLOADOFFSET` |
| REQ-SUPPORT-024 | A user can cancel an upload. A canceled upload does not complete the attachment, and the browser deletes the draft attachment and its storage session. | P1 | LPD-90456 | `HOOK-TICKETATTACHMENTS-USEGCSUPLOADFILE`, `HOOK-TICKETATTACHMENTS-USETICKETATTACHMENTSDELETE` |
| REQ-SUPPORT-025 | When the upload is complete, the system approves the attachment and posts a comment on the ticket. The comment names the user, quotes the message of the user, and links to the attachment page. | P1 | LPD-90456, LPD-90455 | `REST-POST-TICKET-ATTACHMENTS-TICKETATTACHMENTID-COMPLETE-UPLOAD`, `HOOK-TICKETATTACHMENTS-USETICKETATTACHMENTSCOMPLETEUPLOAD`, `FLOW-TICKET-UPLOAD` |
| REQ-SUPPORT-026 | The comment introduction is in the language of the user: Spanish, Japanese, or Portuguese for users of those languages, and English for all other users. The system turns each web address in the message into a link. | P2 | LPD-90456 | `REST-POST-TICKET-ATTACHMENTS-TICKETATTACHMENTID-COMPLETE-UPLOAD`, `CLS-JIRADOCUMENTUTIL` |
| REQ-SUPPORT-027 | An attachment completes only once. A second completion request for an approved attachment fails. | P1 | LPD-90456 | `REST-POST-TICKET-ATTACHMENTS-TICKETATTACHMENTID-COMPLETE-UPLOAD`, `SVC-TICKETATTACHMENTSERVICE` |
| REQ-SUPPORT-028 | When Jira does not accept the comment, the upload still succeeds. The system keeps the comment as a draft comment, and each hour it tries again to post every draft comment of an approved attachment. A posted draft comment is cleared, so the system does not post it twice. When a retry fails, the system emails the support team. | P1 | LPD-90456 | `REST-POST-TICKET-ATTACHMENTS-TICKETATTACHMENTID-COMPLETE-UPLOAD`, `CRON-SCHEDULEDUPDATETICKETATTACHMENTDRAFTCOMMENTBODY`, `FLOW-TICKET-UPLOAD` |
| REQ-SUPPORT-029 | The system stores each file at a path made of the ticket key, the attachment ID, and the file name, so two files cannot replace each other. The page shows file sizes in bytes, KB, MB, or GB. | P2 | LPD-90456 | `CLS-TICKETATTACHMENT`, `MOD-TICKETATTACHMENTS-FORMATFILESIZE` |

## Ticket Attachment Download and Deletion

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-SUPPORT-030 | A download gives the user a signed storage link that expires after 15 minutes. The link is the only way to read the file. | P0 | LPD-90456 | `SVC-GOOGLECLOUDSTORAGESERVICE`, `REST-GET-TICKET-ATTACHMENTS-BY-ID-ID-DOWNLOAD`, `REST-GET-TICKET-ATTACHMENTS-BY-EXTERNAL-REFERENCE-CODE-EXTERNALREFERENCECODE-DOWNLOAD`, `FLOW-TICKET-DOWNLOAD` |
| REQ-SUPPORT-031 | A user can open an attachment by its ID or by its external reference code. Both ways apply the same access rule. | P1 | LPD-90455 | `REST-GET-TICKET-ATTACHMENTS-BY-ID-ID-DOWNLOAD`, `REST-GET-TICKET-ATTACHMENTS-BY-EXTERNAL-REFERENCE-CODE-EXTERNALREFERENCECODE-DOWNLOAD`, `ROUTE-TICKET-ATTACHMENTS-ID-TICKETATTACHMENTID`, `ROUTE-TICKET-ATTACHMENTS-ERC-TICKETATTACHMENTERC` |
| REQ-SUPPORT-032 | When storage does not have the file, the download reports that the file is not found. When storage is not available, the download reports that the file server is unavailable. | P2 | LPD-90456 | `REST-GET-TICKET-ATTACHMENTS-BY-ID-ID-DOWNLOAD`, `SVC-GOOGLECLOUDSTORAGESERVICE` |
| REQ-SUPPORT-033 | A user who deletes an attachment first moves it to the trash. The system then deletes the file from storage and deletes the record. When the storage delete fails, the request still succeeds and the attachment stays in the trash for a later delete. | P1 | LPD-90456 | `REST-DELETE-TICKET-ATTACHMENTS-TICKETATTACHMENTID`, `HOOK-TICKETATTACHMENTS-USEDELETETICKETATTACHMENT` |

## Ticket Attachment Retention

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-SUPPORT-040 | The system deletes the attachments of a ticket seven days after the ticket closes. It deletes both the file in storage and the record. | P0 | LPD-90456 | `CRON-SCHEDULEDCLEANUP`, `FLOW-TICKET-ATTACHMENT-RETENTION` |
| REQ-SUPPORT-041 | The retention check runs at midnight and at noon. It reads only the Help Center and First Line Support projects, and only tickets that closed between seven and eight days before the run. | P1 | LPD-90456 | `CRON-SCHEDULEDCLEANUP` |
| REQ-SUPPORT-042 | Each hour, the system deletes from storage every attachment in the trash, and then deletes its record. A failure on one attachment does not stop the others, and the system emails the support team about it. The attachment stays in the trash and the next run tries again. | P1 | LPD-90456 | `CRON-SCHEDULEDDELETETICKETATTACHMENT`, `FLOW-TICKET-ATTACHMENT-RETENTION` |
| REQ-SUPPORT-043 | The trash job and the draft comment job each handle at most 500 attachments in one run. The next run handles the rest. | P2 | LPD-90456 | `CRON-SCHEDULEDDELETETICKETATTACHMENT`, `CRON-SCHEDULEDUPDATETICKETATTACHMENTDRAFTCOMMENTBODY` |

## Business Events

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-SUPPORT-050 | A user who can view a project can see its business events, the details of each event, and the history of each event. | P0 | LPD-90459, LPD-89889 | `REST-GET-JIRA-PROJECTS-EXTERNALREFERENCECODE-BUSINESS-EVENTS`, `REST-GET-JIRA-PROJECTS-EXTERNALREFERENCECODE-BUSINESS-EVENTS-ID`, `REST-GET-JIRA-PROJECTS-EXTERNALREFERENCECODE-BUSINESS-EVENTS-ID-VERSIONS`, `FLOW-BUSINESS-EVENT-LIFECYCLE` |
| REQ-SUPPORT-051 | Only a user who can update a project can add, edit, or delete its business events. | P0 | LPD-90459, LPD-89889 | `REST-POST-JIRA-PROJECTS-EXTERNALREFERENCECODE-BUSINESS-EVENTS`, `REST-PUT-JIRA-PROJECTS-EXTERNALREFERENCECODE-BUSINESS-EVENTS-ID`, `REST-DELETE-JIRA-PROJECTS-EXTERNALREFERENCECODE-BUSINESS-EVENTS-ID`, `FLOW-BUSINESS-EVENT-LIFECYCLE` |
| REQ-SUPPORT-052 | A business event records a name, a type, a status, a description, a planned date, an actual date, a time zone, the current and the new Liferay versions, the related tickets, and a last comment. | P1 | LPD-90459 | `CONV-JIRABUSINESSEVENTCONVERTER`, `CLS-JIRABUSINESSEVENT`, `SVC-JIRABUSINESSEVENTSERVICE` |
| REQ-SUPPORT-053 | The system records the user who creates a business event as its author, and links the event to the support account of the project. An edit does not change the author or the account. Each save records the user who saved last. | P1 | LPD-90459 | `REST-POST-JIRA-PROJECTS-EXTERNALREFERENCECODE-BUSINESS-EVENTS`, `REST-PUT-JIRA-PROJECTS-EXTERNALREFERENCECODE-BUSINESS-EVENTS-ID`, `CONV-JIRABUSINESSEVENTCONVERTER` |
| REQ-SUPPORT-054 | The history of a business event shows each change with its author, its comment, and its date, newest first. An event ID that is not a number has no history. | P1 | LPD-90459 | `REST-GET-JIRA-PROJECTS-EXTERNALREFERENCECODE-BUSINESS-EVENTS-ID-VERSIONS`, `CONV-JIRABUSINESSEVENTVERSIONCONVERTER`, `CLS-JIRABUSINESSEVENTVERSION`, `HOOK-BUSINESSEVENTS-USEGETBUSINESSEVENTVERSIONS`, `ROUTE-BUSINESS-EVENTS-ACTIVITY-HISTORY` |
| REQ-SUPPORT-055 | The choices for event type, event status, and time zone come from the Jira schema. The choices for Liferay versions come from the product versions in Jira Assets, newest first. | P1 | LPD-90459 | `REST-GET-JIRA-BUSINESS-EVENTS-FIELDS-FIELDNAME-OPTIONS`, `REST-GET-JIRA-PRODUCT-VERSIONS`, `SVC-JIRABUSINESSEVENTSERVICE`, `HOOK-BUSINESSEVENTS-USEGETBUSINESSEVENTTYPESLIST`, `HOOK-BUSINESSEVENTS-USEGETUTCTIMEZONESLIST`, `HOOK-BUSINESSEVENTS-USEGETLIFERAYVERSIONS`, `MOD-BUSINESSEVENTS-SORTLIFERAYVERSIONS`, `MOD-BUSINESSEVENTS-CONTAINSOPTION` |
| REQ-SUPPORT-056 | The system keeps the field choices and the product versions for one day. At midnight it clears them, so a change in Jira shows on the next day at the latest. | P2 | LPD-90495 | `CRON-SCHEDULEDASSETOBJECTSCACHEEVICTION`, `SVC-JIRABUSINESSEVENTSERVICE` |
| REQ-SUPPORT-057 | The system stores the date and time of an event with the offset of its time zone. The page shows the date and time in the locale of the user, and shows an empty value for a missing date. | P1 | LPD-90459 | `MOD-BUSINESSEVENTS-GETFORMATTEDEVENTDATEUTILS`, `MOD-BUSINESSEVENTS-GETFORMATTEDDATE`, `MOD-BUSINESSEVENTS-GETFORMATTEDTIME` |

## Business Event Pages

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-SUPPORT-060 | The business events pages of a project are the list, the add page, the details page, the edit page, and the history page. | P1 | LPD-90459 | `ROUTE-BUSINESS-EVENTS-PROJECTERC-BUSINESS-EVENTS`, `ROUTE-BUSINESS-EVENTS-ADD`, `ROUTE-BUSINESS-EVENTS-ID`, `ROUTE-BUSINESS-EVENTS-EDIT`, `ROUTE-BUSINESS-EVENTS-ACTIVITY-HISTORY` |
| REQ-SUPPORT-061 | The pages show the add, edit, record actual date, and cancel actions only to Administrators, Liferay Staff, account administrators, and the project administrator or project requester of the project. Other members can only view. | P0 | LPD-90455, LPD-95398 | `HOOK-BUSINESSEVENTS-USEHASALLEVENTSPERMISSIONS`, `FLOW-ROLE-PROJECT-PERMISSIONS` |
| REQ-SUPPORT-062 | A user cannot edit, record the actual date of, or cancel a business event that is Canceled or Completed. | P1 | LPD-90455 | `HOOK-BUSINESSEVENTS-USEHASALLEVENTSPERMISSIONS`, `ROUTE-BUSINESS-EVENTS-EDIT` |
| REQ-SUPPORT-063 | The add page shows the form only when the project has a support account in Jira. A project without one cannot add business events. | P1 | LPD-90455 | `HOOK-BUSINESSEVENTS-USECANVIEWTICKETS`, `REST-GET-PROJECTS-EXTERNALREFERENCECODE-JIRA-OBJECT-KEY`, `REST-GET-ACCOUNTS-EXTERNALREFERENCECODE-JIRA-OBJECT-KEY` |
| REQ-SUPPORT-064 | When a business event does not load, the page shows an error and returns to the business event list of the project. When the list does not load, the page shows an empty list. | P2 | LPD-90455 | `HOOK-BUSINESSEVENTS-USEGETBUSINESSEVENT`, `HOOK-BUSINESSEVENTS-USEGETBUSINESSEVENTS` |
| REQ-SUPPORT-065 | A user can search the business event list and filter it by its fields. A change to one filter keeps the other filters. | P2 | — | `HOOK-BUSINESSEVENTS-USEFILTERS` |

## Jira Assets

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-SUPPORT-070 | The system writes to Jira Assets only the attributes that the Jira schema defines. It drops an unknown attribute, an empty value, and a value that is not one of the choices of the attribute. | P0 | LPD-90495 | `CLS-JIRAASSETOBJECT`, `CLS-JIRAASSETSCHEMALOADER`, `CLS-BASEJIRAASSETOBJECTCONVERTER` |
| REQ-SUPPORT-071 | The system reads the Jira schema at run time. When the schema is missing or not valid, the system stops the request with an error, and does not write partial data. | P0 | LPD-90495 | `CLS-JIRAASSETSCHEMALOADER`, `CLS-JIRAASSETPERSISTENCE` |
| REQ-SUPPORT-072 | The system matches an asset object by its external key. It creates the object when none exists, and it does not update an object that has no changes. | P1 | LPD-90459 | `SVC-JIRAASSETSERVICE` |
| REQ-SUPPORT-073 | A delete in Jira Assets tries again when Jira is not available or limits the request rate. It does not try again after any other client error. A delete of an object that does not exist succeeds. | P1 | LPD-90495 | `CLS-JIRAASSETPERSISTENCE` |
| REQ-SUPPORT-074 | The system writes dates to Jira Assets in UTC. It authenticates to Jira with the service account of Liferay One, not with the token of the user. | P1 | LPD-90459 | `CLS-BASEJIRAASSETOBJECTCONVERTER`, `CLS-BASEJIRASERVICE` |
| REQ-SUPPORT-075 | When a Jira list request fails, the page shows an empty list instead of an error. Every other failed Jira request shows an error. | P2 | LPD-90459 | `CLIENT-SPRING-BOOT-JIRA` |

## Help and Support Tab

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-SUPPORT-080 | A project product shows the help and support tab only when the product has a learning link or at least one support detail. | P1 | LPD-90056 | `MOD-MYACCOUNT-PROJECTS-RESOLVEPRODUCTTABCONFIG` |
| REQ-SUPPORT-081 | When the product has a learning link, the tab shows that link. Otherwise the tab shows the support web address, the publisher website, the support email address, the support phone number, and the usage terms that the product has. | P2 | LPD-90056 | `MOD-MYACCOUNT-PROJECTS-RESOLVEPRODUCTTABCONFIG` |

## Not Yet Built

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-SUPPORT-090 | A ticket that a request names is in the list only when it belongs to the support organization of the project. | P0 | — | `REST-GET-JIRA-PROJECTS-EXTERNALREFERENCECODE-TICKETS` |
| REQ-SUPPORT-091 | A user can read, edit, or delete a business event only through the project that owns the event. | P0 | — | `REST-GET-JIRA-PROJECTS-EXTERNALREFERENCECODE-BUSINESS-EVENTS-ID`, `REST-PUT-JIRA-PROJECTS-EXTERNALREFERENCECODE-BUSINESS-EVENTS-ID`, `REST-DELETE-JIRA-PROJECTS-EXTERNALREFERENCECODE-BUSINESS-EVENTS-ID` |
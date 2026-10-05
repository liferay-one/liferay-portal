# Notifications

This area is the catalog of every email and in app notice that the system sends to a person outside the current page. For each notice, it states the event that sends it, the recipients, the content in business terms, the timing, and what happens when the send fails. A toast or an alert inside a page is not a notice and is not in this file. Some notices belong to the behavior of another area, for example the license key expiration email in the LICENSING area. This file lists them again so that the catalog is complete, and cites the same plan items.

The actors are the invitee, the inviter, a customer user, the account administrator, the trial creator, the trial administrator, the publisher, the marketplace administrator, Liferay Staff, and the internal Liferay teams that receive notices (cloud provisioning, partner management, support, and system operations).

Terms used in this file:

- **Notification queue**: the portal service that holds and delivers each email. The system adds an email to the queue and the portal sends it.
- **Notification template**: a stored email with a subject, a body, and placeholders. The site initializer creates each template.
- **Object action**: a rule on an object that runs when an entry is added or updated. A notification object action sends one notification template.
- **Verified user**: a user whose email address Okta confirmed.
- **Welcome email**: the email that tells a provisioned user how to sign in and which projects the user can use.
- **Dead letter topic**: the Pub/Sub topic that holds a message that the system could not process after all of its delivery attempts.

## Accounts and Invitations

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-NOTIFICATIONS-001 | When a user invites a person to an account, the system emails the invitee. The email names the account and the inviter, and contains a link that accepts the invitation. | P0 | LPD-98505 | `REST-POST-ACCOUNTS-EXTERNALREFERENCECODE-INVITATIONS`, `SVC-ACCOUNTINVITATIONEMAILSERVICE` |
| REQ-NOTIFICATIONS-002 | When a user invites a person to one project of an account, the system emails the invitee. The email names the project, the account, and the inviter, and contains the accept link. | P0 | LPD-98505 | `REST-POST-ACCOUNTS-EXTERNALREFERENCECODE-INVITATIONS`, `SVC-ACCOUNTINVITATIONEMAILSERVICE` |
| REQ-NOTIFICATIONS-003 | A second invitation to the same email address for the same account or project updates the pending invitation and sends the email again. The system keeps one pending invitation. | P1 | LPD-98505 | `REST-POST-ACCOUNTS-EXTERNALREFERENCECODE-INVITATIONS`, `SVC-ACCOUNTINVITATIONSERVICE` |
| REQ-NOTIFICATIONS-004 | A user can resend only a pending invitation of the same account. A resend gives the invitation a new expiration date and sends the email again. | P1 | LPD-98505 | `REST-POST-ACCOUNTS-EXTERNALREFERENCECODE-INVITATIONS-ACCOUNTINVITATIONID-RESEND`, `SVC-ACCOUNTINVITATIONSERVICE`, `SVC-ACCOUNTINVITATIONEMAILSERVICE` |
| REQ-NOTIFICATIONS-005 | The accept link in an invitation email is valid for 30 days. After that, the link reports that the invitation expired. | P0 | LPD-98505 | `CLS-ACCOUNTINVITATION`, `REST-GET-INVITATIONS-ACCEPT` |
| REQ-NOTIFICATIONS-006 | The invitation email shows the names that users typed as plain text. A name cannot add markup or links to the email. | P0 | LPD-98505 | `SVC-ACCOUNTINVITATIONEMAILSERVICE` |
| REQ-NOTIFICATIONS-007 | When the system cannot queue an invitation email, the request reports an error. The pending invitation stays, so the inviter can resend it. | P1 | LPD-98505 | `REST-POST-ACCOUNTS-EXTERNALREFERENCECODE-INVITATIONS` |

## Provisioning Welcome

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-NOTIFICATIONS-010 | When an administrator adds a user to an account that the user did not belong to, the system sends the user a welcome email. The user must be verified, and the account must hold a support or partner entitlement. | P1 | LPD-89436 | `REST-POST-ACCOUNTS-EXTERNALREFERENCECODE-USER-ACCOUNTS-BY-EMAIL-ADDRESS-EMAILADDRESS-ACCOUNT-ROLES`, `SVC-PROVISIONINGEMAILSERVICE` |
| REQ-NOTIFICATIONS-011 | A new business opportunity from Salesforce sends a welcome email to each verified user with a customer role on the account. An existing business opportunity sends it only to the contacts that the opportunity added. | P1 | LPD-89436, LPD-89686 | `SUB-SALESFORCEOPPORTUNITYPUBSUBSUBSCRIBER`, `SVC-PROVISIONINGEMAILSERVICE` |
| REQ-NOTIFICATIONS-012 | A renewal opportunity sends no welcome email. When the system processes an opportunity again, only the contacts that the opportunity added get a welcome email. | P1 | LPD-93349 | `SUB-SALESFORCEOPPORTUNITYPUBSUBSUBSCRIBER`, `SVC-PROVISIONINGEMAILSERVICE` |
| REQ-NOTIFICATIONS-013 | When Okta verifies the email address of a user for the first time, the system sends the user one welcome email. The email covers each account where the user has a customer role and a support entitlement, or a partner role and a partner entitlement. | P1 | LPD-89436 | `SUB-OKTAUSERSPUBSUBSUBSCRIBER`, `SVC-PROVISIONINGEMAILSERVICE`, `FLOW-OKTA-IDENTITY-SYNC` |
| REQ-NOTIFICATIONS-014 | The welcome email lists the projects of the user with a link to each. When the user has exactly one project, the subject names it. The email lists only the actions that the roles of the user allow. | P1 | LPD-89436 | `SVC-PROVISIONINGEMAILSERVICE` |
| REQ-NOTIFICATIONS-015 | The welcome email uses the language of the user when it is English, Spanish, Japanese, or Brazilian Portuguese. Otherwise it uses English. | P2 | LPD-89436 | `SVC-PROVISIONINGEMAILSERVICE`, `SVC-NOTIFICATIONTEMPLATESERVICE`, `CLS-LOCALEUTIL` |
| REQ-NOTIFICATIONS-016 | The welcome email comes from the provisioning address of the support region of the account. When the accounts in one email have different regions, it comes from the global address. | P1 | LPD-89436 | `SVC-PROVISIONINGEMAILSERVICE` |
| REQ-NOTIFICATIONS-017 | When Salesforce provisioning sends welcome emails to a list of users, a failure for one user does not stop the emails to the other users. The system logs the failure. | P1 | LPD-89436 | `SVC-PROVISIONINGEMAILSERVICE`, `SUB-SALESFORCEOPPORTUNITYPUBSUBSUBSCRIBER` |

## Partner Management

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-NOTIFICATIONS-020 | When a partner account role is assigned to a user or removed from a user, the system emails the partner management address. The email names the account, the user, the role, and the change. | P1 | LPD-89436 | `SVC-USERASSIGNMENTSERVICE`, `REST-PUT-ACCOUNTS-EXTERNALREFERENCECODE-USER-ACCOUNTS-USERID-ACCOUNT-ROLES` |
| REQ-NOTIFICATIONS-021 | A failed partner role email does not undo the role change. The system logs the failure. A change to a role that is not a partner role sends no email. | P1 | LPD-89436 | `SVC-USERASSIGNMENTSERVICE` |

## Licensing

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-NOTIFICATIONS-030 | Each day at midnight, each subscribed user gets one email for each key that expires in 30 days, in 14 days, or on that day. | P1 | LPD-89428 | `CRON-SCHEDULEDSENDEXPIRINGLICENSEKEYEMAILS`, `SVC-SUBSCRIPTIONENTRYSERVICE`, `FLOW-LICENSE-EXPIRATION-EMAIL`, `SVC-NOTIFICATIONTEMPLATESERVICE` |
| REQ-NOTIFICATIONS-031 | An activation key sends one expiration email for all of its license keys. A license key that is not part of an activation key sends its own email. Only an active key of an existing account sends an email. | P1 | LPD-89428 | `CRON-SCHEDULEDSENDEXPIRINGLICENSEKEYEMAILS`, `SVC-SUBSCRIPTIONENTRYSERVICE` |
| REQ-NOTIFICATIONS-032 | Only a key that lasts longer than 60 days sends expiration emails. A short key, for example a complimentary key, sends none. | P1 | LPD-89428 | `CRON-SCHEDULEDSENDEXPIRINGLICENSEKEYEMAILS` |
| REQ-NOTIFICATIONS-033 | The expiration email names the product group, the expiration status, the license name, the version, and the sizing. It uses the language of the user when the system supports it, and English otherwise. | P2 | LPD-89428 | `SVC-SUBSCRIPTIONENTRYSERVICE` |
| REQ-NOTIFICATIONS-034 | The system skips a subscribed user that no longer exists or has no email address. | P1 | LPD-89428 | `SVC-SUBSCRIPTIONENTRYSERVICE` |

## Trials and Provisioning

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-NOTIFICATIONS-040 | When trial provisioning starts, the system emails the order creator that the trial is almost ready. The trial settings can turn this email off. | P1 | LPD-90604 | `REST-POST-TRIAL-PROVISIONING-ORDERID`, `FLOW-TRIAL-PROVISIONING` |
| REQ-NOTIFICATIONS-041 | When the trial instance and its Console project are ready, the system emails the order creator the trial address and the sign in email. A trial that fails setup sends no ready email. | P1 | LPD-90604 | `REST-POST-TRIAL-PROVISIONING-ORDERID`, `FLOW-TRIAL-PROVISIONING` |
| REQ-NOTIFICATIONS-042 | When a trial in progress has one day or less left, the system emails the order creator the trial end date. Each trial gets this email once. The check runs every 6 hours. | P1 | LPD-90604 | `CRON-SCHEDULEDPROCESSTRIALS`, `FLOW-TRIAL-EXPIRY` |
| REQ-NOTIFICATIONS-043 | Trial emails come from the customer service address. A failed trial email does not stop the provisioning or the expiry of the trial. The system logs the failure. | P1 | LPD-90604 | `REST-POST-TRIAL-PROVISIONING-ORDERID`, `CRON-SCHEDULEDPROCESSTRIALS` |
| REQ-NOTIFICATIONS-044 | When the system sets up the Console project of a trial, Console invites each address in the Console invite list of the trial settings as an administrator. A failed invite does not stop the other invites. | P1 | LPD-90604 | `SVC-CONSOLESERVICE`, `FLOW-CONSOLE-ANALYTICS-PROVISIONING` |
| REQ-NOTIFICATIONS-045 | When an SSA SaaS or Solutions trial order goes on hold, the system emails the order creator that the trial waits to be processed. | P1 | LPD-94266 | — |
| REQ-NOTIFICATIONS-046 | When an SSA SaaS trial order becomes pending, the system emails the internal address that the "Trial, New Trial Started" template names. | P2 | LPD-94266 | — |
| REQ-NOTIFICATIONS-047 | When an administrator creates a trial extension request that needs approval, the system sends the extension request email. The email names the project and the user that made the request. | P1 | LPD-94266, LPD-106746 | — |
| REQ-NOTIFICATIONS-048 | When an administrator approves or rejects a trial extension request, the system emails the author of the request. The email names the decision and the project. | P1 | LPD-106746 | — |

## Cloud Environment Activation

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-NOTIFICATIONS-050 | When a project requests activation of an Analytics Cloud, PaaS, or SaaS environment, the system emails the cloud provisioning team. The email contains the form data, the administrators, and the Salesforce account and project links. | P0 | LPD-99682 | `REST-POST-CLOUD-ENVIRONMENTS-ACTIVATION-REQUEST`, `SVC-CLOUDACTIVATIONREQUESTSERVICE` |
| REQ-NOTIFICATIONS-051 | The system saves the activation request before it sends the email. A failed email does not undo the request. The system logs the failure. | P0 | LPD-99682 | `SVC-CLOUDACTIVATIONREQUESTSERVICE` |

## Orders and Purchases

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-NOTIFICATIONS-060 | When a DXP app order is created with a total above zero and a completed payment status, the system emails the order creator the next steps for the purchase. | P1 | LPD-94266 | — |
| REQ-NOTIFICATIONS-061 | When a buyer completes a cloud app purchase, the system emails the buyer the next steps for that app. | P1 | LPD-94266 | — |
| REQ-NOTIFICATIONS-062 | When a buyer completes a free DXP app purchase, the system emails the buyer the next steps for that app. | P1 | LPD-94266 | — |
| REQ-NOTIFICATIONS-063 | When a user requests a free DXP license, the system emails the business email address of the request with the next steps for the activation key. | P1 | LPD-89423 | — |

## Publishers

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-NOTIFICATIONS-070 | When a user requests a publisher account, the system emails the marketplace administrator address. | P1 | LPD-94266, LPD-96124 | — |
| REQ-NOTIFICATIONS-071 | When a publisher submits a product for approval, each user with the Administrator role gets an email and an in app notice to review it. | P1 | LPD-104108 | — |
| REQ-NOTIFICATIONS-072 | When a reviewer rejects a submitted product, the publisher gets an email and an in app notice to change the product and submit it again. | P1 | LPD-104108 | — |
| REQ-NOTIFICATIONS-073 | When a reviewer completes the review of a product, the publisher gets an email. The email includes the comments of the reviewer when there are comments. | P1 | LPD-104108 | — |

## Support

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-NOTIFICATIONS-080 | When a user completes a large file upload to a support ticket, the system posts a comment on the Jira ticket. The comment links to the attachment, and Jira notifies the people on the ticket. | P1 | LPD-89440 | `REST-POST-TICKET-ATTACHMENTS-TICKETATTACHMENTID-COMPLETE-UPLOAD`, `FLOW-TICKET-UPLOAD` |
| REQ-NOTIFICATIONS-081 | When the system cannot post the upload comment, it keeps the comment and tries again each hour until Jira accepts it. The upload itself succeeds. | P1 | LPD-89440 | `REST-POST-TICKET-ATTACHMENTS-TICKETATTACHMENTID-COMPLETE-UPLOAD`, `CRON-SCHEDULEDUPDATETICKETATTACHMENTDRAFTCOMMENTBODY`, `FLOW-TICKET-UPLOAD` |
| REQ-NOTIFICATIONS-082 | When an hourly retry of the upload comment fails, the system emails the support systems team with the error. | P1 | LPD-89440 | `CRON-SCHEDULEDUPDATETICKETATTACHMENTDRAFTCOMMENTBODY` |
| REQ-NOTIFICATIONS-083 | When the system cannot delete a trashed attachment from storage, it emails the support systems team with the error. | P1 | LPD-89440 | `CRON-SCHEDULEDDELETETICKETATTACHMENT`, `FLOW-TICKET-ATTACHMENT-RETENTION` |

## System Operations

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-NOTIFICATIONS-090 | When a Pub/Sub message moves to the dead letter topic, the system emails the configured operations recipient. The email names the source subscription and the number of delivery attempts, and contains the message. | P1 | LPD-93686 | `SUB-DEADLETTERPUBSUBSUBSCRIBER`, `CLS-BASEDEADLETTERPUBSUBSUBSCRIBER` |
| REQ-NOTIFICATIONS-091 | When no dead letter recipient is configured, the system sends no email. A failed dead letter email does not stop the subscriber. The system logs the failure. | P1 | LPD-93686 | `SUB-DEADLETTERPUBSUBSUBSCRIBER` |

## Not Yet Built

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-NOTIFICATIONS-100 | When a user starts a Solutions trial, the system emails the order creator a welcome to the trial. The template exists, but no action or code sends it. | P2 | LPD-94266 | — |
| REQ-NOTIFICATIONS-101 | When a buyer places an order that pays by invoice, the system emails the accounts receivable team the order and account details. The template exists, but no action or code sends it. | P1 | LPD-94266 | — |
| REQ-NOTIFICATIONS-102 | The system tells the publisher and the marketplace administrator about each step of the publisher request: received, pending review, and approved. The templates exist, but no action or code sends them. | P2 | LPD-94266 | — |
| REQ-NOTIFICATIONS-103 | The system tells the publisher and the marketplace administrator when an app or an app update is submitted, and tells the publisher when the app is live. The templates exist, but nothing in this workspace sends them. | P2 | LPD-94266 | — |
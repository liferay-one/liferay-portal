# Okta Integration

This file is the contract between Liferay One and Okta. Liferay One reads contacts and groups from the Okta REST API. It sends every change for Okta as a Pub/Sub message, and it receives Okta events through Pub/Sub. A change on either side to an endpoint, a topic, a field, a status, an event type, or a group name breaks these rules. The feature rules that use this data belong to [Identity and Access](../../business/identity-and-access.md) and [Accounts and Organizations](../../business/accounts-and-organizations.md), and this file cites them by ID.

The systems are Okta, the Pub/Sub project that carries Okta messages, the Okta side consumer of those messages, and the Liferay One Spring Boot service. The actors are the Pub/Sub subscribers of the service, the user assignment flow, and a global administrator.

Terms used in this file:

- **Contact**: an Okta user. Liferay One finds a contact by its email address, which is the Okta login.
- **Okta event**: a Pub/Sub message that reports a change in Okta, for example a new user or a group membership change.
- **Okta command**: a Pub/Sub message that Liferay One sends so that the Okta side changes a user or an application.
- **Okta group link**: the organization property `okta:group`, which holds the ID of one Okta group.
- **Cloud Native application**: an Okta application for one account. The account property `okta:application` holds its ID.

## Connection and Configuration

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-OKTA-001 | Liferay One reads the Okta REST API at `https://` plus the host in `liferay.one.okta.host`. It sends the token in `liferay.one.okta.api.token` in an `Authorization` header with the `SSWS` scheme. It only reads over REST and never writes to Okta over REST. | P0 | LPD-89433, LPD-89441 | `SVC-OKTASERVICE` |
| TECH-OKTA-002 | Liferay One sends Okta commands to the Google Cloud project in `liferay.one.okta.pubsub.publisher.project.id`. The topics are `okta-user-create`, `okta-user-update`, `okta-app-create`, `okta-app-delete`, and `okta-app-user-update`. Liferay One does not create these topics. | P0 | LPD-89441, LPD-107697 | `CLS-BASEPUBSUBPUBLISHER` |
| TECH-OKTA-003 | Liferay One receives Okta events on two subscriptions, set by the `liferay.one.okta.users.pubsub.subscriber.*` and `liferay.one.okta.app.created.pubsub.subscriber.*` properties. It creates a missing subscription with message ordering, a 30 second acknowledgement deadline, and the dead letter rule of TECH-SALES-021. It does not create the topics. | P1 | LPD-89441, LPD-91399, LPD-93686 | `CLS-BASEPUBSUBSUBSCRIBER`, `SUB-OKTAUSERSPUBSUBSUBSCRIBER`, `SUB-OKTAAPPCREATEDPUBSUBSUBSCRIBER` |
| TECH-OKTA-004 | Liferay One reads the `one-liferay-dead-letter` topic of the Okta Pub/Sub project on the subscription set by the `liferay.one.okta.dead.letter.pubsub.subscriber.*` properties. It creates a missing subscription. It reports each message on that topic as TECH-SALESFORCE-044 states, and it sends the notification email to the recipient in `liferay.one.dead.letter.notification.recipient`. | P1 | LPD-108752 | `SUB-OKTADEADLETTERPUBSUBSUBSCRIBER`, `CLS-BASEDEADLETTERPUBSUBSUBSCRIBER` |

## Contact Reads

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-OKTA-010 | To find a contact, Liferay One sends `GET /api/v1/users/{email}`. A 404 or an empty body means that no contact exists. Any other status that is not a success means that Okta is unavailable, as TECH-ACCESS-032 states. | P0 | LPD-98505 | `SVC-OKTASERVICE` |
| TECH-OKTA-011 | Liferay One reads these fields of an Okta user: `status`, `profile.email`, `profile.firstName`, `profile.lastName`, `profile.middleName`, and `profile.uuid`. The custom profile attribute `uuid` must exist in Okta. A missing field reads as an empty value with no error. | P0 | LPD-89441 | `CLS-OKTAUSER` |
| TECH-OKTA-012 | Liferay One maps the Okta status. `ACTIVE`, `LOCKED_OUT`, `PASSWORD_EXPIRED`, `RECOVERY`, and `SUSPENDED` mean verified. `DEPROVISIONED` means deactivated. `PROVISIONED` and `STAGED` mean pending. A status that Okta adds later means not verified. | P0 | LPD-89441 | `CLS-OKTAUSER` |
| TECH-OKTA-013 | To find the groups of a contact, Liferay One sends `GET /api/v1/users/{email}/groups` and reads the `id` of each group. A 404 or an empty body means no groups. Any other failure status means that Okta is unavailable. | P0 | LPD-89441 | `SVC-OKTASERVICE`, `SVC-USERASSIGNMENTSERVICE` |
| TECH-OKTA-014 | To list the members of a group, Liferay One sends `GET /api/v1/groups/{groupId}/users?limit=200`. It follows the `link` header with `rel="next"` until no next page exists. An empty page body ends the list. Any error status stops the request. | P0 | LPD-89441 | `SVC-OKTASERVICE` |
| TECH-OKTA-015 | Liferay One keeps no cache of Okta answers. Each lookup is a new request. | P2 | LPD-89441 | `SVC-OKTASERVICE` |
| TECH-OKTA-016 | The email address is the only key that links a Liferay user to a contact. A change of the email address on one side breaks the link. Group member emails match Liferay emails with no regard to case. | P0 | LPD-89441 | `SVC-OKTASERVICE`, `REST-POST-ORGANIZATIONS-ORGANIZATIONID-SYNC-FROM-OKTA` |
| TECH-OKTA-017 | The contact validation endpoint uses the contact lookup for TECH-ACCOUNTS-070. When Okta is unavailable, the validation request fails with an error. | P1 | LPD-103504 | `REST-GET-CONTACTS-CONTACTEMAILADDRESS-VALIDATE`, `SVC-EMAILADDRESSVALIDATORSERVICE` |

## Contact Commands

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-OKTA-020 | To create a contact, Liferay One sends JSON with `emailAddress`, `firstName`, `lastName`, and `uuid` to `okta-user-create`. Before it sends the command, it saves the UUID on the user when the user had none. | P0 | LPD-89441 | `SVC-OKTASERVICE` |
| TECH-OKTA-021 | To activate a deactivated contact, Liferay One sends JSON with `action` set to `ACTIVATE` and `login` set to the email address to `okta-user-update`. It sends this only when the Okta status is `DEPROVISIONED`. | P0 | LPD-98505 | `SVC-OKTASERVICE` |
| TECH-OKTA-022 | Before a user joins an account, an account role, an organization, or a project, Liferay One looks up the contact. It sends a create or activate command when needed. When Okta is unavailable, it logs the error, sends no command, and continues the assignment. | P0 | LPD-98505 | `SVC-USERASSIGNMENTSERVICE`, `SVC-OKTASERVICE` |
| TECH-OKTA-023 | An Okta command carries no attributes. Every command uses one ordering key, so Pub/Sub delivers the commands in the order that Liferay One sends them. Liferay One sends one command at a time. | P1 | LPD-89441 | `CLS-BASEPUBSUBPUBLISHER` |
| TECH-OKTA-024 | Liferay One waits up to 60 seconds for Pub/Sub to accept a command. It does not wait for Okta to apply it. When Pub/Sub refuses the command, the operation that sent it stops with an error. | P1 | LPD-89441 | `CLS-BASEPUBSUBPUBLISHER` |
| TECH-OKTA-025 | The consumer on the Okta side must accept a create command for an email that already has a contact. Liferay One can send the same create command again after a retry. | P1 | LPD-98505 | `SVC-OKTASERVICE` |

## Okta Events

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-OKTA-030 | A user event is JSON with an `eventType`, a `user` object, and a `group` object. The `user` object has the form of an Okta user. The `group` object has `id` and `displayName`. | P0 | LPD-91399 | `SUB-OKTAUSERSPUBSUBSUBSCRIBER` |
| TECH-OKTA-031 | Liferay One handles the event types `user.lifecycle.create`, `user.lifecycle.activate`, `user.lifecycle.deactivate`, `group.user_membership.add`, `group.user_membership.remove`, `user.account.update_profile`, and `user.account.update_password`. It acknowledges any other type with no change. | P0 | LPD-91399 | `SUB-OKTAUSERSPUBSUBSUBSCRIBER`, `FLOW-OKTA-IDENTITY-SYNC` |
| TECH-OKTA-032 | For a create, activate, profile, or password event, Liferay One reads the contact from Okta again by email. It uses only `user.profile.email` from the event. For a deactivate or group event, it uses the event alone. | P1 | LPD-91399 | `SUB-OKTAUSERSPUBSUBSUBSCRIBER` |
| TECH-OKTA-033 | Okta keeps a group with the display name `Employees`. A removal from that group removes the user from every account and every organization, as TECH-ACCESS-036 states. A renamed group stops this with no warning. | P0 | LPD-91399 | `SUB-OKTAUSERSPUBSUBSUBSCRIBER` |
| TECH-OKTA-034 | A group event changes an organization only when its Okta group link holds the `group.id` of the event. An event with no matching link, or with an email that no user has, changes nothing. | P0 | LPD-91399 | `SUB-OKTAUSERSPUBSUBSUBSCRIBER`, `FLOW-OKTA-IDENTITY-SYNC` |
| TECH-OKTA-035 | An event that Pub/Sub delivers again gives the same result. An add skips a membership that exists, and a removal skips a membership that does not exist. The verified welcome email goes only to a user who was not verified before the sync. | P0 | LPD-91399 | `SUB-OKTAUSERSPUBSUBSUBSCRIBER`, `SVC-USERASSIGNMENTSERVICE` |
| TECH-OKTA-036 | Liferay One does not compare the time of events. A deactivate event that arrives after a later activate event still removes the memberships. The Okta side must publish the events of one user in order. | P1 | — | `SUB-OKTAUSERSPUBSUBSUBSCRIBER` |
| TECH-OKTA-037 | When an event fails, Liferay One rejects it. Pub/Sub tries 5 times and then moves it to the dead letter topic, which emails the payload to the configured recipient. | P1 | LPD-93686 | `CLS-BASEPUBSUBSUBSCRIBER`, `SUB-DEADLETTERPUBSUBSUBSCRIBER` |

## Cloud Native Application

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-OKTA-040 | To request an application for an account, Liferay One sends JSON with `accountKey` and `subdomain` to `okta-app-create`. The `accountKey` is the external reference code of the account. A failure to send is logged, and Liferay One does not send it again. | P1 | LPD-107697 | `SVC-PROVISIONINGSUBDOMAINSERVICE` |
| TECH-OKTA-041 | The Okta side answers on the app created topic with JSON that holds `accountKey` and `appId`. Liferay One rejects a message without one of them, or for an account that does not exist, so Pub/Sub delivers it again. | P1 | LPD-107697 | `SUB-OKTAAPPCREATEDPUBSUBSUBSCRIBER` |
| TECH-OKTA-042 | To give or remove access, Liferay One sends JSON with `action` set to `ASSIGN` or `UNASSIGN`, the `appId`, and the `emailAddress` to `okta-app-user-update`. A failure for one user is logged and does not stop the others. | P1 | LPD-107697 | `SVC-USERASSIGNMENTSERVICE`, `SUB-OKTAAPPCREATEDPUBSUBSUBSCRIBER` |
| TECH-OKTA-043 | When a canceled order item is the last active PaaS Experience item of the account, Liferay One sends the `appId` to `okta-app-delete`. Then it removes the `okta:application` property of the account. | P1 | LPD-107697 | `REST-POST-OBJECT-ACTION-COMMERCE-ORDER-ITEM-UPDATE` |

## Administrator Sync

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-OKTA-050 | The sync with Okta of one user reads the contact. With no contact, it sends a create command and changes no organization. Otherwise it reads the groups of the contact and aligns the linked organizations, as TECH-ACCESS-038 states. | P0 | LPD-89441 | `REST-POST-USER-ACCOUNTS-USERID-SYNC-WITH-OKTA`, `SVC-USERASSIGNMENTSERVICE` |
| TECH-OKTA-051 | The sync from Okta of one organization reads every member of the linked group first. Then it removes each organization member who is not in that list. A member list that Okta cuts short removes members in error. | P0 | LPD-89441 | `REST-POST-ORGANIZATIONS-ORGANIZATIONID-SYNC-FROM-OKTA`, `FLOW-ORGANIZATION-SYNC` |
| TECH-OKTA-052 | When Okta gives an error during an administrator sync, the request fails. The sync from Okta then changes no member. The sync of one user keeps the profile changes that it made before the error. | P1 | LPD-89441, LPD-98505 | `REST-POST-USER-ACCOUNTS-USERID-SYNC-WITH-OKTA`, `REST-POST-ORGANIZATIONS-ORGANIZATIONID-SYNC-FROM-OKTA` |
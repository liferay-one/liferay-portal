# Provisioning Backends

This file records the contract between Liferay One and the backends that provision and measure customer environments. It covers the Liferay Cloud Console API, Analytics Cloud workspace provisioning, the trial DXP that hosts trial portal instances, the DataOps Metrics API, and the Liferay releases feed. It states what Liferay One sends to each system and what it expects back. The feature rules are in [`../../business/trials-and-provisioning.md`](../../business/trials-and-provisioning.md), [`../../business/usage-and-utilization.md`](../../business/usage-and-utilization.md), and [`../../business/platform.md`](../../business/platform.md).

The systems are the Liferay One Spring Boot service, the Console API, Analytics Cloud, the trial DXP and the SSA trial DXP, the DataOps Cloud Functions, and the releases feed. The actors are the buyer, the trial creator, the project member, and the system processes that provision and expire trials.

Terms used in this file:

- **Console project**: a Liferay Cloud project that the Console API creates and manages.
- **Service account**: the Console user that Liferay One signs in as. Its address and password come from configuration.
- **Corp project UUID**: the key that Analytics Cloud uses for the account of a workspace. Liferay One sends the external reference code of the account.
- **Deployment**: one installed copy of a cloud app in a Console project. The order records each deployment in its `cloud-provisioning` custom field.
- **Account key**: the Koroneiki account key of an account, or the external reference code of the account when it has no key.
- **Releases feed**: the public JSON list of Liferay releases.

## Console Authentication

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-CONSOLE-001 | Liferay One signs in to the Console API with `POST /login` and the `email` and `password` of the service account. The base URL is `liferay.one.console.auth.url`. The credentials are `liferay.one.console.auth.email.address` and `liferay.one.console.auth.password`. | P0 | LPD-90604 | `SVC-CONSOLESERVICE` |
| TECH-CONSOLE-002 | The sign in answer must contain a `token`. Liferay One sends it as a bearer token on every other Console call. A missing answer stops the call with an error. | P0 | LPD-90604 | `SVC-CONSOLESERVICE` |
| TECH-CONSOLE-003 | Liferay One keeps one token for 15 minutes from the sign in, and signs in again 30 seconds before that time. It does not read an expiry from the Console. The Console must keep a token valid for at least 15 minutes. | P0 | LPD-90604 | `SVC-CONSOLESERVICE` |
| TECH-CONSOLE-004 | Known defect: a 401 answer does not clear the kept token. When the Console revokes a token early, every Console call fails until the 15 minutes end. | P1 | — | — |
| TECH-CONSOLE-005 | Each Console call tries up to 3 more times, 5 seconds apart, when the connection fails. An HTTP error answer does not try again. It stops the call with an error. See TECH-PROVISIONING-065. | P1 | LPD-90604 | `SVC-CONSOLESERVICE` |
| TECH-CONSOLE-006 | Known risk: a new try repeats a create request when the connection fails after the Console got the request. Liferay One sends no idempotency key. The Console must refuse or ignore a duplicate project, invite, link, or app deployment. | P0 | — | — |

## Console Projects for Trials

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-CONSOLE-010 | To set up a trial, Liferay One creates a Console project with `POST /projects`. The request sends the `cluster`, the `projectId`, `environment` set to true, and `metadata.skipCloudProviderIamConfiguration` set to true. The answer must contain the `id` of the project. | P0 | LPD-90604 | `REST-POST-TRIAL-PROVISIONING-ORDERID`, `SVC-CONSOLESERVICE`, `FLOW-TRIAL-PROVISIONING` |
| TECH-CONSOLE-011 | The Console project ID is the project prefix, then `-ext`, then the project ID of the trial settings or else the order ID. A solution trial uses `liferay.one.console.project.prefix` and `liferay.one.console.cluster`. An SSA trial uses the matching `liferay.one.console.ssa` properties. Liferay One does not store this ID, so a changed prefix leaves earlier trials without a match on delete. | P0 | LPD-90604 | `REST-POST-TRIAL-PROVISIONING-ORDERID`, `REST-DELETE-TRIAL-ORDERID` |
| TECH-CONSOLE-013 | Liferay One invites each address in `consoleInviteEmailAddresses` of the trial settings with `POST /projects/{projectId}/invite` and the role `admin`. It does not invite the service account. A failed invite goes to the log and does not stop the setup. | P1 | LPD-90604 | `SVC-CONSOLESERVICE` |
| TECH-CONSOLE-014 | Liferay One links the trial portal instance to the Console project with `POST /lxc-extension-links`. The request sends `dxpProjectUid`, `dxpVirtualInstanceId` as the host name of the portal instance, and `extensionProjectUid` as the `id` from the project create. The DXP project UID comes from `liferay.one.console.project.uid` or `liferay.one.console.ssa.project.uid`. | P0 | LPD-90604 | `REST-POST-TRIAL-PROVISIONING-ORDERID` |
| TECH-CONSOLE-015 | A solution trial deploys the trial app with `POST /admin/projects/{projectId}/apps`. The request sends the order ID as `orderId` and the service account address as `userEmail`. An SSA trial deploys no app. | P1 | LPD-90604 | `REST-POST-TRIAL-PROVISIONING-ORDERID` |
| TECH-CONSOLE-016 | When a Console step fails, Liferay One deletes the Console project with `DELETE /projects/{projectId}` and deletes the portal instance. Then it records the Console error body in `trial-error` on the order and cancels the order. See TECH-PROVISIONING-008. | P0 | LPD-90604 | `REST-POST-TRIAL-PROVISIONING-ORDERID`, `FLOW-TRIAL-PROVISIONING` |
| TECH-CONSOLE-017 | Known defect: an expiry or a delete removes the Console project first and the portal instance second. When the Console delete fails, the portal instance stays and uses a trial seat. The order of an expired trial is already complete, so the 6 hour run does not try again. | P1 | LPD-90604 | `REST-POST-TRIAL-EXPIRE-ORDERID`, `REST-DELETE-TRIAL-ORDERID`, `FLOW-TRIAL-EXPIRY` |
| TECH-CONSOLE-018 | Liferay One copies the Console error body to the order and to the log with no change. The Console must not put a credential or a token in an error body. | P1 | LPD-90604 | — |

## Cloud App Deployments

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-CONSOLE-020 | To install a cloud app, Liferay One calls `POST /admin/projects/{projectId}/apps`. The request sends the commerce order ID as `orderId` and the address of the order creator as `userEmail`. The Console identifies the app by the order ID. | P0 | LPD-101678 | `REST-POST-CONSOLE-PROVISIONING-ORDERID`, `SVC-CLOUDAPPSERVICE` |
| TECH-CONSOLE-021 | Liferay One stores the whole Console answer as one deployment in the `cloud-provisioning` custom field of the order. The answer must contain an `id`, because the uninstall request names the deployment by that value. A temporary deployment marks the install as in progress during the Console call, and Liferay One removes it after the call. | P0 | LPD-101678 | `SVC-CLOUDAPPSERVICE` |
| TECH-CONSOLE-023 | To uninstall, Liferay One calls `DELETE /apps/{orderId}`. The call names the order and not the deployment. Known risk: an order with more than one deployment depends on the Console to pick the correct deployment. | P0 | LPD-101678 | `REST-POST-CONSOLE-UNINSTALL-APP-ORDERID` |
| TECH-CONSOLE-024 | Liferay One removes the deployment from the order only after the Console uninstall succeeds. A failed uninstall leaves the order unchanged. | P1 | LPD-101678 | `REST-POST-CONSOLE-UNINSTALL-APP-ORDERID` |
| TECH-CONSOLE-025 | A connected DXP installs a cloud app through `/dxp/provisioning/{orderId}`. That path checks the project in the Console usage of the user and then uses the same Console calls. | P1 | LPD-103883 | `REST-POST-DXP-PROVISIONING-ORDERID` |

## Console Usage

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-CONSOLE-030 | Liferay One reads the projects and the plan usage of a user with `GET /admin/user-projects-plan-usage` and the `userEmail` parameter. It sends the address of the signed in Liferay One user. The Console user and the Liferay One user must have the same email address. | P0 | LPD-101678 | `REST-GET-CONSOLE-PROJECTS-USAGE`, `SVC-CONSOLESERVICE` |
| TECH-CONSOLE-031 | The answer has a `userProjects` array. Each item has a `rootProjectId`, an `environments` array with `projectId` and `isExtensionEnvironment`, and a `rootProjectPlanUsage` with `cpu`, `memory`, and `instance`. Each of these three has `free`, `limit`, and `used`. | P1 | LPD-101678 | `MOD-MYACCOUNT-PROJECTS-CLOUDAPPINSTALL` |
| TECH-CONSOLE-032 | A project belongs to the user only when its ID equals the `projectId` of an environment in the answer. The install request and the DXP usage request use this check. See TECH-PROVISIONING-041 and TECH-USAGE-050. | P0 | LPD-101678, LPD-103883 | `REST-POST-CONSOLE-PROVISIONING-ORDERID`, `REST-GET-DXP-PROJECT-USAGE` |
| TECH-CONSOLE-033 | Liferay One sends the Console answer to the browser with no change and does not keep it. Each install check and each usage page calls the Console again. When the Console is down, the request fails and nothing takes its place. | P1 | LPD-101678 | `REST-GET-CONSOLE-PROJECTS-USAGE` |

## Trial Portal Instances

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-CONSOLE-040 | Liferay One manages trial portal instances with the headless portal instances API of the trial DXP. The base URL is `external.trial.oauth2.headless.server.home.page.url` for a solution trial and `external.ssa.oauth2.headless.server.home.page.url` for an SSA trial. The token comes from the OAuth2 application `external-trial` or `external-ssa`. | P0 | LPD-90604 | `REST-POST-TRIAL-PROVISIONING-ORDERID` |
| TECH-CONSOLE-041 | The create request sets the portal instance ID and the virtual host to the project ID, a period, and the trial domain. The trial domain is `liferay.one.trial.dxp.domain` or `liferay.one.trial.ssa.dxp.domain`. The request also sends the site initializer key and an administrator with the name and the address of the order creator. | P0 | LPD-90604 | `REST-POST-TRIAL-PROVISIONING-ORDERID` |
| TECH-CONSOLE-042 | Liferay One counts the used trial seats from the total count of the portal instance list of the trial DXP, without the default instance. The maximum is `liferay.one.trial.max.instances`. Every other instance uses a seat, also one that Liferay One did not create. | P0 | LPD-90604 | `REST-GET-TRIAL-AVAILABILITY`, `REST-GET-TRIAL-DOMAIN-AVAILABILITY-PROJECTPREFIX` |
| TECH-CONSOLE-043 | Liferay One finds the instance to delete by the host name in the `trial-virtual-host` custom field of the order. It deletes that instance by its portal instance ID. Without a host name, it deletes no instance. | P0 | LPD-90604 | `REST-DELETE-TRIAL-ORDERID` |
| TECH-CONSOLE-044 | The create request is not idempotent. A second provisioning request for the same order sends the same portal instance ID, and the trial DXP must refuse it. When the create fails, Liferay One cancels the order. | P1 | LPD-90604 | `REST-POST-TRIAL-PROVISIONING-ORDERID` |

## Analytics Cloud Workspaces

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-CONSOLE-050 | Liferay One sends HTTP basic authentication on every Analytics Cloud request and keeps no token. The default environment uses `liferay.one.analytics.cloud.auth.url`, `liferay.one.analytics.cloud.auth.email.address`, and `liferay.one.analytics.cloud.auth.password`. The internal environment uses the matching `liferay.one.analytics.cloud.internal.auth` properties. | P0 | LPD-90606 | `SVC-ANALYTICSCLOUDSERVICE` |
| TECH-CONSOLE-051 | The external reference code of the account is the corp project UUID. Liferay One finds the workspace of an account with `GET /o/faro/main/project/corpProjectUuid/{corpProjectUuid}`. An answer with a `groupId` of 0, or with no `groupId`, means that the account has no workspace. | P0 | LPD-102451 | `SVC-ANALYTICSCLOUDSERVICE`, `REST-POST-LIFERAY-DATA-PLATFORM-PROVISIONING-ORDERID` |
| TECH-CONSOLE-052 | Liferay One creates a workspace with `POST /o/faro/main/project/provisioned` as form data. The fields are `corpProjectName`, `corpProjectUuid`, `enableAutoConfiguration`, `friendlyURL`, `incidentReportEmailAddresses` as a JSON array, `name`, `ownerEmailAddress`, `serverLocation`, `sharedCluster` set to false, and `trial` set to false. | P0 | LPD-90606, LPD-102451 | `SVC-ANALYTICSCLOUDSERVICE` |
| TECH-CONSOLE-053 | The answer must be the workspace as a JSON object. Liferay One stores it on the order in `ldpAnalyticsCloudProject` or `dsrAnalyticsCloudProject`, and takes the workspace name from its `name`. | P0 | LPD-102451, LPD-104271 | `REST-POST-LIFERAY-DATA-PLATFORM-PROVISIONING-ORDERID`, `REST-POST-DIGITAL-SALES-ROOM-PROVISIONING-ORDERID`, `SVC-PROVISIONINGANALYTICSCLOUDSERVICE` |
| TECH-CONSOLE-054 | A Liferay Data Platform order from the purchase flow uses the internal environment. A Digital Sales Room order uses the environment that `analyticsCloudEnvironment` of its settings names. A workspace from a Salesforce opportunity uses the default environment. The internal environment always sends the server location `us-west1-ac-uat-c1`. | P0 | LPD-102451, LPD-104271 | `REST-POST-LIFERAY-DATA-PLATFORM-PROVISIONING-ORDERID`, `REST-POST-DIGITAL-SALES-ROOM-PROVISIONING-ORDERID`, `SVC-PROVISIONINGANALYTICSCLOUDSERVICE` |
| TECH-CONSOLE-055 | For a Salesforce opportunity, the data center locations `asia-south1`, `europe-west2`, `europe-west3`, `southamerica-east1`, and `us-west1` map to fixed Analytics Cloud server locations. A known server location passes with no change. Any other value sends `us-west1-s2-c1`. | P1 | LPD-104271 | `SVC-PROVISIONINGANALYTICSCLOUDSERVICE` |
| TECH-CONSOLE-056 | Known risk: the workspace lookup treats every HTTP error answer, also 401 and 500, as no workspace. During such an error, a Liferay Data Platform order or a Salesforce opportunity creates a second workspace for the account. | P0 | LPD-102451 | — |
| TECH-CONSOLE-057 | Known defect: a Digital Sales Room order from the purchase flow creates a workspace with no lookup first. A repeated request for the same order sends a second create, and Analytics Cloud must refuse it. | P1 | LPD-102451 | `FLOW-DIGITAL-SALES-ROOM-SIGNUP` |
| TECH-CONSOLE-058 | The create request has no retry. When Analytics Cloud refuses it or cannot be reached, a purchase flow order records the error in `ldpError` or `dsrError` and is cancelled. A Salesforce opportunity records the same error with its date, adds a warning to the provisioning issue, and does not cancel the order. | P0 | LPD-102451, LPD-104271 | `REST-POST-LIFERAY-DATA-PLATFORM-PROVISIONING-ORDERID`, `SVC-PROVISIONINGANALYTICSCLOUDSERVICE` |
| TECH-CONSOLE-059 | A Salesforce opportunity skips an order that already holds a workspace, and provisions one account at a time in one service instance. A repeated opportunity event creates no second workspace. | P0 | LPD-104271 | `SVC-PROVISIONINGANALYTICSCLOUDSERVICE`, `SUB-SALESFORCEOPPORTUNITYPUBSUBSUBSCRIBER` |

## DataOps Metrics API

The usage rules are in [`../../business/usage-and-utilization.md`](../../business/usage-and-utilization.md). This section keeps only the interface.

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-CONSOLE-060 | Liferay One reads usage from DataOps with five GET resources. Below `liferay.one.gcf.base.url`, it calls `/composable_usage_api/api/v1/accounts/{accountKey}/usage/month/{month}` and `/customer_usage_api/api/v1/customer/usage/accounts/{accountKey}`. Below `liferay.one.ldp.base.url`, it calls `/api/v1/projects/{salesforceProjectId}/ldp/usage` and its `/event-summary` and `/event-history` resources. The month uses the format `yyyy-MM` in UTC. See TECH-USAGE-005. | P1 | LPD-107346 | `SVC-DATAOPSUSAGESERVICE`, `REST-GET-PROJECTS-EXTERNALREFERENCECODE-USAGE`, `REST-GET-PROJECTS-EXTERNALREFERENCECODE-USAGE-EVENT-SUMMARY`, `REST-GET-PROJECTS-EXTERNALREFERENCECODE-USAGE-EVENT-HISTORY` |
| TECH-CONSOLE-061 | Liferay One sends a Google ID token whose audience is the base URL of the function. Each endpoint impersonates its own service account from `liferay.one.gcf.composable.service.account`, `liferay.one.gcf.customer.service.account`, or `liferay.one.ldp.service.account`. An empty property uses the default credentials. Liferay One keeps each answer for 1 hour, also an answer of no data, and keeps no failure. | P1 | LPD-107668 | `SVC-DATAOPSUSAGESERVICE` |
| TECH-CONSOLE-062 | A 404 answer means no data. Any other error, a failed connection, or a failed sign in marks DataOps as not available, and the dashboard still shows its limits. The dashboards read fixed field names, for example `usage`, `eventSummary`, and `totalSitesCount`. A renamed field shows as no usage and gives no error. | P1 | LPD-107346 | `SVC-DATAOPSUSAGESERVICE`, `FLOW-UTILIZATION-TRACKING`, `CLS-EXPERIENCEUSAGESTRATEGY`, `CLS-SAASUSAGESTRATEGY`, `CLS-LDPUSAGESTRATEGY`, `CLS-LDPEVENTSUMMARY` |

## Liferay Releases Feed

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-CONSOLE-070 | Liferay One reads the releases feed at `liferay.one.product.version.sync.releases.url` with no authentication. It reads the feed at startup and on the schedule `liferay.one.product.version.sync.cron`, which is each Sunday at midnight by default. | P1 | LPD-89617 | `CRON-SYNCPRODUCTVERSIONS`, `LSN-PRODUCTVERSIONSERVICE-ONAPPLICATIONREADY`, `SVC-PRODUCTVERSIONSERVICE` |
| TECH-CONSOLE-071 | The feed is a JSON array. Liferay One reads `product`, `productGroupVersion`, `productMajorVersion`, `productVersion`, and `tags` from each item, for the groups in `liferay.one.product.version.sync.product.groups`. A `supported` tag marks a supported version. Liferay One writes each version with a PUT by external reference code, which is the version name, so a repeated sync updates the same records. | P1 | LPD-89617, LPD-102450 | `SVC-PRODUCTVERSIONSERVICE`, `CLS-PRODUCTVERSION` |
| TECH-CONSOLE-072 | When the feed cannot be read, the sync stops and the stored versions stay. A failed write of one version goes to the log and does not stop the others. The free tier uses the latest stored supported DXP version, or `7.4` when there is none. See TECH-PLATFORM-020. | P1 | LPD-89617, LPD-97364 | `SVC-PRODUCTVERSIONSERVICE` |

## Shared Transport

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-CONSOLE-080 | Known risk: no request to the Console, Analytics Cloud, DataOps, or the releases feed sets a response timeout. A system that accepts the connection and does not answer holds the calling thread with no limit. | P1 | — | — |
# Usage and Utilization

This area covers how the system measures what a project consumes against what its entitlements allow. It includes the usage dashboards of the Utilization tab, the proxy to the Liferay Data Platform metrics of the DataOps Metrics API, the monthly usage reports for Liferay Data Platform events, the usage of self hosted products and cloud projects, and the purchase of AI Hub tokens. Consumption metering and consumption billing are specified but not built. The rules that create entitlements and name them belong to the entitlements area.

The actors are a project member, the account members who can see license keys, the global administrator roles, the reviewer of usage reports, and the scheduled jobs of the system.

Terms used in this file:

- **Usage dashboard**: the view of the Utilization tab that compares the consumption of one product with the limits that the entitlements of the project allow.
- **DataOps**: the data warehouse service that reports consumption. The system calls it through Google Cloud functions.
- **Allotment**: the number of Liferay Data Platform events that a project may use in one month.
- **Add on bucket**: a fixed number of extra events that a customer buys on top of the base allotment. The usage definition of the metric sets the bucket size.
- **Usage report**: the record of the consumption of one project for one month, with any overage that a reviewer must handle.
- **Overage**: the consumption above the entitled quantity. The system bills it in whole buckets.

## Usage Dashboard

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-USAGE-001 | A user can see the usage of a project only with permission to view that project. | P0 | LPD-88249 | `PERM-PROJECTPERMISSION`, `REST-GET-PROJECTS-EXTERNALREFERENCECODE-USAGE`, `REST-GET-PROJECTS-EXTERNALREFERENCECODE-USAGE-EVENT-SUMMARY`, `REST-GET-PROJECTS-EXTERNALREFERENCECODE-USAGE-EVENT-HISTORY` |
| REQ-USAGE-002 | A usage dashboard shows one product. The `project-utilization-profile` specification of that product must be `experience-dashboard`, `usage-metrics`, or `saas-plan-dashboard`, and this profile selects the dashboard. The system refuses any other product as a bad request. | P1 | LPD-91383 | `REST-GET-PROJECTS-EXTERNALREFERENCECODE-USAGE` |
| REQ-USAGE-003 | The limits of a dashboard come from the active entitlements of the project whose names the dashboard reads. An entitlement with a different name does not change the limits. | P0 | LPD-91383 | `REST-GET-PROJECTS-EXTERNALREFERENCECODE-USAGE`, `CLS-SAASUSAGESTRATEGY`, `CLS-EXPERIENCEUSAGESTRATEGY`, `CLS-LDPUSAGESTRATEGY` |
| REQ-USAGE-004 | The consumption comes from DataOps. An experience dashboard reads the account usage of the current UTC month. A Liferay Data Platform dashboard reads the project usage. A SaaS plan dashboard reads the customer account usage. | P1 | LPD-91383, LPD-107346 | `SVC-DATAOPSUSAGESERVICE`, `REST-GET-PROJECTS-EXTERNALREFERENCECODE-USAGE` |
| REQ-USAGE-005 | DataOps identifies an account by its Koroneiki account key. When the account has no such key, the system uses the external reference code of the account. DataOps identifies a project by its Salesforce project ID. | P1 | LPD-91383 | `REST-GET-PROJECTS-EXTERNALREFERENCECODE-USAGE`, `SVC-DATAOPSUSAGESERVICE` |
| REQ-USAGE-006 | When DataOps cannot be reached or has no data, the dashboard still shows the limits from the entitlements. It marks the usage data as not available and does not fail. | P1 | LPD-91383 | `SVC-DATAOPSUSAGESERVICE`, `REST-GET-PROJECTS-EXTERNALREFERENCECODE-USAGE`, `CLS-BASEUSAGESTRATEGY` |
| REQ-USAGE-007 | The system keeps each DataOps answer for one hour. Each DataOps endpoint signs in with its own Google service account. | P2 | LPD-107668 | `SVC-DATAOPSUSAGESERVICE` |

## Usage Calculation

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-USAGE-010 | The limit of a metric is the sum of the quantities of the matching entitlements. An entitlement with the unlimited grant type, or a negative quantity, makes the metric unlimited. | P0 | LPD-91383 | `CLS-BASEUSAGESTRATEGY`, `CLS-SAASUSAGESTRATEGY`, `CLS-EXPERIENCEUSAGESTRATEGY`, `CLS-LDPUSAGESTRATEGY` |
| REQ-USAGE-011 | The percentage of a metric is the usage divided by the limit, rounded to two decimals. An unlimited metric, a zero limit, or a metric without usage data shows zero percent. | P1 | LPD-91383 | `CLS-BASEUSAGESTRATEGY` |
| REQ-USAGE-012 | The system measures capacity in GiB. It converts an entitlement in TiB to GiB. It shows a value of 1024 GiB or more in TiB. It converts experience usage in bytes to whole GiB, rounded down. | P1 | LPD-91383 | `CLS-BASEUSAGESTRATEGY`, `CLS-EXPERIENCEUSAGESTRATEGY` |
| REQ-USAGE-013 | The dashboard warns of overage charges when any metric is above 100 percent. It does not show this warning when the usage data is not available. It shows "Unlimited" for an unlimited limit. | P1 | — | `MOD-MYACCOUNT-PROJECTS-USAGEMETRICDISPLAYUTILS` |

## Liferay Data Platform Events

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-USAGE-020 | A project member can read the event summary and the event history of a project for a date range. The dates use the format yyyy-MM-dd, and the start date is not after the end date. | P1 | LPD-107346 | `REST-GET-PROJECTS-EXTERNALREFERENCECODE-USAGE-EVENT-SUMMARY`, `REST-GET-PROJECTS-EXTERNALREFERENCECODE-USAGE-EVENT-HISTORY` |
| REQ-USAGE-021 | A date range is 10 years or less. The event history groups events by day or by month, and a daily history covers 1 year or less. The system refuses any other request as a bad request. An unknown project answers not found. | P1 | LPD-107346 | `REST-GET-PROJECTS-EXTERNALREFERENCECODE-USAGE-EVENT-HISTORY`, `REST-GET-PROJECTS-EXTERNALREFERENCECODE-USAGE-EVENT-SUMMARY` |
| REQ-USAGE-022 | The event allotment of a project is the quantity of its base events entitlements plus its add on buckets multiplied by the bucket size. Overage bucket entitlements do not add to the allotment. | P0 | LPD-99837 | `CLS-LDPEVENTALLOTMENT`, `CLS-LDPEVENTUSAGESTRATEGY`, `CLS-USAGEDEFINITION`, `CLS-ENTITLEMENTUTIL` |
| REQ-USAGE-023 | The used events are the total of the event summary. When only a history is present, the system adds the events of all of its periods. | P1 | LPD-107346 | `CLS-LDPEVENTUSAGESTRATEGY`, `CLS-LDPEVENTSUMMARY` |
| REQ-USAGE-024 | When DataOps has no event data, the answer still contains the allotment and marks the usage data as not available. | P1 | LPD-107346 | `CLS-LDPEVENTUSAGESTRATEGY`, `SVC-DATAOPSUSAGESERVICE` |
| REQ-USAGE-025 | The events widget shows one UTC day or one UTC month. It names the number of add on buckets above the base allotment and the days until the contract renews. | P2 | — | `HOOK-MYACCOUNT-PROJECTS-USEPROJECTEVENTUSAGE`, `HOOK-MYACCOUNT-PROJECTS-USEPROJECTEVENTHISTORY` |

## Monthly Usage Reports

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-USAGE-030 | At 02:00 UTC on the first day of each month, the system generates the Liferay Data Platform event usage reports for the previous month. | P0 | LPD-99837 | `CRON-SCHEDULEDGENERATEUSAGEREPORTS`, `SVC-LDPEVENTUSAGEREPORTSERVICE` |
| REQ-USAGE-031 | An administrator can generate the reports for one month. Without a month, the system uses the previous month. The system refuses the current month, a future month, and a month that does not use the format yyyy-MM. | P0 | LPD-99837, LPD-107012 | `REST-POST-ADMIN-LDP-EVENT-USAGE-REPORTS-GENERATE`, `PERM-ADMINPERMISSION` |
| REQ-USAGE-032 | A report covers each project with an events entitlement or an add on bucket entitlement that is active during any part of the month. An entitlement without a project is not in any report. | P0 | LPD-99837 | `SVC-LDPEVENTUSAGEREPORTSERVICE`, `SVC-ENTITLEMENTSERVICE` |
| REQ-USAGE-033 | The system generates at most one report for each project and month. When the report already exists, the system does not change it. | P0 | LPD-99837 | `SVC-LDPEVENTUSAGEREPORTSERVICE`, `SVC-USAGEREPORTSERVICE`, `CRON-SCHEDULEDGENERATEUSAGEREPORTS` |
| REQ-USAGE-034 | The system makes no report for a project with an unlimited allotment, a project without a usage definition, or a project without event data for the month. It makes no report when the project has add on buckets but the usage definition has no bucket size. | P0 | LPD-99837, LPD-107012 | `SVC-LDPEVENTUSAGEREPORTSERVICE`, `CLS-LDPEVENTALLOTMENT` |
| REQ-USAGE-035 | A failure for one project does not stop the reports of the other projects. | P1 | LPD-99837 | `SVC-LDPEVENTUSAGEREPORTSERVICE` |
| REQ-USAGE-036 | A report records the used quantity, the entitled quantity, and the overage. The overage is the used quantity minus the entitled quantity, and never less than zero. A report with overage is ready for review. A report without overage is complete. | P0 | LPD-99837 | `SVC-USAGEREPORTSERVICE`, `CLS-USAGEREPORT` |
| REQ-USAGE-037 | The system bills overage in whole buckets. The bucket count is the overage divided by the bucket size, rounded up. The amount is the bucket count multiplied by the overage rate. | P0 | LPD-99837, LPD-107013 | `CLS-USAGEDEFINITION`, `CLS-OVERAGEPRICING`, `SVC-USAGEREPORTSERVICE` |
| REQ-USAGE-038 | When the events entitlements of a project have no overage price or conflicting overage prices, the report still records the overage. It leaves the SKU, the bucket count, and the amount empty for the reviewer. | P0 | LPD-99837, LPD-107013 | `SVC-LDPEVENTUSAGEREPORTSERVICE`, `CLS-LDPEVENTALLOTMENT`, `CLS-OVERAGEPRICING` |
| REQ-USAGE-039 | A report links to its project and its usage definition. It records the account and the contract of the project so that a later order needs no other lookup. | P1 | LPD-99837 | `SVC-USAGEREPORTSERVICE` |

## Self Hosted Product Usage

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-USAGE-040 | A user can read the usage of a self hosted product only with permission to view the license keys of the account. Only DXP, Portal, and Portal EWSA have this report. Another product, or a product that the account does not hold, answers not found. | P0 | LPD-91426 | `REST-GET-ACCOUNTS-ACCOUNTKEY-PRODUCTS-PRODUCTEXTERNALREFERENCECODE-USAGE`, `PERM-LICENSEKEYPERMISSION` |
| REQ-USAGE-041 | The report gives, for the previous, the current, and the next year, the highest number of concurrent subscriptions and of concurrent license keys. It also gives the number of license keys in use now. Only the license keys of those entitlements count. | P1 | LPD-91426 | `REST-GET-ACCOUNTS-ACCOUNTKEY-PRODUCTS-PRODUCTEXTERNALREFERENCECODE-USAGE`, `CLS-TERMCOUNTUTIL` |
| REQ-USAGE-042 | A term without a start date starts at the beginning of the previous year. A term without an end date ends at the beginning of the next year. A term that ended before the previous year does not count. | P1 | LPD-91426 | `CLS-TERMCOUNTUTIL` |

## Cloud Project Usage

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-USAGE-050 | A signed in user can read the Console usage of a cloud project only when one of the Console projects of that user contains the project. Otherwise the system answers not found. | P0 | — | `REST-GET-DXP-PROJECT-USAGE` |
| REQ-USAGE-051 | A signed in user can read the Console usage of all of the Console projects of that user, and of no other projects. | P1 | — | `REST-GET-CONSOLE-PROJECTS-USAGE` |

## Utilization Tab

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-USAGE-060 | The product specification for the project utilization profile selects the Utilization tab view. The six profiles are AI Hub, experience dashboard, legacy, SaaS plan dashboard, usage metrics, and none. An unknown value means none, and none hides the tab. | P1 | — | `MOD-MYACCOUNT-PROJECTS-RESOLVEUTILIZATIONPROFILE`, `MOD-MYACCOUNT-PROJECTS-RESOLVEPRODUCTTABCONFIG` |
| REQ-USAGE-061 | The AI Hub profile shows past token purchases. The legacy profile shows the legacy billing notice. The dashboard profiles show the usage dashboard. The usage metrics profile shows the Liferay Data Platform summary, events, and history. | P1 | — | `FLOW-UTILIZATION-TRACKING`, `MOD-MYACCOUNT-PROJECTS-RESOLVEUTILIZATIONPROFILE` |
| REQ-USAGE-062 | The One Time Purchases project shows no usage dashboard and sends no usage request. | P1 | — | `HOOK-MYACCOUNT-PROJECTS-USEPROJECTUSAGEDASHBOARD`, `HOOK-MYACCOUNT-PROJECTS-USEPROJECTEVENTUSAGE`, `HOOK-MYACCOUNT-PROJECTS-USEPROJECTEVENTHISTORY` |
| REQ-USAGE-063 | The usage card of any other profile sums the usage events of the project against its allowances. Add on buckets multiply by the bucket size, and overage buckets do not count. A monthly metric counts only the latest month. | P1 | — | `HOOK-USEPROJECTUSAGE`, `FLOW-UTILIZATION-TRACKING` |
| REQ-USAGE-064 | When the usage request fails, the tab shows that usage is not available. When no metric has a value, the tab shows the empty utilization card. | P2 | — | `FLOW-UTILIZATION-TRACKING` |

## AI Hub Tokens

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-USAGE-070 | A customer can buy Liferay tokens only for a project with a completed AI Hub order. The token order takes its contract from that AI Hub order. The system refuses a project without such an order. | P0 | LPD-90605 | `CLIENT-COMMERCE-PRODUCTPURCHASEAIHUBTOKEN`, `FLOW-AI-HUB-PURCHASE` |
| REQ-USAGE-071 | When a token order completes, the system buys one prepaid quota block on the AI Hub of the project. The block size of each order item is the default quantity of the `aiTokenBlock` entitlement definition of its SKU, multiplied by its quantity. | P0 | LPD-90605 | `SVC-AIHUBSERVICE`, `FLOW-AI-HUB-PURCHASE` |
| REQ-USAGE-072 | The system buys the quota block of an order only once. The order ID identifies the purchase to AI Hub. A repeated completion of the same order buys nothing more. | P0 | LPD-90605 | `SVC-AIHUBSERVICE`, `FLOW-AI-HUB-PURCHASE` |
| REQ-USAGE-073 | The system does not complete a token order when the project has no AI Hub or the order has no token item. | P0 | LPD-90605 | `SVC-AIHUBSERVICE`, `FLOW-AI-HUB-PURCHASE` |
| REQ-USAGE-074 | A token order never counts as the order of the AI Hub product on the product detail page. | P1 | — | `HOOK-USEPROJECTORDERS` |

## Not Yet Built

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-USAGE-080 | The system meters the usage of each account and each project and adds it up into billable consumption records for each billing cycle. | P0 | LPD-88265 | `FLOW-CONSUMPTION-METERING` |
| REQ-USAGE-081 | The system turns the consumption of a billing cycle into Stripe charges or invoice lines. It bills the overage above the allowance of the plan. A second run for the same cycle bills nothing more. | P0 | LPD-88265 | `FLOW-CONSUMPTION-BILLING` |
| REQ-USAGE-082 | When a reviewer approves a usage report, the system creates one overage order for the bucket SKU, records the order on the report, and sends it to Salesforce. It refuses a report without a SKU. A completed report creates no order. | P0 | LPD-88265 | `FLOW-CONSUMPTION-BILLING` |
| REQ-USAGE-083 | The monthly usage reports cover every metered entitlement, not only Liferay Data Platform events. | P1 | LPD-88265 | `FLOW-CONSUMPTION-METERING` |
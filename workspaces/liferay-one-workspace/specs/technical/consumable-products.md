# Consumable Products

How a metered product gets its monthly usage reports, and what it takes to add a new one. The short version: a consumable product is **data**. Once its rows are in place the usage report generator picks it up on the next run without a code change, unless its consumption comes from an API shape nothing reads yet.

## What "Consumable" Means Here

A consumable product sells a metered quantity, called a **metric**, with a cap for the billing period. Usage past the cap is **overage**, sold in whole **buckets**. Once a month `UsageReportGenerator` (in `liferay-one-etc-spring-boot`) produces one `UsageReport` per project per metric: what the project consumed, what it was entitled to, the difference, and, when the data allows, the overage SKU and bucket count a reviewer turns into an order. The reviewer flow and the order are described under **UsageReport** in [`data-model.md`](./data-model.md).

Liferay Data Platform events are the worked example throughout. The SaaS Experience and PaaS Experience metrics (LPD-100232) are the second type, and [Second Type: Experience Metrics](#second-type-experience-metrics) lists what they needed.

## The Five Pieces

Everything the generator needs lives in one of these. The first four are seed data under `scripts/seed/data` and the batch client extension; only the fifth is code, and only sometimes.

### 1. A `UsageDefinition` Per Metric

The metric itself: what is counted, in what unit, how big a bucket is, and where the consumed number comes from.

```json
{
	"aggregationType": "count",
	"externalReferenceCode": "events-monthly",
	"overageBucketSize": 200000,
	"period": "per month",
	"unit": "events",
	"usageSource": "ldp-event-summary",
	"usageSourceMetricKey": "eventsCount",
	"usageSourceUnit": "events"
}
```

- `unit` is the unit the metric is sold and reported in.
- `overageBucketSize` is the number of units one add-on or overage bucket covers. Leave it unset and overage is not billable: the report still records the delta but carries no SKU or bucket count.
- `usageSource` names the API shape the consumed number is read from. Each value maps to one `UsageSource` class in code (see piece 5). **A definition without a source is never reported**, which is how `storage-gb` and friends stay out of the run today.
- `usageSourceMetricKey` is the field the adapter reads from that API's response.
- `usageSourceUnit` is the unit that field arrives in when it differs from `unit`, for example `bytes` for a metric sold in `GiB`. Leave it unset when the API already reports in `unit`.

File: `client-extensions/liferay-one-batch-products/batch/00-usage-definition.batch-engine-data.json` for a Salesforce SKU, and `scripts/seed/data/13-usage-definition.batch-engine-data.json` for any other SKU.

### 2. A Product Whose SKUs Carry a Consumption Role

A consumable product has one SKU per role, told apart by the `consumption-role` option (`LO_OPTION_CONSUMPTION_ROLE`, defined in `client-extensions/liferay-one-batch/batch/09-commerce-option.batch-engine-data.json`):

| Role | Meaning | Example SKU |
|---|---|---|
| `allotment` | The base cap the subscription includes. Also where overage pricing lives. | `KOR-17691626` (LIFERAY DATA PLATFORM) |
| `add-on` | Prepaid extra buckets bought up front. Quantity is a bucket count. | `KOR-17691654` (ADDITIONAL EVENTS) |
| `overage` | Buckets billed after the fact on an overage order. Never counts toward a cap. | `KOR-17691682` (OVERAGE EVENTS) |

Every SKU that grants an entitlement linked to a metric must set its role, including the plain subscription SKU. When one of a project's SKUs has no `consumption-role` option, the generator skips that project and logs an error naming the SKU, because guessing the role risks a wrong cap on a bill. A SKU with a role value outside this table is ignored.

The product declares the option under `productOptions` and each SKU sets its value under `skuOptions`. File: `scripts/seed/data/06-commerce-product.batch-engine-data.json`.

### 3. An `EntitlementDefinition` Per SKU, Linked to the Metric

This is the join. An entitlement definition says what one SKU grants and which metric it counts toward. The link `r_usageDefinitionToEntitlementDefinition_c_usageDefinitionERC` is how the generator finds a metric's entitlements; the entitlement's `name` plays no part.

```json
{
	"active": true,
	"defaultQuantity": 1000000,
	"displayName": "Events",
	"externalReferenceCode": "C_ENT_DEF_DATA_PLATFORM_EVENTS",
	"grantType": "fixed",
	"name": "events",
	"overageRate": 20,
	"overageSkuExternalReferenceCode": "KOR-17691682",
	"r_usageDefinitionToEntitlementDefinition_c_usageDefinitionERC": "events-monthly",
	"skuExternalReferenceCode": "KOR-17691626",
	"unit": "count"
}
```

- `defaultQuantity` and `unit` are the cap this SKU grants. For an add-on SKU the quantity is a bucket count (`1`), multiplied by the metric's `overageBucketSize` at report time.
- `unit` may differ from the metric's `unit`. Byte scale units (`bytes`, `GB`, `GiB`, `TB`, `TiB`) are converted; any other pair, such as `count` and `events`, is taken as the same thing spelled two ways. A byte scale unit paired with anything else is a mismatch and the project is skipped with an error.
- `overageSkuExternalReferenceCode` and `overageRate` go on the **allotment** definition only. The SKU is necessary for the report to carry an overage SKU and a bucket count. The rate is optional. When it is not set, the report carries the SKU and the bucket count with no amount, and BizOps prices the overage downstream. A rate without a SKU is refused. Both are copied onto each entitlement at grant time, so a later price change never reprices an existing grant. When a project's allotments disagree on the SKU or the rate, or carry no SKU, the report carries no SKU, no bucket count, and no amount, for the reviewer to handle.
- `grantType: unlimited`, or a negative quantity, means the project is skipped: there is nothing to exceed.
- `productOptions` restricts the definition to order items carrying matching SKU options. This is how one SKU sells several cap tiers: a `{"machineType": "standard"}` row and a `{"machineType": "high"}` row under the same SKU.

The automatic generation from products only covers paid apps with a license usage type, so a consumable needs a definition from a file. File: `client-extensions/liferay-one-batch-products/batch/01-entitlement-definition.batch-engine-data.json` for a Salesforce SKU, and `scripts/seed/data/15-entitlement-definition.batch-engine-data.json` for any other SKU. Add a Salesforce definition to that batch file, and the next deploy of the batch writes it to each environment.

### 4. Entitlements, Which You Do Not Write

When an order item is placed, one `Entitlement` is created per active definition of its SKU, scoped to the order's project. That flow already exists and is not specific to consumables. The generator reads entitlements whose dates overlap the month being reported, grouped by project.

### 5. A `UsageSource`, Only for a New API Shape

`UsageSource` (in `com.liferay.one.usage`) reads one metric's consumption for one project and month from one DataOps API. Spring collects every implementation automatically and the generator picks the one whose `getKey()` matches the definition's `usageSource`.

An adapter knows the response layout, not the metric: it reads whatever field `usageSourceMetricKey` names. So a second metric served by an API that already has an adapter is seed data only. A new API shape is one new class implementing two methods, plus a route and a fixture in the DataOps mock (`client-extensions/liferay-one-gcf-mock`, described in `scripts/gcf-mock/README.md`) so it can be exercised locally.

Adapters that exist:

| Key | Class | API | Keyed By |
| --- | --- | --- | --- |
| `composable-account-usage` | `ComposableAccountUsageSource` | Composable usage API, one month of a project | The project's Salesforce project ID |
| `ldp-event-summary` | `LDPEventSummaryUsageSource` | Liferay Data Platform Metrics API event summary | The project |

## How the Generator Reads It

The run happens on the cron in `liferay.one.usage.report.cron` (UTC) for the previous calendar month, or on demand through `POST /admin/usage-reports/generate?yearMonth=yyyy-MM` for any complete month. For each usage definition with a source:

1. Fetch the entitlements of every definition linked to the metric that overlap the month, and group them by project.

1. Look up each entitlement's SKU role (cached an hour).

1. Roll up the allotment: allotments add their quantity in the metric's unit, add-ons add buckets times bucket size, overage buckets are ignored. Unlimited means skip. Add-on buckets with no bucket size means skip with an error, since the cap is unknowable.

1. Skip when a report with this month's ERC already exists, so a rerun is safe.

1. Read consumption through the adapter and convert it to the metric's unit. No data means skip with a warning, not a zero.

1. Write the report. The ERC is `C_USAGE_REPORT_<PROJECT>_<USAGE_DEFINITION>_<yyyy_MM>`, with hyphens turned to underscores and uppercased. The product recorded on it is the one whose SKU granted the allotment.

Delta at or below zero gives a `completed` report; anything over gives `readyForReview`. One project failing never stops the others; every skip is logged with the project and metric.

## Checklist: Adding a New Consumable Type

What product management decides, per metric:

- Its name, unit, and period, and how many units one bucket covers.
- The cap each tier of the product includes, and which SKU option tells the tiers apart.
- Whether extra buckets can be bought up front, and whether overage is billed after the fact. Each is its own SKU.
- The overage SKU and the price of one bucket.
- Which DataOps API reports the consumption, which field, in what unit, and how many days after month end the number is complete.

What development seeds, in this order:

1. The product's SKUs with their `consumption-role` values in `06-commerce-product`.

1. The `UsageDefinition` in `00-usage-definition` of the Salesforce product batch, or in seed `13-usage-definition`, with `usageSource`, `usageSourceMetricKey`, and `usageSourceUnit`.

1. One `EntitlementDefinition` per SKU in `01-entitlement-definition` of the Salesforce product batch, or in seed `15-entitlement-definition`, each linked to the metric, with pricing on the allotment row and `productOptions` for tiers.

1. Only if the API shape is new: a `UsageSource` implementation and a mock fixture.

Then reseed, place an order for the product against a project, and trigger a complete month through the admin endpoint. The report should appear under Usage Reports in the Objects admin UI with the product, both quantities, and the delta.

## Second Type: Experience Metrics

SaaS Experience and PaaS Experience each sell six metrics: client extension RAM, client extension vCPUs, storage, database, traffic, and logs. The Utilization tab already read them from the composable usage API, so the monthly reports needed these pieces and no change to the generator:

1. One adapter, `ComposableAccountUsageSource`. It reads the field that the metric key names under `usage`, for the month and the project's Salesforce project ID.

1. Six usage definitions, `experience-database-monthly`, `experience-extensions-ram-monthly`, `experience-extensions-vcpus-monthly`, `experience-logs-monthly`, `experience-storage-monthly`, and `experience-traffic-networking-monthly`. The byte metrics have `usageSourceUnit` `bytes` and `unit` `GiB`. vCPUs are `vCPU` on both sides.

1. The links from the PaaS Experience and SaaS Experience entitlement definitions, and from the Additional vCPU definition, to those usage definitions.

1. Three SKU roles: `allotment` on the PaaS Experience and SaaS Experience SKUs, `add-on` on the Additional vCPU SKU, and `overage` on the twelve overage SKUs. Each of the three products also declares the `consumption-role` option.

1. One mock route for the composable usage API, with a month under every allotment and a month over all six.

Each metric has one overage SKU, which PaaS Experience and SaaS Experience share: the six supplemental SKUs of `salesforce-product-pay-as-you-go-usage`, for example `01tVO00000QiCQ0YAN`, Client Extensions vCPU's (1 vCPU) - Supplemental. Each allotment definition sets `overageSkuExternalReferenceCode` to its overage SKU and leaves `overageRate` unset. Each overage SKU also has one entitlement definition, `C_ENT_DEF_EXPERIENCE_<METRIC>_OVERAGE`, so an overage order item creates its entitlement as the Liferay Data Platform overage bucket does. UAT does not give these SKUs the `overage` consumption role yet, so `05-commerce-product` of the Salesforce product batch sets it. Every Experience usage definition has an `overageBucketSize` of 1, so one bucket is one GiB or one vCPU. A report with overage therefore carries the overage SKU and the bucket count, and leaves the amount empty. BizOps prices the overage order in Salesforce. The bucket size of 1 also measures the Additional vCPU add on, whose entitlement quantity is 4 vCPUs.

**A usage definition is one metric from one source.** `storage-gb` already counted the SaaS plan document library, the storage add on, and PaaS storage, all as seed data with no source. Pointing it at the composable usage API would read Experience storage for the SaaS plan projects too, which is a different number from a different product. So Experience storage has its own definition, and `C_ENT_DEF_PAAS_STORAGE` and `C_ENT_DEF_SAAS_STORAGE` moved to it. When a metric name already has a usage definition, check every entitlement definition linked to it before you give it a source.

## Pitfalls

- A definition the generator cannot find the source for is logged and skipped, not failed. Check the log for `Unable to find usage source` after seeding a new metric.
- A SKU option only exists when its option does. If the `consumption-role` option is missing from an environment, the product import drops every role silently and the generator skips every project with `have no consumption-role option`.
- The entitlement window is `startDate < month end` and `endDate >= month start`, so an order placed mid-month is reported for that month in full.
- A project is reported only while an `allotment` SKU grants it the metric. A project that holds only an add on, such as the vCPU add on sold with the SaaS plans, or only the overage bucket of a month that has ended, is skipped with a warning. Without this rule the add on or a zero would be the cap and the whole month would be overage.
- Several allotments for the same metric and project add up. Two orders for the same product double the cap, which is intended for add-ons and worth knowing for plain subscriptions.
- Changing a report ERC scheme, a bucket size, or a cap never rewrites existing reports. They are an audit trail.
- An add on SKU whose entitlement quantity is in the metric's unit, such as 4 vCPUs, still counts as buckets. Give its usage definition an `overageBucketSize` of 1, or every project with the add on is skipped because its cap is unknown.
- A metric whose allotment has no overage SKU logs `Unable to price the ... overage` when a project goes over. The report is still written with the delta, but with no SKU and no bucket count. A metric with an overage SKU and no rate logs nothing: its report carries the SKU and the bucket count with no amount.
- An account keyed source gives every project of an account the same consumption. The generator reports an account only while one of its projects would be reported for the metric. When two reportable projects share the account, both are skipped with a warning, because each would otherwise report the full account usage against its own allotment. A project skipped for another reason, such as one holding only buckets, does not count against its account. Which project should carry the account's usage is an open question on LPD-100232.
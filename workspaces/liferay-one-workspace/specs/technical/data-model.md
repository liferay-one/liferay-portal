# Data Model

## Liferay One Objects

---

### Account Management

#### Account (`AccountEntry` — core extension)

**system:** `true`

| Field | Type | Notes |
|---|---|---|
| PK `accountEntryId` | long | |
| `externalReferenceCode` | string | Salesforce Account.Id (18-char); unique |
| `name` | string | |
| `description` | string | Prefer Salesforce; fall back to Marketplace |
| `logoId` | long | |
| `parentAccountEntryId` | long | Force NULL; child account hierarchy lives on Contract |
| `type` | string | `business` · `person` |
| `userId` | long | FK to User; Person-type accounts only |
| `status` | string | `approved` · `inactive` · `closed` |
| `taxId` | string | OOTB field |
| `defaultBillingAddressId` | long | FK to Address |
| `defaultShippingAddressId` | long | FK to Address |
| `internal` | boolean | Liferay employee test accounts |
| `maxRequestors` | int | Cap on requestor seats; null = unlimited |
| `creditLimit` | decimal | Liferay finance-set, A/R risk control |
| `availableCredit` | decimal | |
| `creditStatus`, `holdReason` | string | |

**Custom fields:** `accountTier` (Platinum / Gold / Silver / Bronze / Trial / Community), `accountCode` (migrated Koroneiki accountKey), `allowComplimentary` (boolean), `allowPermanentLicenses` (boolean), `allowSelfProvisioning` (boolean), `AccountType`

---

#### AccountNote (`C_ACCOUNT_NOTE`)

**system:** `false`

| Field | Type | Notes |
|---|---|---|
| PK `accountNoteId` | long | |
| `uuid` | string | Preserved from Koroneiki for cross-system traceability |
| `externalReferenceCode` | string | Migrated Koroneiki `accountNoteKey` |
| FK `accountEntryId` | long | |
| `summary` | string | |
| `content` | Clob | |
| `format` | picklist | |
| `type` | picklist | |
| `priority` | picklist | |
| `status` | picklist | |
| `createDate` | datetime | |
| `createdByUserId` | long | FK to User |
| `createdByUserName` | string | Frozen at creation; do not overwrite on edit |
| `modifiedDate` | datetime | |
| `modifiedByUserId` | long | FK to User |
| `modifiedByUserName` | string | |
| `koroneikiAccountKey` | string | Parent Koroneiki accountKey; migration traceability |
| `projectId` | long | FK to Project |

---

#### Organization (`L_ORGANIZATION` — core system object)

**system:** `true`

Liferay system Organization, migrated from support.liferay for FLS (First Line Support) and Liferay-internal orgs only. Partner-account orgs are migrated separately by the partner-account team. Wired for JSM team sync via `onAfterAdd`/`onAfterUpdate`/`onAfterDelete` object actions.

| Field | Type | Notes |
|---|---|---|
| PK `organizationId` | long | |
| `name` | string | Copied from Support Organization name |
| `accountEntryId` | long | Custom field — owning account, e.g. Accenture FLS → Accenture account. Must be a plain field, not a relationship: Liferay forbids object relationships between two system objects (`L_ACCOUNT` and `L_ORGANIZATION` are both system). |

**Relationships:**

- `organizationToProject` (`L_ORGANIZATION → C_PROJECT`, one-to-many, disassociate) — the FLS partner use case: which customer projects an org supports. A project is supported by at most one org. Valid because `C_PROJECT` is a custom object. Drives partner-scoped project visibility (VIEW permission + restricted-page gating are a dependent follow-up).

---

### Subscription Management

#### Commerce Product (CPDefinition with custom fields)

**system:** `true`

| Field | Type | Notes |
|---|---|---|
| PK `CProductId` | long | |
| `externalReferenceCode` | string | Source-specific (`PRDCT-*` for seeded and Marketplace products). Not a lookup key; the Salesforce key lives on the SKU. Salesforce events never create products; they only update the SKU carrying the Salesforce ID |
| `catalog` | string | `Liferay` · `AccountEntry` |
| `name` | string | |
| `description` | string | |
| `isPrimary` | boolean | Default `false` |
| `licenseKeyProductVersion` | string | Version string in generated keys, e.g. `dxp-7.4`; null for non-key products |
| `productFamily` | picklist | DXP · Portal · SaaS · PaaS · Commerce · Analytics · EnterpriseSearch · AIHub · CMP · DataPlatform · DSR · Partner · Support · Training · Other. Normalized from SFDC `Product2.Family` (LXC → SaaS, DXP Cloud → PaaS, Commerce/Commerce Cloud → Commerce, Enterprise Search + Cloud → EnterpriseSearch). CMP is the Content Marketing Platform; Data Platform and Digital Sales Room (DSR) are their own families. Seeded as a `product-family` product specification. |
| `metricCoverage` | string | Rules from SFDC Product Catalog |

**CPSpecificationOption values (product specifications)**

Defined in `client-extensions/liferay-one-batch/batch/10-commerce-specification.batch-engine-data.json`, which is the source of truth for every key below.

| Key | Title | Option category |
|---|---|---|
| `app-api-reference-url` | App API Reference URL | APP_SUPPORT_AND_HELP |
| `app-documentation-url` | App Documentation URL | APP_SUPPORT_AND_HELP |
| `app-entry-uuid` | App Entry UUID | PRODUCT_METADATA |
| `app-installation-guide-url` | App Installation Guide URL | APP_SUPPORT_AND_HELP |
| `app-storefront-video-description` | App Storefront Video Description | PRODUCT_METADATA |
| `app-storefront-video-url` | App Storefront Video URL | PRODUCT_METADATA |
| `app-usage-terms-url` | App Usage Terms URL | APP_SUPPORT_AND_HELP |
| `cloud-enabled` | Cloud Enabled | PRODUCT_METADATA |
| `cpu` | CPU | RESOURCE_REQUIREMENTS |
| `current-requirements` | Current Requirements | PRODUCT_METADATA |
| `developer-name` | Developer Name | PRODUCT_METADATA |
| `last-updated-by` | Last Updated By | PRODUCT_METADATA |
| `latest-version` | Latest Version | PRICING_LICENSING_TERMS |
| `license-term` | License Term | PRICING_LICENSING_TERMS |
| `license-type` | License Type | PRICING_LICENSING_TERMS |
| `liferay-products-capabilities` | Liferay Products Capabilities | PRODUCT_METADATA |
| `liferay-products-categories` | Liferay Products Categories | PRODUCT_METADATA |
| `liferay-version` | Liferay Version | PRODUCT_METADATA |
| `lifetime-license` | Lifetime License | PRICING_LICENSING_TERMS |
| `number-of-cpus` | Number of CPUs | RESOURCE_REQUIREMENTS |
| `our-selection` | Our Selection | PRODUCT_METADATA |
| `partner-product` | Partner Product | PRODUCT_METADATA |
| `past-versions-work-with` | Past Versions Work With | PRODUCT_METADATA |
| `price-model` | Price Model | PRICING_LICENSING_TERMS |
| `product-downloads` | Product Downloads | PRODUCT_METADATA |
| `product-family` | Product Family | PRODUCT_METADATA |
| `product-notes` | Product Notes | PRODUCT_METADATA |
| `project-activation-profile` | Project Activation Profile | PRODUCT_METADATA |
| `project-contacts-role-ercs` | Project Contacts Role ERCs | PRODUCT_METADATA |
| `project-details-profile` | Project Details Profile | PRODUCT_METADATA |
| `project-download-profile` | Project Download Profile | PRODUCT_METADATA |
| `project-environment-profile` | Project Environment Profile | PRODUCT_METADATA |
| `project-item-type` | Project Item Type | PRODUCT_METADATA |
| `project-learn-url` | Project Learn URL | PRODUCT_METADATA |
| `project-utilization-profile` | Project Utilization Profile | PRODUCT_METADATA |
| `publisher-name` | Publisher Name | PRODUCT_METADATA |
| `publisher-web-site-url` | Publisher Web Site URL | APP_SUPPORT_AND_HELP |
| `ram` | RAM | RESOURCE_REQUIREMENTS |
| `ram-in-gb` | RAM in GB | RESOURCE_REQUIREMENTS |
| `solution-company-description` | Solution Company Description | SOLUTION_METADATA |
| `solution-company-email` | Solution Company Email | SOLUTION_METADATA |
| `solution-company-phone` | Solution Company Phone | SOLUTION_METADATA |
| `solution-company-website` | Solution Company Website | SOLUTION_METADATA |
| `solution-contact-email` | Solution Contact Email | SOLUTION_METADATA |
| `solution-details-blocks` | Solution Details Blocks | SOLUTION_METADATA |
| `solution-header-description` | Solution Header Description | SOLUTION_METADATA |
| `solution-header-title` | Solution Header Title | SOLUTION_METADATA |
| `solution-header-video-description` | Solution Header Video Description | SOLUTION_METADATA |
| `solution-header-video-url` | Solution Header Video URL | SOLUTION_METADATA |
| `solution-type` | Solution Type | SOLUTION_METADATA |
| `source-code-url` | Source Code URL | APP_SUPPORT_AND_HELP |
| `support-email-address` | Support Email Address | APP_SUPPORT_AND_HELP |
| `support-phone` | Support Phone | APP_SUPPORT_AND_HELP |
| `support-url` | Support URL | APP_SUPPORT_AND_HELP |
| `type` | Type | PRODUCT_METADATA |

**Categories**

| Category |
|---|
| Marketplace App Category |
| Marketplace App Tags |
| Marketplace Availability |
| Marketplace Category |
| Liferay Platform Offering |
| Liferay Version |
| Product Type |
| Solution Category |
| Solution Tags |

---

#### Commerce SKU (CPInstance)

**system:** `true`

The sellable unit. A product has one or more SKUs; each SKU maps one to one to a Salesforce `Product2`, which is Salesforce's sellable unit (`PricebookEntry` and `OpportunityLineItem` hang off it). Marketplace products such as AI Hub have one SKU per plan; migrated Salesforce products have exactly one. A consumable product has one SKU per role, told apart by the `consumption-role` option (`allotment` · `add-on` · `overage`, ERC `LO_OPTION_CONSUMPTION_ROLE`). Overage orders bill their own SKU so they never grant an add-on bucket.

| Field | Type | Notes |
|---|---|---|
| PK `CPInstanceId` | long | |
| FK `CProductId` | long | Parent product |
| `externalReferenceCode` | string | The only cross-system key; order items, price entries, and entitlement definitions reference the SKU by this value. Salesforce `Product2.Id` (18-char) for Salesforce products, which includes the seeded SKUs that mirror them; `PRDCT-*` for Marketplace apps and for seeded SKUs that have no Salesforce counterpart |
| `sku` | string | SKU code |
| `skuOptions` | list | Plan, sizing, and license options that distinguish SKUs of one product |

Liferay Commerce has no system object definition for CPInstance, so custom objects cannot hold an object relationship to a SKU. They store `skuExternalReferenceCode` as a text field instead.

**Options (SKU-contributing)**

Defined in `client-extensions/liferay-one-batch/batch/09-commerce-option.batch-engine-data.json`. A SKU that carries the `base-license-usage-type` option is licensable. This one option holds the license tiers of every product family. New apps get this option from `LICENSE_USAGE_TYPE_SKU_OPTION_KEY`, with only the tiers of their app type. To read a SKU, the frontend (`isLicenseUsageTypeSKUOptionKey`) and Spring Boot (`CommerceSkuUtil.hasLicenseUsageTypeOption`) both match the `-license-usage-type` suffix. They therefore also accept the older family keys (`ai-hub`, `cloud`, `cmp`, `dsr`, `dxp`), which existing and migrated products still carry, until a data migration replaces them. AI Hub tiers are `plan-activate`, `plan-enterprise`, and `plan-studio`, the keys that the migrated Marketplace catalog uses. `getAiHubTier` reads the value, not the key, and removes the `plan-` prefix to get the tier that AI Hub expects.

| Key | ERC | Values |
|---|---|---|
| `base-license-usage-type` | `LO_OPTION_BASE_LICENSE_USAGE` | `developer` · `plan-activate` · `plan-enterprise` · `plan-studio` · `production` · `standard` · `trial` |
| `consumption-role` | `LO_OPTION_CONSUMPTION_ROLE` | `add-on` · `allotment` · `overage` |
| `salesforce-product` | `LO_OPTION_SALESFORCE_PRODUCT` | One value for each Salesforce SKU, on every product that has one, whether the product has one SKU or many. The key is the lowercase Salesforce product ID, and the name is the Salesforce product name. Liferay keeps only one SKU of a product published unless each SKU has its own value, so the Salesforce sync and the seed data set this option on every Salesforce SKU. A SKU that is not a Salesforce product, such as a Liferay Data Platform event bucket, has no value. |

---

#### CommerceOrder (OOTB + custom fields)

**system:** `true`

| Field | Type | Notes |
|---|---|---|
| PK `commerceOrderId` | long | |
| `externalReferenceCode` | string | Salesforce Opportunity.Id |
| FK `accountEntryId` | long | |
| FK `commerceOrderTypeId` | long | |
| `currencyCode` | string | e.g. USD, EUR |
| `orderStatus` | int | 0=completed · 1=pending · 2=open · 6=in-progress · 8=cancelled · 10=processing · 20=on-hold (`CommerceOrderConstants`) |
| `paymentStatus` | int | |
| `paymentMethodKey` | string | |
| `total`, `subtotal`, `shippingAmount`, `taxAmount`, `totalWithTaxAmount` | decimal(30,16) | |
| `billingAddressId`, `shippingAddressId` | long | FK to Address |
| `purchaseOrderNumber` | string | |
| `couponCode` | string | |
| `transactionId` | string | Payment processor transaction ID |
| `printedNote` | longtext | |
| `userId` | long | |
| `createDate`, `modifiedDate` | datetime | |

**Custom fields:** `contractId` (FK to Contract), `marketplaceOrderType`, `projectName`, `cloudProjectName`, `ldpWorkspaceName`

---

#### CommerceOrderItem (OOTB + custom fields)

**system:** `true`

Replaces `SubscriptionItem`. Each row corresponds to a Salesforce OpportunityLineItem.

| Field | Type | Notes |
|---|---|---|
| PK `orderItemId` | long | |
| `externalReferenceCode` | string | Salesforce OpportunityLineItem.Id |
| FK `orderId` | long | Parent CommerceOrder |
| FK `CProductId` | long | |
| FK `CPInstanceId` | long | |
| `quantity` | decimal(30,16) | |
| `unitPrice`, `finalPrice` | decimal(30,16) | |
| `name` | longtext | Product name at time of purchase; denormalized |
| `sku` | string | SKU at time of purchase |
| `subscription` | boolean | |
| `subscriptionInfo` | string | |
| `userId` | long | |
| `createDate`, `modifiedDate` | datetime | |

**Custom fields:** `cloudRegion` (e.g. `us-central1`), `machineType` (`Standard` · `High`), `orderType` (`New Business` · `Renewal`), `sizing` (int), `startDate`, `endDate`, `effectiveEndDate` (endDate + 30-day grace period), `status` (`Approved` · `Canceled` · `On Hold`), `spendLimit` (double; per-product spend cap), `opportunitySoldBy`

---

#### Contract (`C_CONTRACT`)

**system:** `false`

> Temporary custom object until Liferay core provides a system `Contract` object. A migration ticket will be required at that point.

| Field | Type | Notes |
|---|---|---|
| PK `contractId` | long | |
| `externalReferenceCode` | string | Salesforce Contract.Id (18-char) |
| FK `accountEntryId` | long | |
| `startDate` | datetime | |
| `endDate` | datetime | |
| `contractTerm` | int | Term in months, e.g. 12 |
| `contractBillingCadence` | int | e.g. 12 (months) |
| `overageBillingCadence` | int | e.g. 3 (months) |
| `ownerEmailAddress` | string | Resolved from Salesforce Contract owner |
| `status` | string | Computed from CommerceOrderItem statuses |
| `renewalState` | string | |
| `spendLimit` | double | Account-level spend cap from Salesforce |

---

#### Entitlement (`C_ENTITLEMENT`)

**system:** `false`

Materialized grant records derived from CommerceOrderItems via EntitlementDefinitions.

| Field | Type | Notes |
|---|---|---|
| PK `entitlementId` | long | |
| FK `entitlementDefinitionId` | long | |
| FK `orderItemId` | long | Parent CommerceOrderItem that grants this entitlement |
| FK `contractId` | long | Denormalized for fast lookup |
| FK `projectId` | long | Project scoping the grant (`projectToEntitlement`), from the order's `salesforceProjectId` custom field; empty for project-less orders |
| FK `usageDefinitionId` | long | For metered entitlements |
| `name` | string | e.g. `database-size` · `vcpu` · `maxServers` · `licenseGeneration` |
| `grantType` | string | `fixed` · `rollover` · `prepaid` · `metered` |
| `quantity` | double | Soft cap — alerts at this level; overridden by `sizing` where applicable |
| `maxQuantity` | double | Hard cap — blocks at this level |
| `overageRate` | double | Price of one overage bucket, copied from the definition at grant time |
| `overageSkuExternalReferenceCode` | string | Overage bucket SKU, copied from the definition at grant time |
| `startDate` | datetime | |
| `endDate` | datetime | |

The `endDate` is the grant's effective end. After a realignment amendment it may be earlier than the granting CommerceOrderItem's frozen `endDate`, in which case it equals that item's `effectiveEndDate`. Realignment expresses supersession through dates only; no status transition occurs at processing time.

---

#### EntitlementDefinition (`C_ENTITLEMENT_DEFINITION`)

**system:** `false`

SKU-level entitlement template. One SKU → many EntitlementDefinitions. When a CommerceOrderItem is created for a SKU, one Entitlement is auto-generated per active EntitlementDefinition for that SKU.

| Field | Type | Notes |
|---|---|---|
| PK `entitlementDefinitionId` | long | |
| `externalReferenceCode` | string | e.g. `dxp-cloud-standard-database-size` |
| `skuExternalReferenceCode` | string | ERC of the granting SKU (Salesforce `Product2.Id`); a text field because CPInstance has no system object definition |
| `name` | string | e.g. `database-size`, `vcpu`, `maxServers`, `licenseGeneration` |
| `displayName` | string | Human-readable, e.g. `Database Storage`, `License Generation` |
| `unit` | string | GB · vCPU · count · requests · seats · boolean |
| `defaultQuantity` | double | Default; overridden at order item level via `sizing` |
| `grantType` | string | `fixed` · `rollover` · `metered` · `prepaid` |
| `licenseKeyType` | string | The key type this SKU grants, e.g. `production`, `developer`, `backup`, `complimentary`; empty when the definition grants no key type of its own |
| `licenseKeyDurationDays` | integer | How long a generated key lasts; empty for the subscription's own dates |
| `licenseKeyFamily` | string | The LCS license entry family the SKU is licensed under, e.g. `DXP`, `Portal`, `CMP`, `DSR`, `Cloud Native`. Prefix of the license entry name the generate form groups key types by |
| `generatesActivationKey` | boolean | Whether this SKU leads an activation key. A SKU carrying a `*-license-usage-type` option leads one regardless |
| FK `usageDefinitionId` | long | Nullable; only for metered/usage-type entitlements |
| `overageRate` | double | Price of one overage bucket; empty if the definition cannot bill overage |
| `overageSkuExternalReferenceCode` | string | Overage bucket SKU, e.g. `PRDCT-DATA-PLATFORM-EVENTS-OVERAGE-BUCKET` |
| `productOptions` | string | JSON map of SKU option key/value pairs the order item must carry for this definition to apply; empty matches any |
| `active` | boolean | Default `true`; set `false` to deprecate without deleting |

**Several definitions per metric.** One product can sell a metric several ways, each its own EntitlementDefinition under the same UsageDefinition. For LDP, `events-monthly` parents:

- `C_ENT_DEF_DATA_PLATFORM_EVENTS`: the base allotment, granted by the Liferay Data Platform SKU `01tVO00000UccNxYAJ`. The only one with overage pricing.
- `C_ENT_DEF_DATA_PLATFORM_EVENTS_ADD_ON_BUCKET`: one 200,000 event bucket per unit, granted by `PRDCT-DATA-PLATFORM-EVENTS-ADD-ON-BUCKET`.
- `C_ENT_DEF_DATA_PLATFORM_EVENTS_OVERAGE_BUCKET`: granted by `PRDCT-DATA-PLATFORM-EVENTS-OVERAGE-BUCKET` on overage orders. `LDPEventAllotment` ignores it.

**Bucket priced overage.** Entitlements copy `overageRate` and `overageSkuExternalReferenceCode` from their definition at grant time, so a later definition change never reprices a grant. The two are set together or not at all, enforced by the `*_OVERAGE_PRICING_PAIR` validation rule on both objects. A rate of 0 or less counts as unset, since Liferay stores an unset decimal as 0. Bucket size belongs to the metric (`UsageDefinition.overageBucketSize`) and also measures add-on buckets. Overage bills in whole buckets: 300,000 events over with a 200,000 event bucket bills two. Currency is not stored; the overage order takes it from its Commerce channel.

When a project's `events` entitlements have no pricing or conflicting pricing, or its usage definition has no bucket size, `LDPEventUsageReportService` records the overage but leaves the SKU, bucket count, and amount empty for a reviewer. A project with add-on buckets and no bucket size is skipped, since its entitled quantity is unknown.

**License generation:** Presence of an EntitlementDefinition with `name = 'licenseGeneration'` (`grantType = fixed`, `unit = boolean`) indicates the product can generate license keys. This replaces the old boolean `licenses` flag on products.

**Licensing is SKU level.** Which key type a purchase grants (`licenseKeyType`), how long the key lasts (`licenseKeyDurationDays`), which license entry family it resolves against (`licenseKeyFamily`), and whether it leads an activation key (`generatesActivationKey`) all live on the definition, keyed by SKU external reference code. None of them is a product specification: a product external reference code is minted by whichever catalog created the product and differs per environment, while the SKU is what Salesforce sells and what an entitlement resolves.

---

#### UsageDefinition (`C_USAGE_DEFINITION`)

**system:** `false`

> Also referred to as `ConsumptionMetric` in some arch docs.

| Field | Type | Notes |
|---|---|---|
| PK `usageDefinitionId` | long | |
| `externalReferenceCode` | string | e.g. `storage-gb`, `page-views-monthly` |
| `unit` | string | e.g. GB, page views, vcpu, AI tokens |
| `aggregationType` | string | count / sum. Renamed from `aggregation`: a field literally named `aggregation` collides with Liferay's reserved OData aggregation term and generates an empty DB column name, so the object fails to publish (`CREATE TABLE` syntax error). |
| `period` | string | Per month, day, hour |
| `overageBucketSize` | double | Units of the metric one overage bucket covers, e.g. 200,000 events. Unset means overage is not billable for this metric |

Overage rate and SKU live on the EntitlementDefinition; see **Bucket priced overage**.

---

#### UsageEvent (`C_USAGE_EVENT`)

**system:** `false`

| Field | Type | Notes |
|---|---|---|
| PK `usageEventId` | long | |
| FK `environmentId` | long | |
| FK `subscriptionId` | long | |
| FK `usageDefinitionId` | long | |
| `eventTimestamp` | datetime | |
| `quantity` | double | |
| `dedupeKey` | string | Idempotent; client-assigned |

---

#### UsageReport (`C_USAGE_REPORT`)

**system:** `false`

Aggregated periodic report over UsageEvents. The report target is polymorphic — a report can roll up at any level (project, contract, order, environment), expressed via `targetType` + `targetClassName` + `targetPK`, mirroring the `Property` pattern. A `usageDefinitionToUsageReport` and a `projectToUsageReport` relationship provide the primary FK rollups: usage reports are children of the project they belong to (the dashboard is project-scoped, and `projectToContract` still reaches the contract in one hop). `commerceOrderId` is a denormalized plain field — not a relationship FK — holding the standalone overage order this report generated, as an audit trail. It is deliberately a plain field rather than a `usageReportToCommerceOrder` relationship: a navigable edge into the system CommerceOrder object puts a cycle through the object entry OData entity model, which throws `IllegalArgumentException: Name is null` and 500s every `/o/c/...` endpoint that embeds it (projects, contracts).

**Consumption-based billing workflow (E24 / LPD-88265).** On the first of every month `UsageReportService` (in `liferay-one-etc-spring-boot`, `@Scheduled` cron `liferay.one.usage.report.cron`) queries the datawarehouse — mocked for now — for the prior month's metered consumption, compares each metered entitlement's usage against its allotment, and records every overage as a UsageReport in the `readyForReview` state. `reviewStatus` is a picklist **state field** (`Ready for Review` → `Approved` · `Completed`) backed by `LT_USAGE_REPORT_REVIEW_STATUS`; a reviewer works reports in the Liferay Objects admin UI. Setting a report to `Approved` (invoice needed) fires the `UsageReportApproved` `onAfterUpdate` object action → `ObjectActionUsageReportApprovedRestController`, which creates the standalone overage commerce order (order line = `overageSkuQuantity` of the `skuExternalReferenceCode` bucket SKU), writes its id back to `commerceOrderId`, and pushes it to Salesforce as an opportunity, mirroring the AI Hub token purchasing flow. Setting a report to `Completed` (no invoice needed) is terminal and creates nothing. The controller is idempotent: it no-ops unless `reviewStatus` is `approved` and `commerceOrderId` is unset. It must also refuse a report with no `skuExternalReferenceCode`. The `accountExternalReferenceCode`, `contractExternalReferenceCode`, and `skuExternalReferenceCode` fields are denormalized onto the report so the object action can build the order without traversing relationships over headless.

| Field | Type | Notes |
|---|---|---|
| PK `usageReportId` | long | |
| FK `usageDefinitionId` | long | Via `usageDefinitionToUsageReport` relationship |
| FK `projectId` | long | Via `projectToUsageReport` relationship |
| `reviewStatus` | string | State picklist: `readyForReview` · `approved` · `completed` (`LT_USAGE_REPORT_REVIEW_STATUS`) |
| `commerceOrderId` | long | Denormalized audit link to the generated overage order; not a relationship FK |
| `accountExternalReferenceCode` | string | Denormalized; order-build input for the approved action |
| `contractExternalReferenceCode` | string | Denormalized; order-build input for the approved action |
| `skuExternalReferenceCode` | string | Denormalized; the overage bucket SKU, from the project's `events` entitlement. Empty when unpriced |
| `aggregateQuantity` | double | Consumed quantity in the period, in the metric's unit |
| `entitledQuantity` | double | Allotted quantity for the period, in the metric's unit |
| `overageQuantity` | double | `max(aggregateQuantity − entitledQuantity, 0)`, in the metric's unit |
| `overageSkuQuantity` | double | Order line quantity: `ceil(overageQuantity ÷ overageBucketSize)`. Empty when unpriced |
| `overageAmount` | double | `overageSkuQuantity` × `overageRate`. Empty when unpriced |
| `overageCurrency` | string | Not populated; the order's Commerce channel sets the currency |
| `targetType` | string | `project` · `contract` · `order` · `environment` |
| `targetClassName` | string | Denormalized class name of the report target |
| `targetPK` | long | PK of the report target instance |
| `generatorClassName` | string | |
| `generatedAt` | datetime | |
| `dateFrom` | datetime | |
| `dateTo` | datetime | |

---

### Environment Management

#### Environment (`C_ENVIRONMENT`)

**system:** `false`

| Field | Type | Notes |
|---|---|---|
| PK `environmentId` | long | |
| FK `subscriptionId` | long | FK to Contract |
| `name` | string | Reported by the environment on activation |
| `offering` | string | `AI Hub` · `Analytics Cloud` · `Cloud Native` · `DSR` · `LDP` · `On-Prem` · `PaaS` · `SaaS` |
| `type` | string | `non-production` · `production` · `uat`; cloud only |
| `region` | string | Cloud only; blank for on-prem |
| `disasterRecoveryRegion` | string | Cloud only; secondary region for disaster recovery, alongside `region` |
| `ownerEmailAddress` | string | Cloud only; workspace owner collected on activation. On SaaS this is the Analytics Cloud workspace owner, mirroring Customer Portal's `lxc.analyticsCloudOwnersEmailAddress` |
| `activationMode` | string | `license-key` · `offline` · `online` |
| `status` | string | `active` · `deactivated` · `expired` |
| `lastHeartbeatAt` | datetime | Cloud only |
| `currentEntitlementHash` | string | Identity hash; enables change detection on heartbeat |
| `hostName` | string | On-prem only |
| `domains` | string | On-prem only; allowed domain list |
| `ipAddresses` | longtext | On-prem only |
| `macAddresses` | longtext | On-prem only |
| `serverId` | longtext | On-prem only |

---

#### EnvironmentAdmin (`C_ENVIRONMENT_ADMIN`)

**system:** `false`

| Field | Type | Notes |
|---|---|---|
| PK `environmentAdminId` | long | |
| FK `environmentId` | long | FK to Environment; cascade delete |
| `emailAddress` | string | |
| `firstName` | string | SaaS splits its single "first and last name" input into `firstName` and `lastName` |
| `lastName` | string | |
| `githubUsername` | string | PaaS only; SaaS collects no GitHub username |

> One row per project admin nominated on the PaaS or SaaS activation form. The first admin is also denormalized onto Environment's `adminEmailAddress`, `adminFirstName`, `adminLastName` and `githubUsername`.

---

#### LicenseKey (`C_LICENSE_KEY`)

**system:** `false`

| Field | Type | Notes |
|---|---|---|
| PK `licenseKeyId` | long | |
| `uuid` | string | Preserved from Provisioning for cross-system traceability |
| `createdByUserId` | long | FK to User |
| `createdByUserName` | string | Denormalized |
| `createDate` | datetime | |
| `modifiedByUserId` | long | FK to User |
| `modifiedByUserName` | string | Denormalized |
| `modifiedDate` | datetime | |
| FK `accountEntryId` | long | |
| FK `projectId` | long | Nullable; set when the key is scoped to a project, else account-only |
| FK `entitlementId` | long | |
| `orderId` | long | FK to CommerceOrderItem via `assetReceiptLicenseUuid` |
| `entitlementName` | string | Name of the attached entitlement |
| FK `CProductId` | long | |
| `accountEntryCode` | string | Denormalized |
| `accountEntryName` | string | Denormalized |
| `licenseName` | string | Hard-coded from LicenseEntry on migration |
| `licenseType` | string | `production` · `cluster` · `developer` · `enterprise` · `oem` · `per-user` · `limited` · `virtual-cluster` · `free` · `developer-cluster` |
| `licenseVersion` | int | |
| `productName` | string | Denormalized from CProduct |
| `productExternalId` | string | UUID-format product ID |
| `productVersion` | string | e.g. `7.4`, `2026.Q1` |
| `productVersionLabel` | string | Human-readable version label |
| `clusterId` | long | |
| `owner` | string | |
| `maxServers` | int | |
| `maxConcurrentUsers` | long | |
| `maxUsers` | long | |
| `maxHttpSessions` | int | |
| `maxClusterNodes` | int | |
| `sizing` | string | Copied from CommerceOrderItem for license generation convenience |
| `name` | string | |
| `description` | string | |
| `licenseKey` | longtext | The actual license XML/key payload |
| `startDate` | datetime | |
| `customExpirationDate` | datetime | |
| `additionalInfo` | longtext | |
| `complimentary` | boolean | |
| `active` | boolean | |

---

### Other

#### Property (`C_PROPERTY`)

**system:** `false`

| Field | Type | Notes |
|---|---|---|
| `accountEntryId` | long | |
| `classNameId` | long | e.g. classNameId of CommerceOrderItem, AccountEntry |
| `className` | string | Denormalized, e.g. `CommerceOrderItem` |
| `classPK` | long | PK of the target entity instance |
| `name` | string | e.g. `koroneikiAccountKey`, `nonProductionSubscriptionUuid` |
| `value` | string | e.g. `12345-abcde` |
| `metadataJson` | text | JSON metadata blob |

> External system references (formerly `ExternalLink`) are stored as Property rows: `name = '{domain}:{entityName}'`, `value = entityId`.

---

## ERC and FriendlyURL Registry

| Object | ERC | Separator |
|---|---|---|
| `AccountNote` | `C_ACCOUNT_NOTE` | `l` |
| `Contract` | `C_CONTRACT` | `cpct` |
| `Entitlement` | `C_ENTITLEMENT` | `cpen` |
| `EntitlementDefinition` | `C_ENTITLEMENT_DEFINITION` | `cped` |
| `Environment` | `C_ENVIRONMENT` | `cpdp` |
| `EnvironmentAdmin` | `C_ENVIRONMENT_ADMIN` | `l` |
| `LicenseKey` | `C_LICENSE_KEY` | `cplk` |
| `Property` | `C_PROPERTY` | `cppr` |
| `UsageDefinition` | `C_USAGE_DEFINITION` | `cpud` |
| `UsageEvent` | `C_USAGE_EVENT` | `cpue` |
| `UsageReport` | `C_USAGE_REPORT` | `cpur` |

---

## See Also

- [`workspace.md`](./workspace.md) — workspace layout and client extensions
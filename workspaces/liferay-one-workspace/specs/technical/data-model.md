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

**Custom fields:** `accountTier` (text: Platinum / Gold / Silver / Bronze / Trial / Community; not the `LT_ACCOUNT_TIER` picklist), `accountCode` (migrated Koroneiki accountKey), `allowComplimentary` (boolean), `allowPermanentLicenses` (boolean), `allowSelfProvisioning` (boolean), `AccountType`, `contactEmail`, `industry`, `oktaSSO`, `passwordPolicy`, `twoFactorAuthentication`

**Object actions:** `AccountCreate`, `AccountUpdate`, and `AccountDelete` call `liferay-one-etc-spring-boot`.

**Relationships:** the account is the parent of 16 custom objects. See [`object-model.md`](./object-model.md) for the full list and the deletion type of each.

---

#### AccountNote (`C_ACCOUNT_NOTE`)

**system:** `false`

| Field | Type | Notes |
|---|---|---|
| PK `accountNoteId` | long | |
| `uuid` | string | Preserved from Koroneiki for cross-system traceability |
| `externalReferenceCode` | string | Migrated Koroneiki `accountNoteKey` |
| FK `accountEntryId` | long | `accountEntryToAccountNote`, cascade. Account restricted |
| `content` | longtext | |
| `format` | string | |
| `type` | picklist | `LT_ACCOUNT_NOTE_TYPE`: `general` · `sales` |
| `priority` | picklist | `LT_ACCOUNT_NOTE_PRIORITY`: `normal` · `pinned` |
| `customStatus` | picklist | `LT_ACCOUNT_NOTE_STATUS`: `approved` · `archived`. Named `customStatus` because `status` is reserved |
| `createDate` | datetime | |
| `createdByUserId` | long | User ID; a plain field, not a relationship |
| `createdByUserName` | string | Frozen at creation; do not overwrite on edit |
| `modifiedDate` | datetime | |
| `modifiedByUserId` | long | User ID; a plain field, not a relationship |
| `modifiedByUserName` | string | |
| `koroneikiAccountKey` | string | Parent Koroneiki accountKey; migration traceability |
| `koroneikiProjectName` | string | Koroneiki project name; migration traceability. A note has no link to a Project |

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

Liferay Commerce has no system object definition for CPInstance, so custom objects cannot hold an object relationship to a SKU. They store `skuExternalReferenceCode` as a text field instead. EntitlementDefinitionSku holds that text field to link a definition to many SKUs.

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
| `externalReferenceCode` | string | Salesforce Opportunity.Id, or Salesforce ProjectEntitlement.Id for a project entitlement order |
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

**Custom fields (links):** `projectName` (text) and `contractId` (long) are the only link from an order to its Project and Contract. LPD-92222 removed the `projectToCommerceOrder` and `contractToCommerceOrder` relationships, because the commerce order API returns custom fields but not relationship fields. The project link is the project **name**, so a project rename breaks it.

**Custom fields (other):** `accountOwnerEmailAddress`, `accountOwnerFirstName`, `accountOwnerLastName`, `cloud-provisioning`, `cloudProjectName`, `dossieraProjectKey`, `dsrAnalyticsCloudProject`, `dsrError`, `dsrErrorDate`, `dsrSettings`, `dsrWorkspaceName`, `gsInvolved`, `ldpAnalyticsCloudProject`, `ldpError`, `ldpErrorDate`, `ldpSettings`, `ldpWorkspaceName`, `marketplaceOrderType`, `order-metadata`, `opportunityProductFamily`, `opportunitySoldBy`, `opportunityStageName`, `opportunityTerritory`, `opportunityType`, `parentOpportunityId`, `partnerAccount`, `partnerFirstLineSupport`, `projectDescription`, `projectKey`, `projectSolution`, `renewal`, `salesforceOpportunityId`, `salesforcePricebookId`, `salesforceProjectId`, `trial-end-date`, `trial-error`, `trial-error-date`, `trial-notify-end-date`, `trial-settings`, `trial-start-date`, `trial-virtual-host`. The source is `liferay-one-site-initializer/site-initializer/expando-columns.json`.

**Relationships:** parent of LicenseKey (`commerceOrderToLicenseKey`, disassociate) and of the request objects AIHubBetaPrivateAccessRequest, DSRRequest, DXPFreeActivationKeyRequest, ProductFeedback, and TrialExtensionRequest (cascade). Child of PublisherSalesSummary (`publisherToCommerceOrder`, disassociate).

**Object actions:** `CommerceOrderUpdate` (onAfterUpdate), from the site initializer.

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

**Custom fields:** `cloudRegion` (e.g. `us-central1`), `machineType` (`Standard` · `High`), `orderType` (`New Business` · `Renewal`), `sizing` (int), `startDate`, `endDate`, `effectiveEndDate` (endDate + 30-day grace period), `customStatus` (`Approved` · `Canceled` · `On Hold`), `spendLimit` (double; per-product spend cap), `opportunitySoldBy`

**Relationships:** parent of Entitlement (`commerceOrderItemToEntitlement`, disassociate).

**Object actions:** `EntitlementGeneration` (onAfterAdd) creates one Entitlement for each active EntitlementDefinition of the SKU when the order is completed. The CommerceOrder `CommerceOrderUpdate` action generates them for every item when the order becomes completed. `EntitlementUpdate` and `CommerceOrderItemUpdate` run on update.

---

#### Contract (`C_CONTRACT`)

**system:** `false`

> Temporary custom object until Liferay core provides a system `Contract` object. A migration ticket will be required at that point.

| Field | Type | Notes |
|---|---|---|
| PK `contractId` | long | |
| `externalReferenceCode` | string | Salesforce Contract.Id (18-char) |
| FK `accountEntryId` | long | `accountEntryToContract`, prevent. Account restricted |
| FK `projectId` | long | `projectToContract`, disassociate. Empty for an account level contract that spans several projects |
| FK `originalContractId` | long | `originalContractToContract`, disassociate. Set on a renewal; points to the contract it renews |
| `contractType` | picklist | `LT_CONTRACT_TYPE`: `initial` · `renewal` |
| `opportunityId` | string | Salesforce Opportunity.Id |
| `renewalOpportunityId` | string | Salesforce Opportunity.Id of the renewal |
| `startDate` | datetime | |
| `endDate` | datetime | |
| `contractTerm` | int | Term in months, e.g. 12 |
| `contractBillingCadence` | int | e.g. 12 (months) |
| `overageBillingCadence` | int | e.g. 3 (months) |
| `ownerEmailAddress` | string | Resolved from Salesforce Contract owner |
| `renewalState` | string | |
| `spendLimit` | double | Account-level spend cap from Salesforce |

The contract has no status field. Its children are Entitlements (`contractToEntitlement`) and Environments (`contractToEnvironment`), both `disassociate`: deleting a contract keeps them. A Commerce Order links to its contract only through the order's `contractId` custom field.

---

#### Entitlement (`C_ENTITLEMENT`)

**system:** `false`

Materialized grant records derived from CommerceOrderItems via EntitlementDefinitions.

| Field | Type | Notes |
|---|---|---|
| PK `entitlementId` | long | |
| FK `accountEntryId` | long | `accountEntryToEntitlement`, prevent. Account restricted |
| FK `entitlementDefinitionId` | long | `entitlementDefinitionToEntitlement`, prevent: a definition with entitlements cannot be deleted. Set `active: false` instead |
| FK `orderItemId` | long | `commerceOrderItemToEntitlement`, disassociate. Parent CommerceOrderItem that grants this entitlement |
| FK `contractId` | long | `contractToEntitlement`, disassociate |
| FK `projectId` | long | Project scoping the grant (`projectToEntitlement`), from the order's `salesforceProjectId` custom field; empty for project-less orders |
| `name` | string | e.g. `database-size` · `vcpu` · `maxServers` · `licenseGeneration` |
| `grantType` | string | `fixed` · `rollover` · `prepaid` · `metered` |
| `quantity` | double | Soft cap — alerts at this level; overridden by `sizing` where applicable |
| `maxQuantity` | double | Hard cap — blocks at this level |
| `overageRate` | double | Price of one overage bucket, copied from the definition at grant time |
| `overageSkuExternalReferenceCode` | string | Overage bucket SKU, copied from the definition at grant time |
| `productOptions` | longtext | SKU option map, copied from the definition at grant time |
| `skuExternalReferenceCode` | string | SKU of the order item that granted this entitlement |
| `terminationStatus` | string | Returned to the cloud console with the entitlement |
| `startDate` | datetime | |
| `endDate` | datetime | |

An Entitlement reaches its UsageDefinition through its EntitlementDefinition; it has no direct link. It is the parent of LicenseKey (`entitlementToLicenseKey`, disassociate) and UsageEvent (`entitlementToUsageEvent`, cascade).

The `endDate` is the grant's effective end. After a realignment amendment it may be earlier than the granting CommerceOrderItem's frozen `endDate`, in which case it equals that item's `effectiveEndDate`. Realignment expresses supersession through dates only; no status transition occurs at processing time.

---

#### EntitlementDefinition (`C_ENTITLEMENT_DEFINITION`)

**system:** `false`

Capability-level entitlement template. Many SKUs ↔ many EntitlementDefinitions, through EntitlementDefinitionSku. When a CommerceOrderItem is created for a SKU, one Entitlement is auto-generated per active EntitlementDefinition for that SKU.

| Field | Type | Notes |
|---|---|---|
| PK `entitlementDefinitionId` | long | |
| `externalReferenceCode` | string | e.g. `dxp-cloud-standard-database-size` |
| `name` | string | e.g. `database-size`, `vcpu`, `maxServers`, `licenseGeneration` |
| `displayName` | string | Human-readable, e.g. `Database Storage`, `License Generation` |
| `unit` | string | GB · vCPU · count · requests · seats · boolean |
| `defaultQuantity` | double | Default; overridden at order item level via `sizing` |
| `grantType` | string | `fixed` · `rollover` · `metered` · `prepaid` |
| `licenseKeyType` | string | The key type this SKU grants, e.g. `production`, `developer`, `backup`, `complimentary`; empty when the definition grants no key type of its own |
| `licenseKeyDurationDays` | integer | How long a generated developer or complimentary key lasts, in days from its start date. Empty or 0 means no duration: a complimentary key then lasts 30 days after its start date, and a developer key expires on the entitlement end date. A complimentary key does not expire after the subscription end date. Liferay stores an empty value as 0, so the two are the same value, and the `C_ENTITLEMENT_DEFINITION_LICENSE_KEY_DURATION_RANGE` rule rejects a negative value. A key keeps the dates it was issued with. |
| `licenseKeyFamily` | string | The LCS license entry family the SKU is licensed under, e.g. `DXP`, `Portal`, `CMP`, `DSR`, `Cloud Native`. Prefix of the license entry name the generate form groups key types by |
| `generatesActivationKey` | boolean | Whether this SKU leads an activation key. A SKU carrying a `*-license-usage-type` option leads one regardless |
| FK `usageDefinitionId` | long | Nullable; only for metered/usage-type entitlements |
| `overageRate` | double | Price of one overage bucket; empty when the overage is priced downstream or cannot be billed |
| `overageSkuExternalReferenceCode` | string | Overage bucket SKU, e.g. `PRDCT-DATA-PLATFORM-EVENTS-OVERAGE-BUCKET` |
| `productOptions` | string | JSON map of SKU option key/value pairs the order item must carry for this definition to apply; empty matches any |
| `active` | boolean | Default `true`; set `false` to deprecate without deleting |

**Several definitions per metric.** One product can sell a metric several ways, each its own EntitlementDefinition under the same UsageDefinition. For LDP, `events-monthly` parents:

- `C_ENT_DEF_DATA_PLATFORM_EVENTS`: the base allotment, granted by the Liferay Data Platform SKU `01tVO00000UccNxYAJ`. The only one with overage pricing.
- `C_ENT_DEF_DATA_PLATFORM_EVENTS_ADD_ON_BUCKET`: one 200,000 event bucket per unit, granted by `PRDCT-DATA-PLATFORM-EVENTS-ADD-ON-BUCKET`.
- `C_ENT_DEF_DATA_PLATFORM_EVENTS_OVERAGE_BUCKET`: granted by `PRDCT-DATA-PLATFORM-EVENTS-OVERAGE-BUCKET` on overage orders. `UsageAllotment` ignores it, because its SKU carries the `overage` consumption role.

**Bucket priced overage.** Entitlements copy `overageRate` and `overageSkuExternalReferenceCode` from their definition at grant time, so a later definition change never reprices a grant. The SKU makes an overage orderable and the rate makes it priceable. A SKU without a rate is valid: the report carries the SKU and the bucket count, and the amount stays empty for BizOps to price downstream. A rate without a SKU is refused by the `*_OVERAGE_PRICING_PAIR` validation rule on both objects. A rate of 0 or less counts as unset, since Liferay stores an unset decimal as 0. Bucket size belongs to the metric (`UsageDefinition.overageBucketSize`) and also measures add-on buckets. Overage bills in whole buckets: 300,000 events over with a 200,000 event bucket bills two. Currency is not stored; the overage order takes it from its Commerce channel.

When a project's allotments have no overage SKU or conflicting pricing, or its usage definition has no bucket size, `UsageReportGenerator` records the overage but leaves the SKU, bucket count, and amount empty for a reviewer. A project with add-on buckets and no bucket size is skipped, since its entitled quantity is unknown.

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
| `usageSource` | string | Which DataOps API shape the consumed quantity is read from, e.g. `ldp-event-summary`. One `UsageSource` adapter exists in `liferay-one-etc-spring-boot` per value. Unset means no usage report is generated for this metric |
| `usageSourceMetricKey` | string | The field the adapter reads from that API's response, e.g. `eventsCount` |
| `usageSourceUnit` | string | The unit that field is reported in, e.g. `bytes`; converted to `unit` when it differs. Unset means the source already reports in `unit` |

Overage rate and SKU live on the EntitlementDefinition; see **Bucket priced overage**.

**Declarative usage reports.** The three `usageSource*` fields, together with the `usageDefinitionToEntitlementDefinition` relationship and the `consumption-role` SKU option, are everything the usage report generator needs to report a metric. A new metric served by an API that already has an adapter is seed data only: a UsageDefinition row, the EntitlementDefinition rows that link to it, and the SKUs those definitions grant from.

---

#### UsageEvent (`C_USAGE_EVENT`)

**system:** `false`

| Field | Type | Notes |
|---|---|---|
| PK `usageEventId` | long | |
| FK `environmentId` | long | `environmentToUsageEvent`, cascade |
| FK `entitlementId` | long | `entitlementToUsageEvent`, cascade |
| FK `usageDefinitionId` | long | `usageDefinitionToUsageEvent`, disassociate |
| `eventTimestamp` | datetime | |
| `quantity` | double | |
| `dedupeKey` | string | Idempotent; client-assigned |

---

#### UsageReport (`C_USAGE_REPORT`)

**system:** `false`

Aggregated periodic report over UsageEvents. The report target is polymorphic — a report can roll up at any level (project, contract, order, environment), expressed via `targetType` + `targetClassName` + `targetPK`, mirroring the `Property` pattern. A `usageDefinitionToUsageReport` and a `projectToUsageReport` relationship provide the primary FK rollups: usage reports are children of the project they belong to (the dashboard is project-scoped, and `projectToContract` still reaches the contract in one hop). `commerceOrderId` is a denormalized plain field — not a relationship FK — holding the standalone overage order this report generated, as an audit trail. It is deliberately a plain field rather than a `usageReportToCommerceOrder` relationship: a navigable edge into the system CommerceOrder object puts a cycle through the object entry OData entity model, which throws `IllegalArgumentException: Name is null` and 500s every `/o/c/...` endpoint that embeds it (projects, contracts).

**Consumption-based billing workflow (E24 / LPD-88265).** On the fifth of every month `UsageReportGenerator` (in `liferay-one-etc-spring-boot`, `@Scheduled` cron `liferay.one.usage.report.cron`, also triggered by `POST /admin/usage-reports/generate`) walks every UsageDefinition that declares a `usageSource`, reads the prior month's consumption through that source, compares it against the project's allotment rolled up by consumption role, and records the result as one UsageReport per project per usage definition (ERC `C_USAGE_REPORT_<PROJECT>_<USAGE_DEFINITION>_<yyyy_MM>`), in the `readyForReview` state when there is overage and `completed` otherwise. `reviewStatus` is a picklist **state field** (`Ready for Review` → `Approved` · `Completed`) backed by `LT_USAGE_REPORT_REVIEW_STATUS`; a reviewer works reports in the Liferay Objects admin UI. Setting a report to `Approved` (invoice needed) fires the `UsageReportApproved` `onAfterUpdate` object action → `ObjectActionUsageReportApprovedRestController`, which creates the standalone overage commerce order (order line = `overageSkuQuantity` of the `skuExternalReferenceCode` bucket SKU), writes its id back to `commerceOrderId`, and pushes it to Salesforce as an opportunity, mirroring the AI Hub token purchasing flow. Setting a report to `Completed` (no invoice needed) is terminal and creates nothing. The controller is idempotent: it no-ops unless `reviewStatus` is `approved` and `commerceOrderId` is unset. It must also refuse a report with no `skuExternalReferenceCode`. The `accountExternalReferenceCode`, `contractExternalReferenceCode`, and `skuExternalReferenceCode` fields are denormalized onto the report so the object action can build the order without traversing relationships over headless.

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
| `overageAmount` | double | `overageSkuQuantity` × `overageRate`. Empty when unpriced, or when the overage SKU has no rate |
| `overageCurrency` | string | Not populated; the order's Commerce channel sets the currency |
| `productExternalReferenceCode` | string | Denormalized; the product whose SKU granted the allotment the report measures against, e.g. `PRDCT-SAAS`. Downstream consumers read it rather than re-deriving which product a project's overage belongs to |
| `productName` | string | Denormalized; the product's name at generation time, e.g. `SaaS Experience`, for the reviewer |
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

Not account restricted: `accountEntryToEnvironment` is `disassociate`, and Liferay restricts an object only through a relationship that is not `disassociate`.

| Field | Type | Notes |
|---|---|---|
| PK `environmentId` | long | |
| FK `accountEntryId` | long | `accountEntryToEnvironment`, disassociate |
| FK `contractId` | long | `contractToEnvironment`, disassociate |
| FK `projectId` (relationship) | long | `projectToEnvironment`, disassociate |
| `projectId` | string | The Liferay Cloud project ID the customer types on the PaaS or SaaS activation form, e.g. `acme` in `https://acme.liferay.net`. Not the Liferay Project; that link is `projectToEnvironment` |
| `name` | string | Reported by the environment on activation |
| `offering` | string | `AI Hub` · `Analytics Cloud` · `Cloud Native` · `DSR` · `LDP` · `On-Prem` · `PaaS` · `SaaS` |
| `type` | string | `non-production` · `production` · `uat`; cloud only |
| `region` | string | Cloud only; blank for on-prem |
| `disasterRecoveryRegion` | string | Cloud only; secondary region for disaster recovery, alongside `region` |
| `ownerEmailAddress` | string | Cloud only; workspace owner collected on activation. On SaaS this is the Analytics Cloud workspace owner, mirroring Customer Portal's `lxc.analyticsCloudOwnersEmailAddress` |
| `adminEmailAddress`, `adminFirstName`, `adminLastName`, `githubUsername` | string | The first EnvironmentAdmin, denormalized |
| `allowedEmailDomains` | string | |
| `workspaceName`, `friendlyURL`, `timeZone` | string | Cloud workspace settings collected on activation |
| `aiHubURL` | string | AI Hub only; the home page link |
| `tokenMonthlyAllowance` | string | AI Hub only; shown on the environment card |
| `activationMode` | string | `license-key` · `offline` · `online` |
| `activationCode` | string | One time code; reuse throws `ActivationCodeAlreadyUsedException` |
| `activationStatus` | string | `active` · `deactivated` · `expired`. Named `activationStatus` because `status` is reserved |
| `publicKey` | longtext | Registered by the environment on activation |
| `requestedVersion` | string | Product version the environment asked for |
| `bundledEntitlementIds` | longtext | Entitlement IDs the environment consumes, set by `CloudRestController` |
| `lastHeartbeatAt` | datetime | Cloud only |
| `currentEntitlementHash` | string | Identity hash; enables change detection on heartbeat |
| `hostName` | string | On-prem only |
| `domains` | string | On-prem only; allowed domain list |
| `ipAddresses` | longtext | On-prem only |
| `macAddresses` | longtext | On-prem only |
| `serverId` | longtext | On-prem only |

Children: EnvironmentAdmin and UsageEvent, both `cascade`.

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
| FK `createdByUserId` | long | `createdByUser` relationship to User, disassociate |
| FK `modifiedByUserId` | long | `modifiedByUser` relationship to User, disassociate |
| FK `accountEntryId` | long | `accountEntryToLicenseKey`, prevent. Account restricted |
| FK `projectId` | long | `projectToLicenseKey`, disassociate. Nullable; set when the key is scoped to a project, else account-only |
| FK `entitlementId` (relationship) | long | `entitlementToLicenseKey`, disassociate |
| FK `commerceOrderId` | long | `commerceOrderToLicenseKey`, disassociate |
| FK `activationKeyId` | long | `activationKeyToLicenseKey`, disassociate |
| `entitlementId` | long | The entitlement the key was generated from. Key generation writes it, and active key counts and renewals read it. The seed sets it from the `entitlementToLicenseKey` relationship |
| `entitlementDefinitionId` | long | EntitlementDefinition ID; a plain field, not a relationship |
| `orderId` | string | Commerce order ID as text, set by the DXP Free and app license key endpoints. `commerceOrderToLicenseKey` exists but no code uses it |
| `accountName` | string | Denormalized |
| `licenseKeyFamily` | string | LCS license entry family, e.g. `DXP`, `Portal`, `Cloud Native`. Stored since LPD-102841; older keys have none |
| `licenseName` | string | Hard-coded from LicenseEntry on migration |
| `licenseType` | string | `production` · `cluster` · `developer` · `enterprise` · `oem` · `per-user` · `limited` · `virtual-cluster` · `free` · `developer-cluster` |
| `licenseVersion` | int | |
| `productName` | string | Copied from the legacy key on migration. A generated key uses the name of its license entry without the qualifier in parentheses, such as `DXP Production` for `DXP Production (Virtual Cluster)`, and an add-on without a license entry of its own uses its commerce product name. A free tier key uses `Liferay DXP - Free Tier` |
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
| `key` | longtext | The actual license XML/key payload |
| `hostName`, `domains`, `ipAddresses`, `macAddresses`, `serverId` | string, longtext | The server the key is bound to |
| `dataCenterLocation`, `workspaceName`, `workspaceOwnerEmail` | string | Cloud keys |
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
| FK `accountEntryId` | long | `accountEntryToProperty`, cascade. Not account restricted |
| `classNameId` | long | e.g. classNameId of CommerceOrderItem, AccountEntry |
| `className` | string | Denormalized, e.g. `CommerceOrderItem` |
| `classPK` | long | PK of the target entity instance |
| `name` | string | e.g. `koroneikiAccountKey`, `nonProductionSubscriptionUuid` |
| `value` | string | e.g. `12345-abcde` |
| `metadataJson` | text | JSON metadata blob |

---

#### EntitlementDefinitionSku (`C_ENTITLEMENT_DEFINITION_SKU`)

**system:** `false`

One link between an EntitlementDefinition and a SKU that sells it. Before this object, one capability existed as one definition per SKU, so a renewal sold under a new SKU landed on a different definition. With it, one definition can carry every SKU that sells its capability.

| Field | Type | Notes |
|---|---|---|
| PK `entitlementDefinitionSkuId` | long | |
| FK `entitlementDefinitionId` | long | Parent definition (`entitlementDefinitionToSku`, cascade delete) |
| `externalReferenceCode` | string | `<definition ERC>_<SKU ERC>` |
| `skuExternalReferenceCode` | string | ERC of the SKU |

> External system references (formerly `ExternalLink`) are stored as Property rows: `name = '{domain}:{entityName}'`, `value = entityId`.

---

### Projects and Membership

The full field lists for the objects below are in [`object-model.md`](./object-model.md). This section records what each object is for and how it links.

#### Project (`C_PROJECT`)

**system:** `false`

A customer project inside an account, such as one DXP or cloud workspace. Most customer data is a child of both the account and a project.

| Field | Type | Notes |
|---|---|---|
| FK `accountEntryId` | long | `accountEntryToProject`, cascade. Account restricted |
| FK `organizationId` | long | `organizationToProject`, disassociate. The first line support organization, if any |
| `name` | string | Required. Commerce Orders link to a project by this value (`projectName` custom field), so a rename breaks that link |
| `aiHubAccountName`, `allowedEmailDomains`, `dataCenterLocation`, `friendlyWorkspaceURL`, `liferayVersion`, `securityContactEmailAddress` | string | |

Parent of ActivationKey, Contract, Entitlement, Environment, and LicenseKey (all `disassociate`), and of ProjectMembership and UsageReport (both `cascade`).

#### ProjectMembership (`C_PROJECT_MEMBERSHIP`)

**system:** `false`

One row per user, project, and project role. Formerly `UserProjectAssociation`.

| Field | Type | Notes |
|---|---|---|
| FK `accountEntryId` | long | `accountEntryToProjectMembership`, cascade. Account restricted |
| FK `projectId` | long | `projectToProjectMembership`, cascade |
| FK `userId` | long | `userToProjectMembership`, cascade |
| `roleExternalReferenceCode` | string | Required. The project role ERC |

The `C_PROJECT_MEMBERSHIP_UNIQUE` composite key rule (project, role, user) rejects a duplicate membership.

#### AccountInvitation (`C_ACCOUNT_INVITATION`)

**system:** `false`

A pending invitation to join an account. It has no relationships: it names the account, the project, and the roles by ERC in text fields (`accountExternalReferenceCode`, `projectExternalReferenceCode`, `projectRoleExternalReferenceCode`, `roleExternalReferenceCodes`). When `accepted` changes to true, the `AccountInvitationAccepted` action creates the user, adds the user to the account with the roles, and adds the ProjectMembership.

#### TicketAttachment (`C_TICKET_ATTACHMENT`)

**system:** `false`

A file attached to a support ticket. The file is in Google Cloud Storage (`gcsBucketName`, `storageProvider`), and the ticket is in Jira (`jiraIssueKey`, `projectKey`). Child of the account (`accountEntryToTicketAttachment`, cascade); account restricted. See [`integrations/gcs.md`](./integrations/gcs.md).

#### OAuth2DxpAuthorization (`C_OAUTH2_DXP_AUTHORIZATION`)

**system:** `false`

Records that a customer's DXP instance connected to Liferay One over OAuth 2. `connectionSource` is the origin of the instance. Child of the account (cascade); account restricted. The project DXP Connections tab lists these rows.

#### SubscriptionEntry (`C_SUBSCRIPTION_ENTRY`)

**system:** `false`

A user's subscription to notifications about one record. The target is polymorphic (`className`, `classPK`), for example an ActivationKey, and `customUserId` is the subscriber. It has no relationships, so nothing deletes a row when its target or user is deleted.

---

### Licensing

#### ActivationKey (`C_ACTIVATION_KEY`)

**system:** `false`

The key a licensable purchase leads with. An EntitlementDefinition with `generatesActivationKey`, or a SKU with a `*-license-usage-type` option, leads one. Child of the account (`accountEntryToActivationKey`, prevent; account restricted) and of the project (`projectToActivationKey`, disassociate). Parent of its LicenseKeys (`activationKeyToLicenseKey`, disassociate).

#### CommonLicenseKey (`C_COMMON_LICENSE_KEY`)

**system:** `false`

A license key file that Liferay uploads once and shares with every entitled customer, selected by `productFamily`, `productVersion`, and `environmentType`. It has no relationships. Served by `CommonLicenseKeysRestController` (`/common-license-keys`).

#### ProductVersion (`C_PRODUCT_VERSION`)

**system:** `false`

A released product version (`productGroup`, `productGroupVersion`, `productVersion`), with its `type`, `versionLevel`, `supported` flag, and `bundleURL` for the download. Reference data; it has no relationships.

---

### Marketplace and Publishers

#### PublisherDetail (`C_PUBLISHER_DETAILS`)

**system:** `false`

The public profile of a Marketplace publisher account: name, contact addresses, website, and the publisher's catalog (`catalogId`, `catalogExternalId`). Child of the account (cascade); not account restricted.

#### PublisherSalesSummary (`C_PUBLISHER_SALES_SUMMARY`)

**system:** `false`

One payout period for a publisher (`quarter`, `paymentStatus`, `paidDate`). Child of the account (`accountEntryToPublisherSalesSummary`, cascade); not account restricted. Parent of the Commerce Orders it pays out (`publisherToCommerceOrder`, disassociate: deleting a summary keeps the orders).

#### PublisherAsset (`C_PUBLISHER_ASSET`)

**system:** `false`

One uploaded version of a publisher's app. Child of the account (cascade; account restricted) and of the Commerce Product (`productEntryToPublisherAsset`, cascade). Parent of PublisherAssetAttachment (cascade), which holds the uploaded file and its `publisherAssetAttachmentType` (`lpkg` · `package` · `sourceCode`).

#### GetAppInformation (`C_GET_APP_INFORMATION`)

**system:** `false`

A log row the Marketplace checkout posts after an app purchase (`orderId`, `productName`, `dashboardLink`). It has no relationships; `orderId` is text.

#### Report (`C_REPORT`)

**system:** `false`

A precomputed admin report stored as a name and a JSON value. The Marketplace summary page reads it for its most purchased section.

---

### Requests

Form submissions, in the Requests object folder. Most of them are children of the Commerce Order that the form placed, with `cascade`.

| Object | ERC | Links |
|---|---|---|
| AIHubBetaPrivateAccessRequest | `C_AI_HUB_BETA_PRIVATE_ACCESS_REQUEST` | Child of the order. No code in this workspace reads or writes it |
| DSRRequest | `C_DSR_REQUEST` | Child of the order |
| DXPFreeActivationKeyRequest | `C_DXP_FREE_ACTIVATION_KEY_REQUEST` | Child of the order |
| ProductFeedback | `C_PRODUCT_FEEDBACK` | Child of the order and of the Commerce Product |
| PublisherAccountRequest | `C_PUBLISHER_ACCOUNT_REQUEST` | No relationships. `requestStatus` is `open` · `completed` · `rejected` |
| SalesRequest | `C_SALES_REQUEST` | No relationships. No code in this workspace reads or writes it |
| TrialExtensionRequest | `C_TRIAL_EXTENSION_REQUEST` | Child of the account (account restricted) and of the order. `projectId` is a required text field with no relationship. `dueStatus` is a state picklist |


---

## ERC and FriendlyURL Registry

Generated from `03-object-definition.batch-engine-data.json` on 2026-10-15.

| Object | ERC | Separator |
|---|---|---|
| `AIHubBetaPrivateAccessRequest` | `C_AI_HUB_BETA_PRIVATE_ACCESS_REQUEST` | `l` |
| `AccountInvitation` | `C_ACCOUNT_INVITATION` | `l` |
| `AccountNote` | `C_ACCOUNT_NOTE` | `l` |
| `ActivationKey` | `C_ACTIVATION_KEY` | `l` |
| `CommonLicenseKey` | `C_COMMON_LICENSE_KEY` | `l` |
| `Contract` | `C_CONTRACT` | `l` |
| `DSRRequest` | `C_DSR_REQUEST` | `l` |
| `DXPFreeActivationKeyRequest` | `C_DXP_FREE_ACTIVATION_KEY_REQUEST` | `l` |
| `Entitlement` | `C_ENTITLEMENT` | `l` |
| `EntitlementDefinition` | `C_ENTITLEMENT_DEFINITION` | `l` |
| `EntitlementDefinitionSku` | `C_ENTITLEMENT_DEFINITION_SKU` | `l` |
| `Environment` | `C_ENVIRONMENT` | `cpdp` |
| `EnvironmentAdmin` | `C_ENVIRONMENT_ADMIN` | `l` |
| `GetAppInformation` | `C_GET_APP_INFORMATION` | `l` |
| `LicenseKey` | `C_LICENSE_KEY` | `l` |
| `OAuth2DxpAuthorization` | `C_OAUTH2_DXP_AUTHORIZATION` | `l` |
| `ProductFeedback` | `C_PRODUCT_FEEDBACK` | `l` |
| `ProductVersion` | `C_PRODUCT_VERSION` | not set |
| `Project` | `C_PROJECT` | `l` |
| `ProjectMembership` | `C_PROJECT_MEMBERSHIP` | `l` |
| `Property` | `C_PROPERTY` | `l` |
| `PublisherAccountRequest` | `C_PUBLISHER_ACCOUNT_REQUEST` | `l` |
| `PublisherAsset` | `C_PUBLISHER_ASSET` | not set |
| `PublisherAssetAttachment` | `C_PUBLISHER_ASSET_ATTACHMENT` | not set |
| `PublisherDetail` | `C_PUBLISHER_DETAILS` | not set |
| `PublisherSalesSummary` | `C_PUBLISHER_SALES_SUMMARY` | `l` |
| `Report` | `C_REPORT` | `l` |
| `SalesRequest` | `C_SALES_REQUEST` | `l` |
| `SubscriptionEntry` | `C_SUBSCRIPTION_ENTRY` | `l` |
| `TicketAttachment` | `C_TICKET_ATTACHMENT` | `l` |
| `TrialExtensionRequest` | `C_TRIAL_EXTENSION_REQUEST` | `l` |
| `UsageDefinition` | `C_USAGE_DEFINITION` | `cpud` |
| `UsageEvent` | `C_USAGE_EVENT` | `cpue` |
| `UsageReport` | `C_USAGE_REPORT` | `cpur` |

---

## See Also

- [`object-model.md`](./object-model.md) — every object, relationship, and soft link, with a diagram
- [`workspace.md`](./workspace.md) — workspace layout and client extensions
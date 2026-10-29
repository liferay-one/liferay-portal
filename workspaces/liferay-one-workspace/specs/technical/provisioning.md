# Provisioning Pipeline and Data Ownership

This file shows how a Liferay One environment goes from nothing to a working portal, which layer owns each kind of data, and what happens when a step runs a second time. It also records an audit of the pipeline on 2026-10-16.

The source of truth is the code: the client extensions under `client-extensions/`, the scripts under `scripts/`, the `one-*` skills under `.claude/skills/`, and the migration scripts in the Liferay One scripts repository. A script generated the batch file table, the item counts, and the dependency graph from `client-extensions/liferay-one-batch/batch/` and `scripts/seed/data/` on 2026-10-16. When this file and the code disagree, the code is correct.

The claims about Liferay behavior cite the portal source in this repository (`modules/apps/...`). The workspace runs `dxp-2026.q1.2-lts` (`gradle-local.properties`), so the deployed portal can differ from the source in this checkout. Each such claim says so.

The migration scripts are not in this repository. The Related Repos section of `CLAUDE.md` shows how to find the `liferay-one/scripts` checkout. Paths in this file use `<scripts>/` for its root.

## Summary

| Count | Item |
| --- | --- |
| 7 | Client extensions that bootstrap deploys, in a fixed order |
| 17 | Batch files in `liferay-one-batch`, numbered `00` to `17` with no `02`, `10`, or `11`, and two `03` and two `05` files |
| 325 | Items in the batch files |
| 12 | Dependency edges between batch files. The file order respects all 12. |
| 1 | Batch reference to a client extension entry that does not exist |
| 5 | Bootstrap scripts that run after the client extensions |
| 12 | Seed steps in `scripts/seed.sh` |
| 17 | Seed data files in `scripts/seed/data/` |
| 3 | Reset tiers: site, instance, and environment |
| 4 | Environment types: local Docker, partitioned instance, stack, and UAT |
| 12 | Findings, of which 4 are high |

## Pipeline From Zero

`scripts/bootstrap.sh` is the orchestrator for a local environment. It pins the seed scripts to basic auth against `LIFERAY_BOOTSTRAP_URL` (`scripts/bootstrap.sh:32-36`), so a bootstrap never writes to the remote environment that `.env` can name. The migration scripts are not part of any bootstrap. A person runs them against UAT or production to load real data.

```mermaid
flowchart TD
    A["gradlew clean, extract hotfix and license"] --> B["gradlew buildDockerImage, tag liferay:local"]
    B --> C["docker compose up: database, liferay, etc-spring-boot"]
    C --> D["Wait for /c/portal/status"]
    D --> E1["Deploy liferay-one-global-css"]
    E1 --> E2["Deploy liferay-one-instance-settings, creates the OAuth2 applications of Cloud Infra, Data Engineering, and Release Team"]
    E2 --> E3["Deploy liferay-one-custom-element"]
    E3 --> E4["Deploy liferay-one-batch, creates liferay-one-batch-oahs"]
    E4 --> BATCH
    subgraph BATCH["Batch import, sequential, natural file order"]
        B00["00 picklists"] --> B01["01 object folders"] --> B02["02 system object fields and actions"] --> B03["03 object definitions"] --> B04["04 object relationships"] --> B05a["05 account restrictions"] --> B05b["05 validation rule"] --> B06["06 catalog"] --> B07["07 currency"] --> B08["08 option categories"] --> B09["09 options"] --> B12["12 order types"] --> B13["13 roles"] --> B14["14 vocabularies"] --> B15["15 categories"] --> B16["16 user groups"] --> B17["17 search blueprint"]
    end
    BATCH --> E4b["Deploy liferay-one-batch-products: usage definitions, entitlement definitions, SKU links, options, specifications, products"]
    E4b --> E5["Deploy liferay-one-etc-spring-boot, creates oahs, oaua and 16 object action entries"]
    E5 --> E6["Deploy liferay-one-site-initializer"]
    E6 --> SI
    subgraph SI["Site initializer, one transaction"]
        S1["Expando columns, picklists, DDM structures"] --> S2["Vocabularies, documents, DDM templates, journal articles"]
        S2 --> S3["Roles, layouts, layout set, fragments"]
        S3 --> S4["Page templates, layout content, navigation menus"]
        S4 --> S5["Object actions, notification templates, workflow, resource permissions"]
    end
    SI --> F["Rebuild and recreate the Spring Boot sidecar"]
    F --> G1["set_virtual_hosts.sh: one.localhost"]
    G1 --> G2["set_redirect_entries.sh: JSONWS"]
    G2 --> G3["set_payment_methods.sh: JSONWS"]
    G3 --> G4["create_dxp_oauth_application.sh: portlet actions"]
    G4 --> G5["reprovision_etc_spring_boot_oauth.sh"]
    G5 --> SEED
    subgraph SEED["scripts/seed.sh"]
        H0["validate_seed_data.py"] --> H1["seed_test_data.sh: 17 data files"] --> H2["ensure_product_skus.sh"] --> H3["seed_journal_articles.sh"] --> H4["activate, assign memberships, assign accounts"] --> H5["link catalogs, link display pages, tier cards, publisher details"] --> H6["populate_orders.sh"] --> H7["populate_overages.sh"]
    end
    SEED -. "UAT and production only" .-> M["Migration scripts: <scripts>/one/scripts/migration/Main.ts"]
```

### Steps and Sources

| Step | What It Does | Source |
| --- | --- | --- |
| Build | Runs `gradlew clean`, extracts the hotfix and the license, builds the portal image, and tags it `liferay:local`. | `scripts/bootstrap.sh:44-57` |
| Containers | Starts `database`, `liferay`, and `liferay-one-etc-spring-boot`. The sidecar shares the network of the `liferay` container. | `scripts/bootstrap.sh:60`, `docker-compose.yaml` |
| Liferay ready | Polls `/c/portal/status` every 10 seconds with no limit. | `scripts/bootstrap.sh:63-67` |
| Client extensions | Deploys seven client extensions in a fixed order. It sleeps 10 seconds after each light one, waits for the batch log to go quiet for 20 seconds, and waits for the `Initialized One for group` log line. | `scripts/bootstrap/deploy_client_extensions.sh:26-48`, `:88-140`, `:145-150` |
| OAuth applications | Each client extension deploy creates its own OAuth2 applications: `liferay-one-batch-oahs`, `liferay-one-batch-products-oahs`, `liferay-one-site-initializer-oahs`, the `oahs` and `oaua` applications of the Spring Boot client extension, and the `liferay-one-instance-settings-cloud-infra-oahs`, `liferay-one-instance-settings-data-engineering-oahs`, and `liferay-one-instance-settings-release-team-oahs` applications of the instance settings client extension. | `client-extensions/*/client-extension.yaml` |
| Instance settings | Four `instanceSettings` entries and the OAuth2 applications of Cloud Infra, Data Engineering, and Release Team. Three are scoped to the site by `siteExternalReferenceCode: LIFERAY_ONE`. Liferay matches that code when it reads the configuration, so the site does not have to exist at deploy time. | `client-extensions/liferay-one-instance-settings/client-extension.yaml`, `modules/apps/configuration-admin/.../ConfigurationFilterStringUtil.java:51-73` |
| Batch import | Imports 18 files, one at a time, in natural file name order. | `modules/apps/batch-engine/.../BatchEngineUnitReaderImpl.java:111-112`, `BatchEngineUnitProcessorImpl.java:540-561` |
| Site initializer | Creates or updates the `LIFERAY_ONE` site through `putSiteByExternalReferenceCode` in one transaction. | `modules/apps/site-initializer/.../SiteInitializerClientExtension.java:168-229` |
| Sidecar | Rebuilds the Spring Boot image and recreates its container, so it reads the routes the deploy wrote. | `scripts/bootstrap/deploy_client_extensions.sh:50-60` |
| Virtual host | Binds `one.localhost` to the public layout set of the One site. | `scripts/bootstrap/set_virtual_hosts.sh:14-26` |
| Redirects | Adds the redirect entries that give the hash routes of the custom element a plain path. The site initializer cannot hold them (see trap 7). | `scripts/bootstrap/set_redirect_entries.sh:14-45` |
| Payment methods | Activates `money-order` and `paypal-integration` on the channel through JSONWS. No client extension type, headless API, or batch delegate exists for these rows. | `scripts/bootstrap/set_payment_methods.sh:14-34` |
| DXP OAuth application | Creates `marketplace-client-id` through the OAuth2 admin portlet actions, with the PKCE and refresh token grants that a customer DXP needs. | `scripts/bootstrap/create_dxp_oauth_application.sh:7-44` |
| Sidecar OAuth | Redeploys the Spring Boot client extension with `--rerun-tasks` so its redirect URIs and CORS list include `one.localhost`, then restarts the sidecar. | `scripts/bootstrap/reprovision_etc_spring_boot_oauth.sh:7-45` |
| Seed | Validates the seed data, then runs 12 steps. A failed step does not stop the others, and the run reports every failed step at the end. | `scripts/seed.sh:28-46`, `:78-91` |
| Migration | Extracts from Koroneiki, Salesforce, and the old Marketplace, then writes accounts, projects, products, contracts, orders, entitlement definitions, entitlements, and license keys. | `<scripts>/one/scripts/migration/Main.ts:6-9`, `MigrateMain.ts:43-90` |

### Client Extension Deploy Order

Each target deploys the client extensions in a different order. The batch must come before the site initializer, because 29 object names in the site initializer tree resolve through `[$OBJECT_DEFINITION_ID:<Name>$]` and `[$OBJECT_DEFINITION_CLASS_NAME:<Name>$]` tokens, and all 29 are defined in the batch files.

| Target | Order | Waits for the Batch Import | Source |
| --- | --- | --- | --- |
| Local Docker | global CSS, instance settings, custom element, batch, Salesforce product batch, Spring Boot, site initializer | Yes, log quiet for 20 seconds, after each batch | `scripts/bootstrap/deploy_client_extensions.sh:26-48` |
| Partitioned instance | global CSS, instance settings, custom element, batch, Salesforce product batch, site initializer, then Spring Boot in `_set_up` | Yes, reads import tasks from the partition, after each batch | `scripts/instance.sh:25-31`, `:161-233`, `:531-553` |
| UAT and production | batch, Salesforce product batch, site initializer, then the others. Only the client extensions that changed since a base commit. | No. `lcp deploy` returns when the upload finishes. | `scripts/deploy.sh:16-19`, `:63-69`, `:161-176` |

An object action whose executor key names a client extension entry that does not exist yet is allowed: Liferay logs it at debug level and saves the action (`modules/apps/object/.../ObjectActionLocalServiceImpl.java:726-740`). So the batch can define actions before the Spring Boot client extension deploys.

### Site Initializer Handlers

`BundleSiteInitializer` does not run its handlers in a fixed list. It builds a dependency map (`_createRMap`) and runs each handler when all of its prerequisites are done. The log prints the real order as `Invoking <handler> took <n> ms`. These are the handlers that read the One tree, with their prerequisites from the map:

| Directory or File | Handler | Runs After |
| --- | --- | --- |
| `asset-list-entries.json` | `addAssetListEntries` | DDM structures, documents, journal articles, object entries, `publishObjectDefinitions` |
| `commerce-channel*.json` | `addCPDefinitions`, through the commerce site initializer | `addOrUpdateLayouts`, object entries |
| `data-definitions/` | `addOrUpdateDataDefinitions` | nothing |
| `ddm-structures/` | `addOrUpdateDDMStructures` | nothing |
| `ddm-templates/` | `addOrUpdateDDMTemplates` | data definitions, DDM structures, `publishObjectDefinitions` |
| `documents/` | `addOrUpdateDocuments` | expando columns, vocabularies |
| `expando-columns.json` | `addOrUpdateExpandoColumns` | nothing |
| `expando-values.json` | `addExpandoValues` | journal articles, layout content, user groups |
| `fragments/` | `addFragmentEntries` | documents, `updateLayoutSets` |
| `journal-articles/` | `addOrUpdateJournalArticles` | DDM templates, documents |
| `layout-page-templates/` | `addLayoutPageTemplates` | object definitions, `addCPDefinitions`, client extension entries, fragments, journal articles, search blueprint |
| `layout-set/` | `updateLayoutSets` | `addOrUpdateLayouts` |
| `layouts/` | `addOrUpdateLayouts`, then `addOrUpdateLayoutsContent` | roles; then fragments and page templates |
| `list-type-definitions/` | `addOrUpdateListTypeDefinitions` | nothing |
| `notification-templates/` | `addOrUpdateNotificationTemplates` | `publishObjectDefinitions` |
| `object-actions/` | `addOrUpdateObjectActions` | account entry restrictions |
| `organizations.json` | `addOrUpdateOrganizations` | expando columns |
| `plo-entries.json` | `setPLOEntries` | nothing |
| `resource-permissions.json` | `addOrUpdateResourcePermissions` | segments experiences, workflow definitions |
| `roles-assignments.json` | `addRolesAssignments` | roles, user accounts, user groups. User accounts run after organizations. The handler replaces every group of the role with the groups in the file. |
| `site-navigation-menus.json` | inside `addOrUpdateLayoutsContent` | the layouts |
| `style-books/` | `addStyleBookEntries` | depot entries |
| `taxonomy-vocabularies/` | `addOrUpdateTaxonomyVocabularies` | DDM structures |
| `workflow-definitions/` | `addWorkflowDefinitions` | accounts, roles |

Source: `_createRMap` in `modules/apps/site-initializer/site-initializer-extender/site-initializer-extender/src/main/java/com/liferay/site/initializer/extender/internal/BundleSiteInitializer.java`, and the loop at `:6142-6172`.

## Batch Files

The table lists every file in `client-extensions/liferay-one-batch/batch/`. REST Builder generates the same strategy mapping for every resource: `UPSERT` with `UPDATE` calls the PUT by external reference code, which replaces the record. `UPSERT` with `PARTIAL_UPDATE` reads the record by external reference code and calls PATCH, or POST when the record does not exist. `INSERT` calls POST. Source: `BaseObjectDefinitionResourceImpl.java:774-826` in `modules/apps/object/object-admin-rest-impl`.

| File | Entity | Items | Create, Update | On Error Fail | Depends On |
| --- | --- | --- | --- | --- | --- |
| `00-list-type-definition` | `ListTypeDefinition` | 23 | `UPSERT`, `UPDATE` | false | nothing |
| `01-object-folder` | `ObjectFolder` | 2 | `UPSERT`, `UPDATE` | false | nothing |
| `03-object-definition` | `ObjectDefinition` (35 custom objects) | 35 | `UPSERT`, `PARTIAL_UPDATE` | false | `00` (14 picklists); `01` (2 folders); 2 Spring Boot object action entries, 1 of which does not exist |
| `03-system-object-field` | `ObjectDefinition` (6 system objects, with their 23 relationships) | 6 | `UPSERT`, `UPDATE` | false | `00` (picklist `LT_PRODUCT_FAMILY`); `03` (the 23 child objects); 6 Liferay system objects; 14 Spring Boot object action entries |
| `04-object-relationship` | `ObjectRelationship` (a custom object parent) | 28 | `UPSERT`, `UPDATE` | not set | `03` (the objects); 6 Liferay system objects as children |
| `05-object-definition-account-entry-restricted` | `ObjectDefinition` | 14 | `UPSERT`, `PARTIAL_UPDATE` | false | `03` (14 objects); `03-system-object-field` (the `accountEntryTo*` relationships) |
| `05-object-validation-rule` | `ObjectValidationRule` | 1 | `INSERT` | false | `03` (`C_PROJECT_MEMBERSHIP`); `03-system-object-field` (`userToProjectMembership`); `04` (`projectToProjectMembership`) |
| `06-commerce-catalog` | `Catalog` | 1 | `UPSERT`, `PARTIAL_UPDATE` | false | the built in currency `USD` |
| `07-commerce-currency` | `Currency` (`SGD`) | 1 | `INSERT` | not set | nothing |
| `08-commerce-option-category` | `OptionCategory` | 5 | `UPSERT`, `PARTIAL_UPDATE` | false | nothing |
| `09-commerce-option` | `Option` | 3 | `INSERT`, `PARTIAL_UPDATE` | false | nothing |
| `12-commerce-order-type` | `OrderType` | 19 | `UPSERT`, `PARTIAL_UPDATE` | false | nothing |
| `13-role` | `Role` | 43 | `UPSERT`, `PARTIAL_UPDATE` | false | nothing |
| `14-taxonomy-vocabulary` | `TaxonomyVocabulary`, site `L_GLOBAL` | 10 | `UPSERT`, `UPDATE` | false | nothing. Each item sets `multiValued`, because the update path unboxes it and throws a `NullPointerException` when it is not set. |
| `15-taxonomy-category` | `TaxonomyCategory`, site `L_GLOBAL` | 128 | `UPSERT`, `UPDATE` | false | `14` (10 vocabularies) |
| `16-user-group` | `UserGroup` | 4 | `UPSERT`, `PARTIAL_UPDATE` | false | `13` (2 roles) |
| `17-sxp-blueprint` | `SXPBlueprint` | 1 | `UPSERT`, `UPDATE` | false | nothing |

### Dependency Graph

An arrow points from the file that creates an entity to the file that references it. The two `03` files sort as `03-object-definition` before `03-system-object-field`, and the two `05` files sort as `05-object-definition-account-entry-restricted` before `05-object-validation-rule`, because the batch engine uses natural string order.

```mermaid
flowchart LR
    F00["00-list-type-definition"]
    F01["01-object-folder"]
    F03["03-object-definition"]
    F03s["03-system-object-field"]
    F04["04-object-relationship"]
    F05["05-object-definition-account-entry-restricted"]
    F05b["05-object-validation-rule"]
    F06["06-commerce-catalog"]
    F07["07-commerce-currency"]
    F08["08-commerce-option-category"]
    F09["09-commerce-option"]
    F12["12-commerce-order-type"]
    F13["13-role"]
    F14["14-taxonomy-vocabulary"]
    F15["15-taxonomy-category"]
    F16["16-user-group"]
    F17["17-sxp-blueprint"]
    SB["liferay-one-etc-spring-boot entries"]
    F00 --> F03
    F00 --> F03s
    F01 --> F03
    F03 --> F03s
    F03 --> F04
    F03 --> F05
    F03 --> F05b
    F03s --> F05
    F03s --> F05b
    F04 --> F05b
    F13 --> F16
    F14 --> F15
    SB -. "executor keys" .-> F03s
    SB -. "executor keys" .-> F03
```

### Order Check

The file order respects all 12 edges. No file references an entity that a later file creates. Three references point outside the batch:

1. `06-commerce-catalog` uses `USD`, a currency that Liferay creates. `07-commerce-currency` adds only `SGD`, so the numbers `06` and `07` are not in conflict.

1. `02` and `03` name 16 Spring Boot object action entries as `function#<entry>`. 15 of them exist (see finding 6). The Spring Boot client extension deploys after the batch. Liferay accepts an executor key that is not registered yet, so the order works.

1. The commerce products that use the 3 options and the 128 categories are not in the batch. The Salesforce product batch holds the specifications, the 48 Salesforce products of UAT, and their definitions (see the next section). The other products are in `scripts/seed/data/06-commerce-product.batch-engine-data.json` and in the migration. All the specification keys and all 26 category codes that the seed products use exist in the Salesforce product batch `04` and in `15`. The Salesforce product batch deploys after the batch, because its specifications use the 5 option categories of `08`, and the seed runs after both.

### Salesforce Product Batch

`client-extensions/liferay-one-batch-products/batch/` holds what we own for the Salesforce products: the specifications of every product, and the products, entitlement definitions, SKU links, and usage definitions of the Salesforce SKUs. Salesforce owns the SKUs and the orders. The files are the source of truth and are edited by hand. No script writes this data to UAT or production: the deploy of the batch is the only write. A pull from UAT is a check that is run by hand and is not part of the repository.

| File | Entity | Items | Create, Update in the File | Depends On |
| --- | --- | --- | --- | --- |
| `00-usage-definition` | `C_USAGE_DEFINITION` | 8 | `UPSERT`, `UPDATE` | batch `03` |
| `01-entitlement-definition` | `C_ENTITLEMENT_DEFINITION` | 335 | `UPSERT`, `UPDATE` | batch `03`, `04`; `00` (8 usage definitions) |
| `02-entitlement-definition-sku` | `C_ENTITLEMENT_DEFINITION_SKU` | 1,436 | `UPSERT`, `UPDATE` | batch `03`, `04`; `01` (335 definitions) |
| `03-commerce-option` | `Option` | 49 | `INSERT`, `PARTIAL_UPDATE` | nothing |
| `04-commerce-specification` | `Specification` | 62 | `UPSERT`, `PARTIAL_UPDATE` | batch `08` (5 option categories) |
| `05-commerce-product` | `Product` | 48 | `UPSERT`, `PARTIAL_UPDATE` | batch `06`, `09`; `03`, `04` |

The definitions import before the catalog because they do not depend on it: a link holds the SKU external reference code as text, so a definition does not need its product. The batch engine imports every file in file name order, and a file that fails does not stop the files after it. The option files of both batches use `INSERT`, because `UPSERT` cannot create an option: it calls `OptionResourceImpl.doGetOptionByExternalReferenceCode` to find each option, and that method throws a `NullPointerException` instead of a `NoSuchModelException` when the option does not exist. On an environment without the options, the whole file then fails, and `05-commerce-product` fails for each product that uses a missing option. `INSERT` calls `addOrUpdateCPOption` with the external reference code, so it creates an option that does not exist and updates one that does. `05-commerce-product` fails on every environment that already has the products: `ProductOptionUtil.addOrUpdateCPDefinitionOptionRel` passes the null `optionId` of the request to `updateCPDefinitionOptionRel`, which throws a `NullPointerException`, and the products stay unchanged.

The object entry files use the `com.liferay.object.rest.dto.v1_0.ObjectEntry` class name with the `C_<object name>` task item delegate. A batch client extension does not resolve the `ObjectDefinition#<ERC>` class name of the seed files, and the import then waits with no error.

### Seed Files

`scripts/seed/seed_test_data.sh` imports these files in file name order, after it imports `09-commerce-option` from the batch a second time (`scripts/seed/seed_test_data.sh:27-40`). Custom object entries go to the scoped `/o/c/<plural>/batch` endpoint of the object.

| File | Entity | Items | Create, Update in the File |
| --- | --- | --- | --- |
| `01-account` | `Account` | 32 | `UPSERT`, `UPDATE` |
| `02-user-account` | `UserAccount` | 16 | `UPSERT`, `UPDATE` |
| `03-project` | `C_PROJECT` | 36 | `UPSERT`, `UPDATE` |
| `04-contract` | `C_CONTRACT` | 37 | `UPSERT`, `UPDATE` |
| `05-commerce-catalog` | `Catalog` (`a1fcb2bc-7571-0ebe-4722-3547f58689ac`, IGNEK) | 1 | `UPSERT`, `PARTIAL_UPDATE` |
| `05-commerce-option` | `Option` (the 5 options of the seed products that the batch does not define) | 5 | `UPSERT`, `PARTIAL_UPDATE` |
| `06-commerce-product` | `Product` (copies of 24 UAT products) | 24 | `UPSERT`, `PARTIAL_UPDATE` |
| `07-license-key` | `C_LICENSE_KEY` | 17 | `UPSERT`, `UPDATE` |
| `08-project-membership` | `C_PROJECT_MEMBERSHIP` | 73 | `UPSERT`, `UPDATE` |
| `09-publisher-account-request` | `C_PUBLISHER_ACCOUNT_REQUEST` | 4 | `UPSERT`, `UPDATE` |
| `10-publisher-sales-summary` | `C_PUBLISHER_SALES_SUMMARY` | 3 | `UPSERT`, `UPDATE` |
| `11-publisher-details` | `C_PUBLISHER_DETAILS` | 1 | `UPSERT`, `UPDATE` |
| `13-usage-definition` | `C_USAGE_DEFINITION` (the 4 that no Salesforce definition uses) | 4 | `UPSERT`, `UPDATE` |
| `14-environment` | `C_ENVIRONMENT` | 25 | `UPSERT`, `UPDATE` |
| `15-entitlement-definition` | `C_ENTITLEMENT_DEFINITION` (test and marketplace definitions) | 43 | `UPSERT`, `UPDATE` |
| `16-oauth2-dxp-authorization` | `C_OAUTH2_DXP_AUTHORIZATION` | 3 | `UPSERT`, `UPDATE` |
| `17-entitlement-definition-sku` | `C_ENTITLEMENT_DEFINITION_SKU` (links to SKUs that are not Salesforce SKUs) | 45 | `UPSERT`, `UPDATE` |

The import URLs pass `createStrategy` but not `updateStrategy` (`scripts/seed/seed_test_data.sh:84`, `:92`). So every seed file updates with `UPDATE`, and the `PARTIAL_UPDATE` in `05` and `06` has no effect. See finding 9.

## Ownership Map

The workspace rule is: the batch client extension holds definitions, configuration, and reference entries that ship to every environment, with no test data. The site initializer holds site content. The seed holds test records. The migration holds real data. The table shows where each kind of data lives today. Rows that break the rule carry a finding number.

| Entity | Definition | Reference Data | Test Data | Real Data |
| --- | --- | --- | --- | --- |
| Picklists | batch `00` (23); site initializer (3: `AC-REGIONS`, `LIFERAY-VERSIONS`, `LT_PURPOSE_OF_COMPLIMENTARY_KEY`) | same | none | none |
| Object folders | batch `01` | none | none | none |
| Custom objects (35) | batch `03` | none | seed `03`, `04`, `07` to `17` | migration and runtime |
| Fields and actions on 6 system objects | batch `02` | none | none | none |
| Object action on Commerce Order | site initializer `object-actions/` | none | none | none |
| Object relationships (52) | batch `04` | none | none | none |
| Account restrictions (12) | batch `05` | none | none | none |
| Validation rule (1) | batch `05` | none | none | none |
| Custom fields (expando, 81 columns on 7 models) | site initializer `expando-columns.json` | site initializer `expando-values.json` | none | migration |
| Commerce channel | site initializer `commerce-channel.json` | none | none | none |
| Channel payment methods | none | bootstrap `set_payment_methods.sh` | none | none |
| Commerce catalogs | batch `06` (`LIFERAY_INC_CATALOG`) | none | seed `05` (the IGNEK publisher catalog) | migration (marketplace publishers) |
| Currency `SGD` | batch `07` | none | none | migration (account currencies) |
| Option categories | batch `08` | none | none | none |
| Specifications | Salesforce product batch `04` (62) | none | none | none |
| Options | batch `09` (3); seed `05` (the 5 options of the seed products that the batch does not define), finding 8; the Salesforce product batch `03` (`MACHINE_TYPE` and one option per Salesforce product family) | none | none | migration creates `MACHINE_TYPE` when it is missing |
| Commerce products and SKUs | Salesforce product batch `05` (the 48 Salesforce products of UAT) | none | seed `06` (46), `ensure_product_skus.sh` | migration (Salesforce and Marketplace products) |
| Order types | batch `12` | none | none | none |
| Roles, user groups | batch `13`, `16` | none | role and group memberships in seed | migration (memberships) |
| Vocabularies (company) | batch `14` (10) and site initializer (11), finding 5 | batch `15` (128 categories) and site initializer (5 categories) | none | none |
| Vocabulary `article-categories` (site) | site initializer | site initializer (60 categories) | none | none |
| Search blueprint | batch `17` | none | none | none |
| Usage definitions | batch `03` | Salesforce product batch `00` (8); seed `13` (4), finding 4 | none | none |
| Entitlement definitions and SKU links | batch `03` | Salesforce product batch `01`, `02` (the 335 definitions and 1,436 links of the Salesforce SKUs) | seed `15`, `17` (43 and 45) | migration `CreateEntitlementDefinitions` |
| Accounts, users | Liferay | none | seed `01`, `02` and the assign scripts | migration and runtime |
| Orders, order items, entitlements, license keys, usage events | Liferay and batch `03` | none | `populate_orders.sh`, `populate_overages.sh` | migration and runtime |
| Pages, fragments, templates, style books, menus, documents | site initializer | none | none | none |
| Journal articles | site initializer (`eula` only) | none | `seed_journal_articles.sh` | migration `MigrateCPArticles` |
| Product display page links, tier card IDs | none | `link_product_display_pages.sh`, `configure_tier_cards.sh` in the seed, finding 4 | none | none |
| Notification templates, workflow definitions, resource permissions | site initializer | none | none | none |
| Virtual host, redirect entries | none | bootstrap | none | none |
| OAuth2 applications | each client extension deploy; bootstrap for `marketplace-client-id`; `/one-oauth-app` for `local-dev` | none | none | none |
| Instance settings | `liferay-one-instance-settings` | none | none | none |

The batch rule holds: no batch file holds test data. The batch OAuth application still asks for 8 `c_*.everything` scopes for objects whose entries moved to the seed (`client-extensions/liferay-one-batch/client-extension.yaml:13-20`). The batch writes no object entries, so it does not need them.

## Rerun Behavior

### Per Step

| Step | Second Run | What Makes It Run Again |
| --- | --- | --- |
| Batch client extension | The batch engine writes a processed marker per file and company, keyed on the bundle modification time. An identical zip does nothing. A changed zip imports all 18 files again, in order. | A new zip (`gradlew clean deploy`), or a reinstall of the bundle. Source: `BatchEngineUnitProcessorImpl.java:456-530`. |
| `00`, `01`, `04`, `14`, `15`, `17` | Upsert by external reference code with full replace. Safe. | as above |
| `03-system-object-field` | PUT by external reference code. Each item lists the relationships of its system object, so the PUT updates them in place and deletes none. A relationship with a system object parent belongs in this file, not in `04`: the PUT deletes any relationship that the item does not list, and `yarn viz:check` reports one in `04`. The same holds for object actions, so `OA_COMMERCE_PRODUCT_DEFINITION_CREATE` is in this file and not in the site initializer. | as above. See trap 3. |
| `03`, `05`, `06`, `08` to `10`, `12`, `13`, `16` | PATCH by external reference code. The objects keep their relationships, because the PATCH starts from the stored definition. | as above |
| `05-object-validation-rule`, `07-commerce-currency` | `INSERT` posts the item again and the item fails as a duplicate, which changes nothing. On `2026.q1.2` neither can do better: the batch engine rejects `UPSERT` for a currency, a validation rule has no `UPSERT`, and a PATCH of the object definition does not add a missing rule. The `_ensure_batch_records` step of `scripts/seed/seed_test_data.sh` creates both when they are missing. | as above. Finding 10. |
| Site initializer | A new zip calls `putSiteByExternalReferenceCode`, which updates the existing group and runs every handler again in one transaction. Most handlers upsert. A failure rolls back the whole run and leaves the site as it was. | A new zip. Deleting the site and deploying a new zip creates it from nothing. |
| `set_virtual_hosts.sh` | Sets the same host. Safe. | every bootstrap and reset |
| `set_redirect_entries.sh` | Looks up each entry before it writes. Safe. | every bootstrap and reset |
| `set_payment_methods.sh` | Skips an engine that already has a row on the channel. Safe. | bootstrap and partitioned instance provision only |
| `create_dxp_oauth_application.sh` | Updates the application in place. Safe. | bootstrap and partitioned instance provision only |
| `reprovision_etc_spring_boot_oauth.sh` | Redeploys with `--rerun-tasks` and restarts the sidecar. Safe. | every local bootstrap and reset |
| Seed data files | Upsert by external reference code. Safe, except that products use `UPDATE` (finding 9). | every bootstrap and reset |
| `populate_orders.sh`, `populate_overages.sh` | Upsert orders by external reference code. Disables the `EntitlementGeneration` action while it runs. | every bootstrap and reset. See finding 2. |
| Migration | `CreateEntitlementDefinitions` upserts by external reference code. The other scripts are outside this audit. | by hand |

### Known Traps

Each trap was checked against the code or the data. The status column says how far.

| # | Trap | Status | Evidence |
| --- | --- | --- | --- |
| 1 | A reserved field name such as `status` aborts the whole object import. | True as a mechanism. No field in the current batch files uses a reserved name: the script checked every object field against `status`, `id`, `creator`, `keywords`, `userId`, and five metadata names. | `batch_deps.py` output; `.agents/rules/site-initializer-format.md` |
| 2 | Deleting a batch owned object definition triggers an OSGi refresh that imports all batch data again. | Observed, not confirmed in source. The processed marker lives in the bundle data area and is keyed on the bundle modification time, so a reinstall of the bundle imports again. The refresh path that `teardown_structure.sh` describes was not traced. | `scripts/seed/teardown_structure.sh:29-40`; `BatchEngineUnitProcessorImpl.java:483-530` |
| 3 | Importing the system object file into a populated environment drops relationships. | Fixed. `putObjectDefinition` deletes each stored relationship whose name is not in the request, also when the request has no `objectRelationships` at all. The file was `02-system-object-field`, ran before the custom objects, and sent an empty list. It is now `03-system-object-field`, runs after them, and lists the 23 relationships whose parent is one of the 6 system objects. A redeploy on a seeded instance kept every relationship ID and foreign key value. | `client-extensions/liferay-one-batch/batch/03-system-object-field.batch-engine-data.json`; `ObjectDefinitionResourceImpl.java:910-931` |
| 4 | `PARTIAL_UPDATE` does not add `objectFields`. | True on `2026.q1.2`. A PATCH import of an existing object definition added no field, no object action, and no validation rule (tested on a stack instance on 2026-10-28). `preparePatch` in this checkout passes new fields through to the PUT, so a later release may add them. Until then, a nested collection that must appear on an existing object needs the `UPDATE` strategy, which is why the system object file uses it. | `ObjectDefinitionResourceImpl.java:1026-1078` |
| 5 | The site initializer is all or nothing. | True. The client extension runs the site PUT inside `TransactionInvokerUtil.invoke`. A failure rolls back the site, the objects, and the picklists that the run created. | `SiteInitializerClientExtension.java:217-228` |
| 6 | Object relationship JSON needs a stable external reference code. | True for the site initializer. Not a risk now: the site initializer tree has no `object-relationships/` directory, and all 52 relationships in `04` have a fixed, readable external reference code. | `batch_deps.py` output |
| 7 | `site-settings.json` cannot hold redirect patterns. | True as documented. The site initializer passes each value as a string, and `RedirectPatternConfigurationModelListener` casts the patterns to `String[]`, which fails the provision. The redirects are a bootstrap step. | `scripts/bootstrap/set_redirect_entries.sh:27-45` |

## Reset Matrix

A filled cell means the reset destroys and builds that layer again. "Kept" means the layer survives. "Lost" means the reset destroys the layer and does not build it again.

| Layer | `/one-env-down` | `/one-site-reset` | `/one-instance-reset` | `/one-env-reset` | `teardown.sh` | `teardown.sh --full` | `instance.sh delete` and `provision` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Docker image and volumes | kept | kept | kept | rebuilt | kept | kept | kept (shared server) |
| Database | kept | kept | kept | rebuilt | kept | kept | rebuilt (own schema) |
| OAuth app `local-dev` | kept | kept | kept | lost (run `/one-oauth-app`) | kept | kept | not created |
| Global CSS, instance settings, custom element | kept | kept | kept | rebuilt | kept | kept | rebuilt |
| Batch definitions and reference data | kept | kept | rebuilt | rebuilt | kept | deleted, then restored by the batch refresh (trap 2) | rebuilt |
| One site and its content | kept | rebuilt | rebuilt | rebuilt | kept | kept | rebuilt |
| Commerce channel | kept | depends on the site delete (open question 2) | rebuilt by the site initializer | rebuilt | kept | deleted | rebuilt |
| Payment methods | kept | depends on the channel | lost (open question 2) | rebuilt | kept | lost | rebuilt |
| DXP OAuth application | kept | kept | kept | rebuilt | kept | kept | rebuilt |
| Virtual host, redirects | kept | rebuilt | rebuilt | rebuilt | kept | kept | rebuilt |
| Sidecar OAuth routes | kept | rebuilt | rebuilt | rebuilt | kept | kept | rebuilt (own sidecar) |
| Seed records | kept | rebuilt | rebuilt | rebuilt | deleted | deleted | rebuilt |

Sources: `scripts/bootstrap.sh:38-42`, `scripts/seed/site_reset.sh:44-68`, `scripts/seed/instance_reset.sh:55-94`, `scripts/seed/teardown.sh:5-17`, `scripts/seed/teardown_structure.sh:44`, `:103-108`, `scripts/instance.sh:144-159`, `:417-444`, and the `one-*` skills.

`teardown_records.sh` deletes 13 record types: orders, usage reports, entitlements, license keys, environments, contracts, project memberships, projects, publisher data, products, journal articles, accounts, and users. It keeps entitlement definitions, usage definitions, entitlement definition SKUs, and DXP OAuth authorizations. The seed upserts them again, so this has no effect on a reset.

## Environment Differences

| Step | Local Docker | Partitioned Instance | Stack | UAT and Production |
| --- | --- | --- | --- | --- |
| Entry point | `scripts/bootstrap.sh` | `scripts/instance.sh provision <web ID>` | `instance.sh` with `DOCKER_HOST` and `LIFERAY_INSTANCE_DOMAIN=stack`, or a whole Docker stack on the host | `scripts/deploy.sh` with `LCP_PROJECT` |
| Build and containers | Builds the image and starts the stack | Uses the shared server. Creates the company through `headless-portal-instances` under the import lock. | The server runs on the stack host. The scripts build on the laptop. | Liferay Cloud |
| Client extensions | 6, with `liferay-one` names | 6, built with `-Pliferay.virtual.instance.id`, so each zip and bundle has the `_<web ID>` suffix | as partitioned instance | Only the client extensions that changed |
| Spring Boot | One sidecar on port 58081 | One sidecar per instance, ports 58082 to 58099 | Sidecar bound to `127.0.0.1` on the stack host | Liferay Cloud service |
| Virtual host | `one.localhost` | `<subdomain>.localhost` and `admin.<subdomain>.localhost` | `<subdomain>.stack` | Real domain |
| Redirects, payment methods, DXP OAuth | Yes | Yes, in `_configure` | Yes | Not automated. Run each script by hand with admin credentials. |
| `reprovision_etc_spring_boot_oauth.sh` | Yes | No. The sidecar deploys after the host is bound. | No | No |
| Batch import lock | No | Yes, for the company creation, each batch and site initializer deploy, and each seed import | Yes | No |
| Seed | Yes | Yes. `admin.<subdomain>.localhost` passes `_require_local_seed_target`. | Refused. `admin.<subdomain>.stack` is not a local host, so 4 steps exit and the other 8 run against missing data. Run again with `LIFERAY_SEED_REMOTE=true` and `DOCKER_HOST`. | Refused unless `LIFERAY_SEED_REMOTE=true` |
| Migration | No | No | No | Yes |

Sources: `scripts/_common.sh:87-97`, `:209-221`, `:296-317`; `scripts/instance.sh:5-20`, `:102-142`, `:417-444`, `:531-553`; `scripts/deploy.sh:7-26`; `.claude/skills/one-worktree-instance/SKILL.md`. The stack host itself is defined in personal tooling outside this repository.

`scripts/bootstrap/build.sh`, `start.sh`, and `post-start.sh` are a second entry point with `pre-*.sh` and `post-*.sh` hooks. No file in this repository calls them. `post-start.sh` runs only `deploy_client_extensions.sh`, so that path sets no virtual host and runs no seed.

## Findings

### High

1. **Fixed on 2026-10-28: every deploy of a changed batch zip deleted 23 relationships and their foreign keys.** `02-system-object-field` replaced the 6 system objects in full and listed none of their relationships, so the PUT deleted the ones whose parent is `L_ACCOUNT`, `L_USER`, `L_COMMERCE_PRODUCT_DEFINITION`, `L_COMMERCE_ORDER_ITEM`, or `L_ORGANIZATION`. On UAT, only the composite key rule on `C_PROJECT_MEMBERSHIP` made the import fail first. The file is now `03-system-object-field`, which lists the 23 relationships, and `04` holds only the relationships with a custom object parent.

1. **Fixed on 2026-10-20 (Go-Live Tasks T3.4): a partitioned instance provision left the `EntitlementGeneration` action disabled.** `scripts/seed/populate_orders.sh` set an `EXIT` trap that turns the action on again, and with `LIFERAY_BATCH_IMPORT_LOCK=true`, which `scripts/instance.sh` sets, `_lock_batch_import` replaced that trap with `trap '_unlock' EXIT`. Both now add their command with `_add_exit_command` in `scripts/_common.sh`, and the one `EXIT` trap runs each command once.

1. **`/one-site-reset` can delete the site and not create it again.** `scripts/seed/site_reset.sh:53` deploys the site initializer without `clean`. `scripts/seed/instance_reset.sh:62-67` explains that an unchanged source copies a byte identical zip, which Liferay does not process. On a second site reset with no source change, the site stays deleted and the wait times out after 600 seconds. Add `:client-extensions:liferay-one-site-initializer:clean` as `instance_reset.sh:78` does.

1. **Reference data that every environment needs lives only in the seed, which UAT and production never run.** The 8 usage definitions of the Salesforce definitions moved to the Salesforce product batch. The other 4 in `scripts/seed/data/13-usage-definition.batch-engine-data.json` (`ai-tokens-monthly`, `api-requests-monthly`, `events-monthly`, `license-generations`) have no other source, so their usage reports find no metric on an environment without the seed. `link_product_display_pages.sh` and `configure_tier_cards.sh` are site configuration in `scripts/seed.sh:42-43`. `configure_tier_cards.sh` says to run it by hand on UAT and production, but nothing does. Move the usage definitions to the batch, and move the two site configuration steps to bootstrap, as `set_redirect_entries.sh` is.

### Medium

1. **Two layers own the same 10 company vocabularies and 5 categories.** `14-taxonomy-vocabulary` and `client-extensions/liferay-one-site-initializer/site-initializer/taxonomy-vocabularies/company/` both write `MARKETPLACE_APP_CATEGORY` and 9 more. `15-taxonomy-category` and the site initializer both write `MARKETPLACE_LISTING_LISTED` and the 4 `MARKETPLACE_PRODUCT_TYPE_*` categories. `MARKETPLACE_SOLUTION_EDITION` exists only in the site initializer. A change in one layer is reverted by the other on the next run. Keep the company vocabularies in the batch only.

1. **The `UsageReportApproved` action does not create the overage order.** `03-object-definition.batch-engine-data.json:8072` names `function#liferay-one-etc-spring-boot-object-action-usage-report-approved`. The entry in `client-extensions/liferay-one-etc-spring-boot/client-extension.yaml:133` and the controller `ObjectActionUsageReportApprovedRestController` exist. The controller does nothing unless the usage report is approved, and then it only logs a warning. An approved usage report creates no overage order and no Salesforce opportunity. Add the order and the opportunity to the controller.

1. **The UAT deploy does not wait for the batch import before the site initializer.** `scripts/deploy.sh:63-69` calls `lcp deploy` for each client extension in a row. The site initializer resolves 29 object definition tokens that the batch creates. When both change in one deploy, the site initializer can run first and fail its transaction. Deploy the batch alone and wait, or deploy the site initializer in a second run.

1. **Fixed on 2026-10-28: the batch options failed on `2026.q1.2`.** With `UPSERT`, `OptionResourceImpl.doGetOptionByExternalReferenceCode` throws a `NullPointerException` for each new option, so an environment without the options got none. `09-commerce-option` and the product batch `03-commerce-option` now use `INSERT`, which calls `addOrUpdateCPOption` and creates or updates each option.

### Low

1. **The seed ignores `updateStrategy`.** `scripts/seed/seed_test_data.sh:84` and `:92` send `createStrategy` only, so the import uses the default `UPDATE`. `05-commerce-catalog`, `05-commerce-option`, and `06-commerce-product` ask for `PARTIAL_UPDATE`. `populate_orders.sh` passes `updateStrategy`, so the two scripts behave differently.

1. **Three batch files fail on every reimport, and the data stays as it was.** `05-object-validation-rule` and `07-commerce-currency` use `INSERT` and fail as duplicates. The batch engine of `2026.q1.2` rejects `UPSERT` for a currency, the validation rule has no `UPSERT`, and a PATCH of the object definition does not add a missing rule. The product batch `05-commerce-product` fails for each product that already has its options, because `ProductOptionUtil.addOrUpdateCPDefinitionOptionRel` passes the null `optionId` of the request to `updateCPDefinitionOptionRel`. A fix of that line belongs in the portal. The `_ensure_batch_records` step of `scripts/seed/seed_test_data.sh` creates the currency, the rule, and the products that are missing, on the environments that run the seed.

1. **The `one-bootstrap` skill documents commands that `bootstrap.sh` does not have.** `.claude/skills/one-bootstrap/SKILL.md:29-39` lists `up`, `start`, `stop`, `down`, and `clean`. `scripts/bootstrap.sh:10-16` reads only `--reset` and ignores every other argument, so `scripts/bootstrap.sh stop` runs a full bootstrap, and `clean` does not delete the volumes. Point the skill at `docker compose` for those commands.

1. **Dead configuration in the client extensions.** `client-extensions/liferay-one-site-initializer/client-extension.yaml:4` sets `overwrite: true`, which the workspace plugin does not map to `site-initializer.json` (`CreateClientExtensionConfigTask.java:939-948` maps 7 keys, and `overwrite` is not one of them). `client-extensions/liferay-one-batch/client-extension.yaml:13-20` grants 8 `c_*.everything` scopes that no batch file uses. `scripts/instance.sh:215` says the site initializer does not run again on an existing site, but `putSiteByExternalReferenceCode` runs it again when the zip changes.

## Open Questions

1. Does the deployed `2026.q1.2` portal behave as the source in this checkout for the three Liferay behaviors that the findings depend on: the PUT that deletes relationships (finding 1), the PATCH that adds or does not add object fields (trap 4), and the site initializer that runs again on an existing site (finding 12)? A test on a scratch partitioned instance answers all three.

1. Does deleting the One site in `/one-site-reset` delete the commerce channel? If it does, the site initializer creates a new channel with no payment methods, and `site_reset.sh` does not run `set_payment_methods.sh`, so checkout fails with a 404. `instance_reset.sh` has the same gap with certainty, because `teardown_structure.sh:44` deletes the channel.

1. Which file in the migration repository loads usage definitions and the consumable entitlement definitions on UAT and production? `consumable-products.md` says they are seed data, and the search of `<scripts>/one/scripts/` found no writer of `C_USAGE_DEFINITION`.

1. Who calls `scripts/bootstrap/build.sh` and `start.sh`? If nothing does, they can be deleted. If an external tool does, document it here.

1. Should the 3 picklists in the site initializer move to `00-list-type-definition`? Their codes (`AC-REGIONS`, `LIFERAY-VERSIONS`) do not follow the `LT_` convention of the other 23.
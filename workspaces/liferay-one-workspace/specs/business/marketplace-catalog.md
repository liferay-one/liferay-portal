# Marketplace Catalog

This area covers how a visitor finds and evaluates what Liferay and its publishers sell. It includes the catalog pages and site search, the taxonomy that sorts products, the product specifications, the product display pages, the license tiers that a product offers, the products that Liferay sells only through its sales team, beta products, and the catalog content that comes from Salesforce.

The actors are a visitor who is not signed in, a signed in buyer, a publisher, Liferay sales, and the system processes that keep the catalog in step with Salesforce.

Terms used in this file:

- **Catalog**: the products that the Liferay One commerce channel offers. A product has one or more SKUs.
- **SKU**: one sellable variant of a product. A SKU is purchasable or not, and it carries options such as a license usage type.
- **License tier**: the license usage type option value of a SKU, for example developer, trial, production, or standard.
- **Specification**: a named value on a product, for example the price model, the app type, or the solution type.
- **Product type category**: the category of a product in the product type vocabulary: App, Liferay Product, Product, or Solution.
- **Listed category**: the only category of the listing vocabulary. It controls whether a product appears on the Products page.
- **Contact sales product**: a product that Liferay sells only through its sales team. The buyer cannot check it out.

## Catalog Pages and Search

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-CATALOG-001 | The marketplace has three public catalog pages: Applications, Products, and Solutions. A visitor can browse each page without signing in. | P1 | LPD-92360, LPD-96124 | — |
| REQ-CATALOG-002 | The Applications page lists only products in the App product type category. A visitor can filter the list by app category, marketplace category, specification, option, and price range. | P1 | LPD-92360 | — |
| REQ-CATALOG-003 | The Solutions page lists only products in the Solution product type category. A visitor can filter the list by solution category and price range. | P1 | LPD-94844 | — |
| REQ-CATALOG-004 | The Products page lists only products that have the Listed category. | P1 | LPD-95368 | — |
| REQ-CATALOG-005 | Site search returns marketplace products, and the web content and pages of the current site. It does not return web content or pages of other sites. | P2 | — | — |
| REQ-CATALOG-006 | The category navigation links each configured app category to the Applications page with that category as the filter. It shows the category names in English, Japanese, Spanish, and Portuguese. | P2 | — | — |
| REQ-CATALOG-007 | The catalog uses one commerce channel for the whole site, with USD as its default currency. The Guest role and the User role can view the channel. | P1 | — | `CTX-MARKETPLACECONTEXTPROVIDER` |
| REQ-CATALOG-008 | The channel sells to accounts, not to persons. Every purchase acts for one account of the buyer. | P0 | — | `CTX-MARKETPLACECONTEXTPROVIDER` |

## Taxonomy

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-CATALOG-010 | The system defines 10 global marketplace vocabularies: app category, app tags, availability, marketplace category, platform offering, Liferay version, listing, product type, solution category, and solution tags. | P1 | LPD-94842, LPD-88277 | — |
| REQ-CATALOG-011 | The product type vocabulary has four categories: App, Liferay Product, Product, and Solution. A product in the Solution category uses the solution purchase flow. | P1 | LPD-94842 | `ROUTE-PRODUCT-PURCHASE-SOLUTION` |
| REQ-CATALOG-012 | The Liferay Product category and the Listed category have different jobs. The Liferay Product category selects the next steps after a purchase. The Listed category controls only the visibility on the Products page. | P1 | LPD-95368 | — |
| REQ-CATALOG-013 | A project shows a purchased item as a product or as an application from the project item type specification of the product. A category does not decide this. | P1 | LPD-90955 | `MOD-MYACCOUNT-PROJECTS-RESOLVEPROJECTITEMTYPE` |
| REQ-CATALOG-014 | The import of vocabularies and categories matches each entry by its external reference code. A second import updates the existing entries and creates no duplicates. | P0 | LPD-95368 | — |
| REQ-CATALOG-015 | A publisher chooses categories from the site vocabularies or from the global vocabularies, as the page configuration sets. The system skips a requested vocabulary that does not exist. | P2 | LPD-94842 | `HOOK-USEGETVOCABULARIESANDCATEGORIES`, `CLIENT-HEADLESS-HEADLESSADMINTAXONOMY`, `MOD-ATTRIBUTEUTILS` |

## Product Specifications

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-CATALOG-020 | The system defines 55 product specifications, each with a fixed key. The catalog, the purchase flow, and the project pages read specification values only through these keys. | P1 | LPD-102706 | — |
| REQ-CATALOG-021 | The catalog offers 20 of the specifications as filters. Examples are the price model, the app type, the Liferay version, and the developer name. | P2 | LPD-102706 | — |
| REQ-CATALOG-022 | A missing product, specification, category, or name reads as an empty value. A product with no specifications does not stop a page or a process. | P1 | LPD-102706 | `CLS-COMMERCEPRODUCTUTIL`, `MOD-PRODUCTUTILS` |
| REQ-CATALOG-023 | The price model specification decides whether a product is free or paid. A free product shows the price "Free". A paid product shows the price of its purchasable standard SKU. A product with no price model counts as free. | P0 | — | `MOD-PRODUCTUTILS`, `CLIENT-MODELS-MARKETPLACEDELIVERYPRODUCT` |
| REQ-CATALOG-024 | The solution type specification selects the purchase path of a Liferay product. The known values are `ai-hub`, `ai-hub-open-beta`, `seo-studio`, `dsr`, `cmp`, `liferay-data-platform`, and `pre-built-trial`. | P1 | LPD-102451 | `MOD-PRODUCTUTILS` |
| REQ-CATALOG-025 | A product is a free DXP product only when its price model is free and its app type is `dxp`. | P0 | — | `MOD-PRODUCTUTILS` |

## Product Display Pages

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-CATALOG-030 | Every product has a display page at the product URL of the site. The App Detail template is the default. AI Hub, CMP, DSR, free DXP, LDP, SEO Studio, and solutions have their own templates. | P2 | LPD-104271 | `MOD-PRODUCTUTILS` |
| REQ-CATALOG-031 | The product page shows the Get App button only when the product has at least one purchasable SKU. The button opens the purchase page for that product. | P0 | LPD-89504 | — |
| REQ-CATALOG-032 | Under the Get App button, the page shows "Free" for a free product. Otherwise it shows the standard SKU price, then "One-Time" for a perpetual license or "Annually" for other licenses. When a trial SKU exists, the text starts with "30-day trial or". | P1 | LPD-89504 | — |
| REQ-CATALOG-033 | When a product has no purchasable SKU, the page shows Contact Publisher instead of Get App. A visitor who is not signed in goes to sign in, and the contact form opens on return. | P1 | — | — |
| REQ-CATALOG-034 | A referral product shows no purchase button and no contact button. | P2 | — | — |
| REQ-CATALOG-035 | The purchase page shows "Product unavailable" when the URL names no product, or names a product that does not exist. | P1 | — | `FLOW-PRODUCT-PURCHASE-ENTRY` |

## License Tiers

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-CATALOG-040 | A product offers a license tier only through a purchasable SKU. The license usage type option of that SKU must name a known tier: developer, trial, production, or standard. | P0 | LPD-102451 | `MOD-LICENSETIERUTILS` |
| REQ-CATALOG-041 | The system always lists license tiers in this order: developer, trial, production, standard. | P1 | LPD-102451 | `MOD-LICENSETIERUTILS` |
| REQ-CATALOG-042 | Each license usage option offers a fixed set of tiers. CMP offers developer, production, and trial. DXP offers developer, standard, and trial. Cloud offers standard and trial. Base offers developer and standard. DSR offers developer. | P1 | LPD-102451 | — |
| REQ-CATALOG-043 | A SKU is a trial SKU when its name ends in "ts", its name is "trial", or an option value is "trial" or "yes". A buyer cannot select a trial SKU as a license. | P0 | — | `MOD-PRODUCTUTILS`, `CLIENT-MODELS-MARKETPLACEPRODUCT` |
| REQ-CATALOG-044 | AI Hub offers two tiers, activate and studio, from purchasable SKUs. The system lists them from the lowest price to the highest. It lists token packs from the smallest token count to the largest. | P1 | LPD-102570 | `MOD-PRODUCTUTILS`, `HOOK-USEAIHUBPRODUCT` |

## Contact Sales Products

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-CATALOG-050 | Liferay sells Content Marketing Platform, Digital Sales Room, and Liferay Data Platform only through its sales team. Their product pages show Contact Sales instead of Get App. | P0 | LPD-102451, LPD-104271 | `FLOW-CMP-CONTACT-SALES`, `MOD-PRODUCTUTILS` |
| REQ-CATALOG-051 | A buyer who opens the purchase page of a contact sales product by its URL sees the Contact Sales invitation. The buyer cannot select an account, and the system creates no order. | P0 | LPD-102451, LPD-104271 | `FLOW-CMP-CONTACT-SALES` |
| REQ-CATALOG-052 | The Contact Sales invitation lists the license tiers of the product from its SKUs. When the product has no tier SKU, the invitation shows no tier list. | P1 | LPD-102451 | `FLOW-CMP-CONTACT-SALES`, `MOD-LICENSETIERUTILS` |
| REQ-CATALOG-053 | The Contact Sales button opens the Liferay contact sales page in a new tab. | P2 | LPD-102451 | `FLOW-CMP-CONTACT-SALES` |

## Beta Products

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-CATALOG-060 | An order is a beta order when one of its items has the SKU option value `beta`, `open-beta`, or `private-beta`. | P2 | LPD-102451 | `MOD-ORDERUTILS` |
| REQ-CATALOG-061 | The beta checkout of Content Marketing Platform creates `CMP_BETA` orders. Only the sales pipeline creates `CMP` orders for the general release. Both show the name Content Marketing Platform. | P1 | LPD-102451 | `MOD-ORDERUTILS` |
| REQ-CATALOG-062 | A product with the license type "3 Months Limited Beta" gives a purchase term of three months. A trial SKU gives one month. Every other SKU gives one year. | P1 | — | `CLS-COMMERCEORDERUTIL` |
| REQ-CATALOG-063 | The AI Hub open beta product sells access and token packs to a project. The purchase flows for it are in `REQ-ORDERS-014`. | P1 | LPD-102570 | `ROUTE-PRODUCT-PURCHASE-AI-HUB-OPEN-BETA-FORM` |

## Catalog Content From Salesforce

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-CATALOG-070 | Each Salesforce product becomes a SKU of the catalog product that its product group names. When that catalog product does not exist, the system creates it as a virtual product in the Liferay Inc catalog. | P1 | LPD-88254 | `SUB-SALESFORCEOBJECTPUBSUBSUBSCRIBER`, `SVC-COMMERCEPRODUCTSERVICE` |
| REQ-CATALOG-071 | A SKU from Salesforce is published, purchasable, and never expires. A catalog product with exactly one SKU takes the name and the description of its Salesforce product. | P2 | LPD-88254 | `SVC-COMMERCEPRODUCTSERVICE` |
| REQ-CATALOG-072 | A Salesforce product without a product group and without an existing SKU changes nothing. The system logs a warning. | P2 | LPD-88254 | `SVC-COMMERCEPRODUCTSERVICE` |
| REQ-CATALOG-073 | When Salesforce deletes a product, the system unpublishes its SKU. The system deactivates the catalog product only when no other SKU of that product stays published. | P0 | LPD-88254 | `SUB-SALESFORCEOBJECTPUBSUBSUBSCRIBER`, `SVC-COMMERCEPRODUCTSERVICE` |
| REQ-CATALOG-074 | Each Salesforce price book entry becomes a price entry in a price list for its price book and currency. The system ignores a currency other than AUD, BRL, EUR, GBP, INR, JPY, SGD, or USD. | P0 | LPD-88254 | `SUB-SALESFORCEOBJECTPUBSUBSUBSCRIBER`, `SVC-COMMERCEPRICEENTRYSERVICE` |
| REQ-CATALOG-075 | When a price entry moves to another price list, the system deletes the old entry and creates a new one. An entry in the same price list is updated in place. | P1 | LPD-88254 | `SVC-COMMERCEPRICEENTRYSERVICE` |

## Delivery Catalog Access

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-CATALOG-080 | The custom element reads products from the delivery catalog of the marketplace channel. It sends no catalog request until the channel is known. | P2 | — | `CTX-MARKETPLACECONTEXTPROVIDER`, `HOOK-USEAIHUBPRODUCT`, `HOOK-USESSAPRODUCT` |
| REQ-CATALOG-081 | The SSA product is the first catalog product whose solution type is `pre-built-trial`. When no product matches, the system has no SSA product. | P2 | — | `HOOK-USESSAPRODUCT` |
| REQ-CATALOG-082 | The product image list of a purchased product leaves out the image with priority 0. | P2 | — | `CLIENT-MODELS-MARKETPLACEDELIVERYPRODUCT` |
| REQ-CATALOG-083 | A product download serves the product file of the requested version. When no file has that version, it serves the file with the latest version. | P1 | — | `SVC-COMMERCEPRODUCTVIRTUALSETTINGSSERVICE` |
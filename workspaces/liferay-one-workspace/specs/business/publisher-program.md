# Publisher Program

This area covers how a company sells its own apps and solutions on the Liferay Marketplace. It includes the request to become a publisher, the publisher dashboard, the publisher profile, the flows that publish an app, a new app version, or a solution, the quarterly sales summaries, the payouts to publishers, and the most purchased products report. The approval of a publisher request is an administration task and belongs to the ADMIN area, in `administration.md`.

The actors are a marketplace user who asks to become a publisher, a publisher (a user whose current account owns a publisher catalog), the Finance Administrator, and the global Administrator role.

Terms used in this file:

- **Publisher request**: the request that a user sends to become a marketplace publisher.
- **Publisher catalog**: the commerce catalog that belongs to the account of the publisher. Every app and solution of the publisher is a product in this catalog.
- **Publisher profile**: the details of a publisher, with public fields that buyers see and private fields that only Liferay uses.
- **App**: a product that a publisher builds, with packages that a customer installs on Liferay DXP or Liferay Cloud.
- **Solution**: a product that a publisher builds on Liferay and presents on a marketplace page. A solution has no package.
- **Draft**: a product that the publisher saved and did not submit. Liferay does not review a draft.
- **Pending**: a product that the publisher submitted and that waits for review by Liferay.
- **Sales summary**: the record of the paid marketplace orders of one publisher in one quarter, with its payout status.
- **Payout**: the share of the sales that Liferay pays to the publisher.

## Becoming a Publisher

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-PUBLISHER-001 | A marketplace user can ask to become a publisher. The Become a Publisher page explains the program and opens the request form, or returns the user to the marketplace. | P1 | LPD-96124, LPD-107009 | `ROUTE-BECOME-A-PUBLISHER-REQUEST-ACCOUNT` |
| REQ-PUBLISHER-002 | A publisher request needs a first name, a last name, a valid email address, a phone number, at least one publisher type, and a description of the request. A phone extension is optional. | P1 | LPD-96124 | `MOD-SCHEMAS-PUBLISHINGSCHEMAS`, `MOD-SCHEMAS-ZODSCHEMA` |
| REQ-PUBLISHER-003 | The form fills in the name, the email address, and the phone number of the user from the user account. The form selects the App Publisher type by default. | P2 | LPD-96124 | `ROUTE-BECOME-A-PUBLISHER-REQUEST-ACCOUNT` |
| REQ-PUBLISHER-004 | The publisher types are App Publisher and Solution Publisher. An App Publisher can publish free or paid apps for DXP and Cloud. A Solution Publisher must already be a Liferay partner. | P1 | LPD-96124 | `MOD-BECOMEAPUBLISHER` |
| REQ-PUBLISHER-005 | The system reads the publisher types from the publisher type picklist. When the picklist is missing or empty, the form offers the two default types. | P2 | LPD-96124 | `MOD-BECOMEAPUBLISHER` |
| REQ-PUBLISHER-006 | The user reviews a summary of the request before sending it. After the system saves the request, the page confirms it. When the save fails, the page shows an error and the user can send the request again. | P1 | LPD-96124 | `ROUTE-BECOME-A-PUBLISHER-REQUEST-ACCOUNT` |
| REQ-PUBLISHER-007 | A new publisher request has the status Open. The only other statuses are Completed and Rejected. | P1 | LPD-103809 | — |

## Publisher Dashboard

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-PUBLISHER-010 | The publisher dashboard works on the publisher catalog of the current account of the user. A publisher sees and changes only the products of that catalog. | P0 | LPD-54024, LPD-94842 | `HOOK-USEPUBLISHERCATALOG`, `FLOW-PUBLISHER-ONBOARDING` |
| REQ-PUBLISHER-011 | When the current account has no publisher catalog, the dashboard lists no products and the user cannot start a new app or a new solution. | P0 | LPD-94842 | `HOOK-USEPUBLISHERCATALOG` |
| REQ-PUBLISHER-012 | The dashboard searches at most 20 pages of 100 catalogs for the publisher catalog. When it does not find one, the account has no publisher catalog. | P2 | LPD-94842 | `HOOK-USEPUBLISHERCATALOG` |
| REQ-PUBLISHER-013 | The dashboard has three sections: Published Apps, Published Solutions, and Publisher Profile. It opens on Published Apps, and an unknown address goes back to Published Apps. | P1 | LPD-54024 | `ROUTE-PUBLISHER-DASHBOARD-PUBLISHED-APPS`, `ROUTE-PUBLISHER-DASHBOARD-PUBLISHED-SOLUTIONS`, `ROUTE-PUBLISHER-DASHBOARD-PUBLISHER-PROFILE` |
| REQ-PUBLISHER-014 | The publish flows for a new app, a new app version, and a new solution show on a full page, without the dashboard menu and without the marketplace header. | P2 | LPD-94842 | `ROUTE-PUBLISHER-DASHBOARD-PUBLISHER`, `ROUTE-PUBLISHER-DASHBOARD-NEWAPP`, `ROUTE-PUBLISHER-DASHBOARD-NEWSOLUTION`, `ROUTE-PUBLISHER-DASHBOARD-NEWVERSION`, `HOOK-USEPUBLISHHEADER`, `HOOK-PUBLISHERDASHBOARD-USEPUBLISHHEADER` |
| REQ-PUBLISHER-015 | A publish flow moves one step at a time, with Previous and Continue. A new app or a new solution starts at the create step. A flow can start without a product and continue with the saved product. | P1 | LPD-94842 | `HOOK-PUBLISHERDASHBOARD-USEPUBLISHNAVIGATION`, `ROUTE-PUBLISHER-DASHBOARD-PRODUCTID-OPTIONAL` |
| REQ-PUBLISHER-016 | The Published Apps list shows the name, version, app type, last update, and status of each app. A publisher can view the summary of each app. Only an approved app opens in the marketplace. | P1 | LPD-94842, LPD-94838 | `ROUTE-PUBLISHER-DASHBOARD-PUBLISHED-APPS`, `ROUTE-PUBLISHER-DASHBOARD-PRODUCTID` |
| REQ-PUBLISHER-017 | In the Published Solutions list, a publisher cannot edit or delete a pending solution. Only an approved solution opens in the marketplace. A delete needs a confirmation and cannot be undone. | P1 | LPD-94844, LPD-106775 | `ROUTE-PUBLISHER-DASHBOARD-PUBLISHED-SOLUTIONS` |

## Publisher Profile

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-PUBLISHER-020 | The publisher profile has public fields: the publisher name, the company description, the company, support, and sales email addresses, the website, and the company address. | P1 | LPD-54024 | `ROUTE-PUBLISHER-DASHBOARD-PUBLISHER-PROFILE`, `HOOK-USEPUBLISHERDETAILS` |
| REQ-PUBLISHER-021 | The publisher profile has private fields: the full name and role of the contact, a private email address, a phone number, and the PayPal account for payouts. | P0 | LPD-54024 | `ROUTE-PUBLISHER-DASHBOARD-EDIT`, `HOOK-USEPUBLISHERDETAILS` |
| REQ-PUBLISHER-022 | A publisher can edit only a profile that already exists for the publisher catalog. The dashboard does not create a profile, and shows an error when there is none. | P1 | LPD-54024 | `ROUTE-PUBLISHER-DASHBOARD-EDIT` |
| REQ-PUBLISHER-023 | Guests and signed in users can read publisher profiles, so that the marketplace can show who publishes each product. | P1 | — | — |

## App Publishing

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-PUBLISHER-030 | The app flow has these steps, in order: create, profile, build, storefront, version, pricing, licensing, license prices, support, and submit. | P1 | LPD-94842 | `ROUTE-PUBLISHER-DASHBOARD-NEWAPP`, `ROUTE-PUBLISHER-DASHBOARD-PROFILE`, `ROUTE-PUBLISHER-DASHBOARD-BUILD`, `ROUTE-PUBLISHER-DASHBOARD-STOREFRONT`, `ROUTE-PUBLISHER-DASHBOARD-VERSION`, `ROUTE-PUBLISHER-DASHBOARD-PRICING`, `ROUTE-PUBLISHER-DASHBOARD-LICENSING`, `ROUTE-PUBLISHER-DASHBOARD-LICENSING-PRICES`, `ROUTE-PUBLISHER-DASHBOARD-SUPPORT`, `ROUTE-PUBLISHER-DASHBOARD-SUBMIT` |
| REQ-PUBLISHER-031 | An app profile needs a name and a description of 3 or more characters, a category, at least one area, and at least one tag. | P1 | LPD-94842 | `MOD-SCHEMAS-PUBLISHINGSCHEMAS`, `ROUTE-PUBLISHER-DASHBOARD-PROFILE` |
| REQ-PUBLISHER-032 | The system creates a new app as a product in the publisher catalog. The product gets the App product type, the platform offerings that match its app type, and the catalog name as the developer name. | P0 | LPD-94842 | `CLIENT-ACTIONS-APPPUBLISH`, `CTX-NEWAPPCONTEXTPROVIDER`, `CLIENT-HEADLESS-HEADLESSCOMMERCEADMINCATALOG` |
| REQ-PUBLISHER-033 | An app build needs an app type and at least one package. Each package needs a file and at least one Liferay version. A Cloud app also states the number of CPUs and the RAM that it needs. | P1 | LPD-94842 | `MOD-SCHEMAS-PUBLISHINGSCHEMAS`, `CLIENT-ACTIONS-APPPUBLISH`, `ROUTE-PUBLISHER-DASHBOARD-BUILD` |
| REQ-PUBLISHER-034 | The system stores each package file in a folder for the app and the package, under the publisher assets folder. A package file is a ZIP, WAR, or JAR file of 200 MB or less. | P1 | LPD-94842 | `CLIENT-ACTIONS-PUBLISHERASSET` |
| REQ-PUBLISHER-035 | The system records on the app each Liferay version that a package supports, one time each. | P1 | LPD-94842 | `CLIENT-ACTIONS-APPPUBLISH` |
| REQ-PUBLISHER-036 | The storefront of an app has 1 to 10 images. The app icon is separate from the storefront images. The publisher can change the order of the images. The system uploads only the images that are new or changed. | P1 | LPD-94842 | `MOD-SWAPELEMENTS`, `MOD-SCHEMAS-PUBLISHINGSCHEMAS`, `CLIENT-ACTIONS-BASEAPPPUBLISH`, `CTX-NEWAPPCONTEXTPROVIDER`, `ROUTE-PUBLISHER-DASHBOARD-STOREFRONT` |
| REQ-PUBLISHER-037 | An app version needs a version number. Release notes are optional. | P1 | LPD-94842 | `MOD-SCHEMAS-PUBLISHINGSCHEMAS`, `ROUTE-PUBLISHER-DASHBOARD-VERSION` |
| REQ-PUBLISHER-038 | An edit of a submitted app does not change its build. | P1 | LPD-94842 | `CLIENT-ACTIONS-APPPUBLISH`, `HOOK-USEPUBLISHAPPSUBMISSION` |
| REQ-PUBLISHER-039 | A publisher can start a new version of an existing app. The new version flow starts at the build step and has no create step. | P1 | LPD-94842 | `ROUTE-PUBLISHER-DASHBOARD-NEWVERSION`, `ROUTE-PUBLISHER-DASHBOARD-PRODUCTID`, `ROUTE-PUBLISHER-DASHBOARD-BUILD` |

## App Pricing and Licensing

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-PUBLISHER-040 | An app is Free or Paid. After an app leaves the draft status, the publisher cannot change this choice. | P0 | LPD-94842 | `ROUTE-PUBLISHER-DASHBOARD-PRICING`, `CLIENT-ACTIONS-APPPUBLISH` |
| REQ-PUBLISHER-041 | An app has a Perpetual license, which never expires, or a Subscription license, which the customer renews each year. A free app can only have a Perpetual license. | P0 | LPD-94842 | `ROUTE-PUBLISHER-DASHBOARD-LICENSING`, `CLIENT-ACTIONS-APPPUBLISH` |
| REQ-PUBLISHER-042 | A paid app can offer a free trial of 30 days. A free app cannot offer a trial. | P0 | LPD-94842 | `ROUTE-PUBLISHER-DASHBOARD-LICENSING` |
| REQ-PUBLISHER-043 | Only a paid app has the license prices step. The publisher sets prices for each currency and each license tier, with a price for each minimum quantity. The publisher can add each currency one time only. | P0 | LPD-94842 | `ROUTE-PUBLISHER-DASHBOARD-LICENSING-PRICES`, `CTX-NEWAPPCONTEXTPROVIDER` |
| REQ-PUBLISHER-044 | The system creates one SKU for each license tier of the app. A SKU name contains the product ID and the version number without punctuation. | P0 | LPD-94842 | `CLIENT-ACTIONS-APPPUBLISH`, `MOD-PUBLISHUTILS` |
| REQ-PUBLISHER-045 | A trial SKU costs nothing. A developer SKU and a standard SKU take the price of their tier. | P0 | LPD-94842 | `MOD-PUBLISHUTILS`, `CLIENT-ACTIONS-APPPUBLISH` |
| REQ-PUBLISHER-046 | The system keeps one price list for each currency of the publisher catalog, and creates it when it is missing. A price update changes only the tiers that changed, and removes the tiers that the publisher deleted. | P0 | LPD-94842 | `CLIENT-ACTIONS-APPPUBLISH`, `CTX-NEWAPPCONTEXTPROVIDER` |

## App Support and Submission

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-PUBLISHER-050 | A paid app must give a valid support email address, a support phone number of 8 or more characters, and a valid publisher website. For a free app these fields are optional, but each value must be valid. | P1 | LPD-94842 | `MOD-SCHEMAS-PUBLISHINGSCHEMAS`, `ROUTE-PUBLISHER-DASHBOARD-SUPPORT` |
| REQ-PUBLISHER-051 | The support, documentation, installation guide, and usage terms links of an app are optional. Each link that the publisher gives must be a valid web address. The system stores only the support fields that have a value. | P2 | LPD-94842 | `MOD-SCHEMAS-PUBLISHINGSCHEMAS`, `CLIENT-ACTIONS-APPPUBLISH` |
| REQ-PUBLISHER-052 | A publisher must accept the terms and conditions to submit an app. | P0 | LPD-94842 | `MOD-SCHEMAS-PUBLISHINGSCHEMAS`, `ROUTE-PUBLISHER-DASHBOARD-SUBMIT` |
| REQ-PUBLISHER-053 | A submitted app has the pending status and waits for review by Liferay. An app that the publisher saves as a draft keeps the draft status, and the publisher returns to the dashboard. | P0 | LPD-94842 | `HOOK-USEPUBLISHAPPSUBMISSION`, `CLIENT-ACTIONS-APPPUBLISH` |
| REQ-PUBLISHER-054 | The system runs every publish step, also when an earlier step fails. When one or more steps fail, the system names the failed steps. It then does not change the name, description, categories, or status of an existing app. | P1 | LPD-94842 | `CLIENT-ACTIONS-APPPUBLISH`, `CLIENT-ACTIONS-BASEAPPPUBLISH`, `HOOK-USEPUBLISHAPPSUBMISSION` |
| REQ-PUBLISHER-055 | A failed upload of a package file stops the publish and shows an error. | P1 | LPD-94842 | `CLIENT-ACTIONS-PUBLISHERASSET` |

## Solution Publishing

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-PUBLISHER-060 | The solution flow has these steps, in order: create, profile, header, details, company, contact, and submit. | P1 | LPD-94844 | `ROUTE-PUBLISHER-DASHBOARD-NEWSOLUTION`, `ROUTE-PUBLISHER-DASHBOARD-PROFILE`, `ROUTE-PUBLISHER-DASHBOARD-HEADER`, `ROUTE-PUBLISHER-DASHBOARD-DETAILS`, `ROUTE-PUBLISHER-DASHBOARD-COMPANY`, `ROUTE-PUBLISHER-DASHBOARD-CONTACT`, `ROUTE-PUBLISHER-DASHBOARD-SUBMIT` |
| REQ-PUBLISHER-061 | A solution profile needs a name and a description of 3 or more characters, at least one category, and at least one tag. | P1 | LPD-94844 | `MOD-SCHEMAS-PUBLISHINGSCHEMAS` |
| REQ-PUBLISHER-062 | A solution header needs a title and a description with text. It shows either an embedded video or uploaded images. | P1 | LPD-94844 | `MOD-SCHEMAS-PUBLISHINGSCHEMAS`, `CLIENT-ACTIONS-SOLUTIONPUBLISH`, `ROUTE-PUBLISHER-DASHBOARD-HEADER` |
| REQ-PUBLISHER-063 | The details of a solution have at least 2 blocks. Each block is text, text with images, or text with a video. The publisher can move a block up, down, to the top, or to the bottom, and can delete it. | P1 | LPD-94844 | `MOD-SCHEMAS-PUBLISHINGSCHEMAS`, `CTX-SOLUTIONCONTEXTPROVIDER`, `ROUTE-PUBLISHER-DASHBOARD-DETAILS` |
| REQ-PUBLISHER-064 | The company profile of a solution needs a description with text, a valid email address, a phone number, and a website. The contact step needs a valid email address. | P1 | LPD-94844 | `MOD-SCHEMAS-PUBLISHINGSCHEMAS`, `ROUTE-PUBLISHER-DASHBOARD-COMPANY`, `ROUTE-PUBLISHER-DASHBOARD-CONTACT` |
| REQ-PUBLISHER-065 | A publisher must accept the terms and conditions to submit a solution. A submitted solution has the pending status. A solution that the publisher saves as a draft keeps the draft status. | P0 | LPD-94844 | `CLIENT-ACTIONS-SOLUTIONPUBLISH`, `HOOK-USEPUBLISHSOLUTIONSUBMISSION`, `MOD-SCHEMAS-PUBLISHINGSCHEMAS` |
| REQ-PUBLISHER-066 | The system records the name of the user who last saved a solution. It uploads the solution icon only when the icon is new or changed. | P2 | LPD-94844 | `CLIENT-ACTIONS-SOLUTIONPUBLISH`, `HOOK-USEPUBLISHSOLUTIONSUBMISSION` |
| REQ-PUBLISHER-067 | When one or more steps of a solution publish fail, the system names the failed steps and shows an error. | P1 | LPD-94844 | `CLIENT-ACTIONS-SOLUTIONPUBLISH`, `HOOK-USEPUBLISHSOLUTIONSUBMISSION` |

## Sales Summaries and Payouts

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-PUBLISHER-070 | A sales summary belongs to one publisher account and covers one quarter. It needs the publisher name, the quarter, and a payment status of Paid or Unpaid. | P0 | LPD-89821 | `FLOW-PUBLISHER-SALES-SUMMARY` |
| REQ-PUBLISHER-071 | A sales summary links to the paid marketplace orders that it covers. A scheduled job outside Liferay One builds the summaries from the paid orders of each quarter. | P0 | LPD-89821 | `FLOW-PUBLISHER-SALES-SUMMARY`, `HOOK-USEPUBLISHERSALESSUMMARYOBJECT` |
| REQ-PUBLISHER-072 | The Finance Administrator can view and update every sales summary. When a publisher account is deleted, its sales summaries are deleted too. | P0 | LPD-89821 | — |
| REQ-PUBLISHER-073 | Liferay keeps a commission of 20% of the order total, and pays the publisher the other 80%. | P0 | LPD-89821, LPD-103679 | `ROUTE-ADMIN-MP-PAYMENTS-ENTRYID`, `MOD-ORDERUTILS` |
| REQ-PUBLISHER-074 | The payout totals add up only the orders in US dollars. | P0 | LPD-89821 | `MOD-ORDERUTILS` |
| REQ-PUBLISHER-075 | The payment details show the publisher name, email, billing address, tax number, and quarter, and each order item with its account, quantity, net price, tax, total, currency, and buyer. The page can export the order items as a CSV file. | P1 | LPD-89821, LPD-92498 | `HOOK-USEPUBLISHERSALESSUMMARYOBJECT`, `ROUTE-ADMIN-MP-PAYMENTS`, `ROUTE-ADMIN-MP-PAYMENTS-ENTRYID` |
| REQ-PUBLISHER-076 | When the finance team pays a publisher, it marks the summary as paid. The system records who paid and the date. A paid summary cannot be marked as paid again. | P0 | LPD-89821, LPD-103679 | `ROUTE-ADMIN-MP-PAYMENTS-ENTRYID` |

## Most Purchased Products

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-PUBLISHER-080 | The marketplace summary shows the 5 most purchased apps and the 5 most purchased Liferay products, from the product purchase count report. Products with the same count show in order of product ID. | P2 | LPD-91578 | `ROUTE-ADMIN-MP-SUMMARY` |
| REQ-PUBLISHER-081 | When the system cannot load a product of the report, the summary shows the product as unavailable and keeps its purchase count. | P2 | LPD-91578 | — |

## Not Yet Built

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-PUBLISHER-090 | Only the publisher and Liferay can read the private fields of a publisher profile. Guests and other users can read only the public fields. | P0 | — | — |
| REQ-PUBLISHER-091 | A publisher can see its own sales summaries and payouts on the publisher dashboard. | P2 | LPD-88250 | `FLOW-PUBLISHER-ONBOARDING`, `FLOW-PUBLISHER-SALES-SUMMARY` |
| REQ-PUBLISHER-092 | Only Liferay can change the status of a publisher request. The user who sends a request cannot set its status. | P0 | — | — |
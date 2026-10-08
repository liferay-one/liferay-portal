# Purchasing and Orders

This area covers how a buyer turns a catalog product into a placed order, and what the system does with that order afterward. It includes the purchase flow and its steps, the cart, payment methods, currency, tax, the license agreement, the next steps page, order completion, order types, order status labels, the link from an order to a project and a contract, and the Orders page of My Account. Entitlement creation from order items is in [`entitlements.md`](./entitlements.md). The free DXP license is in [`licensing-and-activation.md`](./licensing-and-activation.md). The Digital Sales Room is in `sales-and-crm.md`.

The actors are a signed in buyer, an account member, the account administrator, Liferay Staff, the Administrator role, the payment provider, and the system processes that complete orders.

Terms used in this file:

- **Order**: a commerce order of one account. Before checkout, an order is an open cart.
- **Order type**: the external reference code that classifies an order, for example `DXP_APP`, `AI_HUB`, or `CMP`.
- **Settled payment**: a payment status of completed or not required.
- **Completable order**: an order with the status pending or processing.
- **Paid product**: a product whose price model specification is paid. Every other product follows the free flow.
- **One Time Purchases**: the pseudo project and pseudo contract that hold the orders and entitlements that no project or project contract owns. See [`glossary.md`](../glossary.md).

## Purchase Access

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ORDERS-001 | A buyer must sign in to buy. A visitor who is not signed in goes to the sign in page, and returns to the same purchase page after sign in. | P0 | — | `HOOK-USEREQUIRESIGNIN`, `FLOW-PRODUCT-PURCHASE-ENTRY` |
| REQ-ORDERS-002 | A purchase acts for one account. The buyer selects one of the accounts that the buyer belongs to, or creates a new account in the flow. | P0 | LPD-90605 | `HOOK-PRODUCTPURCHASE-USEACCOUNTS`, `FLOW-PRODUCT-PURCHASE-ENTRY` |
| REQ-ORDERS-003 | When the buyer belongs to exactly one account, the flow selects that account and skips the account step. | P1 | LPD-90605 | `HOOK-PRODUCTPURCHASE-USEACCOUNTS`, `FLOW-PRODUCT-PURCHASE-ENTRY` |
| REQ-ORDERS-004 | When the system places the order, it makes the purchase account the current commerce account of the buyer. | P1 | — | `MOD-SETCURRENTACCOUNT`, `CLIENT-COMMERCE-PRODUCTPURCHASE` |
| REQ-ORDERS-005 | A step after the account step sends the buyer back to the account step when no account is selected. | P2 | — | `ROUTE-PRODUCT-PURCHASE-LICENSE`, `ROUTE-PRODUCT-PURCHASE-PAYMENT-METHOD`, `ROUTE-PRODUCT-PURCHASE-SUMMARY` |

## Purchase Steps

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ORDERS-010 | The default purchase flow has four steps: account, license selection, payment method, and summary. Only a paid product shows the license selection step and the payment method step. | P0 | LPD-88250 | `ROUTE-PRODUCT-PURCHASE-LICENSE`, `ROUTE-PRODUCT-PURCHASE-PAYMENT-METHOD`, `ROUTE-PRODUCT-PURCHASE-SUMMARY`, `FLOW-CHECKOUT-FREE`, `FLOW-CHECKOUT-PAID` |
| REQ-ORDERS-011 | A free DXP product has two steps: account and activation key. It has no summary step. The free license rules are in `REQ-LICENSING-070`, `REQ-LICENSING-071`, and `REQ-LICENSING-072`. | P1 | LPD-89423 | `ROUTE-PRODUCT-PURCHASE-ACTIVATION-KEY-FORM`, `CLIENT-COMMERCE-PRODUCTPURCHASEDXPFREE` |
| REQ-ORDERS-012 | A product in the Solution product type category has two steps: account and the solution form. | P1 | LPD-94844 | `ROUTE-PRODUCT-PURCHASE-SOLUTION` |
| REQ-ORDERS-013 | An AI Hub product has two steps: account and the AI Hub form. | P1 | LPD-90605 | `ROUTE-PRODUCT-PURCHASE-AI-HUB-FORM`, `FLOW-AI-HUB-PURCHASE` |
| REQ-ORDERS-014 | The AI Hub open beta product has five steps: account, project, contract, account details, and summary. A token purchase has three steps instead: token amount, payment method, and summary. | P1 | LPD-102570 | `ROUTE-PRODUCT-PURCHASE-AI-HUB-OPEN-BETA-FORM`, `ROUTE-PRODUCT-PURCHASE-PROJECT`, `ROUTE-PRODUCT-PURCHASE-CONTRACT`, `FLOW-PRODUCT-PURCHASE-CONTRACT` |
| REQ-ORDERS-015 | The contract step lists the contracts of the selected project. The buyer cannot continue until the buyer selects a contract. The order records the selected contract. | P0 | LPD-102570 | `ROUTE-PRODUCT-PURCHASE-CONTRACT`, `FLOW-PRODUCT-PURCHASE-CONTRACT`, `CLIENT-COMMERCE-PRODUCTPURCHASEAIHUBOPENBETA` |
| REQ-ORDERS-016 | An SEO Studio product has three steps: account, project, and request access. It has no paid steps. | P1 | LPD-102451 | `ROUTE-PRODUCT-PURCHASE-SEO-STUDIO-FORM` |
| REQ-ORDERS-017 | The license selection step lists only the purchasable SKUs that have a price and are not trial SKUs. The buyer cannot continue until the cart holds at least one license. | P0 | — | `ROUTE-PRODUCT-PURCHASE-LICENSE`, `HOOK-PRODUCTPURCHASE-USEPRODUCTPURCHASECART` |

## Cart

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ORDERS-020 | The flow looks for an open cart of the buyer with the same account and order type. It continues that cart only when the cart holds the product. It deletes the cart when it holds a different product. | P0 | LPD-104108 | `HOOK-PRODUCTPURCHASE-USEPRODUCTPURCHASECART` |
| REQ-ORDERS-021 | Adding a license that the cart already holds raises its quantity by one. Removing a license lowers its quantity by one, and the system drops the license at zero. | P1 | LPD-104108 | `HOOK-PRODUCTPURCHASE-USEPRODUCTPURCHASECART` |
| REQ-ORDERS-022 | A free app order holds one item: the standard SKU of the product, with the quantity one. | P1 | LPD-90605 | `CLIENT-COMMERCE-PRODUCTPURCHASE`, `CLIENT-COMMERCE-PRODUCTPURCHASEAPP` |
| REQ-ORDERS-023 | The system submits a purchase one time. A second click while the order is in progress does nothing. When the order fails, the buyer sees an error and can try again. | P0 | — | `FLOW-CHECKOUT-FREE`, `FLOW-CHECKOUT-PAID` |
| REQ-ORDERS-024 | A failure to send the app information after the order does not fail the order. | P2 | — | `CLIENT-COMMERCE-PRODUCTPURCHASEAPP` |

## Payment Methods

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ORDERS-030 | A paid checkout offers two payment types: pay now with a card, and an invoice paid by bank transfer. | P0 | LPD-93643 | `FLOW-CHECKOUT-PAID`, `ROUTE-PRODUCT-PURCHASE-PAYMENT-METHOD` |
| REQ-ORDERS-031 | Pay now sends the buyer to the page of the payment provider, which returns the buyer to the next steps page. When the provider gives no page, the buyer goes to the next steps page directly. | P0 | LPD-93643 | `CLIENT-HEADLESS-HEADLESSCOMMERCEDELIVERYCART`, `CLIENT-COMMERCE-PRODUCTPURCHASE` |
| REQ-ORDERS-032 | An invoice order is placed without payment. The buyer sees the order confirmation and the order ID. | P0 | — | `ROUTE-PRODUCT-PURCHASE-BANK-TRANSFER-COMPLETED`, `FLOW-CHECKOUT-PAID` |
| REQ-ORDERS-033 | The billing address must have a name, a street, a city, a country, a postal code, and a phone number. The buyer cannot continue without a valid billing address. The billing address is also the shipping address. | P1 | — | `MOD-SCHEMAS-COMMERCESCHEMAS`, `MOD-PRODUCTPURCHASE-PAYMENTMETHOD-BILLINGADDRESS-GETPOSTALADDRESSDESCRIPTION`, `ROUTE-PRODUCT-PURCHASE-PAYMENT-METHOD` |
| REQ-ORDERS-034 | The selected billing address becomes the default billing address of the account. The system saves the tax ID of the buyer only when the account has no tax ID. | P1 | LPD-94957 | `ROUTE-PRODUCT-PURCHASE-PAYMENT-METHOD` |
| REQ-ORDERS-035 | The summary step enables Get App or Purchase App only after the buyer accepts the end user license agreement and the Marketplace terms of service. | P0 | — | `ROUTE-PRODUCT-PURCHASE-SUMMARY` |

## Currency

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ORDERS-040 | The checkout currency follows the country of the billing address. When the country has no currency, the checkout uses the session currency, and then USD. | P0 | LPD-94957 | `MOD-CURRENCYUTILS`, `ROUTE-PRODUCT-PURCHASE-PAYMENT-METHOD` |
| REQ-ORDERS-041 | When an order changes, the system gives its account a default channel currency from a billing country. It uses the default billing address of the account, or else the billing address of the order. The system sets it only when the account has no channel currency, and never replaces one. | P0 | LPD-94957, LPD-101694 | `SVC-COMMERCEACCOUNTCURRENCYSERVICE`, `REST-POST-OBJECT-ACTION-COMMERCE-ORDER-UPDATE` |
| REQ-ORDERS-042 | An account currency must be an active currency from this list: AUD, BRL, EUR, GBP, INR, JPY, SGD, or USD. The system refuses any other currency and logs a warning. | P0 | LPD-101694 | `SVC-COMMERCEACCOUNTCURRENCYSERVICE`, `SVC-COMMERCECURRENCYSERVICE`, `SVC-COMMERCECHANNELSERVICE` |
| REQ-ORDERS-043 | A price shows in the currency of the order. JPY shows and rounds to whole units, and every other currency to two decimals. | P1 | — | `MOD-CURRENCYUTILS`, `MOD-FORMATCURRENCY` |
| REQ-ORDERS-044 | An order total that adds several orders counts only the orders in USD. | P1 | — | `MOD-ORDERUTILS` |

## Tax

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ORDERS-050 | Tax is 20 percent of the order subtotal. The system adds it to the order total and to the price of each order item. | P0 | LPD-88264, LPD-95435 | `SVC-COMMERCEORDERSERVICE`, `REST-POST-COMMERCE-ORDERS-COMMERCEORDERID-CALCULATE-TAX`, `FLOW-TAX-CALCULATION` |
| REQ-ORDERS-051 | The system taxes a business account only when its billing country is Ireland. It taxes a person account when its billing country is one of the 27 European Union member states. It taxes no other order. | P0 | LPD-88264, LPD-95435 | `SVC-COMMERCEORDERSERVICE`, `FLOW-TAX-CALCULATION` |
| REQ-ORDERS-052 | An order without a billing address gets no tax. | P1 | LPD-95435 | `SVC-COMMERCEORDERSERVICE` |
| REQ-ORDERS-053 | Only an Administrator, Liferay Staff, or a member of the account of the order can request tax for an order. | P0 | LPD-95435 | `PERM-COMMERCEORDERPERMISSION`, `REST-POST-COMMERCE-ORDERS-COMMERCEORDERID-CALCULATE-TAX` |
| REQ-ORDERS-054 | The system calculates tax when the buyer leaves the payment method step. A tax failure does not stop the checkout. | P1 | LPD-95435 | `ROUTE-PRODUCT-PURCHASE-PAYMENT-METHOD`, `FLOW-TAX-CALCULATION` |
| REQ-ORDERS-055 | A taxed order records the EUR exchange rate in its order metadata. The system records the rate one time and keeps it on later calculations. | P2 | LPD-95435 | `SVC-COMMERCEORDERSERVICE` |

## Order Completion

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ORDERS-060 | The system completes an order only when its payment is settled and the order is pending or processing. | P0 | LPD-104570 | `REST-POST-COMMERCE-ORDERS-COMMERCEORDERID-COMPLETE-SETTLED`, `CRON-COMPLETESETTLEDORDERS` |
| REQ-ORDERS-061 | Automatic completion applies only to app orders and AI Hub token orders: `CLIENT_EXTENSION`, `CLOUDAPP`, `CLOUD_APP`, `COMPOSITE_APP`, `DXP_APP`, `LOW_CODE_CONFIGURATION`, `OTHER`, and `AI_HUB_TOKEN`. Other order types complete through their own provisioning. | P0 | LPD-104570 | `REST-POST-COMMERCE-ORDERS-COMMERCEORDERID-COMPLETE-SETTLED`, `CRON-COMPLETESETTLEDORDERS` |
| REQ-ORDERS-062 | Completion moves the order to pending, then to processing, then to completed, and records the settled payment status. | P0 | LPD-104570 | `REST-POST-COMMERCE-ORDERS-COMMERCEORDERID-COMPLETE-SETTLED` |
| REQ-ORDERS-063 | Only one completion runs at a time for one order. A repeated request, or a request for a completed order, changes nothing. | P0 | LPD-104570 | `REST-POST-COMMERCE-ORDERS-COMMERCEORDERID-COMPLETE-SETTLED`, `CRON-COMPLETESETTLEDORDERS` |
| REQ-ORDERS-064 | Every day at midnight, and once at startup, the system completes each settled order that is still open. A failure on one order does not stop the others. | P0 | LPD-104570 | `CRON-COMPLETESETTLEDORDERS`, `LSN-COMMERCEORDERSERVICE-ONAPPLICATIONREADY` |
| REQ-ORDERS-065 | Only an Administrator, Liferay Staff, or a member of the account of the order can ask the system to complete the order. | P0 | LPD-95435, LPD-101678 | `PERM-COMMERCEORDERPERMISSION`, `REST-POST-COMMERCE-ORDERS-COMMERCEORDERID-COMPLETE-SETTLED`, `REST-POST-COMMERCE-ORDERS-COMMERCEORDERID-COMPLETE-CLOUD-APP` |
| REQ-ORDERS-066 | After a cloud app purchase, the system asks to complete the order. The order completes only under the rules of `REQ-ORDERS-060`. | P0 | LPD-101678, LPD-104570 | `REST-POST-COMMERCE-ORDERS-COMMERCEORDERID-COMPLETE-CLOUD-APP`, `ROUTE-PRODUCT-PURCHASE-PURCHASE-COMPLETED` |
| REQ-ORDERS-067 | Each change to an order triggers the order update action. The action sets the account currency, then completes the order when its payment is settled. The action ignores an order that does not exist. | P0 | LPD-104570 | `REST-POST-OBJECT-ACTION-COMMERCE-ORDER-UPDATE` |
| REQ-ORDERS-068 | A pending AI Hub order does not complete on payment. Instead, the order update action creates its Salesforce opportunity and moves the order to processing. | P0 | LPD-102570 | `REST-POST-OBJECT-ACTION-COMMERCE-ORDER-UPDATE`, `FLOW-AI-HUB-PURCHASE` |

## Order Types

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ORDERS-070 | An app order takes its order type from the app type specification: `ai-hub`, `client-extension`, `cloud`, `composite-app`, `dxp`, `low-code-configuration`, `other`, or `ssa-saas`. An unknown app type gives the order type `NOTYPE`. An SEO Studio order is always `SEO_STUDIO`. | P1 | LPD-102451 | `MOD-GETPRODUCTORDERTYPES`, `CLIENT-COMMERCE-PRODUCTPURCHASEAPP` |
| REQ-ORDERS-071 | The system defines 19 order types, and all of them are active. | P2 | LPD-102451 | — |
| REQ-ORDERS-072 | An order from Salesforce gets an order type only when all its products agree: `cmp` gives `CMP`, `dsr` gives `DSR`, and `liferay-data-platform` gives `LDP`. A mix of types leaves the order type empty and logs a warning. | P1 | LPD-88254 | `SUB-SALESFORCEOPPORTUNITYPUBSUBSUBSCRIBER`, `FLOW-SALESFORCE-ORDER-SYNC` |
| REQ-ORDERS-073 | A buyer can download an order of type `CLIENT_EXTENSION`, `COMPOSITE_APP`, `DXP_APP`, `LOW_CODE_CONFIGURATION`, or `OTHER`. A buyer can generate licenses only for a paid order of type `CLIENT_EXTENSION`, `COMPOSITE_APP`, or `DXP_APP`. | P0 | — | `CLIENT-MODELS-DELIVERYORDERMODEL` |

## Order Status Labels

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ORDERS-080 | For a subscription order (`ADDONS`, `CMP`, `CMP_BETA`, `DSR`, `DXP`, or `SALESFORCE`), a cancelled order shows Expired. A completed or in progress order shows Active. A pending, processing, or on hold order shows Pending. | P1 | LPD-102451 | `MOD-ORDERUTILS` |
| REQ-ORDERS-081 | An AI Hub order that is pending, processing, or on hold shows Pending. | P1 | LPD-90605 | `MOD-ORDERUTILS` |
| REQ-ORDERS-082 | An SEO Studio order that is completed shows Active. A cancelled order shows Cancelled. Any other order shows Pending. | P1 | LPD-102451, LPD-105834 | `MOD-ORDERUTILS` |
| REQ-ORDERS-083 | The status filter treats "Cancelled" and "Canceled" as one status. | P2 | — | `MOD-ORDERUTILS` |
| REQ-ORDERS-084 | The payment status of an order shows as paid, unpaid, pending, failed, canceled, or not required. | P2 | — | `ROUTE-MY-ACCOUNT-ORDERID` |

## Order to Project and Contract

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ORDERS-090 | An order names its project in its project name field. When that field is empty, the order uses the first project name of its Koroneiki project field. | P1 | LPD-90960 | `HOOK-USEPROJECTORDERS`, `ROUTE-MY-ACCOUNT-ORDERS` |
| REQ-ORDERS-091 | An order that names no project belongs to One Time Purchases. | P1 | LPD-90955 | `HOOK-USEPROJECTITEMS`, `HOOK-USEPROJECTORDERS` |
| REQ-ORDERS-092 | When a buyer buys an app for a Salesforce project, the order metadata records the external reference code of that project. | P0 | LPD-90605 | `CLIENT-COMMERCE-PRODUCTPURCHASEAPP` |
| REQ-ORDERS-093 | An AI Hub order records the project in its metadata only when the buyer selects a project. The system writes the project name onto the order only when the project belongs to the account of the order. | P0 | LPD-102570 | `CLIENT-COMMERCE-PRODUCTPURCHASEAIHUB`, `FLOW-AI-HUB-PURCHASE` |
| REQ-ORDERS-094 | The contract ID field of an order links the order to its contract. | P0 | LPD-102570 | `FLOW-PRODUCT-PURCHASE-CONTRACT`, `CLIENT-COMMERCE-PRODUCTPURCHASEAIHUBOPENBETA` |
| REQ-ORDERS-095 | A token order takes its project and contract from a completed AI Hub order of the same project. When the project has no completed AI Hub order, the system refuses the token order. | P0 | LPD-102570 | `CLIENT-COMMERCE-PRODUCTPURCHASEAIHUBTOKEN` |

## My Account Orders

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ORDERS-100 | The Orders page lists the placed orders of the current account, newest first. Only an account manager or a user with an account role can see the page. | P0 | LPD-90960, LPD-95398 | `MOD-MYACCOUNT-ACCOUNTMEMBERS-ACCOUNTROLES`, `ROUTE-MY-ACCOUNT-ORDERS`, `FLOW-ROLE-ACCOUNT-PERMISSIONS` |
| REQ-ORDERS-101 | A user can search the orders by order ID or project name. A user can filter by project, to include or exclude projects, and by status. | P2 | LPD-93898 | — |
| REQ-ORDERS-102 | The order details show the order ID, date, project, status, payment status, total, purchase order number, buyer, account, and items. A missing total shows $0.00. | P1 | LPD-93898 | `ROUTE-MY-ACCOUNT-ORDERID`, `HOOK-USEPLACEDORDER` |
| REQ-ORDERS-103 | My Account shows the orders, projects, and billing of an entitled member. | P1 | LPD-88258 | `FLOW-MY-ACCOUNT-OVERVIEW` |

## Next Steps and Completion Pages

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ORDERS-110 | The next steps page shows the result from the payment status. A paid order shows "Purchase completed" and the order ID. A pending payment shows "Order received" and says that an invoice comes by email. | P1 | LPD-104214 | `HOOK-USEGETPRODUCTBYORDERID` |
| REQ-ORDERS-111 | A failed or canceled payment shows "Purchase failed" and the Marketplace support email address. | P1 | LPD-104214 | `HOOK-USEGETPRODUCTBYORDERID` |
| REQ-ORDERS-112 | When the next steps page shows a paid order, the system asks to complete that order. | P0 | LPD-104570 | `REST-POST-COMMERCE-ORDERS-COMMERCEORDERID-COMPLETE-SETTLED` |
| REQ-ORDERS-113 | After a paid cloud app order, the continue button opens the applications of One Time Purchases for the install. After another paid order, it opens the Orders page. Otherwise it opens the catalog. | P2 | LPD-104214 | — |
| REQ-ORDERS-114 | The next steps page uses a dedicated page for Liferay Data Platform, AI Hub, AI Hub open beta, and AI Hub token orders. | P1 | LPD-90605 | — |
| REQ-ORDERS-115 | When the product of an order no longer exists, the order pages show "Product unavailable" and a placeholder image. | P1 | — | `HOOK-USEGETPRODUCTBYORDERID` |
| REQ-ORDERS-116 | After a paid app purchase with a failed or canceled payment, the purchase completed page shows "Payment failed" and lets the buyer try again. | P1 | — | `ROUTE-PRODUCT-PURCHASE-PURCHASE-COMPLETED` |

## License Agreement

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ORDERS-120 | The license agreement page shows the Marketplace licensor end user license agreement. The text comes from the site web content with the key EULA, or else from the web content at the friendly URL `eula`. | P1 | LPD-103896 | — |
| REQ-ORDERS-121 | The agreement link in the checkout opens the usage terms URL of the product when the product has one. Otherwise it opens the license agreement page. | P1 | — | `ROUTE-PRODUCT-PURCHASE-SUMMARY` |

## SEO Studio and AI Hub Purchases

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ORDERS-130 | Liferay sells SEO Studio only to an account that already has an AI Hub order. For another account, the account step opens the requirements dialog, and the request form refuses the submit. | P0 | LPD-102451 | `FLOW-SEO-STUDIO-SIGNUP`, `HOOK-PRODUCTPURCHASE-USEAIHUBORDERS` |
| REQ-ORDERS-131 | The requirements dialog sends the buyer to the AI Hub product page. When that page is unknown, it sends the buyer to the products page. | P2 | LPD-102451 | `HOOK-PRODUCTPURCHASE-USESEOSTUDIOREQUIREMENTSMODAL` |
| REQ-ORDERS-132 | An AI Hub order, an AI Hub open beta order, and an SEO Studio order each need the completed form. The system refuses the order without it. The order metadata keeps the form. | P0 | LPD-90605, LPD-102451 | `CLIENT-COMMERCE-PRODUCTPURCHASEAIHUB`, `CLIENT-COMMERCE-PRODUCTPURCHASEAIHUBOPENBETA`, `CLIENT-COMMERCE-PRODUCTPURCHASESEOSTUDIO` |

## Order Item Changes

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ORDERS-140 | When a PaaS Experience order item is canceled, the system deletes the Okta application of the account. It keeps the application when the account has another approved PaaS Experience item that has not ended. | P1 | LPD-89439, LPD-107697 | `REST-POST-OBJECT-ACTION-COMMERCE-ORDER-ITEM-UPDATE` |

## Not Yet Built

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-ORDERS-150 | Catalog prices and checkout totals show in the currency of the account, and the order keeps that currency. Only the checkout part exists. | P1 | LPD-88263 | `FLOW-MULTI-CURRENCY-CHECKOUT` |
| REQ-ORDERS-151 | The order history page lists the past orders of the account. The page shows only the account ID now. | P2 | — | `ROUTE-MY-ACCOUNT-HISTORY` |
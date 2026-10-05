# PayPal Payments and Tax Calculation

This file records the contract between Liferay One and the systems that take payment and calculate tax. The plan names Stripe for payments and tax (Epic E25, LPD-93643). The code does not call Stripe. Payment goes through the PayPal payment integration of Liferay Commerce, and Liferay One calculates tax itself with a fixed rate. This file states what the code does and records the difference from the plan. The purchase flow, the tax rules for each country, and order completion are in [`../../business/purchasing-and-orders.md`](../../business/purchasing-and-orders.md).

The systems are the purchase flow in the browser, the Liferay One Spring Boot service, Liferay Commerce, and PayPal behind the Commerce payment integration. The actors are the buyer and the system processes that complete orders.

Terms used in this file:

- **Payment integration key**: the name that Liferay Commerce gives to a payment method, for example `paypal-integration` or `money-order`.
- **Payment URL**: the address of the payment page that Liferay Commerce returns for a cart.
- **Callback URL**: the address that the payment page sends the buyer back to after the payment.
- **Payment status**: the number that Liferay Commerce stores on an order to show the state of its payment.
- **Settled payment**: a payment status of 0 (completed) or 23 (not required).

## Payment Methods

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-PAYMENTS-001 | The code has no Stripe client, no Stripe key, and no Stripe webhook. The plan describes card payment and token payment through Stripe, but the code sends every card payment to PayPal through Liferay Commerce. This difference is open. | P1 | LPD-93643 | — |
| TECH-PAYMENTS-002 | A paid checkout names one of two payment integration keys on the cart. Pay now sends `paypal-integration`. An invoice paid by bank transfer sends `money-order`. The AI Hub token purchase always sends `paypal-integration`. | P0 | LPD-93643, LPD-102570 | `FLOW-CHECKOUT-PAID`, `CLIENT-COMMERCE-PRODUCTPURCHASEAIHUBTOKEN` |
| TECH-PAYMENTS-003 | Liferay Commerce must have both payment methods active on the `LIFERAY_ONE_CHANNEL` channel. When a method is not active, the cart update that names it fails with 404, and the buyer sees a general error. | P0 | LPD-101158 | — |
| TECH-PAYMENTS-004 | No headless API or client extension can activate a payment method on a channel. The bootstrap activates both methods through JSONWS with administrator credentials. It skips a method that the channel already has, so a second run adds no duplicate. | P1 | LPD-101158 | — |
| TECH-PAYMENTS-005 | The administrator order pages show PayPal as the payment method only for an order with the key `paypal-integration`. A new key from Commerce does not show as PayPal. | P2 | — | — |

## Checkout and Payment Redirect

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-PAYMENTS-010 | The browser creates or updates the cart through the headless commerce delivery cart API. The cart carries the account, the items, the currency, the order type, the payment integration key, and the billing address. The billing address is also the shipping address. | P0 | LPD-93643 | `CLIENT-COMMERCE-PRODUCTPURCHASE`, `CLIENT-HEADLESS-HEADLESSCOMMERCEDELIVERYCART` |
| TECH-PAYMENTS-011 | The browser checks out the cart with `POST /carts/{cartId}/checkout` before it asks for payment. So the order exists in Commerce before PayPal takes any money. | P0 | LPD-104570 | `CLIENT-COMMERCE-PRODUCTPURCHASE`, `FLOW-CHECKOUT-PAID` |
| TECH-PAYMENTS-012 | For pay now, the browser gets the payment URL with `GET /carts/{cartId}/payment-url` and a `callbackURL` parameter. The callback URL is the next steps page of the site, with the order ID in the `orderId` query parameter and no URL fragment. PayPal does not open when the callback URL has a fragment. | P0 | LPD-104214 | `CLIENT-HEADLESS-HEADLESSCOMMERCEDELIVERYCART`, `CLIENT-COMMERCE-PRODUCTPURCHASE` |
| TECH-PAYMENTS-013 | Commerce returns the payment URL as plain text. An empty answer sends the buyer to the callback URL directly. An answer that is not a success raises an error, and the buyer stays on the summary step with a general error message. | P0 | LPD-104214 | `CLIENT-HEADLESS-HEADLESSCOMMERCEDELIVERYCART` |
| TECH-PAYMENTS-014 | Known defect: the checkout runs before the payment URL request. When the payment URL request fails, the order stays in Commerce with no payment, and the buyer does not see its order ID. | P1 | LPD-104214 | — |
| TECH-PAYMENTS-015 | The browser accepts one purchase submit at a time. It holds the guard until the browser leaves for the payment page, so a second click does not place a second order. | P1 | LPD-104108 | — |
| TECH-PAYMENTS-016 | The AI Hub token purchase and the AI Hub open beta purchase also send the buyer to the payment URL after checkout, with the same callback URL rules. | P1 | LPD-102570 | `CLIENT-COMMERCE-PRODUCTPURCHASEAIHUBTOKEN`, `CLIENT-COMMERCE-PRODUCTPURCHASEAIHUBOPENBETA` |

## Payment Result

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-PAYMENTS-020 | PayPal sends no callback or webhook to Liferay One. Liferay One reads the result of a payment only from the payment status of the Commerce order. The PayPal integration of Commerce must set the payment status before it returns the buyer. | P0 | LPD-104570 | `REST-POST-COMMERCE-ORDERS-COMMERCEORDERID-COMPLETE-SETTLED` |
| TECH-PAYMENTS-021 | Liferay One treats only the payment status 0 (completed) and 23 (not required) as settled. Commerce must keep these codes. A change to them stops every paid order from completing. | P0 | LPD-104570 | `CRON-COMPLETESETTLEDORDERS`, `REST-POST-COMMERCE-ORDERS-COMMERCEORDERID-COMPLETE-SETTLED` |
| TECH-PAYMENTS-022 | Three paths deliver a settled payment to Liferay One. The commerce order update object action posts the `classPK` of the order to `/object/action/commerce/order/update`. The next steps page posts to `/commerce-orders/{commerceOrderId}/complete-settled`. The daily run and the startup run read all open settled orders. | P0 | LPD-104570 | `REST-POST-OBJECT-ACTION-COMMERCE-ORDER-UPDATE`, `REST-POST-COMMERCE-ORDERS-COMMERCEORDERID-COMPLETE-SETTLED`, `CRON-COMPLETESETTLEDORDERS`, `LSN-COMMERCEORDERSERVICE-ONAPPLICATIONREADY` |
| TECH-PAYMENTS-023 | The same order can arrive on more than one path. Completion ignores an order that is not pending or processing, and ignores a second request for an order that one service instance completes at that time. This guard is in memory, so two service instances can complete the same order at the same time. | P0 | LPD-104570 | `REST-POST-COMMERCE-ORDERS-COMMERCEORDERID-COMPLETE-SETTLED` |
| TECH-PAYMENTS-024 | A failed call from the next steps page does not show to the buyer. The order update action or the daily run completes the order later. See TECH-ORDERS-064. | P1 | LPD-104570 | `CRON-COMPLETESETTLEDORDERS` |

## Tax Calculation

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-PAYMENTS-030 | No external tax provider calculates tax. Liferay One calculates tax at a fixed rate of 20 percent of the order subtotal, for the countries that TECH-ORDERS-051 names. The rate and the country list are constants in the code, so a change needs a release. | P0 | LPD-88264, LPD-95435 | `SVC-COMMERCEORDERSERVICE`, `FLOW-TAX-CALCULATION` |
| TECH-PAYMENTS-031 | The browser asks for tax with `POST /commerce-orders/{commerceOrderId}/calculate-tax` and the cart ID. Liferay One reads the order from the headless commerce admin order API, with the account, the billing address, the custom fields, and the order items. It needs the account type and the country ISO code of the billing address. | P0 | LPD-95435 | `REST-POST-COMMERCE-ORDERS-COMMERCEORDERID-CALCULATE-TAX` |
| TECH-PAYMENTS-032 | Liferay One writes the tax amount and the new total on the order. On each item, it writes the final price with tax and marks the price as manually adjusted. Commerce must keep these values and must not calculate them again before the payment. | P0 | LPD-95435 | `SVC-COMMERCEORDERSERVICE` |
| TECH-PAYMENTS-033 | Each call calculates from the current subtotal and replaces the earlier values, so a repeated call gives the same result. The EUR exchange rate goes into the order metadata on the first call only. | P1 | LPD-95435 | `SVC-COMMERCEORDERSERVICE` |
| TECH-PAYMENTS-034 | Known defect: the update is not atomic. Liferay One updates the order first and then each item. A failure after the first update leaves a taxed order total with items that have no tax. The browser ignores the failure. | P1 | LPD-95435 | — |
| TECH-PAYMENTS-035 | The AI Hub token purchase does not ask for tax. A token order that PayPal charges has no tax, whatever the billing country. | P1 | LPD-102570 | — |
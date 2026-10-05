# Glossary

This file defines the terms that the requirement files share. Each area file also lists the terms it uses. When an area file and this file disagree, this file is correct, and the area file must change.

Use one term for one thing. Do not call a project a workspace, or an entitlement a subscription, in a requirement. A synonym in a requirement is an error.

## Accounts, Roles, and Access

- **Account**: a customer company in Liferay One. Projects, contracts, orders, entitlements, and members attach to an account. Area: `accounts-and-organizations.md`.
- **Account invitation**: a pending offer to join an account, or one project of the account, that the system sends by email. Area: `accounts-and-organizations.md`.
- **Account manager**: a user who holds the Account Administrator, Partner Account Admin, or SSA Administrator role on an account. The custom element does not treat SSA Administrator as an account manager. Area: `accounts-and-organizations.md`.
- **Account role**: a role that a user holds in one account. It grants nothing in any other account. Area: `identity-and-access.md`.
- **Global administrator**: a user with the Administrator or the Provisioning Administrator role. The admin pages of the custom element admit only Administrator. Area: `identity-and-access.md`.
- **Global role**: a regular role that applies to the whole company, for example Administrator, Provisioning Member, or Liferay Staff. Area: `identity-and-access.md`.
- **Partner account**: an account that holds at least one product that Liferay marks as a partner product. Area: `accounts-and-organizations.md`.
- **Project role**: the role of a project membership: Project Admin, Project Requester, or Project User. A project membership gives one user one project role on one project. Area: `projects.md`.
- **Reserved Liferay domain**: one of the 8 email domains that Liferay uses for its own staff, for example `liferay.com`. Area: `accounts-and-organizations.md`.
- **Shared organization**: an organization that an account is linked to. The members of the organization get access to the account. Area: `accounts-and-organizations.md`.
- **Trusted application**: one of the 6 OAuth2 applications whose access tokens the Spring Boot service accepts. Area: `identity-and-access.md`.

## Projects, Contracts, and Entitlements

- **Account level contract**: a contract of an account that is not linked to a project. Area: `projects.md`.
- **Account level entitlement**: an entitlement that belongs to an account and to no project. Area: `entitlements.md`.
- **Effective end date**: an earlier end date that a renewal, an amendment, or a deletion in Salesforce sets on an order item. The original end date stays as it was. Area: `entitlements.md`.
- **Entitlement**: one grant of a product to an account, and optionally to a project and a contract. An entitlement has a name, a quantity, a grant type, a start date, and an end date. For licensing, the quantity is the number of activations. Area: `entitlements.md`.
- **Entitlement definition**: the template that says which entitlements one SKU grants. A definition links to its SKU by the SKU external reference code. Area: `entitlements.md`.
- **One Time Purchases**: the pseudo project and pseudo contract that hold the orders and entitlements that no project or project contract owns. Area: `projects.md`.
- **Project**: a unit of work inside an account. Contracts, entitlements, orders, environments, and members attach to a project. Area: `projects.md`.
- **Project item**: a product or an application that a project bought. The `project-item-type` product specification says which of the two it is. Area: `projects.md`.
- **Profile**: a product specification that selects what one tab of a project item shows. A profile of `none` hides the tab. Area: `projects.md`.

## Catalog and Orders

- **App**: a product that a publisher builds, with packages that a customer installs on Liferay DXP or Liferay Cloud. Area: `publisher-program.md`.
- **Catalog**: the products that the Liferay One commerce channel offers. Area: `marketplace-catalog.md`.
- **Completable order**: an order with the status pending or processing. Area: `purchasing-and-orders.md`.
- **Contact sales product**: a product that Liferay sells only through its sales team. The buyer cannot check it out. Area: `marketplace-catalog.md`.
- **License tier**: the license usage type option value of a SKU, for example developer, trial, production, or standard. Area: `marketplace-catalog.md`.
- **Listed category**: the only category of the listing vocabulary. It controls whether a product appears on the Products page. Area: `marketplace-catalog.md`.
- **Order**: a commerce order of one account. Before checkout, an order is an open cart. Area: `purchasing-and-orders.md`.
- **Order item**: one line of an order. Its custom fields carry the start date, the end date, and the effective end date of the purchase. Area: `entitlements.md`.
- **Order type**: the external reference code that classifies an order, for example `DXP_APP`, `AI_HUB`, or `CMP`. Area: `purchasing-and-orders.md`.
- **Paid product**: a product whose price model specification is paid. Every other product follows the free flow. Area: `purchasing-and-orders.md`.
- **Product type category**: the category of a product in the product type vocabulary: App, Liferay Product, Product, or Solution. Area: `marketplace-catalog.md`.
- **Settled payment**: a payment status of completed or not required. Area: `purchasing-and-orders.md`.
- **SKU**: one sellable variant of a product. A SKU carries options such as a license usage type. Area: `marketplace-catalog.md`.
- **Solution**: a product that a publisher builds on Liferay and presents on a marketplace page. A solution has no package. Area: `publisher-program.md`.
- **Specification**: a named value on a product, for example the price model, the app type, or the solution type. Area: `marketplace-catalog.md`.

## Licensing

- **Activation key**: a group of license keys that a project generates in one request. The license keys in an activation key activate, deactivate, and renew as one unit. Area: `licensing-and-activation.md`.
- **Common license key**: a license file that an administrator uploads for a whole product family, for example Commerce or Enterprise Search. Area: `licensing-and-activation.md`.
- **Complimentary key**: a short, free key that Liferay gives for a stated purpose, outside the paid activations. Area: `licensing-and-activation.md`.
- **License key**: one signed license file for one product and one server. Area: `licensing-and-activation.md`.
- **Quarterly version**: a DXP version named by year, quarter, and patch, for example `2025.Q4.3`. Area: `platform.md`.

## Trials, Provisioning, and Usage

- **Add on bucket**: a fixed number of extra events that a customer buys on top of the base allotment. Area: `usage-and-utilization.md`.
- **Allotment**: the number of Liferay Data Platform events that a project may use in one month. Area: `usage-and-utilization.md`.
- **Analytics Cloud workspace**: the workspace that a Liferay Data Platform order or a Digital Sales Room order uses. An account has one, keyed by the external reference code of the account. Area: `trials-and-provisioning.md`.
- **Console project**: a project in Liferay Cloud Console that holds the environments where an app runs. A Console project is not a Liferay One project. Area: `trials-and-provisioning.md`.
- **Deployment**: one install of a cloud app into one Console project. Area: `trials-and-provisioning.md`.
- **Environment quota**: the number of cloud native environments of one type that the active entitlements of a project allow. Area: `trials-and-provisioning.md`.
- **Overage**: the consumption above the entitled quantity. The system bills it in whole buckets. Area: `usage-and-utilization.md`.
- **Seat**: one live trial portal instance. The number of seats has a fixed maximum. Area: `trials-and-provisioning.md`.
- **Solution trial**: a 7 day trial of a prebuilt solution that a buyer starts from the Marketplace. Its order type is `SOLUTIONS7`. Area: `trials-and-provisioning.md`.
- **SSA account**: the account that holds the SaaS demos of the Solution Sales team. The SSA Administrator and SSA User roles apply only in this account. Area: `administration.md`.
- **SSA trial**: a demonstration trial that Liferay sales staff create from the SSA dashboard. Its order type is `SSA_SAAS`. Area: `trials-and-provisioning.md`.
- **Usage report**: the record of the consumption of one project for one month, with any overage that a reviewer must handle. Area: `usage-and-utilization.md`.

## Support

- **Asset object**: one record in Jira Assets, with attributes that the Jira schema defines. Area: `support.md`.
- **Business event**: a planned change for a project, for example an upgrade or a go live date. Area: `support.md`.
- **Closed ticket**: a ticket with the status Closed, Closed (FLS), or Solution Accepted. Area: `support.md`.
- **Draft comment**: the Jira comment for a ticket attachment that the system could not post. The system keeps it and tries again. Area: `support.md`.
- **JSM asset**: the copy of an account, a team, a contact, a role, or a role assignment in the JSM asset schema. Area: `accounts-and-organizations.md`.
- **Ticket**: an issue in the Help Center or First Line Support project of Jira Service Management. Area: `support.md`.
- **Ticket attachment**: a large file that a user adds to a ticket through Liferay One. The file is in Google Cloud Storage, and a ticket attachment record tracks it. Area: `support.md`.

## Sales and Publishers

- **Dead letter topic**: the Pub/Sub topic that receives a message after every delivery attempt fails. Area: `sales-and-crm.md`.
- **DSR**: the Digital Sales Room, a product that runs on an Analytics Cloud workspace. Area: `sales-and-crm.md`.
- **Line item**: one product on an opportunity. A line item with a quantity of zero or less amends the items of an earlier opportunity. Area: `sales-and-crm.md`.
- **Opportunity**: a Salesforce deal. A closed won opportunity becomes one order. Area: `sales-and-crm.md`.
- **Payout**: the share of the sales that Liferay pays to the publisher. Area: `publisher-program.md`.
- **Publisher catalog**: the commerce catalog that belongs to the account of a publisher. Every app and solution of the publisher is a product in this catalog. Area: `publisher-program.md`.
- **Publisher request**: the request that a user sends to become a marketplace publisher. Area: `publisher-program.md`.
- **Sales summary**: the record of the paid marketplace orders of one publisher in one quarter, with its payout status. Area: `publisher-program.md`.

## Notifications and Platform

- **AQL**: the query language of the JSM asset schema. Area: `platform.md`.
- **Notification template**: a stored email with a subject, a body, and placeholders. The site initializer creates each template. Area: `notifications.md`.
- **Object action**: a rule on an object that runs when an entry is added or updated. Area: `notifications.md`.
- **OData filter**: the query language that the Liferay headless APIs accept in the `filter` parameter. Area: `platform.md`.
- **Verified user**: a user whose email address Okta confirmed. Area: `notifications.md`.
- **Welcome email**: the email that tells a provisioned user how to sign in and which projects the user can use. Area: `notifications.md`.
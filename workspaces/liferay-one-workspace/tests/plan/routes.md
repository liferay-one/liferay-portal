# Routes

Every SPA route in the custom element. The `route` attribute of the host widget selects one of nine page group routers. Eight of them carry nested route tables, listed below. The ninth, account-selector, is a single page with no nested routes. A unit test proves a static route table when it asserts the declared paths, elements, and titles. A route group with conditional wiring (for example, the free and paid steps of ProductPurchase) also needs an e2e test. The test loads the route and asserts that it renders for the correct persona. The `*Router.tsx` files also declare routes inline, outside the static table: the MyAccount account guard, the project layout, and the ProductPurchase completion pages. These routes render only behind entitlement or commerce state, so they are e2e or deferred. The flows in flows.md exercise them.

> Autoscaffolded from the code surface (87 items). Edit the Requirement, Type, Priority, and Status columns freely. `scaffoldPlan` preserves them on rerun. Do not edit the ID column. When the code anchor of a row changes, edit its Source column so that the row keeps its ID.

| ID | Requirement | Type | Priority | Status | Source |
| --- | --- | --- | --- | --- | --- |
| ROUTE-ADMIN-ACTIVATION-KEY-UPLOADS | Admin route table wires `activation-key-uploads` to the LicenseKeyUploads page with its nav entry | unit | P1 | planned | route:admin:activation-key-uploads |
| ROUTE-ADMIN-DETAILS-ORDERID | Admin route table wires `details/:orderId` to the TrialDetails page (no nav entry, param-driven detail) | unit | P2 | planned | route:admin:details/:orderId |
| ROUTE-ADMIN-MANAGE-SSA-SAAS-USERS | Admin route table wires `manage-ssa-saas-users` to the ManageSsaSaasUsers page with its nav entry | unit | P1 | planned | route:admin:manage-ssa-saas-users |
| ROUTE-ADMIN-MP-APPS | Admin route table wires `mp-apps` to the Apps list page with its nav entry | unit | P1 | planned | route:admin:mp-apps |
| ROUTE-ADMIN-MP-APPS-PRODUCTID | Admin route table wires `mp-apps/:productId` to the AppDetail page (no nav entry, param-driven detail) | unit | P2 | planned | route:admin:mp-apps/:productId |
| ROUTE-ADMIN-MP-FINANCE-ORDERS | Admin route table wires `mp-finance-orders` to the MPFinanceOrders list page with its nav entry | unit | P1 | planned | route:admin:mp-finance-orders |
| ROUTE-ADMIN-MP-FINANCE-ORDERS-ORDERID | Admin route table wires `mp-finance-orders/:orderId` to the OrderDetails page (no nav entry, param-driven detail) | unit | P2 | planned | route:admin:mp-finance-orders/:orderId |
| ROUTE-ADMIN-MP-ORDERS | Admin route table wires `mp-orders` to the Orders list page with its nav entry | unit | P1 | planned | route:admin:mp-orders |
| ROUTE-ADMIN-MP-PAYMENTS | Admin route table wires `mp-payments` to the Payments list page with its nav entry | unit | P1 | planned | route:admin:mp-payments |
| ROUTE-ADMIN-MP-PAYMENTS-ENTRYID | Admin route table wires `mp-payments/:entryId` to the PaymentDetails page (no nav entry, param-driven detail) | unit | P2 | planned | route:admin:mp-payments/:entryId |
| ROUTE-ADMIN-MP-SOLUTIONS | Admin route table wires `mp-solutions` to the Solutions list page with its nav entry | unit | P1 | planned | route:admin:mp-solutions |
| ROUTE-ADMIN-MP-SOLUTIONS-PRODUCTID | Admin route table wires `mp-solutions/:productId` to the SolutionDetail page (no nav entry, param-driven detail) | unit | P2 | planned | route:admin:mp-solutions/:productId |
| ROUTE-ADMIN-MP-SUMMARY | Admin route table wires `mp-summary` to the MPSummary page and makes it the default index redirect | unit | P1 | planned | route:admin:mp-summary |
| ROUTE-ADMIN-MY-SSA-SAAS-DEMO | Admin route table wires `my-ssa-saas-demo` to the MySsaSaasDemo page with its nav entry | unit | P1 | planned | route:admin:my-ssa-saas-demo |
| ROUTE-ADMIN-PUB-SUB | Admin route table wires `pub-sub` to the PubSub page with its nav entry | unit | P1 | planned | route:admin:pub-sub |
| ROUTE-ADMIN-PUBLISHER-REQUESTS | Admin route table wires `publisher-requests` to the PublisherRequests page with its nav entry | unit | P1 | planned | route:admin:publisher-requests |
| ROUTE-ADMIN-PUBLISHERS | Admin route table wires `publishers` to the Publishers page with its nav entry | unit | P1 | planned | route:admin:publishers |
| ROUTE-ADMIN-SSA-SAAS-ENVIRONMENTS | Admin route table wires `ssa-saas-environments` to the Environments page with its nav entry | unit | P1 | planned | route:admin:ssa-saas-environments |
| ROUTE-ADMIN-TRIALS | Admin route table wires `trials` to the Trials page with its nav entry | unit | P1 | planned | route:admin:trials |
| ROUTE-BECOME-A-PUBLISHER-REQUEST-ACCOUNT | Route table declares the expected path, element, and title: become-a-publisher:request-account | unit | P1 | planned | route:become-a-publisher:request-account |
| ROUTE-BUSINESS-EVENTS-ID | Route table wires the `:id` branch whose index renders BusinessEventsDetails, nesting the edit and activity-history children | unit | P1 | planned | route:business-events::id |
| ROUTE-BUSINESS-EVENTS-PROJECTERC-BUSINESS-EVENTS | Route table nests the `:projectERC/business-events` branch (list index plus add/:id children) under the BusinessEventsRedirect element | unit | P1 | planned | route:business-events::projectERC/business-events |
| ROUTE-BUSINESS-EVENTS-ACTIVITY-HISTORY | Route table wires the `activity-history` child under `:id` to the BusinessEventsActivityHistory page | unit | P1 | planned | route:business-events:activity-history |
| ROUTE-BUSINESS-EVENTS-ADD | Route table wires the `add` child of the business events list to the BusinessEventsAdd page | unit | P1 | planned | route:business-events:add |
| ROUTE-BUSINESS-EVENTS-EDIT | Route table wires the `edit` child under `:id` to the BusinessEventsEdit page | unit | P1 | planned | route:business-events:edit |
| ROUTE-MY-ACCOUNT-ACCOUNTERC | Account access guard: the `:accountERC` route validates the account and gates account-scoped pages; declared inline in MyAccountRouter. Exercised by FLOW-MY-ACCOUNT-OVERVIEW (deferred — needs an entitled member) | e2e | P1 | deferred | route:my-account::accountERC |
| ROUTE-MY-ACCOUNT-APPLICATIONERC | Project route table wires `applications/:applicationERC` to ProjectItemDetails with kind application | unit | P1 | planned | route:my-account::applicationERC |
| ROUTE-MY-ACCOUNT-APPLICATIONERC-INSTALL-ORDERID | Project route table wires `applications/:applicationERC/install/:orderId` to the CloudAppInstall page | unit | P1 | planned | route:my-account::applicationERC/install/:orderId |
| ROUTE-MY-ACCOUNT-LICENSEKEYERC | Project route table wires `activation-keys/:licenseKeyERC` to the LicenseKeyDetails page | unit | P1 | planned | route:my-account::licenseKeyERC |
| ROUTE-MY-ACCOUNT-ORDERID | Account route table wires `orders/:orderId` to the OrderDetails page | unit | P1 | planned | route:my-account::orderId |
| ROUTE-MY-ACCOUNT-PRODUCTERC | Project route table wires `products/:productERC` to ProjectItemDetails with kind product | unit | P1 | planned | route:my-account::productERC |
| ROUTE-MY-ACCOUNT-PROJECTERC | Project detail route (`:projectERC`) renders the selected project; declared inline in MyAccountRouter. Exercised by FLOW-MY-ACCOUNT-OVERVIEW (deferred — needs an entitled member) | e2e | P1 | deferred | route:my-account::projectERC |
| ROUTE-MY-ACCOUNT-ACCOUNT-DETAILS | Account route table wires `account-details` to the AccountDetails page under the AccountTabsLayout | unit | P1 | planned | route:my-account:account-details |
| ROUTE-MY-ACCOUNT-ACCOUNT-MEMBERS | Account route table wires `account-members` to the AccountMembers page under the AccountTabsLayout | unit | P1 | planned | route:my-account:account-members |
| ROUTE-MY-ACCOUNT-ACTIVATION | Route table declares the expected path, element, and title: my-account:activation | unit | P1 | planned | route:my-account:activation |
| ROUTE-MY-ACCOUNT-APPLICATIONS | Project route table wires `applications` to the Applications list page with its nav entry | unit | P1 | planned | route:my-account:applications |
| ROUTE-MY-ACCOUNT-GENERATE | Route table declares the expected path, element, and title: my-account:generate | unit | P1 | planned | route:my-account:generate |
| ROUTE-MY-ACCOUNT-HISTORY | Account route table wires `orders/history` to the OrderHistory page | unit | P1 | planned | route:my-account:history |
| ROUTE-MY-ACCOUNT-ORDERS | Account route table wires the `orders` branch whose index renders the Orders list | unit | P1 | planned | route:my-account:orders |
| ROUTE-MY-ACCOUNT-PRODUCTS | Project route table wires the `products` branch whose index renders the Products list and is the project default redirect | unit | P1 | planned | route:my-account:products |
| ROUTE-MY-ACCOUNT-PROJECT | Project layout route wraps project pages in ProjectProvider; declared inline in MyAccountRouter. Exercised by FLOW-MY-ACCOUNT-OVERVIEW (deferred — needs an entitled member) | e2e | P1 | deferred | route:my-account:project |
| ROUTE-MY-ACCOUNT-PROJECT-MEMBERS | Account route table wires `project-members` to the ProjectMembers page under the AccountTabsLayout | unit | P1 | planned | route:my-account:project-members |
| ROUTE-OAUTH2-AUTHORIZE-CONGRATULATIONS | Route table declares the expected path, element, and title: oauth2-authorize:congratulations | unit | P1 | planned | route:oauth2-authorize:congratulations |
| ROUTE-OAUTH2-AUTHORIZE-ENVIRONMENT-SELECTION | Route table declares the expected path, element, and title: oauth2-authorize:environment-selection | unit | P1 | planned | route:oauth2-authorize:environment-selection |
| ROUTE-OAUTH2-AUTHORIZE-PROJECT-SELECTION | Route table declares the expected path, element, and title: oauth2-authorize:project-selection | unit | P1 | planned | route:oauth2-authorize:project-selection |
| ROUTE-PRODUCT-PURCHASE-ACTIVATION-KEY-FORM | ActivationKeyForm step is included only for DXP free tier products; getProductPurchaseSteps must gate it on isDXPFreeOnly and exclude it otherwise | e2e | P1 | planned | route:product-purchase:activation-key-form |
| ROUTE-PRODUCT-PURCHASE-AI-HUB-FORM | AIHubForm step is emitted only when the product solution type is ai-hub; getProductPurchaseSteps must select the AI Hub step set and not the default flow | e2e | P1 | planned | route:product-purchase:ai-hub-form |
| ROUTE-PRODUCT-PURCHASE-AI-HUB-OPEN-BETA-FORM | AIHubOpenBetaForm step is emitted only for the ai-hub-open-beta solution type without the aiHubTokens param; getProductPurchaseSteps must branch on solution type and search params | e2e | P1 | planned | route:product-purchase:ai-hub-open-beta-form |
| ROUTE-PRODUCT-PURCHASE-BANK-TRANSFER-COMPLETED | Paid-checkout bank-transfer confirmation page; declared inline in ProductPurchaseRouter. Exercised by FLOW-CHECKOUT-PAID (deferred — needs commerce/payment stub) | e2e | P1 | deferred | route:product-purchase:bank-transfer-completed |
| ROUTE-PRODUCT-PURCHASE-CONTRACT | ContractSelection step is emitted only in the ai-hub-open-beta flow without the aiHubTokens param; getProductPurchaseSteps must place it between project and the open beta form | e2e | P1 | planned | route:product-purchase:contract |
| ROUTE-PRODUCT-PURCHASE-DSR-FORM | DSRForm step is emitted only when the product solution type is dsr; getProductPurchaseSteps must return the account-then-form pair and no paid steps | e2e | P1 | planned | route:product-purchase:dsr-form |
| ROUTE-PRODUCT-PURCHASE-LICENSE | SPA route renders for the right persona: product-purchase:license | e2e | P1 | planned | route:product-purchase:license |
| ROUTE-PRODUCT-PURCHASE-PAYMENT-METHOD | SPA route renders for the right persona: product-purchase:payment-method | e2e | P1 | planned | route:product-purchase:payment-method |
| ROUTE-PRODUCT-PURCHASE-PROJECT | ProjectSelection step is emitted only in the ai-hub-open-beta flow; getProductPurchaseSteps must place it between account and the open beta form | e2e | P1 | planned | route:product-purchase:project |
| ROUTE-PRODUCT-PURCHASE-PROVISIONING | LDPProvisioning step is included only for LDP products; getProductPurchaseSteps must gate it on isLDP and exclude it from non LDP flows | e2e | P1 | planned | route:product-purchase:provisioning |
| ROUTE-PRODUCT-PURCHASE-PURCHASE-COMPLETED | Checkout completion page; declared inline in ProductPurchaseRouter. Exercised by FLOW-CHECKOUT-FREE / FLOW-CHECKOUT-PAID (deferred — needs commerce completion) | e2e | P1 | deferred | route:product-purchase:purchase-completed |
| ROUTE-PRODUCT-PURCHASE-SEO-STUDIO-FORM | SEOStudioForm step is emitted only when the product solution type is seo-studio; getProductPurchaseSteps must place it after project selection and omit the paid steps | e2e | P1 | planned | route:product-purchase:seo-studio-form |
| ROUTE-PRODUCT-PURCHASE-SOLUTION | Route table declares the expected path, element, and title: product-purchase:solution | unit | P1 | planned | route:product-purchase:solution |
| ROUTE-PRODUCT-PURCHASE-SUMMARY | SPA route renders for the right persona: product-purchase:summary | e2e | P0 | planned | route:product-purchase:summary |
| ROUTE-PUBLISHER-DASHBOARD-PRODUCTID | Route table wires the `:productId` branch under `published-apps` to the AppSummary index, and under `newversion` to the new-version publish flow | unit | P1 | planned | route:publisher-dashboard::productId |
| ROUTE-PUBLISHER-DASHBOARD-PRODUCTID-OPTIONAL | Route table wires the optional `:productId?` branch under `newapp` and `newsolution` so both flows start without a product and resume with one | unit | P1 | planned | route:publisher-dashboard::productId? |
| ROUTE-PUBLISHER-DASHBOARD-BUILD | Route table wires the app flow `build` step to the Build page and makes it the new-version index redirect | unit | P1 | planned | route:publisher-dashboard:build |
| ROUTE-PUBLISHER-DASHBOARD-COMPANY | Route table wires the solution flow `company` step to the CompanyProfile page | unit | P2 | planned | route:publisher-dashboard:company |
| ROUTE-PUBLISHER-DASHBOARD-CONTACT | Route table wires the solution flow `contact` step to the ContactUs page | unit | P2 | planned | route:publisher-dashboard:contact |
| ROUTE-PUBLISHER-DASHBOARD-DETAILS | Route table wires the solution flow `details` step to the Details page | unit | P2 | planned | route:publisher-dashboard:details |
| ROUTE-PUBLISHER-DASHBOARD-EDIT | Route table wires the `publisher-profile/edit` child to the PublisherProfileEdit page | unit | P1 | planned | route:publisher-dashboard:edit |
| ROUTE-PUBLISHER-DASHBOARD-HEADER | Route table wires the solution flow `header` step to the Header page | unit | P2 | planned | route:publisher-dashboard:header |
| ROUTE-PUBLISHER-DASHBOARD-LICENSING | Route table wires the app flow `licensing` step to the Licensing page | unit | P1 | planned | route:publisher-dashboard:licensing |
| ROUTE-PUBLISHER-DASHBOARD-LICENSING-PRICES | Route table wires the app flow `licensing-prices` step to the LicensePrices page | unit | P1 | planned | route:publisher-dashboard:licensing-prices |
| ROUTE-PUBLISHER-DASHBOARD-NEWAPP | Route table wires the `newapp` branch that nests the app publish flow under the NewApp context provider | unit | P1 | planned | route:publisher-dashboard:newapp |
| ROUTE-PUBLISHER-DASHBOARD-NEWSOLUTION | Route table wires the `newsolution` branch that nests the solution publish flow under the Solution context provider | unit | P1 | planned | route:publisher-dashboard:newsolution |
| ROUTE-PUBLISHER-DASHBOARD-NEWVERSION | Route table wires the `newversion` branch that nests the app flow in NEW_VERSION publish mode | unit | P1 | planned | route:publisher-dashboard:newversion |
| ROUTE-PUBLISHER-DASHBOARD-PRICING | Route table wires the app flow `pricing` step to the Pricing page | unit | P1 | planned | route:publisher-dashboard:pricing |
| ROUTE-PUBLISHER-DASHBOARD-PROFILE | Route table wires the `profile` step to the app flow Profile page and to the solution flow Profile page respectively | unit | P1 | planned | route:publisher-dashboard:profile |
| ROUTE-PUBLISHER-DASHBOARD-PUBLISHED-APPS | Route table wires `published-apps` to the PublishedApps page (nav entry) and makes it the default index redirect | unit | P1 | planned | route:publisher-dashboard:published-apps |
| ROUTE-PUBLISHER-DASHBOARD-PUBLISHED-SOLUTIONS | Route table wires `published-solutions` to the PublishedSolutions page with its nav entry | unit | P1 | planned | route:publisher-dashboard:published-solutions |
| ROUTE-PUBLISHER-DASHBOARD-PUBLISHER | Route table wires the `publisher` branch that mounts the publish outlet and makes Create the index of the app, solution, and new-version flows | unit | P1 | planned | route:publisher-dashboard:publisher |
| ROUTE-PUBLISHER-DASHBOARD-PUBLISHER-PROFILE | Route table wires the `publisher-profile` branch whose index renders PublisherProfile and nests the edit child | unit | P1 | planned | route:publisher-dashboard:publisher-profile |
| ROUTE-PUBLISHER-DASHBOARD-STOREFRONT | Route table wires the app flow `storefront` step to the Storefront page | unit | P2 | planned | route:publisher-dashboard:storefront |
| ROUTE-PUBLISHER-DASHBOARD-SUBMIT | Route table wires the `submit` step to the app flow SubmitApp page and to the solution flow SubmitSolution page respectively | unit | P1 | planned | route:publisher-dashboard:submit |
| ROUTE-PUBLISHER-DASHBOARD-SUPPORT | Route table wires the app flow `support` step to the Support page | unit | P2 | planned | route:publisher-dashboard:support |
| ROUTE-PUBLISHER-DASHBOARD-VERSION | Route table wires the app flow `version` step to the Version page | unit | P1 | planned | route:publisher-dashboard:version |
| ROUTE-TICKET-ATTACHMENTS-TICKETID | Route table wires the `:ticketId` path to the TicketAttachmentsUploaderOutlet under the TicketAttachmentsLayout | unit | P1 | planned | route:ticket-attachments::ticketId |
| ROUTE-TICKET-ATTACHMENTS-ERC-TICKETATTACHMENTERC | Route table wires `erc/:ticketAttachmentERC` to the TicketAttachmentsDownloaderOutlet | unit | P1 | planned | route:ticket-attachments:erc/:ticketAttachmentERC |
| ROUTE-TICKET-ATTACHMENTS-ID-TICKETATTACHMENTID | Route table wires `id/:ticketAttachmentId` to the TicketAttachmentsDownloaderOutlet | unit | P1 | planned | route:ticket-attachments:id/:ticketAttachmentId |
| ROUTE-TICKET-ATTACHMENTS-NEW | Route table wires `new` to the TicketAttachmentsAdd page under the TicketAttachmentsLayout | unit | P1 | planned | route:ticket-attachments:new |
| ROUTE-TICKET-ATTACHMENTS-NEW-TICKETID | Route table wires `new/:ticketId` to the TicketAttachmentsUploaderOutlet | unit | P1 | planned | route:ticket-attachments:new/:ticketId |
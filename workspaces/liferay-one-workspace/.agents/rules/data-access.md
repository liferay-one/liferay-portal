# Data Access

Nearly every read in this workspace is a network call — a headless API request from `liferay-one-custom-element`, or a Liferay/Salesforce/Jira call from `liferay-one-etc-spring-boot`. The cost of a sloppy read is not a few wasted cycles; it is a page that takes eight seconds, or a synchronizer that issues four thousand requests where forty would do.

These rules are about the *shape* of a read. They apply to both lanes: the migration scripts in the sibling `scripts` checkout hit the same APIs, over far more records.

## One Record Means One Row

When exactly one record is expected, the query must ask for one. Never fetch a page and index into it.

```ts
// Wrong — pulls every placed order to look at the newest one
const {items} = await HeadlessCommerceDeliveryOrder.getPlacedOrders(
	channelId,
	accountId
);

const order = items[0];

// Correct — filter server-side, ask for one row
const parameters = new URLSearchParams({
	filter: SearchBuilder.eq('orderTypeExternalReferenceCode', 'AI_HUB'),
	pageSize: '1',
});

const {items} = await HeadlessCommerceDeliveryOrder.getPlacedOrders(
	channelId,
	accountId,
	parameters
);
```

Per stack:

| Stack | One-row read |
| --- | --- |
| Headless REST | `pageSize=1` plus a `filter`, or a `by-external-reference-code` endpoint when one exists |
| OData filters | Build with `SearchBuilder` — never hand-concatenate a filter string |
| Spring Boot Java | The same `pageSize=1` query parameter on the outbound URI |
| `scripts` local SQLite store | `LIMIT 1` on the statement, read with `.get()` rather than `.all()` |

Indexing `[0]` is fine on a collection you already had to fetch in full — `postalAddresses.items.find((address) => address.primary) ?? postalAddresses.items[0]` picks a fallback out of an account's addresses, which is not a query at all. The rule targets fetching a page *in order to* take one element.

## No Service Call Inside A Loop

A loop that calls a service per item is the most common performance defect here. It turns one round trip into N, and N is usually a page size someone will raise later.

```ts
// Wrong — one request per order
for (const order of orders) {
	const account = await HeadlessAdminUser.getAccount(order.accountId);
	...
}

// Correct — one request, then a local lookup
const {items: accounts} = await HeadlessAdminUser.getAccounts(
	new URLSearchParams({
		filter: SearchBuilder.in('id', orders.map((order) => order.accountId)),
		pageSize: '-1',
	})
);

const accountsById = new Map(accounts.map((account) => [account.id, account]));
```

The two fixes, in order of preference: a filter that fetches the whole set in one call, or a batch endpoint. Only when neither exists does a loop become acceptable — and then say so, because the next reader will assume it was an oversight.

This is not in tension with the one-row rule above. Fetching a page is right when you need every element of it and wrong when you need one.

## Hoist What Does Not Change

Anything invariant across iterations belongs above the loop: an OAuth2 authorization header, a resolved channel or object-type ID, a compiled `RegExp`, a `DateTimeFormatter`, a constant request body. Re-deriving an auth token per item is the expensive version of this mistake — it is an extra network call per item hiding inside what looks like a local helper.

## Nested Scans Become Map Lookups

Two loops over the same collection is `O(n²)`. Build a `Map` or `Set` once, then look up in one pass. At forty records nobody notices; the migration scripts run this shape over hundreds of thousands.

## Bound Every Pagination

`pageSize=-1` is correct for a genuinely bounded reference set — countries, currencies, an account's roles. It is a time bomb on anything company-scoped that grows: accounts, orders, license keys, tickets. For those, paginate explicitly and cap the total, or in the scripts lane extend `PaginationRun` and let it drive the pages.

Never pass a user-supplied page size straight through to an outbound request.

## Serial Awaits That Could Overlap

Independent requests should not queue behind each other.

```ts
// Wrong — two round trips, serially, for unrelated data
const account = await HeadlessAdminUser.getAccount(accountId);
const orders = await HeadlessCommerceDeliveryOrder.getPlacedOrders(channelId);

// Correct
const [account, orders] = await Promise.all([
	HeadlessAdminUser.getAccount(accountId),
	HeadlessCommerceDeliveryOrder.getPlacedOrders(channelId),
]);
```

Only parallelize what is genuinely independent — and never fan out an unbounded list of writes this way, since the server will rate-limit or interleave them in an order nothing guarantees.
---

paths:
  - "**/liferay-one-custom-element/**"

---

# Custom Element Safety

These rules apply to `liferay-one-custom-element`. Each rule prevents a failure that a user sees. A write loses its authorization with no error. A name from Salesforce renders as markup. A filter matches the wrong rows. A date saves as the day before the user picked.

`code-style.md` and `data-access.md` state most of these rules in prose. This file states each one as a rule, with the failure it prevents. Apply every rule by reading. A linter enforces some of them in some branches; the rule holds either way.

## Every Liferay Call Goes Through the Fetcher

A call to `fetch()` against a Liferay URL is a defect. The shared fetcher in `services/fetcher/` does two things that a direct call does not do:

- The fetcher attaches `x-csrf-token`. The portal rejects a write that has no token.
- The fetcher converts a failed response into a `FetcherError`. Without the fetcher, a failed read returns as if it succeeded, and the caller renders `undefined`.

```ts
// Wrong. The call sends no CSRF token, and a 403 returns as a success.
const response = await fetch(`${baseURL}/o/c/contactsaleses/`, {headers, method: 'GET'});

// Correct. The call goes through the service that owns the URL.
return fetcher<ContactSales>('/o/c/contactsaleses/');
```

A direct `fetch` to an external URL is correct, and the rule permits it. One example is a Google Cloud Storage upload session. The rule reports only same origin calls to a `/o/` path.

## Anything Rendered as HTML Is Sanitized

`dangerouslySetInnerHTML` takes `DOMPurify.sanitize(...)`. There is no exception, and a translated string is not an exception. `i18n.sub` and `translate` insert their arguments without any change. This code is unsafe:

```tsx
// Wrong. The DOM reads the account name as markup.
<div dangerouslySetInnerHTML={{__html: i18n.sub('x-available-for-you', [accountName])}} />

// Correct
<div dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(i18n.sub('x-available-for-you', [accountName]))}} />
```

The code permits cross-site scripting when the name comes from Salesforce, Jira, Koroneiki, or Marketplace. Every account name, project name, and product name in this app comes from one of those four systems.

## Filters Are Built, Not Concatenated

A value that you insert into an OData filter becomes part of the query. An ID or a name that contains a quote changes which rows the query matches:

```ts
// Wrong
filter: `r_accountEntryToProject_accountEntryId eq '${accountId}'`

// Correct
filter: SearchBuilder.eq('r_accountEntryToProject_accountEntryId', accountId)
```

`SearchBuilder` escapes the value. Use `.eq`, `.contains`, `.lambda`, and `.in`. No other code builds a filter.

The rule reads two shapes. The first shape is a template literal that a `filter` property holds. The second shape is a template literal that closes an OData operator with a quote, as in `` `name eq '${value}'` ``, wherever that literal appears. The second shape matters because a filter built inside a GraphQL string or inside a URL never reaches a `filter` property, so the first shape does not find it.

## Pagination Is Bounded

`pageSize: '-1'` requests every row. This is correct for a fixed reference set, such as the countries, the currencies, or the roles on one account.

This is incorrect for a collection with company scope. That collection grows with the customer data until the request times out.

Request one page and set a limit on the total.

A read that is scoped to one account by a filter grows with one customer, not with the data of the company, so it may read every row. So may a read of the inventory of Liferay, such as the approved apps or the publisher catalogs, because a person reviews each entry. State that claim at the call site with a shared named constant rather than the bare string `'-1'`, so that a reviewer reads the claim and checks it.

A count does not need the rows. When a query returns `totalCount`, read the count from `totalCount` and ask for one page. Pair that with `startsWith` in place of `contains`, so that every row the server returns is a row the caller counts and the two numbers agree.

A sum is the hard case. Adding a field over every completed order in the company needs every row, and a limit returns a total that is too low, so the screen shows a figure that is wrong with no error. The correction is an endpoint that returns the sum. Add the endpoint to `liferay-one-etc-spring-boot` rather than raising the page size.

## Dates From a Picker Are Timezone Naive

JavaScript reads a plain `yyyy-MM-dd` string as **midnight UTC**. `new Date(value).toISOString()` therefore moves the day back by one in every timezone behind UTC, which includes all of the Americas. The user picks the 15th. The code saves the 14th.

```ts
// Wrong
return value ? new Date(value).toISOString() : undefined;

// Correct. Local noon keeps the calendar day in every timezone.
return value ? new Date(`${value}T12:00:00`).toISOString() : undefined;
```

## Web Storage Goes Through the Storage Service

Read and write `localStorage` and `sessionStorage` through `MarketplaceStorage` in `services/liferay/`. `MarketplaceStorage` owns the key names. It also returns a value when the browser refuses storage. A direct read throws an error in a private window, and the component fails to render.

## The Array Index Is Not a Key

`key={index}` connects the component state to a position in the list, not to an item. When you remove an item, or when you change the order, React keeps the old state on the item that moves into that position. A checked row stays checked. An input keeps the text that the user typed into a different row.

Use an `id`, an `externalReferenceCode`, or another value that is unique in the list.

A variable named `key` is an identity, not a position. It comes from `Object.keys`, from `Object.entries`, or from a field that carries its own key, so the rule does not report it.

Some lists carry no identity of their own. A repeated label is one case: the narrow weekday names repeat, because Sunday and Saturday both read `S`, so that list keys on the number of the day. A record that the endpoint returns without an id is the other: key on the combination of fields that is unique, such as the author, the change, and the date together.

A list whose items hold a form is where this defect reaches a user. A person reorders or deletes an item, and React keeps the text of one item on the item that moves into that position. Give each item an `id` when it is created, and give a stored item an id when the browser reads it, so that no stored record needs a change.

## No `as unknown as`

The double cast stops the compiler from checking that the two types are related. The next change to a field name compiles, and then fails when the code runs.

Correct the type instead. Make the DTO wider, add a type guard, or declare the difference that the cast conceals.

A cast conceals a defect more often than it bridges two correct types. These four shapes account for most of them:

- A class holds one record and extends a parent that holds a different record, so it casts the record in and casts it out again. Drop the parent, or hold the record the parent expects.
- A component declares its own shape for a function that a library types. Import the library type. `KeyedMutator` passes `undefined` when the cache is empty, and the hand written shape hides that.
- A component builds an object that looks like a change event. Declare the shape the caller wants, and build that.
- A type describes a value that the browser holds, and the server returns the same record without that field. Mark the field optional, and guard each path that reads it.

A `find` call under a cast is the sharpest case. `find(...) as SKU` turns an absent result into a value that throws on the next line.

## Enforcement

Every rule above applies to new code.

A branch that carries the matching ESLint rules registers them in `tools/eslint-plugin-local/src/index.ts`. A rule there stays a warning while existing violations remain, and becomes an error when the count reaches zero. Record the remaining counts in the branch that owns the linter, not here: a count is true for one tree and wrong in every other one.

`eslint-plugin-jsx-a11y` enforces accessibility, and `.eslintrc.js` reads the plugin's own recommended list. The plugin writes each entry as a bare severity or as an array of a severity and its options. Read the severity out of the array and keep the options. Code that compares the array to the string `off` never matches, turns on the three rules the plugin ships off, and drops the options of each one.
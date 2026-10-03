---

paths:
  - "**/liferay-one-custom-element/**"

---

# Custom Element Structure

The location of a file in `liferay-one-custom-element` tells a reader what the file does. These rules set the layout. The path gives the tier, and the tier gives the operations that the file may perform.

A reviewer applies every rule in this file by reading. Some branches enforce the rules that one file can prove on its own through `yarn lint`, and the rules that need the full import graph through a separate script. Read `package.json` for the scripts the branch in front of you actually has.

This file gives the location of each kind of file. [`custom-element-safety.md`](./custom-element-safety.md) gives the rules that prevent a failure the user sees. Those failures are a missing CSRF token, cross-site scripting, filter injection, and a date that saves one day early.

## The Folders Under `src`

There are nine, and no others:

| Folder | Holds |
| --- | --- |
| `assets/` | Images and icons |
| `components/` | Components more than one page uses |
| `context/` | React contexts more than one page reads |
| `hooks/` | Hooks more than one page calls |
| `i18n/` | Language files |
| `pages/` | One folder per top level page |
| `schemas/` | Zod schemas, one file per domain |
| `services/` | Everything that talks to a server |
| `types/` | Types, interfaces, and enums |
| `utils/` | Plain functions |

A folder outside that list belongs inside one of them:

- An enum is a type, so it goes in `types/`. There is no separate `enums/` tier.
- A model wraps a service payload, so it goes in `services/models/` with the services that return it.
- Every folder name is plural. A `schema/` folder is `schemas/`.
- Hooks are flat. A hook that reads data is still a hook, so it goes in `hooks/`, not `hooks/data/`.

Move a file into the folder its tier requires. When the destination already holds a file of that name, read both declarations before you merge them.

A duplicate declaration of one name is the hazard this creates. When two files declare the same name over the **same** values, one is redundant and either import is correct. When they declare it over **different** value sets, the name has two meanings and the meaning depends on the import path. `AccountRoleType` is declared twice today, as an enum in `enums/Account.ts` and as a union of string literals in `types/accounts.ts`, and the two sets differ. Merging them changes the behavior at every call site, so that work needs its own ticket. Merging the files before that ticket is complete conceals the problem.

## Services

Only `services/` calls a server. No file outside `services/` imports `fetcher`. There is one exception: `main.tsx` imports the fetcher to give it to SWR.

### Reads Go Direct, Writes Go Through Spring Boot

A read may call Liferay directly from `services/headless/`, `services/objects/`, or `services/commerce/`.

A write goes through `services/spring-boot/`. A write is a POST, a PUT, a PATCH, or a DELETE. The server then performs the change, and the permission check stays on the server.

```ts
// Wrong. This is a write in the headless tier.
// src/services/headless/HeadlessAdminUser.ts
static async deleteRoleAccountUser(accountId, roleId, userId) {
	return fetcher.delete(`/o/headless-admin-user/v1.0/...`);
}

// Correct. A read belongs in this tier.
static async getAccount(accountId) {
	return fetcher<Account>(`/o/headless-admin-user/v1.0/accounts/${accountId}`);
}
```

The write moves to `services/spring-boot/Accounts.ts` and calls the Spring Boot endpoint that performs it.

### GraphQL Is the Default

Use GraphQL. GraphQL returns the fields that the caller requests, in one request. This is what these screens need.

Use a REST service when GraphQL cannot express the call. Three examples are a mutation, a file upload, and an endpoint that GraphQL does not serve.

There is one GraphQL client: `services/graphql/GraphQL.ts`. Import that client.

### The Service Tiers

- `services/actions/` — write orchestration. A publish operation changes a catalog, then a price list, then an asset. That sequence is an action, not a service method.
- `services/commerce/` — commerce reads.
- `services/fetcher/` — transport. This tier holds the fetcher, its error type, the SWR cache, and the query string builders `SearchBuilder` and `CreateFilters`. A query string builder is part of the transport, not a general helper, so it does not belong in `utils/`. The table of schemas that `CreateFilters` reads belongs here as well. That table is not a type, so it does not belong in `types/`, where it sits today as `types/filters.ts`.
- `services/graphql/` — the GraphQL client.
- `services/queries/` — read orchestration, and the counterpart to `services/actions/`. A file here exports a `DataQuery`: a `key` and a `fetcher` that a hook gives to SWR, and that `preloadAppData.ts` gives to the cache before the first render. The query belongs here, and not in the hook, because two callers use it. Name the file for the domain and use the plural form, as in `accountQueries.ts` and `orderQueries.ts`.
- `services/headless/` — Liferay headless reads.
- `services/liferay/` — the `Liferay` global and its wrappers.
- `services/models/` — classes that wrap a service payload and expose derived fields.
- `services/objects/` — Liferay Object reads.
- `services/spring-boot/` — every write, and everything the Spring Boot client extension serves.

A service file is named for the URL it targets, per [`naming.md`](./naming.md).

## Pages

Every top level page under `src/pages/` owns its routes:

```
pages/MyAccount/
	MyAccount.tsx           the page
	MyAccountRouter.tsx     the file that main.tsx loads on demand
	myAccountRoutes.tsx     the route table, when the page has two or more routes
	components/             the components that only this page uses
	hooks/                  the hooks that only this page calls
	AccountDetails/         one route, in its own folder
```

`main.tsx` registers one router per page, and every page now has one.

A folder under `src/pages/X` is either a route or a component. A route sits directly under the page. A component goes in `components/`, however deep:

```
# Wrong. A button is not a route.
pages/MyAccount/AccountDetails/SyncToJSMButton/SyncToJSMButton.tsx

# Correct
pages/MyAccount/AccountDetails/components/SyncToJSMButton/SyncToJSMButton.tsx
```

`AccountSelector` is a page. It is not a component. It has a router, and `main.tsx` mounts it at the `account-selector` route.

## No Index Files, No Catch All Files

The name `index.tsx` gives a reader no information. Name a file after the thing that it exports. A page starts at its router.

`utils.ts` and `types.ts` become folders, with one named file per concern:

```
# Wrong
pages/ProductPurchase/types.ts

# Correct
pages/ProductPurchase/types/PaymentMethod.ts
pages/ProductPurchase/types/PurchaseStep.ts
```

When a file name matches its folder name, the case must match as well. Write `Projects/Projects.ts`. Do not write `Projects/projects.ts`.

## One File, One Job

A module has a limit of 400 lines and 12 hook calls. These two numbers mark the point where a file performs more than one job. Divide the file at a boundary that already exists: a sub-component, a hook, or the service call that the file wraps.

The limit does not apply to a language file or to a test. A language file is data. A test grows with the code that it covers.

Two modules must not import each other in a cycle. A cycle is not a style problem. One module in the cycle loads first, and it reads the other modules before they finish loading. A constant that the module reads at load time is then `undefined`, and the result depends on which entry point ran.

Only a value import creates a cycle. TypeScript removes an `import type` before the code runs. A dynamic `import('...')` runs later, so it also creates no cycle.

One pattern causes most cycles: a child component imports its parent's props type with a value import. `import type` corrects it.

An enum is the exception. An enum is a value at run time, even though it reads like a type. Move a shared enum out of the parent, into a module that the parent and the children both import.

## Components

`src/components/` holds the components that two or more pages share.

A component that only one page uses belongs under that page. A reader who opens the page then sees the component. `AppPublish` and every `AppReview*` component belong under `PublisherDashboard`, because only `PublisherDashboard` uses them.

The opposite rule also applies. When a second page imports a component from under another page, that component is now shared. Move it to `src/components/` before a third page copies it.

Neither condition is visible in the file itself. Both need the import graph, so read the importers of a component before you move it.

Check again after each set of moves. A move changes which pages reach the components below it, so the answer for one component depends on where the components above it live. A component can move into a page and then show that a second page reaches it, which is the second rule correcting the first. Move it back and check again. The tree settles after a few rounds.

## Contexts

A context belongs in a `context/` folder. Put it in `src/context/` when two or more pages read it. Otherwise put it beside the page or the component that owns it. Name the file `<Name>ContextProvider.tsx`. The app uses this one suffix:

```
# Wrong
context/AccountContext.tsx
context/MarketplaceContextProvider.tsx

# Correct
context/AccountContextProvider.tsx
context/MarketplaceContextProvider.tsx
```

## Hooks

A file in a `hooks/` folder exports only hooks, and each hook calls another hook.

A file that exports a query string builder next to its hook does two jobs. Move the builder to `utils/`, or to the service that owns the endpoint.

A file that calls no hook is a plain function. Move it out of the `hooks/` folder.

## Language Keys

Write every substitution in a key as `x`. This applies to each substitution, whatever the count. Do not write `y`, `z`, or a number:

```ts
// Wrong
'includes-x-add-on-buckets-y-on-top-of-the-z-base-allotment-per-month':
	'Includes {0} add-on buckets (+{1}) on top of the {2} base allotment per month.',

// Correct
'includes-x-add-on-buckets-x-on-top-of-the-x-base-allotment-per-month':
	'Includes {0} add-on buckets (+{1}) on top of the {2} base allotment per month.',
```

A key is a lowercase slug with a hyphen between the words. A key carries no punctuation. The English text is the value, not the key:

```ts
// Wrong
'need-help-getting-started?': 'Need help getting started?',

// Correct
'need-help-getting-started': 'Need help getting started?',
```

Do not write user facing text in the component. A literal string in `alt`, `aria-label`, `label`, `placeholder`, or `title` reaches only an English reader. Visible JSX text reaches only an English reader. Add a key for the string and call `translate()`.

## No Comments

The code states what it does. A comment that repeats the code becomes wrong when a developer changes the code, and a reader cannot tell which one is correct.

The rule covers the `//` form, the `/* */` form, and the JSX `{/* */}` form, in a stylesheet as well as in TypeScript. It permits one comment: the SPDX licence header.

Write a name instead of a comment. Convert a condition that needs an explanation into a named boolean. Convert a fixed value into a named constant. Convert a block that needs a heading into a function, and use the heading as the function name. A test states the purpose of an edge case more exactly than a sentence above the code.

There is one exception, and a linter cannot see it: a constraint that covers two files. One example is a pair of stylesheets that must hold the same rules. Neither file can state that constraint in code, so a comment in each is correct.

## Never Silence the Linter

`// eslint-disable` does not correct a violation. Do one of three things instead. Declare the correct type for the value, in place of `any`. Move the file to the location that the structure rule requires. Or propose a change to the rule, and change it for the whole team.

## Dead Code Is Deleted, Not Moved

A file is dead when no file imports it, or when only other dead files import it. The size of the file does not change this result. A large module of API calls can be reachable from nothing at all, through a chain of two or three files that are themselves dead.

Read the list of importers before you rewrite a module. The list is sometimes empty, and then the correct change is to delete the file.

A reachability check must count `import('...')` as well as `from '...'`. `main.tsx` and every routes file reach their pages through `import('...')`, so a check that reads only `from '...'` reports every page as dead.

A cycle check must do the opposite. A dynamic import runs later and sets no load order, so only a static import creates a cycle. One script can answer both questions, and it reads each form for the question that form applies to.

## Dependencies

Compare `package.json` against the imports in the source. Two reports come out of it. The first is a dependency that no file imports. The second is an import that `package.json` does not declare.

The second report is the more serious one. The import resolves today because another dependency installs that package. The import fails when that dependency changes its own dependencies.

Some packages are in use but no file imports them. Three examples are a package that satisfies a peer range, a build plugin, and a type package. Record each one as implicitly used, with the reason.

## Enforcement

Every rule above applies to new code.

A branch that carries the matching ESLint rules registers them in `tools/eslint-plugin-local/src/index.ts`. A rule there stays a warning while existing violations remain, and becomes an error when the count reaches zero. Record the remaining counts in the branch that owns the linter, not here: a count is true for one tree and wrong in every other one.
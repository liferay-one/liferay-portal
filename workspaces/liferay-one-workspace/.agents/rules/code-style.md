# Code Style

These rules apply to all code in this workspace. Brian Chan enforces them during PR review — violations are rejected or corrected with a follow-up commit.

Three of the sections below restate a canonical rule in `pr-reviewer/rules`. Read the numbered rule for the full statement and the rationale, and read the section here for what is specific to this workspace. Where the two disagree, the numbered rule wins.

| Section | Canonical rule |
| --- | --- |
| Sort Everything | [202] Sort sortable sequences |
| Log Message Conventions | [703] Log and exception message form |
| String Concatenation in Java | [306] Prefer StringBundler |
| User Facing Text | [701] Avoid hyphens in prose, [702] Title case or complete sentence for labels |

## Sort Everything

Lists, arrays, and JSON entries must always be in sorted order. This applies to:

- JSON array items in site initializer files (sort by `externalReferenceCode` or `key`)
- `[#assign ... /]` variable blocks in FreeMarker templates (logical dependency order, then alphabetical)
- Java `import` statements (already handled by source formatter)
- Entries in configuration files
- CSS rules, nested rules, and properties — see [`css-sort-order.md`](./css-sort-order.md) for the selector group order
- Method and constructor parameter lists — alphabetical by parameter name. Reordering a signature means reordering the arguments at every call site. Where the reordered parameters share a type, the compiler cannot catch a missed call site — the code still compiles while the arguments land in the wrong parameters — so verify each call site by reading it against the new order, not by trusting a green build. Example (same type, the dangerous case): `notify(String message, String recipient)` → `notify(String recipient, String message)`.

When Brian sees items out of order, he comments `"sort"` and bounces the PR back.

## Log Message Conventions

Do not write log statements like AI-generated code. Specifically:

- Error messages: use `"Unable to <verb>"` not `"Error <verb>ing"` or `"Error: <noun>"`
- Product/object names in log strings: no hyphens — write `"business event"` not `"business-event"`, `"business events"` not `"business-events"`
- No label-style punctuation: a log message is prose, so it carries no `:`, `-`, or `=` separators — write `"Unable to update business event " + id`, not `"Update failed: id=" + id`. A hyphen inside a URL path being echoed verbatim is the one tolerable case.

Example of what Brian corrected:

```java
// Wrong — AI slop
_log.info("GET business-events for " + externalReferenceCode);
_log.error("Error updating business event " + id);

// Correct
_log.info("GET business events for " + externalReferenceCode);
_log.error("Unable to update business event " + id);
```

## String Concatenation in Java

Three or more `+` operators joining strings in one expression become `StringBundler.concat(...)`. Two pieces stay as they are.

```java
// Wrong
throw new JiraAssetObjectException(
	"No \"" + objectTypeName + "\" asset object exists for external key " +
		externalKey);

// Correct
throw new JiraAssetObjectException(
	StringBundler.concat(
		"No \"", objectTypeName, "\" asset object exists for external key ",
		externalKey));

// Fine — two pieces
_log.info("Deployed app for project " + projectId);
```

This applies everywhere a string is built: log calls, exception messages, return values, assignments. It is a Java rule only — TypeScript uses template literals.

## User Facing Text

- Use "IDs" (not "Id", "id", "codes", or other terms) when referring to identifier values shown to users. This includes object field `label` values in batch definitions — write `"Catalog External ID"`, not `"Catalog External Id"`.
- Semantic precision matters: "Email" and "Email Address" are different — don't add "Address" if the field is just an email

## FreeMarker Variable Blocks

In FreeMarker templates (`.ftl`, `index.html`), group all `[#assign ... /]` statements together in a single block at the top. Within the block, order variables by dependency (assign prerequisites before their dependents).

```freemarker
[#assign
    currentFriendlyURL = ... /]
[#assign
    currentURL = ... /]
```

→ Both should be in one logical block, with `currentFriendlyURL` before `currentURL` since `currentURL` may depend on it.

### Reset Per Iteration State Inside `[#list]`

`[#assign]` variables are template-scoped, not iteration-scoped — a value assigned in one `[#list]` pass persists into the next. When a variable is assigned only inside a guard (`[#if x?has_content]`), a later iteration whose guard is false still reads the *previous* iteration's value, so the wrong data renders. Reset every such variable to a neutral default at the top of the loop body, before the guards.

```freemarker
[#-- Wrong: principalCategory leaks from the previous product --]
[#list products as product]
    [#if product.categories?has_content]
        [#assign principalCategory = product.categories[0] /]
    [/#if]
    [#if principalCategory?has_content]...[/#if]
[/#list]

[#-- Correct: reset before the guard --]
[#list products as product]
    [#assign principalCategory = "" /]
    [#if product.categories?has_content]
        [#assign principalCategory = product.categories[0] /]
    [/#if]
    [#if principalCategory?has_content]...[/#if]
[/#list]
```

## Image URLs in Fragments

Never string-replace `https://` to `http://` on an image or document URL in shipped fragment markup (`src="${imageURL?replace('https://', 'http://')}"`). This is a local-dev bandaid: on any HTTPS environment (UAT/prod) it forces the asset to `http://`, which the browser blocks as mixed content, and the image silently fails to load. Serve the asset over the current scheme instead of rewriting the protocol.

## Date Input Values Are Timezone Naive

Never feed a `yyyy-MM-dd` value from an `<input type="date">` straight into `new Date(...).toISOString()`. A bare date string is parsed as **UTC midnight**, so in any UTC-negative timezone (all of the Americas) `.toISOString()` and any later local-time display shift the day backward by one — the saved start/expiration date is off by one from what the user picked.

```ts
// Wrong — 2026-03-15 selected in the US saves/renders as 2026-03-14
function toISODate(value?: string): string | undefined {
	return value ? new Date(value).toISOString() : undefined;
}

// Correct — pin to local noon so the calendar day survives any offset
function toISODate(value?: string): string | undefined {
	return value ? new Date(`${value}T12:00:00`).toISOString() : undefined;
}
```

Prefer a shared helper in `~/utils/dateUtils.ts` over re-deriving this per file.

## Clay Drop Down Menus Render Outside the Component

`ClayDropDown` renders its menu in a portal at the end of `body`, not inside the element that carries `className`. A selector such as `.my-dropdown .dropdown-menu` therefore never matches, and the rule has no effect. Give the menu its own class through `menuElementAttrs`, and select that class:

```tsx
<ClayDropDown className="list-card-filter-dropdown" menuElementAttrs={{className: 'list-card-filter-menu'}} />
```

```css
.list-card-filter-menu.dropdown-menu {
	max-width: min(320px, calc(100vw - 32px)) !important;
}
```

All the CSS in the custom element goes into one stylesheet, so a bare `.dropdown-menu` rule in a page file applies to every page. `ProvideAppBuildPage.css` sets `.dropdown-menu { max-width: none !important; }`, and a menu that needs a maximum width must override it with `!important`. Scope a new menu rule to a class of its own.

## Marketo Errors Render Inside the Field Wrap

Marketo adds a validation error as a `.mktoError` element inside `.mktoFieldWrap`, after the label and the field. Both Marketo stylesheets (`MarketoForm.css` in the custom element and `marketo-form/index.css` in the site initializer) give it `width: 100%` in the normal flow. When a rule makes a field wrap `display: flex`, also set `flex-wrap: wrap`. Without it, the error sits in the same row as the field and pushes the label into a narrow column.

```css
.mktoForm .mktoFieldWrap:has(> .mktoCheckboxList > input:only-of-type) {
	align-items: flex-start;
	display: flex;
	flex-wrap: wrap;
}
```

Test a change to the field layout with the error shown: leave a required field empty and submit the form. Both stylesheets hold the same rules, so make each change in both files.

## Java Code Ordering

In Java classes, declare resource clients before the objects that use them:

```java
// Wrong
Account account = new Account();
account.setName(...);
AccountResource accountResource = AccountResource.builder()...build();

// Correct
AccountResource accountResource = AccountResource.builder()...build();
Account account = new Account();
account.setName(...);
```

## Null Means Unknown in Partial Updates

A JSM sync, or any code that assembles several values from separate sources and then writes them in one upsert, must not let one failed source abort or corrupt the others. The contract is: a value that could not be fetched is `null`, `null` means unknown, and unknown is never written.

- **The owning model catches, logs, and returns `null`.** Service-backed getters on a `*SyncModel` do not throw. The synchronizer stays free of try/catch around attribute assembly and drops `throws Exception`.
- **Never flatten unknown to empty.** An empty list or map is a real value that deletes every existing reference in JSM. `JiraAssetObject.setAttributeValue` ignores `null`, so leaving the attribute unset keeps the previous value.
- **Control flow skips on `null`.** A stale-assignment sweep (`syncRoles`, `syncOrganizations`) given an empty set unassigns everything, so its input is checked for `null` before it runs. A loop over a nullable list is guarded, not defaulted.
- **Layered attributes do not backfill.** When a project asset sets the same attribute as its account, set it only from the project's value. Setting the account's first and relying on the project's to override lets a `null` project value leave the account's in place.
- **Memoize the outcome, not the value.** A memo field that stays `null` after a failure cannot tell "failed" from "not fetched yet", so every consumer in the same sync retries the dead service and logs again. Use `MemoizedValue` (`com.liferay.one.util.MemoizedValue`), which evaluates once and returns `null` thereafter.
- **A getter that depends on another getter returns `null` when its input is `null`**, without logging a second time. Sibling getters in one model share one control-flow shape.

```java
// Wrong — unknown becomes empty, and JSM deletes every reference
List<String> accountERCs = Collections.emptyList();

try {
	accountERCs = _getAccountERCs();
}
catch (Exception exception) {
	_log.error("Unable to get accounts", exception);
}

// Correct — the model owns it; null leaves the attribute untouched
_accountExternalReferenceCodes = new MemoizedValue<>(
	"accounts for user account " + externalReferenceCode, _log,
	this::_toAccountExternalReferenceCodes);
```
# Security

This area covers the technical rules that keep user input and browser requests safe in every feature. It includes how the system builds queries from user input, how the browser authenticates its requests to the portal, and how links keep their scheme. The access rules for each feature, such as roles and permissions, are in [`../business/identity-and-access.md`](../business/identity-and-access.md).

Terms used in this file:

- **OData filter**: the query language that the Liferay headless APIs accept in the `filter` parameter.
- **AQL**: the query language of the JSM asset schema.

## Input and Requests

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-SECURITY-001 | Every user value that the system puts into an OData filter or an AQL query is escaped, so the value cannot change the query. | P0 | — | `MOD-ESCAPEODATASTRING`, `CLS-AQLUTIL`, `CLS-ONEBASESERVICE`, `CLIENT-FETCHER-SEARCHBUILDER`, `CLIENT-FETCHER-CREATEFILTERS` |
| TECH-SECURITY-002 | Every request that the browser sends to the portal carries the CSRF token of the portal session. | P0 | — | `CLIENT-FETCHER-FETCHER` |
| TECH-SECURITY-003 | The system never changes a link from https to http on a page that the browser loaded over https. | P1 | — | `MOD-STRINGUTILS` |
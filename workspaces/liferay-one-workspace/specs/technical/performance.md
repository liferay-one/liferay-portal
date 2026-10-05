# Performance

This area covers the technical rules that keep pages fast to load in every feature.

## Caching

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-PERFORMANCE-001 | The browser keeps fetched data for the length of the browser session, so a page that the user opens again loads at once. It does not keep an entry larger than 64 KB. | P2 | — | `CLIENT-FETCHER-SWRCACHEPROVIDER`, `HOOK-USEFETCH` |
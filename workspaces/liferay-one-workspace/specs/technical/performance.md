# Performance

This area covers the technical rules that keep pages fast to load in every feature, and that keep the outbound calls of the Spring Boot service fast.

## Caching

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-PERFORMANCE-001 | The browser keeps fetched data for the length of the browser session, so a page that the user opens again loads at once. It does not keep an entry larger than 64 KB. | P2 | — | `CLIENT-FETCHER-PERSISTSWRCACHE`, `HOOK-USEFETCH` |

## Outbound Connections

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-PERFORMANCE-010 | The Spring Boot service uses one connection pool for all of its services and all of its generated headless clients. A later call to the same host uses an open connection again, also after an error response. Each call names the service and the client in its User-Agent header. | P1 | LPD-113785 | `CLS-BASESERVICE`, `CLS-HTTPINVOKER` |

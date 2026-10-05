# Reliability

This area covers the technical rules that keep the browser and the Spring Boot service working when data is bad or a dependency fails. It includes how the system handles malformed data, values that it cannot fetch, startup failures, concurrent work on one record, and lists that are larger than one page.

## Failure Handling

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-RELIABILITY-001 | Stored data that is malformed shows default values. It does not stop the page or the request. | P2 | — | `MOD-SAFEJSONPARSE`, `CLS-PROPERTY`, `CLS-FINDUTIL` |
| TECH-RELIABILITY-002 | A value that the system cannot fetch is unknown, never empty. The system does not try to fetch it again during the same run. | P1 | — | `CLS-MEMOIZEDVALUE` |
| TECH-RELIABILITY-003 | A failure in a startup task is logged. It does not stop the service from starting. | P1 | — | `LSN-ORPHANEDASSIGNMENTRECONCILER-ONAPPLICATIONREADY`, `LSN-PRODUCTVERSIONSERVICE-ONAPPLICATIONREADY` |
| TECH-RELIABILITY-004 | The browser sends the GraphQL queries of one page as one request. When that request fails, the browser sends each query alone, so one bad query does not stop the others. | P1 | — | `CLIENT-GRAPHQL-GRAPHQL`, `CLIENT-HEADLESS-GRAPHQL` |

## Concurrency

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-RELIABILITY-010 | Work on one record runs one task at a time. Work on different records runs in parallel. | P1 | — | `CLS-KEYEDLOCK` |

## Bounds

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-RELIABILITY-020 | The service reads every page of a list from the headless APIs. The browser reads at most 20 pages of a list. | P1 | — | `CLS-ONEBASESERVICE`, `HOOK-USEOBJECTITEMS` |
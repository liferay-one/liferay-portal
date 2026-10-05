# Platform

This area covers the behavior that every feature of Liferay One shares rather than one of them. It includes exports and downloads, the product version list, the conventions that every list and form follows, and the privacy rules for data that the browser keeps. The technical rules that apply to every feature, such as query escaping, CSRF tokens, and failure handling, are in [`../technical/`](../technical/).

The actors are every user of the custom element and every service of the Spring Boot client extension.

Terms used in this file:

- **Quarterly version**: a DXP version named by year, quarter, and patch, for example `2025.Q4.3`.

## Exports and Downloads

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-PLATFORM-003 | A CSV export quotes every cell and doubles each quote inside a cell. The file is UTF-8 with a byte order mark, so a spreadsheet opens text in every language correctly. | P1 | — | `MOD-EXPORTTOCSV`, `CLIENT-SPRING-BOOT-ORDERS` |
| REQ-PLATFORM-004 | A downloaded file keeps the file name that the server gives it. | P2 | — | `MOD-DOWNLOADFILEUTILS`, `MOD-FILEUTILS` |

## Product Versions

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-PLATFORM-020 | The system keeps a list of released product versions from the Liferay releases feed. It refreshes the list on a schedule and at startup. When a refresh fails, the system keeps the last good list. | P1 | LPD-88254 | `CRON-SYNCPRODUCTVERSIONS`, `SVC-PRODUCTVERSIONSERVICE`, `LSN-PRODUCTVERSIONSERVICE-ONAPPLICATIONREADY` |
| REQ-PLATFORM-021 | Quarterly versions sort newest first, by year, then quarter, then patch. A quarterly version sorts above every other version. | P1 | — | `CLS-VERSIONCOMPARATOR`, `CLS-PRODUCTVERSION`, `HOOK-USEDXPPRODUCTVERSIONS` |
| REQ-PLATFORM-022 | A DXP version list shows only quarterly versions. | P1 | — | `HOOK-USEDXPPRODUCTVERSIONS` |
| REQ-PLATFORM-023 | The bundle list shows every Liferay bundle. A bundle without a download link shows no link. | P2 | — | `HOOK-USELIFERAYBUNDLES` |

## Forms and Formats

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-PLATFORM-030 | A form checks email addresses, domains, IPv4 addresses, and MAC addresses before it sends them. Each line of a multiline field is checked alone. | P1 | — | `MOD-FORMVALIDATIONUTILS`, `MOD-SCHEMAUTILS` |
| REQ-PLATFORM-031 | A missing or invalid date shows a fallback value, not an error. A typed date that does not exist on the calendar is refused. | P1 | — | `MOD-DATEUTILS` |
| REQ-PLATFORM-032 | An address shows the street, the city, the region, the postal code, and the country name in the language of the user. An empty address shows a dash. | P2 | — | `MOD-FORMATADDRESS` |
| REQ-PLATFORM-033 | A marketing form reports success or failure within 8 seconds. | P2 | — | `HOOK-USEMARKETOFORM` |

## Lists and Navigation

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-PLATFORM-040 | The filters, the page, and the page size of a list are kept in the URL, so a shared link opens the same view. A change to the page size returns the list to page 1. | P1 | — | `HOOK-LISTVIEW-USEUPDATEURLPARAMS` |
| REQ-PLATFORM-041 | A search starts 500 milliseconds after the user stops typing. A new search starts again at the first page. | P2 | — | `HOOK-USEDEBOUNCE`, `HOOK-USEINFINITESEARCH` |
| REQ-PLATFORM-042 | A destructive action asks for confirmation and runs only after the user confirms it. The confirm button is disabled while the action runs. | P1 | — | `HOOK-USECONFIRMATIONMODAL`, `HOOK-USEMODALCONTEXT` |
| REQ-PLATFORM-043 | Each account logo and each data source keeps the same color on every visit. | P2 | — | `MOD-MYACCOUNT-PROJECTS-GETLOGOCOLOR`, `MOD-MYACCOUNT-PROJECTS-GETDATASOURCECOLOR` |
| REQ-PLATFORM-044 | Links inside the custom element stay inside the current site. | P2 | — | `MOD-SITEUTILS` |

## Privacy and Analytics

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-PLATFORM-050 | Data that the browser keeps between visits uses the necessary cookie consent category unless the feature asks for another. A storage failure does not stop the page. | P1 | — | `CLIENT-LIFERAY-MARKETPLACESTORAGE`, `HOOK-USESTORAGE` |
| REQ-PLATFORM-051 | The browser sends an analytics event only when the analytics script is loaded on the page. | P2 | — | `CLIENT-LIFERAY-ANALYTICS` |

## Not Yet Built

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| REQ-PLATFORM-090 | The custom element shows labels, dates, and numbers in the language and format of the user on every page. | P1 | LPD-88263 | `FLOW-LOCALIZATION` |
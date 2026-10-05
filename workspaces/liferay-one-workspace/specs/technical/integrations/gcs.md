# Google Cloud Storage Integration

This file is the contract between Liferay One and Google Cloud Storage. It states how Liferay One stores, reads, and deletes the large files that users add to support tickets, and what it expects from the storage side. The feature rules for ticket attachments are in `support.md` (SUPPORT). This file does not repeat them.

The systems are the `liferay-one-etc-spring-boot` service, the browser of the user, and the Cloud Storage JSON API. The actors are the Google service account of Liferay One, the user who uploads or downloads a file, and the scheduled jobs of the service.

Terms used in this file:

- **Bucket**: the Cloud Storage bucket that holds the ticket attachment files.
- **Object name**: the path of one file in the bucket.
- **Session URL**: the address of a resumable upload session. The browser sends the file to it.
- **Signed URL**: a download address that carries its own short lived permission.

## Connection and Authentication

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-GCS-001 | The service calls the Cloud Storage JSON API at `https://storage.googleapis.com`. It authenticates with a Google service account. The JSON key of that account is the value of `liferay.one.gcs.service.account.key`. | P0 | LPD-90456 | `SVC-GOOGLECLOUDSTORAGESERVICE` |
| TECH-GCS-002 | For each upload start and each delete, the service gets a new OAuth2 access token with the `cloud-platform` scope. It does not keep the token between calls. | P1 | LPD-90456 | `SVC-GOOGLECLOUDSTORAGESERVICE` |

## Bucket and Object Names

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-GCS-010 | A new ticket attachment record stores the bucket name from `liferay.one.gcs.bucket.name` and the storage provider `gcs`. Each later call uses the bucket on the record. A change to the property applies only to new attachments. | P0 | LPD-90456 | `SVC-TICKETATTACHMENTSERVICE`, `CLS-TICKETATTACHMENT` |
| TECH-GCS-011 | The object name is `tickets/<ticket key>/<attachment ID>/<file name>`. The service makes the name again from the record for each call, and encodes it as one path value. TECH-SUPPORT-029 records why the name is unique. | P0 | LPD-90456 | `CLS-TICKETATTACHMENT` |

## Upload

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-GCS-020 | To start an upload, the service sends a resumable upload request to `/upload/storage/v1/b/<bucket>/o`. It gives the session URL from the Location header to the browser. The browser sends the file to that URL, so the file does not pass through the service. TECH-SUPPORT-020 records the rule. | P1 | LPD-90456 | `SVC-GOOGLECLOUDSTORAGESERVICE`, `REST-POST-TICKET-ATTACHMENTS-INITIATE-UPLOAD`, `FLOW-TICKET-UPLOAD` |
| TECH-GCS-021 | The start request carries the Origin header of the browser request. The bucket must allow the Liferay One origin in its CORS settings, or the browser cannot send the file. | P1 | LPD-90456 | `REST-POST-TICKET-ATTACHMENTS-INITIATE-UPLOAD` |
| TECH-GCS-022 | When the browser already has a session URL, the service returns that URL and does not start a new session. The browser asks storage for the last byte that it received, and continues from there. TECH-SUPPORT-023 states the part size and the retries. | P1 | LPD-90456 | `REST-POST-TICKET-ATTACHMENTS-INITIATE-UPLOAD`, `HOOK-TICKETATTACHMENTS-USEGCSGETUPLOADOFFSET`, `HOOK-TICKETATTACHMENTS-USEGCSUPLOADFILE` |
| TECH-GCS-023 | When the start request fails, gets a server error, or gets no Location header, the service answers with status 503 and the code `FILE_SERVER_UNAVAILABLE`. | P1 | LPD-90456 | `SVC-GOOGLECLOUDSTORAGESERVICE`, `REST-POST-TICKET-ATTACHMENTS-INITIATE-UPLOAD` |
| TECH-GCS-024 | The browser computes the MD5 checksum of the file. The service uses it only to find an earlier draft attachment for the same file and ticket. The service does not send the checksum to storage, and storage does not check it. | P1 | LPD-90456 | `MOD-TICKETATTACHMENTS-GENERATEFILEMD5`, `SVC-TICKETATTACHMENTSERVICE` |

## Download

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-GCS-030 | For a download, the service signs a V4 URL for the object that expires after 15 minutes. It signs with the key of the service account and does not call storage. TECH-SUPPORT-030 records the rule. | P0 | LPD-90456 | `SVC-GOOGLECLOUDSTORAGESERVICE`, `REST-GET-TICKET-ATTACHMENTS-BY-ID-ID-DOWNLOAD`, `FLOW-TICKET-DOWNLOAD` |
| TECH-GCS-031 | Signing does not confirm that the object exists. The browser gets a missing object error from storage when it opens the URL. A storage error with code 500 or 503 gives `FILE_SERVER_UNAVAILABLE`, and code 404 gives `FILE_NOT_FOUND_IN_STORAGE`. | P2 | LPD-90456 | `SVC-GOOGLECLOUDSTORAGESERVICE`, `REST-GET-TICKET-ATTACHMENTS-BY-ID-ID-DOWNLOAD` |

## Delete

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-GCS-040 | The service deletes a file with a delete request to `/storage/v1/b/<bucket>/o/<object>`. Every failure, also a 404 for a file that is already gone, gives `FILE_SERVER_UNAVAILABLE`. | P1 | LPD-90456 | `SVC-GOOGLECLOUDSTORAGESERVICE` |
| TECH-GCS-041 | A user delete and the hourly trash job delete the file first and the record second. When storage fails, the record stays in the trash and the next hourly run tries again. The job emails the support team about each failure. TECH-SUPPORT-033 and TECH-SUPPORT-042 state the rule. | P1 | LPD-90456 | `REST-DELETE-TICKET-ATTACHMENTS-TICKETATTACHMENTID`, `CRON-SCHEDULEDDELETETICKETATTACHMENT` |
| TECH-GCS-042 | The retention job deletes the record first and the file second. When the storage delete fails, the job stops. No record remains, so nothing tries the delete again. | P0 | LPD-90456 | `CRON-SCHEDULEDCLEANUP`, `FLOW-TICKET-ATTACHMENT-RETENTION` |

## Not Yet Built

| ID | Requirement | Priority | Tickets | Verified By |
| --- | --- | --- | --- | --- |
| TECH-GCS-090 | A delete of a file that storage does not have succeeds. Today it fails, so the record stays in the trash and the job emails the support team each hour. | P1 | — | `CRON-SCHEDULEDDELETETICKETATTACHMENT` |
| TECH-GCS-091 | The retention job deletes the file before the record, and continues with the next attachment after a failure. | P0 | — | `CRON-SCHEDULEDCLEANUP` |
| TECH-GCS-092 | Each storage call stops after a fixed time limit. Today the upload start and the delete set no response timeout. | P2 | — | — |
# Crons

Every scheduled background task in liferay-one-etc-spring-boot. A unit test at the handler level (JUnit + Mockito) covers each task, including idempotency. The plan tracks real integration coverage as journeys in flows.md.

> Autoscaffolded from the code surface (14 items). Edit the Requirement, Type, Priority, and Status columns freely. `scaffoldPlan` preserves them on rerun. Do not edit the ID column. When the code anchor of a row changes, edit its Source column so that the row keeps its ID.

| ID | Requirement | Type | Priority | Status | Source |
| --- | --- | --- | --- | --- | --- |
| CRON-COMPLETESETTLEDORDERS | Sweeps pending and processing orders whose payment already settled and completes each one; a per-order failure is logged and the sweep continues; idempotent on re-run | unit | P0 | planned | cron:completeSettledOrders |
| CRON-RECONCILEENTITLEMENTDEFINITIONS | Regenerates entitlement definitions for every approved catalog product; the compare-and-set guard skips a run while one is in flight and a per-product failure is logged without aborting the pass | unit | P0 | planned | cron:reconcileEntitlementDefinitions |
| CRON-RECONCILEORPHANEDASSIGNMENTS | Removes JSM assignment asset objects whose referenced Liferay entity is gone; the compare-and-set guard skips a concurrent run and the in-progress flag is released even when reconciliation throws | unit | P1 | planned | cron:reconcileOrphanedAssignments |
| CRON-SCHEDULEDASSETOBJECTSCACHEEVICTION | Scheduled task runs correctly and is idempotent: scheduledAssetObjectsCacheEviction | unit | P1 | planned | cron:scheduledAssetObjectsCacheEviction |
| CRON-SCHEDULEDCLEANUP | Scheduled task runs correctly and is idempotent: scheduledCleanUp | unit | P1 | planned | cron:scheduledCleanUp |
| CRON-SCHEDULEDDELETETICKETATTACHMENT | Scheduled task runs correctly and is idempotent: scheduledDeleteTicketAttachment | unit | P1 | planned | cron:scheduledDeleteTicketAttachment |
| CRON-SCHEDULEDGENERATEUSAGEREPORTS | Scheduled task runs correctly and is idempotent: scheduledGenerateUsageReports | unit | P1 | planned | cron:scheduledGenerateUsageReports |
| CRON-SCHEDULEDPROCESSTRIALS | Drives the trial lifecycle each run: expires and notifies in-progress trials, then provisions on-hold trials as seats free; a failure in one phase is logged and the other still runs; idempotent on re-run (E04/E05, LPD-88274; E07, LPD-88259) | unit | P1 | planned | cron:scheduledProcessTrials |
| CRON-SCHEDULEDSENDEXPIRINGLICENSEKEYEMAILS | Scheduled task runs correctly and is idempotent: scheduledSendExpiringLicenseKeyEmails | unit | P1 | planned | cron:scheduledSendExpiringLicenseKeyEmails |
| CRON-SCHEDULEDUPDATETICKETATTACHMENTDRAFTCOMMENTBODY | Scheduled task runs correctly and is idempotent: scheduledUpdateTicketAttachmentDraftCommentBody | unit | P1 | planned | cron:scheduledUpdateTicketAttachmentDraftCommentBody |
| CRON-SYNCACCOUNTROLES | Mirrors every account role to JSM on the schedule and at application-ready; a per-role failure is logged and the loop continues; idempotent re-sync (E15, LPD-88258) | unit | P1 | planned | cron:syncAccountRoles |
| CRON-SYNCORGANIZATIONROLES | Mirrors every organization role to JSM on the schedule and at application-ready; a per-role failure is logged and the loop continues; idempotent re-sync (E15, LPD-88258) | unit | P1 | planned | cron:syncOrganizationRoles |
| CRON-SYNCPRODUCTVERSIONS | Refreshes the product version cache from the releases feed on the schedule and at application-ready; an HTTP or parse failure is logged without clobbering the last good cache (E11, LPD-88254) | unit | P2 | planned | cron:syncProductVersions |
| CRON-SYNCTEAMROLES | Keeps the first-line support team role asset object resolved, recreating it under the named lock when the lookup comes back null, and caches the resulting object id | unit | P1 | planned | cron:syncTeamRoles |
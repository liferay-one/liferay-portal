# Listeners

Every `@EventListener` method in liferay-one-etc-spring-boot. These methods run once when the application is ready, outside any request, so a failure shows only in the startup log. A JUnit + Mockito unit test calls the method directly and proves that it does its work and that a failure is logged without stopping the application.

> Autoscaffolded from the code surface (6 items). Edit the Requirement, Type, Priority, and Status columns freely. `scaffoldPlan` preserves them on rerun. Do not edit the ID column. When the code anchor of a row changes, edit its Source column so that the row keeps its ID.

| ID | Requirement | Type | Priority | Status | Source |
| --- | --- | --- | --- | --- | --- |
| LSN-ACCOUNTROLESYNCHRONIZER-ONAPPLICATIONREADY | Async startup hook that runs the full account role sync once; any exception is caught and logged with the unable to sync on startup message so application startup is not affected | unit | P1 | planned | listener:AccountRoleSynchronizer#onApplicationReady |
| LSN-COMMERCEORDERSERVICE-ONAPPLICATIONREADY | Async startup hook that runs completeSettledOrders to finish orders whose payment settled before the restart; any exception is caught and logged and does not stop startup | unit | P1 | planned | listener:CommerceOrderService#onApplicationReady |
| LSN-ORGANIZATIONROLESYNCHRONIZER-ONAPPLICATIONREADY | Async startup hook that runs the full organization role sync once; any exception is caught and logged with the unable to sync on startup message so application startup is not affected | unit | P1 | planned | listener:OrganizationRoleSynchronizer#onApplicationReady |
| LSN-ORPHANEDASSIGNMENTRECONCILER-ONAPPLICATIONREADY | Async startup hook that runs one orphaned assignment reconciliation, honoring the in progress guard; any exception is caught and logged and does not stop startup | unit | P1 | planned | listener:OrphanedAssignmentReconciler#onApplicationReady |
| LSN-PRODUCTVERSIONSERVICE-ONAPPLICATIONREADY | Startup hook (synchronous, not async) that fetches the product versions from the releases URL once to warm the cache; any exception is caught and logged and does not stop startup | unit | P1 | planned | listener:ProductVersionService#onApplicationReady |
| LSN-TEAMROLESYNCHRONIZER-ONAPPLICATIONREADY | Async startup hook that resolves or creates the first line support team role asset and caches its object ID; any exception is caught and logged and does not stop startup | unit | P1 | planned | listener:TeamRoleSynchronizer#onApplicationReady |

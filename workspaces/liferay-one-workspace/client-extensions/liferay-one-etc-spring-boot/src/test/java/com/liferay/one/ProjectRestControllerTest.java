/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.ProductSpecification;
import com.liferay.one.constants.ProductSpecificationConstants;
import com.liferay.one.constants.PropertyConstants;
import com.liferay.one.constants.RoleConstants;
import com.liferay.one.exception.DataOpsUnavailableException;
import com.liferay.one.exception.InvalidUsageParameterException;
import com.liferay.one.exception.InvalidUsageProductException;
import com.liferay.one.exception.ProjectNotFoundException;
import com.liferay.one.jira.service.AccountAssetService;
import com.liferay.one.jira.synchronizer.AccountSynchronizer;
import com.liferay.one.model.BaseUsageStrategy;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.ExperienceUsageStrategy;
import com.liferay.one.model.LDPEventUsageStrategy;
import com.liferay.one.model.LDPUsageStrategy;
import com.liferay.one.model.Project;
import com.liferay.one.model.ProjectMembership;
import com.liferay.one.model.UsageDefinition;
import com.liferay.one.permission.ProjectPermission;
import com.liferay.one.service.CommerceProductService;
import com.liferay.one.service.CommerceSkuService;
import com.liferay.one.service.DataOpsUsageService;
import com.liferay.one.service.EntitlementService;
import com.liferay.one.service.ProjectMembershipService;
import com.liferay.one.service.ProjectService;
import com.liferay.one.service.PropertyService;
import com.liferay.one.service.UsageDefinitionService;
import com.liferay.one.service.UserAccountService;
import com.liferay.one.service.UserAssignmentService;
import com.liferay.portal.kernel.security.auth.PrincipalException;
import com.liferay.portal.kernel.security.permission.ActionKeys;

import java.util.Arrays;
import java.util.Map;
import java.util.Set;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.InOrder;
import org.mockito.Mockito;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

/**
 * @author Felipe Veloso
 */
public class ProjectRestControllerTest {

	@BeforeEach
	public void setUp() throws Exception {
		_projectRestController = new ProjectRestController();

		ReflectionTestUtils.setField(
			_projectRestController, "_accountAssetService",
			_accountAssetService);
		ReflectionTestUtils.setField(
			_projectRestController, "_accountSynchronizer",
			_accountSynchronizer);
		ReflectionTestUtils.setField(
			_projectRestController, "_commerceProductService",
			_commerceProductService);
		ReflectionTestUtils.setField(
			_projectRestController, "_commerceSkuService", _commerceSkuService);
		ReflectionTestUtils.setField(
			_projectRestController, "_dataOpsUsageService",
			_dataOpsUsageService);
		ReflectionTestUtils.setField(
			_projectRestController, "_entitlementService", _entitlementService);
		ReflectionTestUtils.setField(
			_projectRestController, "_projectMembershipService",
			_projectMembershipService);
		ReflectionTestUtils.setField(
			_projectRestController, "_projectPermission", _projectPermission);
		ReflectionTestUtils.setField(
			_projectRestController, "_projectService", _projectService);
		ReflectionTestUtils.setField(
			_projectRestController, "_propertyService", _propertyService);
		ReflectionTestUtils.setField(
			_projectRestController, "_usageDefinitionService",
			_usageDefinitionService);
		ReflectionTestUtils.setField(
			_projectRestController, "_userAccountService", _userAccountService);
		ReflectionTestUtils.setField(
			_projectRestController, "_userAssignmentService",
			_userAssignmentService);

		Mockito.when(
			_projectService.fetchProject(_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			_createProject()
		);

		Mockito.when(
			_usageDefinitionService.fetchUsageDefinition(Mockito.anyString())
		).thenReturn(
			new UsageDefinition(
				new JSONObject(
				).put(
					"id", 4L
				).put(
					"overageBucketSize", 200000
				))
		);

		_setUpUtilizationProfile(_UTILIZATION_PROFILE_EXPERIENCE_DASHBOARD);
	}

	@Test
	public void testDeleteProjectMembershipsChecksPermissionBeforeUnassigning()
		throws Exception {

		_deleteProjectMemberships();

		InOrder inOrder = Mockito.inOrder(
			_projectPermission, _userAssignmentService);

		inOrder.verify(
			_projectPermission
		).check(
			ActionKeys.ASSIGN_MEMBERS, null, _PROJECT_EXTERNAL_REFERENCE_CODE
		);

		inOrder.verify(
			_userAssignmentService
		).unassignProjectRole(
			Mockito.argThat(
				project -> _PROJECT_EXTERNAL_REFERENCE_CODE.equals(
					project.getExternalReferenceCode())),
			Mockito.eq(RoleConstants.ERC_PROJECT_ADMIN), Mockito.eq(_USER_ID)
		);
	}

	@Test
	public void testDeleteProjectMembershipsDoesNotUnassignWhenPermissionIsDenied()
		throws Exception {

		_denyAssignMembersPermission();

		Assertions.assertThrows(
			PrincipalException.class, this::_deleteProjectMemberships);

		Mockito.verifyNoInteractions(_userAssignmentService);
	}

	@Test
	public void testGetJiraObjectKeyChecksViewPermission() throws Exception {
		_denyProjectPermission(ActionKeys.VIEW);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _projectRestController.getJiraObjectKey(
				null, _PROJECT_EXTERNAL_REFERENCE_CODE));

		Mockito.verifyNoInteractions(_accountAssetService);
	}

	@Test
	public void testGetJiraObjectKeyReturnsTheObjectKey() throws Exception {
		Mockito.when(
			_accountAssetService.getAccountObjectKey(
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			"CSA-1234"
		);

		ResponseEntity<String> responseEntity =
			_projectRestController.getJiraObjectKey(
				null, _PROJECT_EXTERNAL_REFERENCE_CODE);

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());
		Assertions.assertEquals("CSA-1234", responseEntity.getBody());

		Mockito.verify(
			_projectPermission
		).check(
			ActionKeys.VIEW, null, _PROJECT_EXTERNAL_REFERENCE_CODE
		);
	}

	@Test
	public void testGetUsageChecksPermissionBeforeReadingUsage()
		throws Exception {

		_setUpEntitlements();

		_setUpComposableUsage();

		_getUsage();

		InOrder inOrder = Mockito.inOrder(_projectPermission, _projectService);

		inOrder.verify(
			_projectPermission
		).check(
			ActionKeys.VIEW, null, _PROJECT_EXTERNAL_REFERENCE_CODE
		);

		inOrder.verify(
			_projectService
		).fetchProject(
			_PROJECT_EXTERNAL_REFERENCE_CODE
		);
	}

	@Test
	public void testGetUsageDoesNotReadUsageWhenPermissionIsDenied()
		throws Exception {

		Mockito.doThrow(
			new PrincipalException()
		).when(
			_projectPermission
		).check(
			ActionKeys.VIEW, null, _PROJECT_EXTERNAL_REFERENCE_CODE
		);

		Assertions.assertThrows(PrincipalException.class, this::_getUsage);

		Mockito.verifyNoInteractions(_dataOpsUsageService);
	}

	@Test
	public void testGetUsageEventHistoryForwardsTheRequestedDatesUnchanged()
		throws Exception {

		_setUpEntitlements(_createEntitlement(1, null, "events", 1000000.0));

		_getUsageEventHistory(_END_DATE, "month", _START_DATE_PREVIOUS_MONTH);

		Mockito.verify(
			_dataOpsUsageService
		).fetchLDPProjectEventHistory(
			_END_DATE, "month", _PROJECT_EXTERNAL_REFERENCE_CODE,
			_START_DATE_PREVIOUS_MONTH
		);
	}

	@Test
	public void testGetUsageEventHistoryRejectsInvalidGranularity()
		throws Exception {

		Assertions.assertThrows(
			InvalidUsageParameterException.class,
			() -> _getUsageEventHistory(
				_END_DATE, "week", _START_DATE_PREVIOUS_MONTH));

		Mockito.verifyNoInteractions(_dataOpsUsageService);
	}

	@Test
	public void testGetUsageEventHistoryRejectsRangeAboveMaximum()
		throws Exception {

		Assertions.assertThrows(
			InvalidUsageParameterException.class,
			() -> _getUsageEventHistory("2027-07-28", "day", "2026-06-01"));

		Assertions.assertThrows(
			InvalidUsageParameterException.class,
			() -> _getUsageEventHistory("2036-07-28", "month", "2026-06-01"));

		Mockito.verifyNoInteractions(_dataOpsUsageService);
	}

	@Test
	public void testGetUsageEventHistoryRejectsUnknownProject()
		throws Exception {

		Assertions.assertThrows(
			ProjectNotFoundException.class,
			() -> _projectRestController.getUsageEventHistory(
				null, _PROJECT_EXTERNAL_REFERENCE_CODE_UNKNOWN, _END_DATE,
				"month", _START_DATE_PREVIOUS_MONTH));

		Mockito.verifyNoInteractions(_dataOpsUsageService);
	}

	@Test
	public void testGetUsageEventHistoryReturnsHistoryWithTotals()
		throws Exception {

		_setUpEntitlements(_createEntitlement(1, null, "events", 1000000.0));

		Mockito.when(
			_dataOpsUsageService.fetchLDPProjectEventHistory(
				_END_DATE, "month", _PROJECT_EXTERNAL_REFERENCE_CODE,
				_START_DATE_PREVIOUS_MONTH)
		).thenReturn(
			_createLDPEventHistory()
		);

		ResponseEntity<String> responseEntity = _getUsageEventHistory(
			_END_DATE, "month", _START_DATE_PREVIOUS_MONTH);

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		Assertions.assertEquals(
			1158,
			jsonObject.getBigDecimal(
				"usedCount"
			).intValue());
		Assertions.assertEquals(
			1000000,
			jsonObject.getBigDecimal(
				"maxCount"
			).intValue());

		JSONArray eventHistoryJSONArray = jsonObject.getJSONArray(
			LDPEventUsageStrategy.FIELD_EVENT_HISTORY);

		Assertions.assertEquals(2, eventHistoryJSONArray.length());

		Assertions.assertFalse(
			jsonObject.has(LDPEventUsageStrategy.FIELD_EVENT_SUMMARY));
	}

	@Test
	public void testGetUsageEventSummaryAcceptsARangeOfExactlyOneDay()
		throws Exception {

		_setUpEntitlements(_createEntitlement(1, null, "events", 1000000.0));

		_getUsageEventSummary(_END_DATE, _END_DATE);

		// An end date the range treats as exclusive would leave a single day
		// empty, so the same date on both sides has to be a valid request.

		Mockito.verify(
			_dataOpsUsageService
		).fetchLDPProjectEventSummary(
			_END_DATE, _PROJECT_EXTERNAL_REFERENCE_CODE, _END_DATE
		);
	}

	@Test
	public void testGetUsageEventSummaryAcceptsTheMaximumRange()
		throws Exception {

		_setUpEntitlements(_createEntitlement(1, null, "events", 1000000.0));

		// Ten years to the day is the documented limit, so the bound itself is
		// allowed and only the day after it is rejected.

		_getUsageEventSummary("2036-06-01", _START_DATE_PREVIOUS_MONTH);

		Mockito.verify(
			_dataOpsUsageService
		).fetchLDPProjectEventSummary(
			"2036-06-01", _PROJECT_EXTERNAL_REFERENCE_CODE,
			_START_DATE_PREVIOUS_MONTH
		);

		Assertions.assertThrows(
			InvalidUsageParameterException.class,
			() -> _getUsageEventSummary(
				"2036-06-02", _START_DATE_PREVIOUS_MONTH));
	}

	@Test
	public void testGetUsageEventSummaryChecksPermissionBeforeReadingUsage()
		throws Exception {

		Mockito.doThrow(
			new PrincipalException()
		).when(
			_projectPermission
		).check(
			ActionKeys.VIEW, null, _PROJECT_EXTERNAL_REFERENCE_CODE
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _getUsageEventSummary(_END_DATE, _START_DATE_PREVIOUS_MONTH));

		Mockito.verifyNoInteractions(_dataOpsUsageService);
	}

	@Test
	public void testGetUsageEventSummaryCountsAddOnBucketsOfAProductWithoutAProfile()
		throws Exception {

		_setUpEntitlements(
			_createEntitlement(1, null, "events", 1000000.0),
			_createEntitlement(
				2, null, "events-add-on-bucket", 2.0,
				_SKU_EXTERNAL_REFERENCE_CODE_ADD_ON, null));

		_setUpLDPEventSummary();

		ResponseEntity<String> responseEntity = _getUsageEventSummary(
			_END_DATE, _START_DATE_PREVIOUS_MONTH);

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		Assertions.assertEquals(
			2,
			jsonObject.getBigDecimal(
				"addOnBucketCount"
			).intValue());
		Assertions.assertEquals(
			1400000,
			jsonObject.getBigDecimal(
				"maxCount"
			).intValue());
	}

	@Test
	public void testGetUsageEventSummaryRejectsInvalidDate() throws Exception {
		Assertions.assertThrows(
			InvalidUsageParameterException.class,
			() -> _getUsageEventSummary(_END_DATE, "06/01/2026"));

		Mockito.verifyNoInteractions(_dataOpsUsageService);
	}

	@Test
	public void testGetUsageEventSummaryRejectsRangeAboveMaximum()
		throws Exception {

		Assertions.assertThrows(
			InvalidUsageParameterException.class,
			() -> _getUsageEventSummary("2036-07-28", "2026-06-01"));

		Mockito.verifyNoInteractions(_dataOpsUsageService);
	}

	@Test
	public void testGetUsageEventSummaryRejectsStartDateAfterEndDate()
		throws Exception {

		Assertions.assertThrows(
			InvalidUsageParameterException.class,
			() -> _getUsageEventSummary(_START_DATE_PREVIOUS_MONTH, _END_DATE));

		Mockito.verifyNoInteractions(_dataOpsUsageService);
	}

	@Test
	public void testGetUsageEventSummaryRejectsUnknownProject()
		throws Exception {

		Assertions.assertThrows(
			ProjectNotFoundException.class,
			() -> _projectRestController.getUsageEventSummary(
				null, _PROJECT_EXTERNAL_REFERENCE_CODE_UNKNOWN, _END_DATE,
				_START_DATE_PREVIOUS_MONTH));

		Mockito.verifyNoInteractions(_dataOpsUsageService);
	}

	@Test
	public void testGetUsageEventSummaryReturnsEntitlementsWhenDataOpsIsUnavailable()
		throws Exception {

		_setUpEntitlements(_createEntitlement(1, null, "events", 1000000.0));

		Mockito.when(
			_dataOpsUsageService.fetchLDPProjectEventSummary(
				_END_DATE, _PROJECT_EXTERNAL_REFERENCE_CODE,
				_START_DATE_PREVIOUS_MONTH)
		).thenThrow(
			new DataOpsUnavailableException()
		);

		ResponseEntity<String> responseEntity = _getUsageEventSummary(
			_END_DATE, _START_DATE_PREVIOUS_MONTH);

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		Assertions.assertEquals(
			1000000,
			jsonObject.getBigDecimal(
				"maxCount"
			).intValue());
		Assertions.assertFalse(jsonObject.has("usedCount"));
		Assertions.assertFalse(jsonObject.getBoolean("usageDataAvailable"));
	}

	@Test
	public void testGetUsageEventSummaryReturnsEntitlementsWhenDataOpsReturnsNull()
		throws Exception {

		_setUpEntitlements(_createEntitlement(1, null, "events", 1000000.0));

		ResponseEntity<String> responseEntity = _getUsageEventSummary(
			_END_DATE, _START_DATE_PREVIOUS_MONTH);

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		Assertions.assertEquals(
			1000000,
			jsonObject.getBigDecimal(
				"maxCount"
			).intValue());
		Assertions.assertFalse(jsonObject.has("usedCount"));
		Assertions.assertFalse(
			jsonObject.has(LDPEventUsageStrategy.FIELD_EVENT_SUMMARY));
		Assertions.assertFalse(jsonObject.getBoolean("usageDataAvailable"));
	}

	@Test
	public void testGetUsageEventSummaryReturnsSummaryWithAddOnBuckets()
		throws Exception {

		_setUpEntitlements(
			_createEntitlement(1, null, "events", 1000000.0),
			_createEntitlement(2, null, "events-add-on-bucket", 2.0));

		_setUpLDPEventSummary();

		ResponseEntity<String> responseEntity = _getUsageEventSummary(
			_END_DATE, _START_DATE_PREVIOUS_MONTH);

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		Assertions.assertEquals(
			2,
			jsonObject.getBigDecimal(
				"addOnBucketCount"
			).intValue());
		Assertions.assertEquals(
			1000000,
			jsonObject.getBigDecimal(
				"baseAllotment"
			).intValue());
		Assertions.assertEquals(
			1400000,
			jsonObject.getBigDecimal(
				"maxCount"
			).intValue());
		Assertions.assertEquals(
			579,
			jsonObject.getBigDecimal(
				"usedCount"
			).intValue());

		JSONArray eventSummaryJSONArray = jsonObject.getJSONArray(
			LDPEventUsageStrategy.FIELD_EVENT_SUMMARY);

		Assertions.assertEquals(2, eventSummaryJSONArray.length());

		JSONObject eventSummaryJSONObject = eventSummaryJSONArray.getJSONObject(
			0);

		Assertions.assertEquals(
			"Liferay", eventSummaryJSONObject.getString("dataSourceName"));
	}

	@Test
	public void testGetUsageEventSummaryTreatsUnlimitedBucketsAsNegativeMaxCount()
		throws Exception {

		_setUpEntitlements(
			_createEntitlement(1, null, "events", 1000000.0),
			_createEntitlement(2, "unlimited", "events-add-on-bucket", null));

		_setUpLDPEventSummary();

		ResponseEntity<String> responseEntity = _getUsageEventSummary(
			_END_DATE, _START_DATE_PREVIOUS_MONTH);

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		Assertions.assertEquals(
			-1,
			jsonObject.getBigDecimal(
				"maxCount"
			).intValue());
	}

	@Test
	public void testGetUsageEventSummaryTreatsUnlimitedEventsAsNegativeMaxCount()
		throws Exception {

		_setUpEntitlements(
			_createEntitlement(1, "unlimited", "events", null),
			_createEntitlement(2, null, "events-add-on-bucket", 2.0));

		_setUpLDPEventSummary();

		ResponseEntity<String> responseEntity = _getUsageEventSummary(
			_END_DATE, _START_DATE_PREVIOUS_MONTH);

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		Assertions.assertEquals(
			-1,
			jsonObject.getBigDecimal(
				"maxCount"
			).intValue());
	}

	@Test
	public void testGetUsageExperienceProfileExcludesEntitlementsOfAnotherDashboard()
		throws Exception {

		Mockito.when(
			_commerceSkuService.fetchProductId(
				_SKU_EXTERNAL_REFERENCE_CODE_SAAS)
		).thenReturn(
			_PRODUCT_ID_SAAS
		);

		Mockito.when(
			_commerceProductService.fetchProduct(_PRODUCT_ID_SAAS)
		).thenReturn(
			_createProduct(_UTILIZATION_PROFILE_SAAS_PLAN_DASHBOARD)
		);

		_setUpEntitlements(
			_createEntitlement(1, null, "logs", 300.0),
			_createEntitlement(
				2, null, "logs", 900.0, _SKU_EXTERNAL_REFERENCE_CODE_SAAS,
				null));

		_setUpComposableUsage();

		JSONObject metricsJSONObject = _getMetricsJSONObject(
			_UTILIZATION_PROFILE_EXPERIENCE_DASHBOARD);

		JSONObject logStorageJSONObject = metricsJSONObject.getJSONObject(
			ExperienceUsageStrategy.METRIC_LOG_STORAGE);

		Assertions.assertEquals(
			300,
			logStorageJSONObject.getBigDecimal(
				"maxCount"
			).intValue());
	}

	@Test
	public void testGetUsageExperienceProfileReturnsExperienceMetrics()
		throws Exception {

		_setUpEntitlements(
			_createEntitlement(1, null, "extensions-vcpus", 3.0),
			_createEntitlement(2, null, "logs", 300.0));

		_setUpComposableUsage();

		JSONObject metricsJSONObject = _getMetricsJSONObject(
			_UTILIZATION_PROFILE_EXPERIENCE_DASHBOARD);

		Assertions.assertEquals(
			Set.of(
				"clientExtensionsCPU", "clientExtensionsRAM", "databaseStorage",
				"documentLibraryAndBackupStorage", "logStorage",
				"networkTraffic"),
			metricsJSONObject.keySet());

		JSONObject logStorageJSONObject = metricsJSONObject.getJSONObject(
			ExperienceUsageStrategy.METRIC_LOG_STORAGE);

		Assertions.assertEquals(
			300,
			logStorageJSONObject.getBigDecimal(
				"maxCount"
			).intValue());
		Assertions.assertEquals(
			BaseUsageStrategy.UNIT_GIB,
			logStorageJSONObject.get("maxCountUnits"));
	}

	@Test
	public void testGetUsageLDPProfileIgnoresEntitlementsItDoesNotRead()
		throws Exception {

		_setUpEntitlements(
			_createEntitlement(1, null, "api-requests", 500000.0),
			_createEntitlement(2, null, "logs", 300.0),
			_createEntitlement(3, null, "sites", 5.0),
			_createEntitlement(4, null, "vcpu", 16.0));

		_setUpLDPUsage();

		JSONObject metricsJSONObject = _getMetricsJSONObject(
			_UTILIZATION_PROFILE_USAGE_METRICS);

		JSONObject apiRequestsJSONObject = metricsJSONObject.getJSONObject(
			LDPUsageStrategy.METRIC_API_REQUESTS);

		Assertions.assertEquals(
			500000,
			apiRequestsJSONObject.getBigDecimal(
				"maxCount"
			).intValue());

		for (String metricName :
				Arrays.asList(
					LDPUsageStrategy.METRIC_ACTIVE_BATCH_SEGMENTS,
					LDPUsageStrategy.METRIC_ACTIVE_REAL_TIME_SEGMENTS,
					LDPUsageStrategy.METRIC_CONNECTORS)) {

			JSONObject metricJSONObject = metricsJSONObject.getJSONObject(
				metricName);

			Assertions.assertEquals(
				0,
				metricJSONObject.getBigDecimal(
					"maxCount"
				).intValue(),
				metricName);
		}
	}

	@Test
	public void testGetUsageLDPProfileReadsUsageByProject() throws Exception {
		_setUpEntitlements();

		_setUpLDPUsage();

		_getMetricsJSONObject(_UTILIZATION_PROFILE_USAGE_METRICS);

		Mockito.verify(
			_dataOpsUsageService
		).fetchLDPProjectUsage(
			_PROJECT_EXTERNAL_REFERENCE_CODE
		);
	}

	@Test
	public void testGetUsageLDPProfileReturnsLDPMetrics() throws Exception {
		_setUpEntitlements(
			_createEntitlement(1, null, "api-requests", 500000.0),
			_createEntitlement(2, null, "connectors", 10.0));

		_setUpLDPUsage();

		JSONObject metricsJSONObject = _getMetricsJSONObject(
			_UTILIZATION_PROFILE_USAGE_METRICS);

		Assertions.assertEquals(
			Set.of(
				"activeBatchSegments", "activeRealTimeSegments", "apiRequests",
				"connectors"),
			metricsJSONObject.keySet());

		JSONObject apiRequestsJSONObject = metricsJSONObject.getJSONObject(
			LDPUsageStrategy.METRIC_API_REQUESTS);

		Assertions.assertEquals(
			213123,
			apiRequestsJSONObject.getBigDecimal(
				"usedCount"
			).intValue());
		Assertions.assertEquals(
			500000,
			apiRequestsJSONObject.getBigDecimal(
				"maxCount"
			).intValue());

		JSONObject activeBatchSegmentsJSONObject =
			metricsJSONObject.getJSONObject(
				LDPUsageStrategy.METRIC_ACTIVE_BATCH_SEGMENTS);

		Assertions.assertEquals(
			23423,
			activeBatchSegmentsJSONObject.getBigDecimal(
				"usedCount"
			).intValue());
	}

	@Test
	public void testGetUsageProfileSelectsMetricSetNotEntitlements()
		throws Exception {

		_setUpEntitlements(
			_createEntitlement(1, null, "extensions-vcpus", 3.0),
			_createEntitlement(2, null, "logs", 300.0));

		_setUpCustomerUsage();

		JSONObject metricsJSONObject = _getMetricsJSONObject(
			_UTILIZATION_PROFILE_SAAS_PLAN_DASHBOARD);

		Assertions.assertEquals(
			Set.of(
				"anonymousPageViews", "clientExtensionsCapacityCPU",
				"clientExtensionsCapacityRAM", "monthlyActiveLoggedInUsers",
				"sites", "storageCapacityDocumentLibrary"),
			metricsJSONObject.keySet());
	}

	@Test
	public void testGetUsageRejectsMissingProduct() throws Exception {
		Assertions.assertThrows(
			InvalidUsageProductException.class,
			() -> _projectRestController.getUsage(
				null, _PROJECT_EXTERNAL_REFERENCE_CODE, null));
	}

	@Test
	public void testGetUsageRejectsProductWithoutUsageDashboard()
		throws Exception {

		_setUpUtilizationProfile("legacy");

		Assertions.assertThrows(
			InvalidUsageProductException.class, this::_getUsage);

		Mockito.verifyNoInteractions(_dataOpsUsageService);
	}

	@Test
	public void testGetUsageRejectsProductWithoutUtilizationProfile()
		throws Exception {

		_setUpUtilizationProfile(null);

		Assertions.assertThrows(
			InvalidUsageProductException.class, this::_getUsage);

		Mockito.verifyNoInteractions(_dataOpsUsageService);
	}

	@Test
	public void testGetUsageRejectsUnknownProduct() throws Exception {
		Mockito.when(
			_commerceProductService.fetchProduct(
				_PRODUCT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			null
		);

		Assertions.assertThrows(
			InvalidUsageProductException.class, this::_getUsage);

		Mockito.verifyNoInteractions(_dataOpsUsageService);
	}

	@Test
	public void testGetUsageRejectsUnknownProject() throws Exception {
		Mockito.when(
			_projectService.fetchProject(_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			null
		);

		Assertions.assertThrows(
			ProjectNotFoundException.class, this::_getUsage);
	}

	@Test
	public void testGetUsageRendersEmDashLimitsWithoutEntitlements()
		throws Exception {

		_setUpEntitlements();

		_setUpComposableUsage();

		JSONObject metricsJSONObject = _getMetricsJSONObject(
			_UTILIZATION_PROFILE_EXPERIENCE_DASHBOARD);

		JSONObject logStorageJSONObject = metricsJSONObject.getJSONObject(
			ExperienceUsageStrategy.METRIC_LOG_STORAGE);

		Assertions.assertEquals(
			0,
			logStorageJSONObject.getBigDecimal(
				"maxCount"
			).intValue());
		Assertions.assertEquals("0", logStorageJSONObject.get("percentage"));

		Assertions.assertEquals(
			4,
			logStorageJSONObject.getBigDecimal(
				"usedCount"
			).intValue());
	}

	@Test
	public void testGetUsageReportsPercentageAboveOneHundredOnOverage()
		throws Exception {

		_setUpEntitlements(_createEntitlement(1, null, "sites", 1.0));

		_setUpUtilizationProfile(_UTILIZATION_PROFILE_SAAS_PLAN_DASHBOARD);

		_setUpCustomerUsage();

		JSONObject sitesJSONObject = _getMetricsJSONObject().getJSONObject(
			"sites");

		Assertions.assertEquals("300.0000", sitesJSONObject.get("percentage"));
	}

	@Test
	public void testGetUsageResolvesAccountKeyFromExternalReferenceCode()
		throws Exception {

		_setUpEntitlements(_createEntitlement(1, null, "logs", 300.0));

		_getUsage();

		Mockito.verify(
			_dataOpsUsageService
		).fetchComposableAccountUsage(
			Mockito.eq(_ACCOUNT_EXTERNAL_REFERENCE_CODE),
			Mockito.matches("\\d{4}-\\d{2}")
		);
	}

	@Test
	public void testGetUsageResolvesAccountKeyFromOwnAccount()
		throws Exception {

		_setUpEntitlements(_createEntitlement(1, null, "logs", 300.0));

		Mockito.when(
			_propertyService.getPropertyValue(
				_ACCOUNT_ID, PropertyConstants.NAME_KORONEIKI_ACCOUNT_KEY)
		).thenReturn(
			_KORONEIKI_ACCOUNT_KEY
		);

		_getUsage();

		Mockito.verify(
			_dataOpsUsageService
		).fetchComposableAccountUsage(
			Mockito.eq(_KORONEIKI_ACCOUNT_KEY), Mockito.matches("\\d{4}-\\d{2}")
		);
	}

	@Test
	public void testGetUsageReturnsEntitlementsWhenComposableUsageIsAbsent()
		throws Exception {

		_setUpEntitlements(_createEntitlement(1, null, "logs", 300.0));

		Mockito.when(
			_dataOpsUsageService.fetchComposableAccountUsage(
				Mockito.anyString(), Mockito.anyString())
		).thenReturn(
			new JSONObject(
			).toString()
		);

		JSONObject logStorageJSONObject = _getMetricsJSONObject(
			_UTILIZATION_PROFILE_EXPERIENCE_DASHBOARD
		).getJSONObject(
			ExperienceUsageStrategy.METRIC_LOG_STORAGE
		);

		Assertions.assertEquals(
			300,
			logStorageJSONObject.getBigDecimal(
				"maxCount"
			).intValue());
		Assertions.assertEquals(
			BaseUsageStrategy.UNIT_GIB,
			logStorageJSONObject.get("maxCountUnits"));
		Assertions.assertEquals("0", logStorageJSONObject.get("percentage"));
		Assertions.assertFalse(logStorageJSONObject.has("usedCount"));
	}

	@Test
	public void testGetUsageReturnsEntitlementsWhenDataOpsIsUnavailable()
		throws Exception {

		_setUpEntitlements(_createEntitlement(1, null, "logs", 300.0));

		Mockito.when(
			_dataOpsUsageService.fetchComposableAccountUsage(
				Mockito.anyString(), Mockito.anyString())
		).thenThrow(
			new DataOpsUnavailableException()
		);

		ResponseEntity<String> responseEntity = _getUsage();

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		Assertions.assertFalse(jsonObject.getBoolean("usageDataAvailable"));

		JSONObject logStorageJSONObject = jsonObject.getJSONObject(
			"metrics"
		).getJSONObject(
			ExperienceUsageStrategy.METRIC_LOG_STORAGE
		);

		Assertions.assertEquals(
			300,
			logStorageJSONObject.getBigDecimal(
				"maxCount"
			).intValue());
		Assertions.assertFalse(logStorageJSONObject.has("usedCount"));
	}

	@Test
	public void testGetUsageReturnsEntitlementsWhenDataOpsReturnsNull()
		throws Exception {

		_setUpEntitlements(_createEntitlement(1, null, "logs", 300.0));

		JSONObject metricsJSONObject = _getMetricsJSONObject();

		Assertions.assertEquals(
			Set.of(
				"clientExtensionsCPU", "clientExtensionsRAM", "databaseStorage",
				"documentLibraryAndBackupStorage", "logStorage",
				"networkTraffic"),
			metricsJSONObject.keySet());

		JSONObject logStorageJSONObject = metricsJSONObject.getJSONObject(
			ExperienceUsageStrategy.METRIC_LOG_STORAGE);

		Assertions.assertEquals(
			300,
			logStorageJSONObject.getBigDecimal(
				"maxCount"
			).intValue());
		Assertions.assertFalse(logStorageJSONObject.has("usedCount"));
	}

	@Test
	public void testGetUsageReturnsEntitlementsWhenSaaSUsageIsNull()
		throws Exception {

		_setUpEntitlements(_createEntitlement(1, null, "sites", 15.0));

		JSONObject sitesJSONObject = _getMetricsJSONObject(
			_UTILIZATION_PROFILE_SAAS_PLAN_DASHBOARD
		).getJSONObject(
			"sites"
		);

		Assertions.assertEquals(
			15,
			sitesJSONObject.getBigDecimal(
				"maxCount"
			).intValue());
		Assertions.assertFalse(sitesJSONObject.has("usedCount"));
	}

	@Test
	public void testGetUsageReturnsOKWithMetrics() throws Exception {
		_setUpEntitlements();

		_setUpComposableUsage();

		ResponseEntity<String> responseEntity = _getUsage();

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		Assertions.assertFalse(jsonObject.has("variant"));
		Assertions.assertTrue(jsonObject.has("metrics"));
	}

	@Test
	public void testGetUsageSaaSPlanProfileIgnoresEntitlementsItDoesNotRead()
		throws Exception {

		_setUpEntitlements(
			_createEntitlement(1, null, "api-requests", 500000.0),
			_createEntitlement(2, null, "logs", 300.0),
			_createEntitlement(3, null, "sites", 5.0));

		_setUpCustomerUsage();

		JSONObject metricsJSONObject = _getMetricsJSONObject(
			_UTILIZATION_PROFILE_SAAS_PLAN_DASHBOARD);

		JSONObject sitesJSONObject = metricsJSONObject.getJSONObject("sites");

		Assertions.assertEquals(
			5,
			sitesJSONObject.getBigDecimal(
				"maxCount"
			).intValue());

		for (String metricName :
				Arrays.asList(
					"anonymousPageViews", "clientExtensionsCapacityCPU",
					"clientExtensionsCapacityRAM", "monthlyActiveLoggedInUsers",
					"storageCapacityDocumentLibrary")) {

			JSONObject metricJSONObject = metricsJSONObject.getJSONObject(
				metricName);

			Assertions.assertEquals(
				0,
				metricJSONObject.getBigDecimal(
					"maxCount"
				).intValue(),
				metricName);
		}
	}

	@Test
	public void testGetUsageSumsContributingEntitlementNames()
		throws Exception {

		_setUpEntitlements(
			_createEntitlement(1, null, "extensions-vcpus", 3.0),
			_createEntitlement(2, null, "extensions-vcpu", 2.0));

		_setUpComposableUsage();

		JSONObject clientExtensionsCPUJSONObject = _getMetricsJSONObject(
			_UTILIZATION_PROFILE_EXPERIENCE_DASHBOARD
		).getJSONObject(
			ExperienceUsageStrategy.METRIC_CLIENT_EXTENSIONS_CPU
		);

		Assertions.assertEquals(
			5,
			clientExtensionsCPUJSONObject.getBigDecimal(
				"maxCount"
			).intValue());
	}

	@Test
	public void testGetUsageTreatsUnlimitedGrantTypeAsNegativeMaxCount()
		throws Exception {

		_setUpEntitlements(_createEntitlement(1, "unlimited", "sites", null));

		_setUpUtilizationProfile(_UTILIZATION_PROFILE_SAAS_PLAN_DASHBOARD);

		_setUpCustomerUsage();

		JSONObject sitesJSONObject = _getMetricsJSONObject().getJSONObject(
			"sites");

		Assertions.assertEquals(
			-1,
			sitesJSONObject.getBigDecimal(
				"maxCount"
			).intValue());
		Assertions.assertEquals("0", sitesJSONObject.get("percentage"));
	}

	@Test
	public void testGetUsageUpscalesTebibyteLimits() throws Exception {
		_setUpEntitlements(
			_createEntitlement(
				1, null, "storage", 1.0, _SKU_EXTERNAL_REFERENCE_CODE,
				BaseUsageStrategy.UNIT_TIB),
			_createEntitlement(
				2, null, "logs", 300.0, _SKU_EXTERNAL_REFERENCE_CODE,
				BaseUsageStrategy.UNIT_GIB));

		_setUpComposableUsage();

		JSONObject storageJSONObject = _getMetricsJSONObject(
			_UTILIZATION_PROFILE_EXPERIENCE_DASHBOARD
		).getJSONObject(
			ExperienceUsageStrategy.METRIC_DOCUMENT_LIBRARY_AND_BACKUP_STORAGE
		);

		Assertions.assertEquals(
			1,
			storageJSONObject.getBigDecimal(
				"maxCount"
			).intValue());
		Assertions.assertEquals(
			BaseUsageStrategy.UNIT_TIB, storageJSONObject.get("maxCountUnits"));
	}

	@Test
	public void testHandleExceptionMapsInvalidParameterToBadRequest() {
		ResponseEntity<ProblemDetail> responseEntity =
			_projectRestController.handleException(
				new InvalidUsageParameterException(
					"The granularity must be day or month"));

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST, responseEntity.getStatusCode());

		ProblemDetail problemDetail = responseEntity.getBody();

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST.value(), problemDetail.getStatus());
		Assertions.assertEquals(
			"The granularity must be day or month", problemDetail.getDetail());
	}

	@Test
	public void testHandleExceptionMapsInvalidProductToBadRequest() {
		ResponseEntity<ProblemDetail> responseEntity =
			_projectRestController.handleException(
				new InvalidUsageProductException("Product is required"));

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST, responseEntity.getStatusCode());

		ProblemDetail problemDetail = responseEntity.getBody();

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST.value(), problemDetail.getStatus());
		Assertions.assertEquals(
			"Product is required", problemDetail.getDetail());
	}

	@Test
	public void testPostProjectMembershipsChecksPermissionBeforeAssigning()
		throws Exception {

		_postProjectMemberships();

		InOrder inOrder = Mockito.inOrder(
			_projectPermission, _userAssignmentService);

		inOrder.verify(
			_projectPermission
		).check(
			ActionKeys.ASSIGN_MEMBERS, null, _PROJECT_EXTERNAL_REFERENCE_CODE
		);

		inOrder.verify(
			_userAssignmentService
		).assignProjectRole(
			Mockito.argThat(
				project -> _PROJECT_EXTERNAL_REFERENCE_CODE.equals(
					project.getExternalReferenceCode())),
			Mockito.eq(RoleConstants.ERC_PROJECT_ADMIN), Mockito.eq(_USER_ID)
		);
	}

	@Test
	public void testPostProjectMembershipsDoesNotAssignWhenPermissionIsDenied()
		throws Exception {

		_denyAssignMembersPermission();

		Assertions.assertThrows(
			PrincipalException.class, this::_postProjectMemberships);

		Mockito.verifyNoInteractions(_userAssignmentService);
	}

	@Test
	public void testPostProjectMembershipsRejectsNonprojectRole() {
		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> _projectRestController.postProjectMemberships(
					null, _PROJECT_EXTERNAL_REFERENCE_CODE, _USER_ID,
					"ACCT-ROLE-001"));

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST, responseStatusException.getStatusCode());

		Mockito.verifyNoInteractions(_userAssignmentService);
	}

	@Test
	public void testPostSyncToJSMChecksUpdatePermission() throws Exception {
		_denyProjectPermission(ActionKeys.UPDATE);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _projectRestController.postSyncToJSM(
				null, _PROJECT_EXTERNAL_REFERENCE_CODE));

		Mockito.verifyNoInteractions(_accountSynchronizer);
	}

	@Test
	public void testPostSyncToJSMPropagatesAnUnknownProject() throws Exception {
		Mockito.when(
			_projectService.getProject(_PROJECT_EXTERNAL_REFERENCE_CODE_UNKNOWN)
		).thenThrow(
			new ProjectNotFoundException()
		);

		Assertions.assertThrows(
			ProjectNotFoundException.class,
			() -> _projectRestController.postSyncToJSM(
				null, _PROJECT_EXTERNAL_REFERENCE_CODE_UNKNOWN));

		Mockito.verifyNoInteractions(_accountSynchronizer);
	}

	@Test
	public void testPostSyncToJSMSyncsTheProject() throws Exception {
		Project project = _createProject();

		Mockito.when(
			_projectService.getProject(_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			project
		);

		ResponseEntity<Void> responseEntity =
			_projectRestController.postSyncToJSM(
				null, _PROJECT_EXTERNAL_REFERENCE_CODE);

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		Mockito.verify(
			_accountSynchronizer
		).syncProject(
			project
		);
	}

	@Test
	public void testPutProjectMembershipsRejectsNonprojectRole() {
		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> _projectRestController.putProjectMemberships(
					null, _PROJECT_EXTERNAL_REFERENCE_CODE, _USER_ID,
					"ACCT-ROLE-001"));

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST, responseStatusException.getStatusCode());

		Mockito.verifyNoInteractions(_userAssignmentService);
	}

	@Test
	public void testPutProjectMembershipsUnassignsOtherProjectRoles()
		throws Exception {

		Mockito.when(
			_projectMembershipService.getProjectMemberships(
				_PROJECT_EXTERNAL_REFERENCE_CODE, _USER_ID)
		).thenReturn(
			Arrays.asList(
				_createProjectMembership(RoleConstants.ERC_PROJECT_ADMIN),
				_createProjectMembership(RoleConstants.ERC_PROJECT_USER))
		);

		_projectRestController.putProjectMemberships(
			null, _PROJECT_EXTERNAL_REFERENCE_CODE, _USER_ID,
			RoleConstants.ERC_PROJECT_ADMIN);

		InOrder inOrder = Mockito.inOrder(
			_projectPermission, _userAssignmentService);

		inOrder.verify(
			_projectPermission
		).check(
			ActionKeys.ASSIGN_MEMBERS, null, _PROJECT_EXTERNAL_REFERENCE_CODE
		);

		inOrder.verify(
			_userAssignmentService
		).assignProjectRole(
			Mockito.any(), Mockito.eq(RoleConstants.ERC_PROJECT_ADMIN),
			Mockito.eq(_USER_ID)
		);

		inOrder.verify(
			_userAssignmentService
		).unassignProjectRole(
			Mockito.any(), Mockito.eq(RoleConstants.ERC_PROJECT_USER),
			Mockito.eq(_USER_ID)
		);

		Mockito.verify(
			_userAssignmentService, Mockito.never()
		).unassignProjectRole(
			Mockito.any(), Mockito.eq(RoleConstants.ERC_PROJECT_ADMIN),
			Mockito.anyLong()
		);
	}

	private String _createComposableUsage() {
		return new JSONObject(
		).put(
			"usage",
			new JSONObject(
			).put(
				"logStorage", 4L * 1024L * 1024L * 1024L
			)
		).toString();
	}

	private Entitlement _createEntitlement(
		long entitlementDefinitionId, String grantType, String name,
		Double quantity) {

		return _createEntitlement(
			entitlementDefinitionId, grantType, name, quantity,
			_SKU_EXTERNAL_REFERENCE_CODE, null);
	}

	private Entitlement _createEntitlement(
		long entitlementDefinitionId, String grantType, String name,
		Double quantity, String skuExternalReferenceCode, String unit) {

		JSONObject jsonObject = new JSONObject(
		).put(
			"entitlementDefinitionToEntitlement",
			new JSONObject(
			).put(
				"id", entitlementDefinitionId
			).put(
				"r_usageDefinitionToEntitlementDefinition_c_usageDefinitionERC",
				"events-monthly"
			).put(
				"skuExternalReferenceCode", skuExternalReferenceCode
			).put(
				"unit", unit
			)
		).put(
			"id", entitlementDefinitionId
		).put(
			"name", name
		).put(
			"r_entitlementDefinitionToEntitlement_c_entitlementDefinitionId",
			entitlementDefinitionId
		);

		if (grantType != null) {
			jsonObject.put("grantType", grantType);
		}

		if (quantity != null) {
			jsonObject.put("quantity", quantity);
		}

		return new Entitlement(jsonObject);
	}

	private String _createLDPEventHistory() {
		return new JSONObject(
		).put(
			"endDate", _END_DATE
		).put(
			"eventHistory",
			new JSONArray(
			).put(
				new JSONObject(
				).put(
					"date", "2026-06-01"
				).put(
					"eventSummary", _createLDPEventSummaryJSONArray()
				)
			).put(
				new JSONObject(
				).put(
					"date", "2026-07-01"
				).put(
					"eventSummary", _createLDPEventSummaryJSONArray()
				)
			)
		).put(
			"granularity", "month"
		).put(
			"salesforceProjectId", _PROJECT_EXTERNAL_REFERENCE_CODE
		).put(
			"startDate", _START_DATE_PREVIOUS_MONTH
		).toString();
	}

	private String _createLDPEventSummary() {
		return new JSONObject(
		).put(
			"endDate", _END_DATE
		).put(
			"eventSummary", _createLDPEventSummaryJSONArray()
		).put(
			"salesforceProjectId", _PROJECT_EXTERNAL_REFERENCE_CODE
		).put(
			"startDate", _START_DATE_PREVIOUS_MONTH
		).toString();
	}

	private JSONArray _createLDPEventSummaryJSONArray() {
		return new JSONArray(
		).put(
			new JSONObject(
			).put(
				"dataSourceId", "101"
			).put(
				"dataSourceName", "Liferay"
			).put(
				"eventsCount", 123
			)
		).put(
			new JSONObject(
			).put(
				"dataSourceId", "102"
			).put(
				"dataSourceName", "Salesforce"
			).put(
				"eventsCount", 456
			)
		);
	}

	private String _createLDPUsage() {
		return new JSONObject(
		).put(
			"activeBatchSegmentsCount", 23423
		).put(
			"activeRealTimeSegmentsCount", 123
		).put(
			"apiRequestsCount", 213123
		).put(
			"connectorsCount", 123
		).put(
			"month", "2026-07"
		).put(
			"salesforceProjectId", _PROJECT_EXTERNAL_REFERENCE_CODE
		).toString();
	}

	private Product _createProduct(String utilizationProfile) {
		Product product = new Product();

		product.setExternalReferenceCode(_PRODUCT_EXTERNAL_REFERENCE_CODE);

		if (utilizationProfile == null) {
			return product;
		}

		ProductSpecification productSpecification = new ProductSpecification();

		productSpecification.setSpecificationKey(
			() ->
				ProductSpecificationConstants.KEY_PROJECT_UTILIZATION_PROFILE);
		productSpecification.setValue(
			() -> Map.of("en_US", utilizationProfile));

		product.setProductSpecifications(
			() -> new ProductSpecification[] {productSpecification});

		return product;
	}

	private Project _createProject() {
		return new Project(
			new JSONObject(
			).put(
				"externalReferenceCode", _PROJECT_EXTERNAL_REFERENCE_CODE
			).put(
				"r_accountEntryToProject_accountEntryERC",
				_ACCOUNT_EXTERNAL_REFERENCE_CODE
			).put(
				"r_accountEntryToProject_accountEntryId", _ACCOUNT_ID
			));
	}

	private ProjectMembership _createProjectMembership(
		String roleExternalReferenceCode) {

		return new ProjectMembership(
			new JSONObject(
			).put(
				"r_projectToProjectMembership_c_projectERC",
				_PROJECT_EXTERNAL_REFERENCE_CODE
			).put(
				"r_userToProjectMembership_userId", _USER_ID
			).put(
				"roleExternalReferenceCode", roleExternalReferenceCode
			));
	}

	private void _deleteProjectMemberships() throws Exception {
		_projectRestController.deleteProjectMemberships(
			null, _PROJECT_EXTERNAL_REFERENCE_CODE, _USER_ID,
			RoleConstants.ERC_PROJECT_ADMIN);
	}

	private void _denyAssignMembersPermission() throws Exception {
		Mockito.doThrow(
			new PrincipalException()
		).when(
			_projectPermission
		).check(
			ActionKeys.ASSIGN_MEMBERS, null, _PROJECT_EXTERNAL_REFERENCE_CODE
		);
	}

	private void _denyProjectPermission(String actionId) throws Exception {
		Mockito.doThrow(
			new PrincipalException()
		).when(
			_projectPermission
		).check(
			actionId, null, _PROJECT_EXTERNAL_REFERENCE_CODE
		);
	}

	private JSONObject _getMetricsJSONObject() throws Exception {
		ResponseEntity<String> responseEntity = _getUsage();

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		Assertions.assertFalse(jsonObject.has("variant"));

		return jsonObject.getJSONObject("metrics");
	}

	private JSONObject _getMetricsJSONObject(String utilizationProfile)
		throws Exception {

		_setUpUtilizationProfile(utilizationProfile);

		return _getMetricsJSONObject();
	}

	private ResponseEntity<String> _getUsage() throws Exception {
		return _projectRestController.getUsage(
			null, _PROJECT_EXTERNAL_REFERENCE_CODE,
			_PRODUCT_EXTERNAL_REFERENCE_CODE);
	}

	private ResponseEntity<String> _getUsageEventHistory(
			String endDate, String granularity, String startDate)
		throws Exception {

		return _projectRestController.getUsageEventHistory(
			null, _PROJECT_EXTERNAL_REFERENCE_CODE, endDate, granularity,
			startDate);
	}

	private ResponseEntity<String> _getUsageEventSummary(
			String endDate, String startDate)
		throws Exception {

		return _projectRestController.getUsageEventSummary(
			null, _PROJECT_EXTERNAL_REFERENCE_CODE, endDate, startDate);
	}

	private void _postProjectMemberships() throws Exception {
		_projectRestController.postProjectMemberships(
			null, _PROJECT_EXTERNAL_REFERENCE_CODE, _USER_ID,
			RoleConstants.ERC_PROJECT_ADMIN);
	}

	private void _setUpComposableUsage() throws Exception {
		Mockito.when(
			_dataOpsUsageService.fetchComposableAccountUsage(
				Mockito.anyString(), Mockito.anyString())
		).thenReturn(
			_createComposableUsage()
		);
	}

	private void _setUpCustomerUsage() throws Exception {
		Mockito.when(
			_dataOpsUsageService.fetchCustomerAccountUsage(Mockito.anyString())
		).thenReturn(
			new JSONObject(
			).put(
				"totalClientExtensionsCapacityRAM", 2
			).put(
				"totalSitesCount", 3
			).toString()
		);
	}

	private void _setUpEntitlements(Entitlement... entitlements)
		throws Exception {

		Mockito.when(
			_entitlementService.getActiveEntitlements(
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			Arrays.asList(entitlements)
		);
	}

	private void _setUpLDPEventSummary() throws Exception {
		Mockito.when(
			_dataOpsUsageService.fetchLDPProjectEventSummary(
				_END_DATE, _PROJECT_EXTERNAL_REFERENCE_CODE,
				_START_DATE_PREVIOUS_MONTH)
		).thenReturn(
			_createLDPEventSummary()
		);
	}

	private void _setUpLDPUsage() throws Exception {
		Mockito.when(
			_dataOpsUsageService.fetchLDPProjectUsage(
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			_createLDPUsage()
		);
	}

	private void _setUpUtilizationProfile(String utilizationProfile)
		throws Exception {

		Mockito.when(
			_commerceProductService.fetchProduct(
				_PRODUCT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			_createProduct(utilizationProfile)
		);
	}

	private static final String _ACCOUNT_EXTERNAL_REFERENCE_CODE =
		"0015Y00002ABCDEabc";

	private static final long _ACCOUNT_ID = 40001;

	private static final String _END_DATE = "2026-07-28";

	private static final String _KORONEIKI_ACCOUNT_KEY = "abc-123-def";

	private static final String _PRODUCT_EXTERNAL_REFERENCE_CODE = "PRDCT-PAAS";

	private static final long _PRODUCT_ID_SAAS = 2;

	private static final String _PROJECT_EXTERNAL_REFERENCE_CODE = "PRJCT-004";

	private static final String _PROJECT_EXTERNAL_REFERENCE_CODE_UNKNOWN =
		"PRJCT-999";

	private static final String _SKU_EXTERNAL_REFERENCE_CODE = "SKU-001";

	private static final String _SKU_EXTERNAL_REFERENCE_CODE_ADD_ON = "SKU-999";

	private static final String _SKU_EXTERNAL_REFERENCE_CODE_SAAS = "SKU-SAAS";

	private static final String _START_DATE_PREVIOUS_MONTH = "2026-06-01";

	private static final long _USER_ID = 1L;

	private static final String _UTILIZATION_PROFILE_EXPERIENCE_DASHBOARD =
		ProductSpecificationConstants.UTILIZATION_PROFILE_EXPERIENCE_DASHBOARD;

	private static final String _UTILIZATION_PROFILE_SAAS_PLAN_DASHBOARD =
		ProductSpecificationConstants.UTILIZATION_PROFILE_SAAS_PLAN_DASHBOARD;

	private static final String _UTILIZATION_PROFILE_USAGE_METRICS =
		ProductSpecificationConstants.UTILIZATION_PROFILE_USAGE_METRICS;

	private final AccountAssetService _accountAssetService = Mockito.mock(
		AccountAssetService.class);
	private final AccountSynchronizer _accountSynchronizer = Mockito.mock(
		AccountSynchronizer.class);
	private final CommerceProductService _commerceProductService = Mockito.mock(
		CommerceProductService.class);
	private final CommerceSkuService _commerceSkuService = Mockito.mock(
		CommerceSkuService.class);
	private final DataOpsUsageService _dataOpsUsageService = Mockito.mock(
		DataOpsUsageService.class);
	private final EntitlementService _entitlementService = Mockito.mock(
		EntitlementService.class);
	private final ProjectMembershipService _projectMembershipService =
		Mockito.mock(ProjectMembershipService.class);
	private final ProjectPermission _projectPermission = Mockito.mock(
		ProjectPermission.class);
	private ProjectRestController _projectRestController;
	private final ProjectService _projectService = Mockito.mock(
		ProjectService.class);
	private final PropertyService _propertyService = Mockito.mock(
		PropertyService.class);
	private final UsageDefinitionService _usageDefinitionService = Mockito.mock(
		UsageDefinitionService.class);
	private final UserAccountService _userAccountService = Mockito.mock(
		UserAccountService.class);
	private final UserAssignmentService _userAssignmentService = Mockito.mock(
		UserAssignmentService.class);

}
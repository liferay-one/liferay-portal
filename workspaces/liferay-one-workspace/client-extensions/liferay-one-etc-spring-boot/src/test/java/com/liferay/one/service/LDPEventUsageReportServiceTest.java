/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.one.constants.EntitlementConstants;
import com.liferay.one.exception.InvalidUsageParameterException;
import com.liferay.one.model.Contract;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.OveragePricing;
import com.liferay.one.model.Project;
import com.liferay.one.model.UsageDefinition;
import com.liferay.one.model.UsageReport;

import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;

import java.util.ArrayList;
import java.util.List;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Drew Brokke
 */
public class LDPEventUsageReportServiceTest {

	@BeforeEach
	public void setUp() throws Exception {
		_ldpEventUsageReportService = new LDPEventUsageReportService();

		ReflectionTestUtils.setField(
			_ldpEventUsageReportService, "_contractService", _contractService);
		ReflectionTestUtils.setField(
			_ldpEventUsageReportService, "_entitlementService",
			_entitlementService);
		ReflectionTestUtils.setField(
			_ldpEventUsageReportService, "_googleCloudFunctionService",
			_googleCloudFunctionService);
		ReflectionTestUtils.setField(
			_ldpEventUsageReportService, "_projectService", _projectService);
		ReflectionTestUtils.setField(
			_ldpEventUsageReportService, "_usageDefinitionService",
			_usageDefinitionService);
		ReflectionTestUtils.setField(
			_ldpEventUsageReportService, "_usageReportService",
			_usageReportService);

		Mockito.when(
			_contractService.fetchContract(_CONTRACT_ID)
		).thenReturn(
			new Contract(
				new JSONObject(
				).put(
					"externalReferenceCode", _CONTRACT_EXTERNAL_REFERENCE_CODE
				).put(
					"id", _CONTRACT_ID
				))
		);

		Mockito.when(
			_projectService.fetchProject(_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			_createProject(_PROJECT_EXTERNAL_REFERENCE_CODE, _PROJECT_ID)
		);

		Mockito.when(
			_usageReportService.addUsageReport(
				Mockito.anyDouble(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.anyDouble(), Mockito.anyString(),
				Mockito.any(), Mockito.any(), Mockito.any())
		).thenReturn(
			new UsageReport(
				new JSONObject(
				).put(
					"id", 1L
				))
		);

		Mockito.when(
			_usageDefinitionService.fetchUsageDefinition(
				_USAGE_DEFINITION_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			new UsageDefinition(
				new JSONObject(
				).put(
					"id", _USAGE_DEFINITION_ID
				).put(
					"overageBucketSize", _OVERAGE_BUCKET_SIZE
				))
		);
	}

	@Test
	public void testContinuesAfterOneProjectFails() throws Exception {
		String otherProjectExternalReferenceCode = "PRJCT-002";

		_setUpEntitlements(
			_createEventsEntitlement(
				otherProjectExternalReferenceCode, 1000000D, _OVERAGE_RATE),
			_createEventsEntitlement(
				_PROJECT_EXTERNAL_REFERENCE_CODE, 1000000D, _OVERAGE_RATE));

		Mockito.when(
			_projectService.fetchProject(otherProjectExternalReferenceCode)
		).thenThrow(
			new RuntimeException(
				"problem with " + otherProjectExternalReferenceCode)
		);

		_setUpEventSummary(_PROJECT_EXTERNAL_REFERENCE_CODE, 500000);

		_ldpEventUsageReportService.generateUsageReports(_YEAR_MONTH);

		Mockito.verify(
			_usageReportService
		).addUsageReport(
			Mockito.anyDouble(), Mockito.anyString(), Mockito.any(),
			Mockito.any(), Mockito.anyDouble(),
			Mockito.eq(_USAGE_REPORT_EXTERNAL_REFERENCE_CODE), Mockito.any(),
			Mockito.any(), Mockito.any()
		);
	}

	@Test
	public void testGeneratesUnpricedReportForConflictingOveragePricing()
		throws Exception {

		_setUpEntitlements(
			_createEventsEntitlement(
				_PROJECT_EXTERNAL_REFERENCE_CODE, 1000000D, _OVERAGE_RATE),
			_createEventsEntitlement(
				_PROJECT_EXTERNAL_REFERENCE_CODE, 500000D, 25D));
		_setUpEventSummary(_PROJECT_EXTERNAL_REFERENCE_CODE, 1800000);

		_ldpEventUsageReportService.generateUsageReports(_YEAR_MONTH);

		_verifyUnpricedReportAdded(1800000D, 1500000D);
	}

	@Test
	public void testGeneratesUnpricedReportWithoutOveragePricing()
		throws Exception {

		_setUpEntitlements(
			_createEventsEntitlement(
				_PROJECT_EXTERNAL_REFERENCE_CODE, 1000000D, null));
		_setUpEventSummary(_PROJECT_EXTERNAL_REFERENCE_CODE, 1200000);

		_ldpEventUsageReportService.generateUsageReports(_YEAR_MONTH);

		_verifyUnpricedReportAdded(1200000D, 1000000D);
	}

	@Test
	public void testPassesConsumedAndEntitledQuantities() throws Exception {
		_setUpEntitlements(
			_createEventsEntitlement(
				_PROJECT_EXTERNAL_REFERENCE_CODE, 1000000D, _OVERAGE_RATE),
			_createEntitlement(
				"fixed", EntitlementConstants.NAME_EVENTS_ADD_ON_BUCKET,
				_PROJECT_EXTERNAL_REFERENCE_CODE, 1D));
		_setUpEventSummary(_PROJECT_EXTERNAL_REFERENCE_CODE, 1500000);

		_ldpEventUsageReportService.generateUsageReports(_YEAR_MONTH);

		ArgumentCaptor<OveragePricing> overagePricingArgumentCaptor =
			ArgumentCaptor.forClass(OveragePricing.class);
		ArgumentCaptor<Project> projectArgumentCaptor = ArgumentCaptor.forClass(
			Project.class);
		ArgumentCaptor<UsageDefinition> usageDefinitionArgumentCaptor =
			ArgumentCaptor.forClass(UsageDefinition.class);

		Mockito.verify(
			_usageReportService
		).addUsageReport(
			Mockito.eq(1500000D), Mockito.eq(_CONTRACT_EXTERNAL_REFERENCE_CODE),
			Mockito.eq(Instant.parse("2026-08-01T00:00:00Z")),
			Mockito.eq(Instant.parse("2026-08-31T23:59:59.999Z")),
			Mockito.eq(1000000D + _OVERAGE_BUCKET_SIZE),
			Mockito.eq(_USAGE_REPORT_EXTERNAL_REFERENCE_CODE),
			overagePricingArgumentCaptor.capture(),
			projectArgumentCaptor.capture(),
			usageDefinitionArgumentCaptor.capture()
		);

		OveragePricing overagePricing = overagePricingArgumentCaptor.getValue();

		Assertions.assertEquals(_OVERAGE_RATE, overagePricing.getRate());
		Assertions.assertEquals(
			_SKU_EXTERNAL_REFERENCE_CODE,
			overagePricing.getSkuExternalReferenceCode());

		Project project = projectArgumentCaptor.getValue();

		Assertions.assertEquals(_PROJECT_ID, project.getProjectId());

		UsageDefinition usageDefinition =
			usageDefinitionArgumentCaptor.getValue();

		Assertions.assertEquals(
			_USAGE_DEFINITION_ID, usageDefinition.getUsageDefinitionId());

		Mockito.verify(
			_googleCloudFunctionService
		).fetchLDPProjectEventSummary(
			"2026-08-31", _PROJECT_EXTERNAL_REFERENCE_CODE, "2026-08-01"
		);
	}

	@Test
	public void testRejectsIncompleteMonth() {
		YearMonth currentYearMonth = YearMonth.now(ZoneOffset.UTC);

		Assertions.assertThrows(
			InvalidUsageParameterException.class,
			() -> _ldpEventUsageReportService.generateUsageReports(
				currentYearMonth));
		Assertions.assertThrows(
			InvalidUsageParameterException.class,
			() -> _ldpEventUsageReportService.generateUsageReports(
				currentYearMonth.plusMonths(1)));

		Mockito.verifyNoInteractions(_entitlementService, _usageReportService);
	}

	@Test
	public void testSkipsAddOnBucketsWithoutBucketSize() throws Exception {
		Mockito.when(
			_usageDefinitionService.fetchUsageDefinition(Mockito.anyString())
		).thenReturn(
			new UsageDefinition(
				new JSONObject(
				).put(
					"id", _USAGE_DEFINITION_ID
				))
		);

		_setUpEntitlements(
			_createEventsEntitlement(
				_PROJECT_EXTERNAL_REFERENCE_CODE, 1000000D, _OVERAGE_RATE),
			_createEntitlement(
				"fixed", EntitlementConstants.NAME_EVENTS_ADD_ON_BUCKET,
				_PROJECT_EXTERNAL_REFERENCE_CODE, 1D));

		_ldpEventUsageReportService.generateUsageReports(_YEAR_MONTH);

		_verifyNoReportAdded();

		Mockito.verifyNoInteractions(_googleCloudFunctionService);
	}

	@Test
	public void testSkipsExistingReport() throws Exception {
		_setUpEntitlements(
			_createEventsEntitlement(
				_PROJECT_EXTERNAL_REFERENCE_CODE, 1000000D, _OVERAGE_RATE));

		Mockito.when(
			_usageReportService.fetchUsageReport(
				_USAGE_REPORT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			Mockito.mock(UsageReport.class)
		);

		_ldpEventUsageReportService.generateUsageReports(_YEAR_MONTH);

		_verifyNoReportAdded();

		Mockito.verifyNoInteractions(_googleCloudFunctionService);
	}

	@Test
	public void testSkipsProjectWithoutUsageDefinition() throws Exception {
		_setUpEntitlements(
			_createEventsEntitlement(
				_PROJECT_EXTERNAL_REFERENCE_CODE, 1000000D, _OVERAGE_RATE));

		Mockito.when(
			_usageDefinitionService.fetchUsageDefinition(Mockito.anyString())
		).thenReturn(
			null
		);

		_ldpEventUsageReportService.generateUsageReports(_YEAR_MONTH);

		_verifyNoReportAdded();

		Mockito.verifyNoInteractions(_googleCloudFunctionService);
	}

	@Test
	public void testSkipsProjectWithoutWarehouseData() throws Exception {
		_setUpEntitlements(
			_createEventsEntitlement(
				_PROJECT_EXTERNAL_REFERENCE_CODE, 1000000D, _OVERAGE_RATE));

		Mockito.when(
			_googleCloudFunctionService.fetchLDPProjectEventSummary(
				Mockito.anyString(), Mockito.anyString(), Mockito.anyString())
		).thenReturn(
			null
		);

		_ldpEventUsageReportService.generateUsageReports(_YEAR_MONTH);

		_verifyNoReportAdded();
	}

	@Test
	public void testSkipsUnlimitedProject() throws Exception {
		_setUpEntitlements(
			_createEntitlement(
				EntitlementConstants.GRANT_TYPE_UNLIMITED,
				EntitlementConstants.NAME_EVENTS,
				_PROJECT_EXTERNAL_REFERENCE_CODE, null));

		_ldpEventUsageReportService.generateUsageReports(_YEAR_MONTH);

		_verifyNoReportAdded();

		Mockito.verifyNoInteractions(_googleCloudFunctionService);
	}

	private Entitlement _createEntitlement(
		String grantType, String name, String projectExternalReferenceCode,
		Double quantity) {

		return new Entitlement(
			_createEntitlementJSONObject(
				grantType, name, projectExternalReferenceCode, quantity));
	}

	private JSONObject _createEntitlementJSONObject(
		String grantType, String name, String projectExternalReferenceCode,
		Double quantity) {

		JSONObject jsonObject = new JSONObject(
		).put(
			"entitlementDefinitionToEntitlement",
			new JSONObject(
			).put(
				_USAGE_DEFINITION_FIELD_NAME,
				_USAGE_DEFINITION_EXTERNAL_REFERENCE_CODE
			).put(
				"id", 1L
			).put(
				"skuExternalReferenceCode", "PRDCT-DATA-PLATFORM"
			)
		).put(
			"grantType", grantType
		).put(
			"id", 1L
		).put(
			"name", name
		).put(
			"r_contractToEntitlement_c_contractId", _CONTRACT_ID
		).put(
			"r_projectToEntitlement_c_projectERC", projectExternalReferenceCode
		);

		if (quantity != null) {
			jsonObject.put("quantity", quantity);
		}

		return jsonObject;
	}

	private Entitlement _createEventsEntitlement(
		String projectExternalReferenceCode, Double quantity,
		Double overageRate) {

		JSONObject jsonObject = _createEntitlementJSONObject(
			"fixed", EntitlementConstants.NAME_EVENTS,
			projectExternalReferenceCode, quantity);

		if (overageRate != null) {
			jsonObject.put(
				"overageRate", overageRate
			).put(
				"overageSkuExternalReferenceCode", _SKU_EXTERNAL_REFERENCE_CODE
			);
		}

		return new Entitlement(jsonObject);
	}

	private Project _createProject(
		String externalReferenceCode, long projectId) {

		return new Project(
			new JSONObject(
			).put(
				"externalReferenceCode", externalReferenceCode
			).put(
				"id", projectId
			).put(
				"r_accountEntryToProject_accountEntryERC",
				_ACCOUNT_EXTERNAL_REFERENCE_CODE
			));
	}

	private void _setUpEntitlements(Entitlement... entitlements)
		throws Exception {

		List<Entitlement> entitlementList = new ArrayList<>();

		for (Entitlement entitlement : entitlements) {
			entitlementList.add(entitlement);
		}

		Mockito.when(
			_entitlementService.getEntitlements(
				Mockito.eq(Instant.parse("2026-09-01T00:00:00Z")),
				Mockito.anyCollection(),
				Mockito.eq(Instant.parse("2026-08-01T00:00:00Z")))
		).thenReturn(
			entitlementList
		);
	}

	private void _setUpEventSummary(
			String projectExternalReferenceCode, long eventsCount)
		throws Exception {

		Mockito.when(
			_googleCloudFunctionService.fetchLDPProjectEventSummary(
				Mockito.anyString(), Mockito.eq(projectExternalReferenceCode),
				Mockito.anyString())
		).thenReturn(
			new JSONObject(
			).put(
				"eventSummary",
				new JSONArray(
				).put(
					new JSONObject(
					).put(
						"dataSourceId", "ds-1"
					).put(
						"eventsCount", eventsCount
					)
				)
			).put(
				"salesforceProjectId", projectExternalReferenceCode
			).toString()
		);
	}

	private void _verifyNoReportAdded() throws Exception {
		Mockito.verify(
			_usageReportService, Mockito.never()
		).addUsageReport(
			Mockito.anyDouble(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.anyDouble(), Mockito.anyString(), Mockito.any(),
			Mockito.any(), Mockito.any()
		);
	}

	private void _verifyUnpricedReportAdded(
			double aggregateQuantity, double entitledQuantity)
		throws Exception {

		Mockito.verify(
			_usageReportService
		).addUsageReport(
			Mockito.eq(aggregateQuantity), Mockito.anyString(), Mockito.any(),
			Mockito.any(), Mockito.eq(entitledQuantity),
			Mockito.eq(_USAGE_REPORT_EXTERNAL_REFERENCE_CODE), Mockito.isNull(),
			Mockito.any(), Mockito.any()
		);
	}

	private static final String _ACCOUNT_EXTERNAL_REFERENCE_CODE = "ACCNT-001";

	private static final String _CONTRACT_EXTERNAL_REFERENCE_CODE =
		"C_CONTRACT_001";

	private static final long _CONTRACT_ID = 11;

	private static final double _OVERAGE_BUCKET_SIZE = 200000;

	private static final double _OVERAGE_RATE = 20;

	private static final String _PROJECT_EXTERNAL_REFERENCE_CODE = "PRJCT-001";

	private static final long _PROJECT_ID = 22;

	private static final String _SKU_EXTERNAL_REFERENCE_CODE =
		"PRDCT-DATA-PLATFORM-EVENTS-OVERAGE-BUCKET";

	private static final String _USAGE_DEFINITION_EXTERNAL_REFERENCE_CODE =
		"events-monthly";

	private static final String _USAGE_DEFINITION_FIELD_NAME =
		"r_usageDefinitionToEntitlementDefinition_c_usageDefinitionERC";

	private static final long _USAGE_DEFINITION_ID = 33;

	private static final String _USAGE_REPORT_EXTERNAL_REFERENCE_CODE =
		"C_USAGE_REPORT_PRJCT_001_2026_08";

	private static final YearMonth _YEAR_MONTH = YearMonth.of(2026, 8);

	private final ContractService _contractService = Mockito.mock(
		ContractService.class);
	private final EntitlementService _entitlementService = Mockito.mock(
		EntitlementService.class);
	private final GoogleCloudFunctionService _googleCloudFunctionService =
		Mockito.mock(GoogleCloudFunctionService.class);
	private LDPEventUsageReportService _ldpEventUsageReportService;
	private final ProjectService _projectService = Mockito.mock(
		ProjectService.class);
	private final UsageDefinitionService _usageDefinitionService = Mockito.mock(
		UsageDefinitionService.class);
	private final UsageReportService _usageReportService = Mockito.mock(
		UsageReportService.class);

}
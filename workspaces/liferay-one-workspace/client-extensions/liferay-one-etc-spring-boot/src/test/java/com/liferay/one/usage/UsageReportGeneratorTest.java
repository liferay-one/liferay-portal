/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.usage;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.one.constants.EntitlementConstants;
import com.liferay.one.constants.SkuOptionConstants;
import com.liferay.one.exception.InvalidUsageParameterException;
import com.liferay.one.model.Contract;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.OveragePricing;
import com.liferay.one.model.Project;
import com.liferay.one.model.UsageDefinition;
import com.liferay.one.model.UsageReport;
import com.liferay.one.service.CommerceProductService;
import com.liferay.one.service.CommerceSkuService;
import com.liferay.one.service.ContractService;
import com.liferay.one.service.EntitlementService;
import com.liferay.one.service.ProjectService;
import com.liferay.one.service.UsageDefinitionService;
import com.liferay.one.service.UsageReportService;
import com.liferay.one.util.UsageUnitUtil;
import com.liferay.portal.kernel.util.HashMapBuilder;

import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;

import java.util.Arrays;
import java.util.Collections;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Drew Brokke
 */
@DisplayName("[CLS-USAGEREPORTGENERATOR] UsageReportGenerator")
public class UsageReportGeneratorTest {

	@BeforeEach
	public void setUp() throws Exception {
		_usageReportGenerator = new UsageReportGenerator();

		UsageSourceRegistry usageSourceRegistry = new UsageSourceRegistry();

		ReflectionTestUtils.setField(
			usageSourceRegistry, "_usageSources",
			Collections.singletonList(_usageSource));

		ReflectionTestUtils.setField(
			_usageReportGenerator, "_commerceProductService",
			_commerceProductService);
		ReflectionTestUtils.setField(
			_usageReportGenerator, "_commerceSkuService", _commerceSkuService);
		ReflectionTestUtils.setField(
			_usageReportGenerator, "_contractService", _contractService);
		ReflectionTestUtils.setField(
			_usageReportGenerator, "_entitlementService", _entitlementService);
		ReflectionTestUtils.setField(
			_usageReportGenerator, "_projectService", _projectService);
		ReflectionTestUtils.setField(
			_usageReportGenerator, "_usageDefinitionService",
			_usageDefinitionService);
		ReflectionTestUtils.setField(
			_usageReportGenerator, "_usageReportService", _usageReportService);
		ReflectionTestUtils.setField(
			_usageReportGenerator, "_usageSourceRegistry", usageSourceRegistry);

		Mockito.when(
			_usageSource.getKey()
		).thenReturn(
			_USAGE_SOURCE
		);

		_setUpUsageDefinitions(_createUsageDefinition(_OVERAGE_BUCKET_SIZE));

		Mockito.when(
			_commerceSkuService.fetchConsumptionRole(_SKU_ADD_ON)
		).thenReturn(
			SkuOptionConstants.VALUE_CONSUMPTION_ROLE_ADD_ON
		);

		Mockito.when(
			_commerceSkuService.fetchConsumptionRole(_SKU_ALLOTMENT)
		).thenReturn(
			SkuOptionConstants.VALUE_CONSUMPTION_ROLE_ALLOTMENT
		);

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
			_commerceSkuService.fetchProductId(_SKU_ALLOTMENT)
		).thenReturn(
			_PRODUCT_ID
		);

		Product product = new Product();

		product.setExternalReferenceCode(_PRODUCT_EXTERNAL_REFERENCE_CODE);
		product.setName(
			HashMapBuilder.put(
				"en_US", _PRODUCT_NAME
			).build());

		Mockito.when(
			_commerceProductService.fetchProduct(_PRODUCT_ID)
		).thenReturn(
			product
		);

		Mockito.when(
			_usageReportService.addUsageReport(
				Mockito.anyDouble(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.anyDouble(), Mockito.anyString(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.any())
		).thenReturn(
			new UsageReport(
				new JSONObject(
				).put(
					"id", 1L
				))
		);
	}

	@Test
	public void testContinuesAfterOneProjectFails() throws Exception {
		String otherProjectExternalReferenceCode = "PRJCT-002";

		_setUpEntitlements(
			_createAllotment(
				otherProjectExternalReferenceCode, 1000000D, _OVERAGE_RATE),
			_createAllotment(
				_PROJECT_EXTERNAL_REFERENCE_CODE, 1000000D, _OVERAGE_RATE));

		Mockito.when(
			_projectService.fetchProject(otherProjectExternalReferenceCode)
		).thenThrow(
			new RuntimeException(
				"problem with " + otherProjectExternalReferenceCode)
		);

		_setUpUsage(500000D);

		_usageReportGenerator.generateUsageReports(_YEAR_MONTH);

		Mockito.verify(
			_usageReportService
		).addUsageReport(
			Mockito.anyDouble(), Mockito.anyString(), Mockito.any(),
			Mockito.any(), Mockito.anyDouble(),
			Mockito.eq(_USAGE_REPORT_EXTERNAL_REFERENCE_CODE), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any()
		);
	}

	@Test
	public void testConvertsSourceUnitToUsageDefinitionUnit() throws Exception {
		_setUpUsageDefinitions(
			_createUsageDefinition(
				null, UsageUnitUtil.UNIT_GIB, UsageUnitUtil.UNIT_BYTES));
		_setUpEntitlements(
			_createEntitlement(
				"fixed", _PROJECT_EXTERNAL_REFERENCE_CODE, 1D, _SKU_ALLOTMENT,
				UsageUnitUtil.UNIT_TIB));
		_setUpUsage(4D * 1024 * 1024 * 1024);

		_usageReportGenerator.generateUsageReports(_YEAR_MONTH);

		Mockito.verify(
			_usageReportService
		).addUsageReport(
			Mockito.eq(4D), Mockito.anyString(), Mockito.any(), Mockito.any(),
			Mockito.eq(1024D), Mockito.anyString(), Mockito.isNull(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any()
		);
	}

	@Test
	public void testGeneratesUnpricedReportForConflictingOveragePricing()
		throws Exception {

		_setUpEntitlements(
			_createAllotment(
				_PROJECT_EXTERNAL_REFERENCE_CODE, 1000000D, _OVERAGE_RATE),
			_createAllotment(_PROJECT_EXTERNAL_REFERENCE_CODE, 500000D, 25D));
		_setUpUsage(1800000D);

		_usageReportGenerator.generateUsageReports(_YEAR_MONTH);

		_verifyUnpricedReportAdded(1800000D, 1500000D);
	}

	@Test
	public void testGeneratesUnpricedReportWithOverageSkuWithoutRate()
		throws Exception {

		JSONObject jsonObject = _createEntitlementJSONObject(
			"fixed", _PROJECT_EXTERNAL_REFERENCE_CODE, 1000000D, _SKU_ALLOTMENT,
			null);

		jsonObject.put("overageSkuExternalReferenceCode", _SKU_OVERAGE);

		_setUpEntitlements(new Entitlement(jsonObject));

		_setUpUsage(1200000D);

		_usageReportGenerator.generateUsageReports(_YEAR_MONTH);

		ArgumentCaptor<OveragePricing> overagePricingArgumentCaptor =
			ArgumentCaptor.forClass(OveragePricing.class);

		Mockito.verify(
			_usageReportService
		).addUsageReport(
			Mockito.eq(1200000D), Mockito.anyString(), Mockito.any(),
			Mockito.any(), Mockito.eq(1000000D),
			Mockito.eq(_USAGE_REPORT_EXTERNAL_REFERENCE_CODE),
			overagePricingArgumentCaptor.capture(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any()
		);

		OveragePricing overagePricing = overagePricingArgumentCaptor.getValue();

		Assertions.assertNull(overagePricing.getRate());
		Assertions.assertEquals(
			_SKU_OVERAGE, overagePricing.getSkuExternalReferenceCode());
	}

	@Test
	public void testGeneratesUnpricedReportWithoutOveragePricing()
		throws Exception {

		_setUpEntitlements(
			_createAllotment(_PROJECT_EXTERNAL_REFERENCE_CODE, 1000000D, null));
		_setUpUsage(1200000D);

		_usageReportGenerator.generateUsageReports(_YEAR_MONTH);

		_verifyUnpricedReportAdded(1200000D, 1000000D);
	}

	@Test
	public void testLeavesProductEmptyWhenSkuHasNoProduct() throws Exception {
		Mockito.when(
			_commerceSkuService.fetchProductId(_SKU_ALLOTMENT)
		).thenReturn(
			null
		);

		_setUpEntitlements(
			_createAllotment(
				_PROJECT_EXTERNAL_REFERENCE_CODE, 1000000D, _OVERAGE_RATE));
		_setUpUsage(500000D);

		_usageReportGenerator.generateUsageReports(_YEAR_MONTH);

		Mockito.verify(
			_usageReportService
		).addUsageReport(
			Mockito.anyDouble(), Mockito.anyString(), Mockito.any(),
			Mockito.any(), Mockito.anyDouble(), Mockito.anyString(),
			Mockito.any(), Mockito.isNull(), Mockito.isNull(), Mockito.any(),
			Mockito.any()
		);
	}

	@Test
	public void testPassesConsumedAndEntitledQuantities() throws Exception {
		_setUpEntitlements(
			_createAllotment(
				_PROJECT_EXTERNAL_REFERENCE_CODE, 1000000D, _OVERAGE_RATE),
			_createEntitlement(
				"fixed", _PROJECT_EXTERNAL_REFERENCE_CODE, 1D, _SKU_ADD_ON,
				null));
		_setUpUsage(1500000D);

		_usageReportGenerator.generateUsageReports(_YEAR_MONTH);

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
			Mockito.eq(_PRODUCT_EXTERNAL_REFERENCE_CODE),
			Mockito.eq(_PRODUCT_NAME), projectArgumentCaptor.capture(),
			usageDefinitionArgumentCaptor.capture()
		);

		OveragePricing overagePricing = overagePricingArgumentCaptor.getValue();

		Assertions.assertEquals(_OVERAGE_RATE, overagePricing.getRate());
		Assertions.assertEquals(
			_SKU_OVERAGE, overagePricing.getSkuExternalReferenceCode());

		Project project = projectArgumentCaptor.getValue();

		Assertions.assertEquals(_PROJECT_ID, project.getProjectId());

		UsageDefinition usageDefinition =
			usageDefinitionArgumentCaptor.getValue();

		Assertions.assertEquals(
			_USAGE_DEFINITION_ID, usageDefinition.getUsageDefinitionId());

		Mockito.verify(
			_usageSource
		).fetchUsage(
			project, usageDefinition, _YEAR_MONTH
		);
	}

	@Test
	public void testRejectsIncompleteMonth() {
		YearMonth currentYearMonth = YearMonth.now(ZoneOffset.UTC);

		Assertions.assertThrows(
			InvalidUsageParameterException.class,
			() -> _usageReportGenerator.generateUsageReports(currentYearMonth));
		Assertions.assertThrows(
			InvalidUsageParameterException.class,
			() -> _usageReportGenerator.generateUsageReports(
				currentYearMonth.plusMonths(1)));

		Mockito.verifyNoInteractions(
			_entitlementService, _usageDefinitionService, _usageReportService);
	}

	@Test
	public void testReportsTheOnlyProjectOfAnAccountOnAnAccountKeyedSource()
		throws Exception {

		_setUpEntitlements(
			_createAllotment(
				_PROJECT_EXTERNAL_REFERENCE_CODE, 1000000D, _OVERAGE_RATE));
		_setUpUsage(500000D);

		Mockito.when(
			_usageSource.isKeyedByAccount()
		).thenReturn(
			true
		);

		_usageReportGenerator.generateUsageReports(_YEAR_MONTH);

		Mockito.verify(
			_usageReportService
		).addUsageReport(
			Mockito.anyDouble(), Mockito.anyString(), Mockito.any(),
			Mockito.any(), Mockito.anyDouble(),
			Mockito.eq(_USAGE_REPORT_EXTERNAL_REFERENCE_CODE), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any()
		);
	}

	@Test
	public void testSkipsAddOnBucketsWithoutBucketSize() throws Exception {
		_setUpUsageDefinitions(_createUsageDefinition(null));
		_setUpEntitlements(
			_createAllotment(
				_PROJECT_EXTERNAL_REFERENCE_CODE, 1000000D, _OVERAGE_RATE),
			_createEntitlement(
				"fixed", _PROJECT_EXTERNAL_REFERENCE_CODE, 1D, _SKU_ADD_ON,
				null));

		_usageReportGenerator.generateUsageReports(_YEAR_MONTH);

		_verifyNoReportAdded();

		Mockito.verify(
			_usageSource, Mockito.never()
		).fetchUsage(
			Mockito.any(), Mockito.any(), Mockito.any()
		);
	}

	@Test
	public void testSkipsExistingReport() throws Exception {
		_setUpEntitlements(
			_createAllotment(
				_PROJECT_EXTERNAL_REFERENCE_CODE, 1000000D, _OVERAGE_RATE));

		Mockito.when(
			_usageReportService.fetchUsageReport(
				_USAGE_REPORT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			Mockito.mock(UsageReport.class)
		);

		_usageReportGenerator.generateUsageReports(_YEAR_MONTH);

		_verifyNoReportAdded();

		Mockito.verify(
			_usageSource, Mockito.never()
		).fetchUsage(
			Mockito.any(), Mockito.any(), Mockito.any()
		);
	}

	@Test
	public void testSkipsProjectWithSkuWithoutConsumptionRole()
		throws Exception {

		_setUpEntitlements(
			_createAllotment(
				_PROJECT_EXTERNAL_REFERENCE_CODE, 1000000D, _OVERAGE_RATE),
			_createEntitlement(
				"fixed", _PROJECT_EXTERNAL_REFERENCE_CODE, 1D,
				"PRDCT-DATA-PLATFORM-EVENTS-LEGACY-BUCKET", null));

		_usageReportGenerator.generateUsageReports(_YEAR_MONTH);

		_verifyNoReportAdded();

		Mockito.verify(
			_usageSource, Mockito.never()
		).fetchUsage(
			Mockito.any(), Mockito.any(), Mockito.any()
		);
	}

	@Test
	public void testSkipsProjectWithoutUsageData() throws Exception {
		_setUpEntitlements(
			_createAllotment(
				_PROJECT_EXTERNAL_REFERENCE_CODE, 1000000D, _OVERAGE_RATE));
		_setUpUsage(null);

		_usageReportGenerator.generateUsageReports(_YEAR_MONTH);

		_verifyNoReportAdded();
	}

	@Test
	public void testSkipsProjectsSharingAnAccountOnAnAccountKeyedSource()
		throws Exception {

		_setUpEntitlements(
			_createAllotment("PRJCT-002", 1000000D, _OVERAGE_RATE),
			_createAllotment(
				_PROJECT_EXTERNAL_REFERENCE_CODE, 1000000D, _OVERAGE_RATE));
		_setUpUsage(500000D);

		Mockito.when(
			_usageSource.isKeyedByAccount()
		).thenReturn(
			true
		);

		_usageReportGenerator.generateUsageReports(_YEAR_MONTH);

		_verifyNoReportAdded();

		Mockito.verify(
			_usageSource, Mockito.never()
		).fetchUsage(
			Mockito.any(), Mockito.any(), Mockito.any()
		);
	}

	@Test
	public void testSkipsUnlimitedProject() throws Exception {
		_setUpEntitlements(
			_createEntitlement(
				EntitlementConstants.GRANT_TYPE_UNLIMITED,
				_PROJECT_EXTERNAL_REFERENCE_CODE, null, _SKU_ALLOTMENT, null));

		_usageReportGenerator.generateUsageReports(_YEAR_MONTH);

		_verifyNoReportAdded();

		Mockito.verify(
			_usageSource, Mockito.never()
		).fetchUsage(
			Mockito.any(), Mockito.any(), Mockito.any()
		);
	}

	@Test
	public void testSkipsUsageDefinitionWithUnknownSource() throws Exception {
		_setUpUsageDefinitions(
			_createUsageDefinition(
				_OVERAGE_BUCKET_SIZE, _UNIT, _UNIT,
				"composable-account-usage"));

		_usageReportGenerator.generateUsageReports(_YEAR_MONTH);

		_verifyNoReportAdded();

		Mockito.verifyNoInteractions(_entitlementService);
	}

	@Test
	public void testSkipsUsageDefinitionWithoutSource() throws Exception {
		_setUpUsageDefinitions(
			new UsageDefinition(
				new JSONObject(
				).put(
					"externalReferenceCode", "storage-gb"
				).put(
					"id", 2L
				)));

		_usageReportGenerator.generateUsageReports(_YEAR_MONTH);

		_verifyNoReportAdded();

		Mockito.verifyNoInteractions(_entitlementService);
	}

	private Entitlement _createAllotment(
		String projectExternalReferenceCode, Double quantity,
		Double overageRate) {

		JSONObject jsonObject = _createEntitlementJSONObject(
			"fixed", projectExternalReferenceCode, quantity, _SKU_ALLOTMENT,
			null);

		if (overageRate != null) {
			jsonObject.put(
				"overageRate", overageRate
			).put(
				"overageSkuExternalReferenceCode", _SKU_OVERAGE
			);
		}

		return new Entitlement(jsonObject);
	}

	private Entitlement _createEntitlement(
		String grantType, String projectExternalReferenceCode, Double quantity,
		String skuExternalReferenceCode, String unit) {

		return new Entitlement(
			_createEntitlementJSONObject(
				grantType, projectExternalReferenceCode, quantity,
				skuExternalReferenceCode, unit));
	}

	private JSONObject _createEntitlementJSONObject(
		String grantType, String projectExternalReferenceCode, Double quantity,
		String skuExternalReferenceCode, String unit) {

		JSONObject jsonObject = new JSONObject(
		).put(
			"entitlementDefinitionToEntitlement",
			new JSONObject(
			).put(
				"id", 1L
			).put(
				"r_usageDefinitionToEntitlementDefinition_c_usageDefinitionERC",
				_USAGE_DEFINITION_EXTERNAL_REFERENCE_CODE
			).put(
				"skuExternalReferenceCode", skuExternalReferenceCode
			).put(
				"unit", unit
			)
		).put(
			"grantType", grantType
		).put(
			"id", 1L
		).put(
			"r_accountEntryToEntitlement_accountEntryId", _ACCOUNT_ENTRY_ID
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

	private UsageDefinition _createUsageDefinition(Double overageBucketSize) {
		return _createUsageDefinition(overageBucketSize, _UNIT, _UNIT);
	}

	private UsageDefinition _createUsageDefinition(
		Double overageBucketSize, String unit, String usageSourceUnit) {

		return _createUsageDefinition(
			overageBucketSize, unit, usageSourceUnit, _USAGE_SOURCE);
	}

	private UsageDefinition _createUsageDefinition(
		Double overageBucketSize, String unit, String usageSourceUnit,
		String usageSource) {

		JSONObject jsonObject = new JSONObject(
		).put(
			"externalReferenceCode", _USAGE_DEFINITION_EXTERNAL_REFERENCE_CODE
		).put(
			"id", _USAGE_DEFINITION_ID
		).put(
			"unit", unit
		).put(
			"usageSource", usageSource
		).put(
			"usageSourceMetricKey", "eventsCount"
		).put(
			"usageSourceUnit", usageSourceUnit
		);

		if (overageBucketSize != null) {
			jsonObject.put("overageBucketSize", overageBucketSize);
		}

		return new UsageDefinition(jsonObject);
	}

	private void _setUpEntitlements(Entitlement... entitlements)
		throws Exception {

		Mockito.when(
			_entitlementService.getUsageDefinitionEntitlements(
				Instant.parse("2026-09-01T00:00:00Z"),
				Instant.parse("2026-08-01T00:00:00Z"),
				_USAGE_DEFINITION_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			Arrays.asList(entitlements)
		);
	}

	private void _setUpUsage(Double usage) throws Exception {
		Mockito.when(
			_usageSource.fetchUsage(
				Mockito.any(), Mockito.any(), Mockito.eq(_YEAR_MONTH))
		).thenReturn(
			usage
		);
	}

	private void _setUpUsageDefinitions(UsageDefinition... usageDefinitions)
		throws Exception {

		Mockito.when(
			_usageDefinitionService.getUsageDefinitions()
		).thenReturn(
			Arrays.asList(usageDefinitions)
		);
	}

	private void _verifyNoReportAdded() throws Exception {
		Mockito.verify(
			_usageReportService, Mockito.never()
		).addUsageReport(
			Mockito.anyDouble(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.anyDouble(), Mockito.anyString(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any()
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
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any()
		);
	}

	private static final long _ACCOUNT_ENTRY_ID = 55;

	private static final String _ACCOUNT_EXTERNAL_REFERENCE_CODE = "ACCNT-001";

	private static final String _CONTRACT_EXTERNAL_REFERENCE_CODE =
		"C_CONTRACT_001";

	private static final long _CONTRACT_ID = 11;

	private static final double _OVERAGE_BUCKET_SIZE = 200000;

	private static final double _OVERAGE_RATE = 20;

	private static final String _PRODUCT_EXTERNAL_REFERENCE_CODE =
		"PRDCT-DATA-PLATFORM";

	private static final long _PRODUCT_ID = 44;

	private static final String _PRODUCT_NAME = "Liferay Data Platform";

	private static final String _PROJECT_EXTERNAL_REFERENCE_CODE = "PRJCT-001";

	private static final long _PROJECT_ID = 22;

	private static final String _SKU_ADD_ON =
		"PRDCT-DATA-PLATFORM-EVENTS-ADD-ON-BUCKET";

	private static final String _SKU_ALLOTMENT = "PRDCT-DATA-PLATFORM";

	private static final String _SKU_OVERAGE =
		"PRDCT-DATA-PLATFORM-EVENTS-OVERAGE-BUCKET";

	private static final String _UNIT = "events";

	private static final String _USAGE_DEFINITION_EXTERNAL_REFERENCE_CODE =
		"events-monthly";

	private static final long _USAGE_DEFINITION_ID = 33;

	private static final String _USAGE_REPORT_EXTERNAL_REFERENCE_CODE =
		"C_USAGE_REPORT_PRJCT_001_EVENTS_MONTHLY_2026_08";

	private static final String _USAGE_SOURCE = "ldp-event-summary";

	private static final YearMonth _YEAR_MONTH = YearMonth.of(2026, 8);

	private final CommerceProductService _commerceProductService = Mockito.mock(
		CommerceProductService.class);
	private final CommerceSkuService _commerceSkuService = Mockito.mock(
		CommerceSkuService.class);
	private final ContractService _contractService = Mockito.mock(
		ContractService.class);
	private final EntitlementService _entitlementService = Mockito.mock(
		EntitlementService.class);
	private final ProjectService _projectService = Mockito.mock(
		ProjectService.class);
	private final UsageDefinitionService _usageDefinitionService = Mockito.mock(
		UsageDefinitionService.class);
	private UsageReportGenerator _usageReportGenerator;
	private final UsageReportService _usageReportService = Mockito.mock(
		UsageReportService.class);
	private final UsageSource _usageSource = Mockito.mock(UsageSource.class);

}
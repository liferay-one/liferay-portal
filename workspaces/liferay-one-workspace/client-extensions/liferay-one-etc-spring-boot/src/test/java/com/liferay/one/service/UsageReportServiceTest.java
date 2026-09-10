/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.one.model.Project;
import com.liferay.one.model.UsageDefinition;

import java.time.Instant;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

/**
 * @author Drew Brokke
 */
public class UsageReportServiceTest {

	@BeforeEach
	public void setUp() throws Exception {
		_usageReportService = Mockito.spy(new UsageReportService());

		Mockito.doReturn(
			null
		).when(
			_usageReportService
		).addUsageReport(
			Mockito.anyString(), Mockito.anyDouble(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.anyDouble(),
			Mockito.anyString(), Mockito.anyDouble(), Mockito.anyString(),
			Mockito.anyDouble(), Mockito.anyLong(), Mockito.anyString(),
			Mockito.anyString(), Mockito.anyLong()
		);
	}

	@Test
	public void testDerivesCompletedReportWithoutOverage() throws Exception {
		_addUsageReport(999999);

		_verifyUsageReport(
			999999, 0, UsageReportService.REVIEW_STATUS_COMPLETED);
	}

	@Test
	public void testDerivesReadyForReviewReportWithOverage() throws Exception {
		_addUsageReport(1300000);

		_verifyUsageReport(
			1300000, 2, UsageReportService.REVIEW_STATUS_READY_FOR_REVIEW);
	}

	@Test
	public void testRejectsNonpositiveOverageUnitQuantity() {
		Assertions.assertThrows(
			IllegalArgumentException.class,
			() -> _usageReportService.addUsageReport(
				1000001, _CONTRACT_EXTERNAL_REFERENCE_CODE, _DATE_FROM_INSTANT,
				_DATE_TO_INSTANT, 1000000, _EXTERNAL_REFERENCE_CODE, 0,
				_project, _SKU_EXTERNAL_REFERENCE_CODE, _usageDefinition));
	}

	@Test
	public void testRoundsOverageUpToWholeUnits() throws Exception {
		_addUsageReport(1000001);

		_verifyUsageReport(
			1000001, 1, UsageReportService.REVIEW_STATUS_READY_FOR_REVIEW);

		Mockito.clearInvocations(_usageReportService);

		_addUsageReport(1200000);

		_verifyUsageReport(
			1200000, 1, UsageReportService.REVIEW_STATUS_READY_FOR_REVIEW);

		Mockito.clearInvocations(_usageReportService);

		_addUsageReport(1200001);

		_verifyUsageReport(
			1200001, 2, UsageReportService.REVIEW_STATUS_READY_FOR_REVIEW);
	}

	private void _addUsageReport(double aggregateQuantity) throws Exception {
		_usageReportService.addUsageReport(
			aggregateQuantity, _CONTRACT_EXTERNAL_REFERENCE_CODE,
			_DATE_FROM_INSTANT, _DATE_TO_INSTANT, 1000000,
			_EXTERNAL_REFERENCE_CODE, _OVERAGE_UNIT_QUANTITY, _project,
			_SKU_EXTERNAL_REFERENCE_CODE, _usageDefinition);
	}

	private void _verifyUsageReport(
			double aggregateQuantity, double overageQuantity,
			String reviewStatus)
		throws Exception {

		Mockito.verify(
			_usageReportService
		).addUsageReport(
			_ACCOUNT_EXTERNAL_REFERENCE_CODE, aggregateQuantity,
			_CONTRACT_EXTERNAL_REFERENCE_CODE, _DATE_FROM_INSTANT,
			_DATE_TO_INSTANT, 1000000, _EXTERNAL_REFERENCE_CODE,
			overageQuantity * _OVERAGE_RATE, "USD", overageQuantity,
			_PROJECT_ID, reviewStatus, _SKU_EXTERNAL_REFERENCE_CODE,
			_USAGE_DEFINITION_ID
		);
	}

	private static final String _ACCOUNT_EXTERNAL_REFERENCE_CODE = "ACCNT-001";

	private static final String _CONTRACT_EXTERNAL_REFERENCE_CODE =
		"C_CONTRACT_001";

	private static final Instant _DATE_FROM_INSTANT = Instant.parse(
		"2026-08-01T00:00:00Z");

	private static final Instant _DATE_TO_INSTANT = Instant.parse(
		"2026-08-31T23:59:59.999Z");

	private static final String _EXTERNAL_REFERENCE_CODE =
		"C_USAGE_REPORT_PRJCT_001_2026_08";

	private static final double _OVERAGE_RATE = 20;

	private static final long _OVERAGE_UNIT_QUANTITY = 200000;

	private static final long _PROJECT_ID = 22;

	private static final String _SKU_EXTERNAL_REFERENCE_CODE =
		"PRDCT-DATA-PLATFORM-EVENTS-ADD-ON-BUCKET";

	private static final long _USAGE_DEFINITION_ID = 33;

	private final Project _project = new Project(
		new JSONObject(
		).put(
			"externalReferenceCode", "PRJCT-001"
		).put(
			"id", _PROJECT_ID
		).put(
			"r_accountEntryToProject_accountEntryERC",
			_ACCOUNT_EXTERNAL_REFERENCE_CODE
		));
	private final UsageDefinition _usageDefinition = new UsageDefinition(
		new JSONObject(
		).put(
			"id", _USAGE_DEFINITION_ID
		).put(
			"overageCurrency", "USD"
		).put(
			"overageRate", _OVERAGE_RATE
		));
	private UsageReportService _usageReportService;

}
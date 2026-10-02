/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.usage;

import com.liferay.one.exception.DataOpsUnavailableException;
import com.liferay.one.model.Project;
import com.liferay.one.model.UsageDefinition;
import com.liferay.one.service.DataOpsUsageService;

import java.time.YearMonth;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Drew Brokke
 */
@DisplayName("[CLS-LDPEVENTSUMMARYUSAGESOURCE] LDPEventSummaryUsageSource")
public class LDPEventSummaryUsageSourceTest {

	@BeforeEach
	public void setUp() {
		_ldpEventSummaryUsageSource = new LDPEventSummaryUsageSource();

		ReflectionTestUtils.setField(
			_ldpEventSummaryUsageSource, "_dataOpsUsageService",
			_dataOpsUsageService);
	}

	@Test
	public void testAsksForTheWholeMonth() throws Exception {
		_setUpEventSummary(_createEventSummary(100));

		_ldpEventSummaryUsageSource.fetchUsage(
			_createProject(), _createUsageDefinition(), _YEAR_MONTH);

		Mockito.verify(
			_dataOpsUsageService
		).fetchLDPProjectEventSummary(
			"2026-02-28", _PROJECT_EXTERNAL_REFERENCE_CODE, "2026-02-01"
		);
	}

	@Test
	public void testMissingDataIsNull() throws Exception {
		_setUpEventSummary(null);

		Assertions.assertNull(
			_ldpEventSummaryUsageSource.fetchUsage(
				_createProject(), _createUsageDefinition(), _YEAR_MONTH));

		_setUpEventSummary(
			new JSONObject(
			).put(
				"salesforceProjectId", _PROJECT_EXTERNAL_REFERENCE_CODE
			).toString());

		Assertions.assertNull(
			_ldpEventSummaryUsageSource.fetchUsage(
				_createProject(), _createUsageDefinition(), _YEAR_MONTH));
	}

	@Test
	public void testSumsMetricKeyAcrossDataSources() throws Exception {
		_setUpEventSummary(_createEventSummary(100, 250));

		Assertions.assertEquals(
			350D,
			_ldpEventSummaryUsageSource.fetchUsage(
				_createProject(), _createUsageDefinition(), _YEAR_MONTH));
	}

	@Test
	public void testUnavailableDataOpsIsNull() throws Exception {
		Mockito.when(
			_dataOpsUsageService.fetchLDPProjectEventSummary(
				Mockito.anyString(), Mockito.anyString(), Mockito.anyString())
		).thenThrow(
			new DataOpsUnavailableException("Unable to reach DataOps", null)
		);

		Assertions.assertNull(
			_ldpEventSummaryUsageSource.fetchUsage(
				_createProject(), _createUsageDefinition(), _YEAR_MONTH));
	}

	private String _createEventSummary(long... eventsCounts) {
		JSONArray eventSummaryJSONArray = new JSONArray();

		for (long eventsCount : eventsCounts) {
			eventSummaryJSONArray.put(
				new JSONObject(
				).put(
					_METRIC_KEY, eventsCount
				).put(
					"dataSourceId", String.valueOf(eventsCount)
				));
		}

		return new JSONObject(
		).put(
			"eventSummary", eventSummaryJSONArray
		).put(
			"salesforceProjectId", _PROJECT_EXTERNAL_REFERENCE_CODE
		).toString();
	}

	private Project _createProject() {
		return new Project(
			new JSONObject(
			).put(
				"externalReferenceCode", _PROJECT_EXTERNAL_REFERENCE_CODE
			).put(
				"id", 1L
			));
	}

	private UsageDefinition _createUsageDefinition() {
		return new UsageDefinition(
			new JSONObject(
			).put(
				"id", 1L
			).put(
				"usageSource", LDPEventSummaryUsageSource.KEY
			).put(
				"usageSourceMetricKey", _METRIC_KEY
			));
	}

	private void _setUpEventSummary(String response) throws Exception {
		Mockito.when(
			_dataOpsUsageService.fetchLDPProjectEventSummary(
				Mockito.anyString(), Mockito.anyString(), Mockito.anyString())
		).thenReturn(
			response
		);
	}

	private static final String _METRIC_KEY = "eventsCount";

	private static final String _PROJECT_EXTERNAL_REFERENCE_CODE =
		"a0G5e00000ABCDEF";

	private static final YearMonth _YEAR_MONTH = YearMonth.of(2026, 2);

	private final DataOpsUsageService _dataOpsUsageService = Mockito.mock(
		DataOpsUsageService.class);
	private LDPEventSummaryUsageSource _ldpEventSummaryUsageSource;

}
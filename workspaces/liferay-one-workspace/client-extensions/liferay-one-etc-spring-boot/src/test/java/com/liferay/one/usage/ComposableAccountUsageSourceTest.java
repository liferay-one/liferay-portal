/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.usage;

import com.liferay.one.exception.DataOpsUnavailableException;
import com.liferay.one.model.Project;
import com.liferay.one.model.UsageDefinition;
import com.liferay.one.service.DataOpsUsageService;
import com.liferay.one.service.PropertyService;

import java.time.YearMonth;

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
@DisplayName("[CLS-COMPOSABLEACCOUNTUSAGESOURCE] ComposableAccountUsageSource")
public class ComposableAccountUsageSourceTest {

	@BeforeEach
	public void setUp() throws Exception {
		_composableAccountUsageSource = new ComposableAccountUsageSource();

		ReflectionTestUtils.setField(
			_composableAccountUsageSource, "_dataOpsUsageService",
			_dataOpsUsageService);
		ReflectionTestUtils.setField(
			_composableAccountUsageSource, "_propertyService",
			_propertyService);

		Mockito.when(
			_propertyService.getDataOpsAccountKey(Mockito.any(Project.class))
		).thenReturn(
			_ACCOUNT_KEY
		);
	}

	@Test
	public void testAsksForTheAccountAndMonth() throws Exception {
		_setUpUsage(_createUsage(_METRIC_KEY, 1.5));

		_composableAccountUsageSource.fetchUsage(
			_createProject(), _createUsageDefinition(), _YEAR_MONTH);

		Mockito.verify(
			_dataOpsUsageService
		).fetchComposableAccountUsage(
			_ACCOUNT_KEY, "2026-02"
		);
	}

	@Test
	public void testIsKeyedByAccount() {
		Assertions.assertTrue(_composableAccountUsageSource.isKeyedByAccount());
	}

	@Test
	public void testMissingDataIsNull() throws Exception {
		_setUpUsage(null);

		Assertions.assertNull(
			_composableAccountUsageSource.fetchUsage(
				_createProject(), _createUsageDefinition(), _YEAR_MONTH));

		_setUpUsage(
			new JSONObject(
			).toString());

		Assertions.assertNull(
			_composableAccountUsageSource.fetchUsage(
				_createProject(), _createUsageDefinition(), _YEAR_MONTH));
	}

	@Test
	public void testMissingMetricKeyIsNull() throws Exception {
		_setUpUsage(_createUsage("logStorage", 1024));

		Assertions.assertNull(
			_composableAccountUsageSource.fetchUsage(
				_createProject(), _createUsageDefinition(), _YEAR_MONTH));
	}

	@Test
	public void testReadsMetricKey() throws Exception {
		_setUpUsage(_createUsage(_METRIC_KEY, 9.5));

		Assertions.assertEquals(
			9.5D,
			_composableAccountUsageSource.fetchUsage(
				_createProject(), _createUsageDefinition(), _YEAR_MONTH));
	}

	@Test
	public void testUnavailableDataOpsIsNull() throws Exception {
		Mockito.when(
			_dataOpsUsageService.fetchComposableAccountUsage(
				Mockito.anyString(), Mockito.anyString())
		).thenThrow(
			new DataOpsUnavailableException("Unable to reach DataOps", null)
		);

		Assertions.assertNull(
			_composableAccountUsageSource.fetchUsage(
				_createProject(), _createUsageDefinition(), _YEAR_MONTH));
	}

	@Test
	public void testZeroUsageIsZero() throws Exception {
		_setUpUsage(_createUsage(_METRIC_KEY, 0));

		Assertions.assertEquals(
			0D,
			_composableAccountUsageSource.fetchUsage(
				_createProject(), _createUsageDefinition(), _YEAR_MONTH));
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

	private String _createUsage(String metricKey, double value) {
		return new JSONObject(
		).put(
			"usage",
			new JSONObject(
			).put(
				metricKey, value
			)
		).toString();
	}

	private UsageDefinition _createUsageDefinition() {
		return new UsageDefinition(
			new JSONObject(
			).put(
				"id", 1L
			).put(
				"usageSource", ComposableAccountUsageSource.KEY
			).put(
				"usageSourceMetricKey", _METRIC_KEY
			));
	}

	private void _setUpUsage(String response) throws Exception {
		Mockito.when(
			_dataOpsUsageService.fetchComposableAccountUsage(
				Mockito.anyString(), Mockito.anyString())
		).thenReturn(
			response
		);
	}

	private static final String _ACCOUNT_KEY = "abc-123-def";

	private static final String _METRIC_KEY = "clientExtensionsCPU";

	private static final String _PROJECT_EXTERNAL_REFERENCE_CODE = "PRJCT-004";

	private static final YearMonth _YEAR_MONTH = YearMonth.of(2026, 2);

	private ComposableAccountUsageSource _composableAccountUsageSource;
	private final DataOpsUsageService _dataOpsUsageService = Mockito.mock(
		DataOpsUsageService.class);
	private final PropertyService _propertyService = Mockito.mock(
		PropertyService.class);

}
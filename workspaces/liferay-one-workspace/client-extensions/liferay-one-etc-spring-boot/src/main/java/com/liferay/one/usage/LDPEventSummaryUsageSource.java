/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.usage;

import com.liferay.one.exception.DataOpsUnavailableException;
import com.liferay.one.model.Project;
import com.liferay.one.model.UsageDefinition;
import com.liferay.one.service.DataOpsUsageService;
import com.liferay.portal.kernel.util.Validator;

import java.time.YearMonth;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Reads the Liferay Data Platform Metrics API event summary, which counts a
 * project's events per data source over a date range. The metric key names
 * the counter inside each <code>eventSummary</code> element, and the counters
 * are summed across data sources.
 *
 * @author Drew Brokke
 */
@Component
public class LDPEventSummaryUsageSource implements UsageSource {

	public static final String KEY = "ldp-event-summary";

	@Override
	public Double fetchUsage(
			Project project, UsageDefinition usageDefinition,
			YearMonth yearMonth)
		throws Exception {

		String projectExternalReferenceCode =
			project.getExternalReferenceCode();

		String response = null;

		try {
			response = _dataOpsUsageService.fetchLDPProjectEventSummary(
				String.valueOf(yearMonth.atEndOfMonth()),
				projectExternalReferenceCode,
				String.valueOf(yearMonth.atDay(1)));
		}
		catch (DataOpsUnavailableException dataOpsUnavailableException) {
			_log.error(
				"Unable to read LDP event usage for project " +
					projectExternalReferenceCode,
				dataOpsUnavailableException);

			return null;
		}

		if (Validator.isNull(response)) {
			return null;
		}

		JSONObject jsonObject = new JSONObject(response);

		JSONArray eventSummaryJSONArray = jsonObject.optJSONArray(
			"eventSummary");

		if (eventSummaryJSONArray == null) {
			return null;
		}

		double usage = 0;

		for (int i = 0; i < eventSummaryJSONArray.length(); i++) {
			JSONObject eventSummaryJSONObject =
				eventSummaryJSONArray.getJSONObject(i);

			usage += eventSummaryJSONObject.optDouble(
				usageDefinition.getUsageSourceMetricKey(), 0);
		}

		return usage;
	}

	@Override
	public String getKey() {
		return KEY;
	}

	private static final Log _log = LogFactory.getLog(
		LDPEventSummaryUsageSource.class);

	@Autowired
	private DataOpsUsageService _dataOpsUsageService;

}
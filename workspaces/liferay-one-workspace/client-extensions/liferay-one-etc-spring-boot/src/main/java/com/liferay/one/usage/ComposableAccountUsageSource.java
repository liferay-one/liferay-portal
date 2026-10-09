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
import com.liferay.portal.kernel.util.Validator;

import java.time.YearMonth;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Reads the composable usage API, which reports the Experience consumption of
 * an account for one month: client extension vCPUs and RAM, database, storage,
 * network traffic, and logs. The API is keyed by the DataOps account key, not
 * by the project, so every project of an account reads the same numbers. The
 * metric key names a field under <code>usage</code>.
 *
 * @author Drew Brokke
 */
@Component
public class ComposableAccountUsageSource implements UsageSource {

	public static final String KEY = "composable-account-usage";

	@Override
	public Double fetchUsage(
			Project project, UsageDefinition usageDefinition,
			YearMonth yearMonth)
		throws Exception {

		String response = null;

		try {
			response = _dataOpsUsageService.fetchComposableAccountUsage(
				_propertyService.getDataOpsAccountKey(project),
				yearMonth.toString());
		}
		catch (DataOpsUnavailableException dataOpsUnavailableException) {
			_log.error(
				"Unable to read composable usage for project " +
					project.getExternalReferenceCode(),
				dataOpsUnavailableException);

			return null;
		}

		if (Validator.isNull(response)) {
			return null;
		}

		JSONObject jsonObject = new JSONObject(response);

		JSONObject usageJSONObject = jsonObject.optJSONObject("usage");

		String usageSourceMetricKey = usageDefinition.getUsageSourceMetricKey();

		if ((usageJSONObject == null) ||
			!usageJSONObject.has(usageSourceMetricKey)) {

			return null;
		}

		return usageJSONObject.optDouble(usageSourceMetricKey);
	}

	@Override
	public String getKey() {
		return KEY;
	}

	@Override
	public boolean isKeyedByAccount() {
		return true;
	}

	private static final Log _log = LogFactory.getLog(
		ComposableAccountUsageSource.class);

	@Autowired
	private DataOpsUsageService _dataOpsUsageService;

	@Autowired
	private PropertyService _propertyService;

}
/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.model.UsageReport;
import com.liferay.one.service.UsageReportService;
import com.liferay.portal.kernel.util.StringUtil;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * @author Ryan Schuhler
 */
@RequestMapping("/object/action/usage/report/approved")
@RestController
public class ObjectActionUsageReportApprovedRestController
	extends OneBaseRestController {

	@PostMapping
	public void post(@RequestBody String json) throws Exception {
		JSONObject jsonObject = new JSONObject(json);

		JSONObject objectEntryJSONObject = jsonObject.optJSONObject(
			"objectEntry");

		if (objectEntryJSONObject == null) {
			if (_log.isWarnEnabled()) {
				_log.warn(
					"Unable to find the usage report for class PK " +
						jsonObject.optLong("classPK"));
			}

			return;
		}

		// The action fires on every update, so only an approved report goes
		// on. Creating the overage order and the Salesforce opportunity is
		// not implemented yet.

		UsageReport usageReport = _usageReportService.fetchUsageReport(
			objectEntryJSONObject.optString("externalReferenceCode"));

		if ((usageReport == null) ||
			!StringUtil.equals(
				usageReport.getReviewStatus(),
				UsageReportService.REVIEW_STATUS_APPROVED)) {

			return;
		}

		if (_log.isWarnEnabled()) {
			_log.warn(
				"Unable to create an overage order for usage report " +
					usageReport.getExternalReferenceCode());
		}
	}

	private static final Log _log = LogFactory.getLog(
		ObjectActionUsageReportApprovedRestController.class);

	@Autowired
	private UsageReportService _usageReportService;

}
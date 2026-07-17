/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.license;

import com.liferay.one.constants.ProductEnvironment;
import com.liferay.one.util.LocaleUtil;

import java.text.DateFormat;
import java.text.SimpleDateFormat;

import java.time.Instant;

import java.util.Date;

import org.json.JSONObject;
import org.json.XML;

import org.springframework.stereotype.Component;

/**
 * @author Allen Ziegenfus
 */
@Component
public class CommonLicenseKeyParser {

	public CommonLicenseKeyData parseCommerce(String fileContent)
		throws Exception {

		JSONObject jsonObject = XML.toJSONObject(fileContent);

		JSONObject rootJSONObject = jsonObject.getJSONObject(
			jsonObject.keys(
			).next());

		DateFormat dateFormat = new SimpleDateFormat(
			"EEEE, MMMM d, yyyy hh:mm:ss a z", LocaleUtil.US);

		Date endDate = dateFormat.parse(
			rootJSONObject.getString("expiration-date"));
		Date startDate = dateFormat.parse(
			rootJSONObject.getString("start-date"));

		return new CommonLicenseKeyData(
			_toProductEnvironment(rootJSONObject.getString("description")),
			startDate.toInstant(), endDate.toInstant());
	}

	public CommonLicenseKeyData parseEnterpriseSearch(String fileContent) {
		JSONObject jsonObject = new JSONObject(fileContent);

		JSONObject licenseJSONObject = jsonObject.getJSONObject("license");

		return new CommonLicenseKeyData(
			_toProductEnvironment(licenseJSONObject.getString("issued_to")),
			Instant.ofEpochMilli(
				licenseJSONObject.getLong("start_date_in_millis")),
			Instant.ofEpochMilli(
				licenseJSONObject.getLong("expiry_date_in_millis")));
	}

	private String _toProductEnvironment(String text) {
		String lowerCaseText = text.toLowerCase(LocaleUtil.US);

		if (lowerCaseText.contains(ProductEnvironment.BACKUP)) {
			return ProductEnvironment.BACKUP;
		}

		if (lowerCaseText.contains(ProductEnvironment.NONPRODUCTION)) {
			return ProductEnvironment.NONPRODUCTION;
		}

		return ProductEnvironment.PRODUCTION;
	}

}
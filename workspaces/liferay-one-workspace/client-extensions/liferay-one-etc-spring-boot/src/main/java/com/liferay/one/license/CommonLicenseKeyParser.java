/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.license;

import com.liferay.one.constants.UploadProductEnvironmentConstants;
import com.liferay.one.util.LocaleUtil;

import java.text.DateFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;

import java.time.Instant;

import java.util.Date;
import java.util.Iterator;
import java.util.NoSuchElementException;

import org.json.JSONException;
import org.json.JSONObject;
import org.json.XML;

import org.springframework.stereotype.Component;

/**
 * @author Allen Ziegenfus
 */
@Component
public class CommonLicenseKeyParser {

	public CommonLicenseKeyData parseCommerce(String fileContent) {
		try {
			JSONObject jsonObject = XML.toJSONObject(fileContent);

			Iterator<String> keysIterator = jsonObject.keys();

			JSONObject rootJSONObject = jsonObject.getJSONObject(
				keysIterator.next());

			DateFormat dateFormat = new SimpleDateFormat(
				_COMMERCE_LICENSE_DATE_FORMAT, LocaleUtil.US);

			Date endDate = dateFormat.parse(
				rootJSONObject.getString("expiration-date"));
			Date startDate = dateFormat.parse(
				rootJSONObject.getString("start-date"));

			return new CommonLicenseKeyData(
				endDate.toInstant(),
				_toProductEnvironment(rootJSONObject.getString("description")),
				startDate.toInstant());
		}
		catch (JSONException | NoSuchElementException | ParseException
					exception) {

			throw new IllegalArgumentException(
				"Unable to parse the Commerce license file", exception);
		}
	}

	public CommonLicenseKeyData parseEnterpriseSearch(String fileContent) {
		try {
			JSONObject jsonObject = new JSONObject(fileContent);

			JSONObject licenseJSONObject = jsonObject.getJSONObject("license");

			return new CommonLicenseKeyData(
				Instant.ofEpochMilli(
					licenseJSONObject.getLong("expiry_date_in_millis")),
				_toProductEnvironment(licenseJSONObject.getString("issued_to")),
				Instant.ofEpochMilli(
					licenseJSONObject.getLong("start_date_in_millis")));
		}
		catch (JSONException jsonException) {
			throw new IllegalArgumentException(
				"Unable to parse the Enterprise Search license file",
				jsonException);
		}
	}

	private String _toProductEnvironment(String text) {
		String lowerCaseText = text.toLowerCase(LocaleUtil.US);

		if (lowerCaseText.contains(UploadProductEnvironmentConstants.BACKUP)) {
			return UploadProductEnvironmentConstants.BACKUP;
		}

		if (lowerCaseText.contains(
				UploadProductEnvironmentConstants.NONPRODUCTION)) {

			return UploadProductEnvironmentConstants.NONPRODUCTION;
		}

		return UploadProductEnvironmentConstants.PRODUCTION;
	}

	private static final String _COMMERCE_LICENSE_DATE_FORMAT =
		"EEEE, MMMM d, yyyy hh:mm:ss a z";

}
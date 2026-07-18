/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.license;

import com.liferay.one.constants.UploadProductEnvironmentConstants;

import java.time.Instant;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

/**
 * @author Allen Ziegenfus
 */
public class CommonLicenseKeyParserTest {

	@Test
	public void testParseCommerceBackup() throws Exception {
		CommonLicenseKeyData commonLicenseKeyData =
			_commonLicenseKeyParser.parseCommerce(
				_commerceXML(
					"Backup server", "Monday, January 1, 2024 12:00:00 AM UTC",
					"Wednesday, January 1, 2025 12:00:00 AM UTC"));

		Assertions.assertEquals(
			UploadProductEnvironmentConstants.BACKUP,
			commonLicenseKeyData.getProductEnvironment());
	}

	@Test
	public void testParseCommerceProduction() throws Exception {
		CommonLicenseKeyData commonLicenseKeyData =
			_commonLicenseKeyParser.parseCommerce(
				_commerceXML(
					"Production instance",
					"Monday, January 1, 2024 12:00:00 AM UTC",
					"Wednesday, January 1, 2025 12:00:00 AM UTC"));

		Assertions.assertEquals(
			UploadProductEnvironmentConstants.PRODUCTION,
			commonLicenseKeyData.getProductEnvironment());
		Assertions.assertEquals(
			Instant.parse("2024-01-01T00:00:00Z"),
			commonLicenseKeyData.getStartDateInstant());
		Assertions.assertEquals(
			Instant.parse("2025-01-01T00:00:00Z"),
			commonLicenseKeyData.getEndDateInstant());
	}

	@Test
	public void testParseCommerceThrowsForUnparsableFile() {
		Assertions.assertThrows(
			IllegalArgumentException.class,
			() -> _commonLicenseKeyParser.parseCommerce(
				_commerceXML(
					"Production instance", "not a date", "not a date")));
	}

	@Test
	public void testParseEnterpriseSearchNonproduction() {
		CommonLicenseKeyData commonLicenseKeyData =
			_commonLicenseKeyParser.parseEnterpriseSearch(
				_enterpriseSearchJSON(
					"Acme Non-Production", 1704067200000L, 1735689600000L));

		Assertions.assertEquals(
			UploadProductEnvironmentConstants.NONPRODUCTION,
			commonLicenseKeyData.getProductEnvironment());
		Assertions.assertEquals(
			Instant.ofEpochMilli(1704067200000L),
			commonLicenseKeyData.getStartDateInstant());
		Assertions.assertEquals(
			Instant.ofEpochMilli(1735689600000L),
			commonLicenseKeyData.getEndDateInstant());
	}

	@Test
	public void testParseEnterpriseSearchProduction() {
		CommonLicenseKeyData commonLicenseKeyData =
			_commonLicenseKeyParser.parseEnterpriseSearch(
				_enterpriseSearchJSON("Acme", 1L, 2L));

		Assertions.assertEquals(
			UploadProductEnvironmentConstants.PRODUCTION,
			commonLicenseKeyData.getProductEnvironment());
	}

	private String _commerceXML(
		String description, String startDate, String expirationDate) {

		return String.format(
			"<license><product-name>Liferay Commerce</product-name>" +
				"<description>%s</description><start-date>%s</start-date>" +
					"<expiration-date>%s</expiration-date></license>",
			description, startDate, expirationDate);
	}

	private String _enterpriseSearchJSON(
		String issuedTo, long startMillis, long expiryMillis) {

		return String.format(
			"{\"license\":{\"issued_to\":\"%s\"," +
				"\"start_date_in_millis\":%d,\"expiry_date_in_millis\":%d}}",
			issuedTo, startMillis, expiryMillis);
	}

	private final CommonLicenseKeyParser _commonLicenseKeyParser =
		new CommonLicenseKeyParser();

}
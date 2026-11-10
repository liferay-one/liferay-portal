/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.one.license.LicenseKeyExporter;
import com.liferay.one.license.LicenseKeyGenerator;

import java.io.InputStream;

import java.nio.charset.StandardCharsets;

import java.time.Instant;

import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Amos Fong
 */
@DisplayName("[SVC-TRIALLICENSEKEYSERVICE] TrialLicenseKeyService")
public class TrialLicenseKeyServiceTest {

	@BeforeEach
	public void setUp() {
		LicenseKeyGenerator licenseKeyGenerator = new LicenseKeyGenerator();

		LicenseKeyExporter licenseKeyExporter = new LicenseKeyExporter();

		ReflectionTestUtils.setField(
			licenseKeyExporter, "_licenseKeyGenerator", licenseKeyGenerator);

		ReflectionTestUtils.setField(
			_trialLicenseKeyService, "_licenseKeyExporter", licenseKeyExporter);

		ReflectionTestUtils.setField(
			_trialLicenseKeyService, "_licenseKeyGenerator",
			licenseKeyGenerator);
	}

	@Test
	public void testGetCMSTrialLicenseKeyXML() throws Exception {
		Assertions.assertEquals(
			_read("trial_cms_license_key.xml"),
			_trialLicenseKeyService.getCMSTrialLicenseKeyXML(
				_LICENSE_LIFETIME, _OWNER, _START_TIME));
	}

	@Test
	public void testGetDXPTrialLicenseKeyXML() throws Exception {
		Assertions.assertEquals(
			_read("trial_dxp_license_key.xml"),
			_trialLicenseKeyService.getDXPTrialLicenseKeyXML(
				_LICENSE_LIFETIME, _OWNER, _START_TIME));
	}

	@Test
	public void testGetDXPTrialLicenseKeyXMLDropsMilliseconds()
		throws Exception {

		Assertions.assertEquals(
			_read("trial_dxp_license_key.xml"),
			_trialLicenseKeyService.getDXPTrialLicenseKeyXML(
				_LICENSE_LIFETIME + 500, _OWNER, _START_TIME + 999));
	}

	@Test
	public void testGetDXPTrialLicenseKeyXMLUsesQuarterOfStartDate()
		throws Exception {

		Instant instant = Instant.parse("2027-01-01T00:00:00Z");

		String xml = _trialLicenseKeyService.getDXPTrialLicenseKeyXML(
			_LICENSE_LIFETIME, _OWNER, instant.toEpochMilli());

		Assertions.assertTrue(
			xml.contains("<product-version>2027.Q1</product-version>"));

		instant = Instant.parse("2026-12-31T23:59:59Z");

		xml = _trialLicenseKeyService.getDXPTrialLicenseKeyXML(
			_LICENSE_LIFETIME, _OWNER, instant.toEpochMilli());

		Assertions.assertTrue(
			xml.contains("<product-version>2026.Q4</product-version>"));
	}

	private String _read(String fileName) throws Exception {
		try (InputStream inputStream =
				TrialLicenseKeyServiceTest.class.getResourceAsStream(
					"dependencies/" + fileName)) {

			return new String(
				inputStream.readAllBytes(), StandardCharsets.UTF_8);
		}
	}

	private static final long _LICENSE_LIFETIME = TimeUnit.DAYS.toMillis(90);

	private static final String _OWNER = "docker@liferay.com";

	private static final long _START_TIME = Instant.parse(
		"2026-11-10T00:00:00Z"
	).toEpochMilli();

	private final TrialLicenseKeyService _trialLicenseKeyService =
		new TrialLicenseKeyService();

}
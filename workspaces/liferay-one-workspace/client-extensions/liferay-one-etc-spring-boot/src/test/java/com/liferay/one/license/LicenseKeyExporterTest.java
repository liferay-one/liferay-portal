/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.license;

import com.liferay.one.model.LicenseKey;
import com.liferay.portal.ee.license.shared.LicenseConstants;

import java.io.ByteArrayInputStream;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import org.json.JSONArray;
import org.json.JSONObject;
import org.json.XML;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Allen Ziegenfus
 */
public class LicenseKeyExporterTest {

	@BeforeEach
	public void setUp() {
		_licenseKeyExporter = new LicenseKeyExporter();

		ReflectionTestUtils.setField(
			_licenseKeyExporter, "_licenseKeyGenerator",
			new LicenseKeyGenerator());
	}

	@Test
	public void testAggregateXMLsCombinesLicenses() throws Exception {
		String aggregateXML = _licenseKeyExporter.aggregateXMLs(
			new String[] {_toXML("KEY1"), _toXML("KEY2")});

		JSONObject jsonObject = XML.toJSONObject(aggregateXML);

		JSONObject licensesJSONObject = jsonObject.getJSONObject("licenses");

		JSONArray licenseJSONArray = licensesJSONObject.getJSONArray("license");

		Assertions.assertEquals(2, licenseJSONArray.length());

		JSONObject firstLicenseJSONObject = licenseJSONArray.getJSONObject(0);

		Assertions.assertEquals(
			"KEY1", firstLicenseJSONObject.getString("key"));

		JSONObject hostNamesJSONObject = firstLicenseJSONObject.getJSONObject(
			"host-names");

		Assertions.assertEquals(
			"host.example.com", hostNamesJSONObject.getString("host-name"));

		JSONObject secondLicenseJSONObject = licenseJSONArray.getJSONObject(1);

		Assertions.assertEquals(
			"KEY2", secondLicenseJSONObject.getString("key"));
	}

	@Test
	public void testGetFileNameFromLicenseKey() {
		Assertions.assertEquals(
			"activation-key-dxp-2025.q3.9-key-1.xml",
			_licenseKeyExporter.getFileName(
				_toLicenseKey(1L, "KEY1", "key-1")));
	}

	@Test
	public void testGetFileNameFromLicenseKeys() {
		Assertions.assertEquals(
			"activation-key-dxp-key-1-key-2.xml",
			_licenseKeyExporter.getFileName(
				List.of(
					_toLicenseKey(1L, "KEY1", "key-1"),
					_toLicenseKey(2L, "KEY2", "key-2"))));
	}

	@Test
	public void testGetFileNameStripsPathSeparators() {
		Assertions.assertEquals(
			"activation-key-dxp-7.4-......etccron.d.xml",
			_licenseKeyExporter.getFileName(
				"DXP", "7.4", "../../../etc/cron.d"));
	}

	@Test
	public void testGetFileNameStripsQuotes() {
		Assertions.assertEquals(
			"activation-key-dxp-7.4-evil.xml",
			_licenseKeyExporter.getFileName("DXP", "7.4", "ev\"il"));
	}

	@Test
	public void testToXMLEscapesSpecialCharacters() throws Exception {
		String xml = _licenseKeyExporter.toXML(
			"TESTKEY", "Acme Corp", "Enterprise",
			LicenseConstants.TYPE_ENTERPRISE, 3, "Liferay DXP", "", "7.4",
			"Acme Corp", 0, 0, 0, 0L, 0L, "", "R&D <secure> \"team\"", "",
			"host.example.com", "127.0.0.1", "00:11:22:33:44:55", "srv-1",
			new Date(1000000000000L), new Date(2000000000000L));

		Assertions.assertTrue(xml.startsWith("<?xml "));

		JSONObject jsonObject = XML.toJSONObject(xml);

		JSONObject licenseJSONObject = jsonObject.getJSONObject("license");

		Assertions.assertEquals(
			"Acme Corp", licenseJSONObject.getString("owner"));
		Assertions.assertEquals(
			"R&D <secure> \"team\"",
			licenseJSONObject.getString("description"));
		Assertions.assertEquals("TESTKEY", licenseJSONObject.getString("key"));
	}

	@Test
	public void testToXMLFromLicenseKey() throws Exception {
		String xml = _licenseKeyExporter.toXML(
			_toLicenseKey(1L, "KEY1", "key-1"));

		JSONObject jsonObject = XML.toJSONObject(xml);

		JSONObject licenseJSONObject = jsonObject.getJSONObject("license");

		Assertions.assertEquals("KEY1", licenseJSONObject.getString("key"));
		Assertions.assertEquals(
			"owner@example.com", licenseJSONObject.getString("owner"));
		Assertions.assertEquals(
			"DXP", licenseJSONObject.getString("product-name"));
	}

	@Test
	public void testToZipRenamesDuplicateFileNames() throws Exception {
		byte[] bytes = _licenseKeyExporter.toZip(
			List.of(
				_toLicenseKey(1L, "KEY1", "key-1"),
				_toLicenseKey(2L, "KEY2", "key-1")));

		Assertions.assertEquals(
			List.of(
				"activation-key-dxp-2025.q3.9-key-1.xml",
				"2-activation-key-dxp-2025.q3.9-key-1.xml"),
			_getZipEntryNames(bytes));
	}

	private List<String> _getZipEntryNames(byte[] bytes) throws Exception {
		List<String> names = new ArrayList<>();

		try (ZipInputStream zipInputStream = new ZipInputStream(
				new ByteArrayInputStream(bytes))) {

			ZipEntry zipEntry = zipInputStream.getNextEntry();

			while (zipEntry != null) {
				names.add(zipEntry.getName());

				zipEntry = zipInputStream.getNextEntry();
			}
		}

		return names;
	}

	private LicenseKey _toLicenseKey(
		long licenseKeyId, String key, String name) {

		return new LicenseKey(
			new JSONObject(
			).put(
				"accountName", "Acme"
			).put(
				"customExpirationDate", "2027-01-01T00:00:00Z"
			).put(
				"description", "Production license"
			).put(
				"hostName", "host.example.com"
			).put(
				"id", licenseKeyId
			).put(
				"ipAddresses", "127.0.0.1"
			).put(
				"key", key
			).put(
				"licenseName", "Enterprise"
			).put(
				"licenseType", LicenseConstants.TYPE_ENTERPRISE
			).put(
				"licenseVersion", 3
			).put(
				"macAddresses", "00:11:22:33:44:55"
			).put(
				"name", name
			).put(
				"owner", "owner@example.com"
			).put(
				"productExternalId", "portal"
			).put(
				"productName", "DXP"
			).put(
				"productVersion", "2025.q3.9"
			).put(
				"serverId", "srv-1"
			).put(
				"startDate", "2026-01-01T00:00:00Z"
			));
	}

	private String _toXML(String key) throws Exception {
		return _licenseKeyExporter.toXML(
			key, "Acme Corp", "Enterprise", LicenseConstants.TYPE_PRODUCTION, 4,
			"Liferay DXP", "", "7.4", "Acme Corp", 0, 1, 0, 0L, 0L, "",
			"Production license", "", "host.example.com", "127.0.0.1",
			"00:11:22:33:44:55", "srv-1", new Date(1000000000000L),
			new Date(2000000000000L));
	}

	private LicenseKeyExporter _licenseKeyExporter;

}
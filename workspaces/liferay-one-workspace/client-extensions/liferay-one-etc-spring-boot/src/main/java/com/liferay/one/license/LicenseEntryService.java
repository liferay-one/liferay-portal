/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.license;

import com.liferay.one.util.comparator.VersionComparator;
import com.liferay.portal.kernel.util.Validator;

import java.io.BufferedReader;
import java.io.InputStreamReader;

import java.nio.charset.StandardCharsets;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

/**
 * @author Allen Ziegenfus
 * @author Brian Wing Shun Chan
 * @author Amos Fong
 */
@Component
public class LicenseEntryService {

	public List<LicenseEntry> getLicenseEntries(String productKey) {
		List<LicenseEntry> licenseEntries = new ArrayList<>();

		for (LicenseEntry licenseEntry : _licenseEntries) {
			if (Objects.equals(licenseEntry.getProductKey(), productKey)) {
				licenseEntries.add(licenseEntry);
			}
		}

		return licenseEntries;
	}

	public List<LicenseEntry> getLicenseEntriesByNameVersion(
		String name, String version) {

		return _filterByVersion(_findByLikeName(name), version);
	}

	public List<LicenseEntry> getLicenseEntriesByProductKeyVersion(
		String productKey, String version) {

		return _filterByVersion(getLicenseEntries(productKey), version);
	}

	public List<LicenseEntry> getLicenseEntriesByType(String type) {
		List<LicenseEntry> licenseEntries = new ArrayList<>();

		for (LicenseEntry licenseEntry : _licenseEntries) {
			if (Objects.equals(licenseEntry.getType(), type)) {
				licenseEntries.add(licenseEntry);
			}
		}

		return licenseEntries;
	}

	public LicenseEntry getLicenseEntry(String productKey, String type) {
		for (LicenseEntry licenseEntry : _licenseEntries) {
			if (Objects.equals(licenseEntry.getProductKey(), productKey) &&
				Objects.equals(licenseEntry.getType(), type)) {

				return licenseEntry;
			}
		}

		return null;
	}

	private List<LicenseEntry> _filterByVersion(
		List<LicenseEntry> licenseEntries, String version) {

		List<LicenseEntry> filteredLicenseEntries = new ArrayList<>();

		if (Validator.isNull(version)) {
			return filteredLicenseEntries;
		}

		for (LicenseEntry licenseEntry : licenseEntries) {
			if ((Validator.isNull(licenseEntry.getVersionMin()) ||
				 _isLessThan(licenseEntry.getVersionMin(), version)) &&
				(Validator.isNull(licenseEntry.getVersionMax()) ||
				 _isLessThan(version, licenseEntry.getVersionMax()))) {

				filteredLicenseEntries.add(licenseEntry);
			}
		}

		return filteredLicenseEntries;
	}

	private List<LicenseEntry> _findByLikeName(String name) {
		Pattern pattern = _toLikePattern(name);

		List<LicenseEntry> licenseEntries = new ArrayList<>();

		for (LicenseEntry licenseEntry : _licenseEntries) {
			if (pattern.matcher(
					licenseEntry.getName()
				).matches()) {

				licenseEntries.add(licenseEntry);
			}
		}

		return licenseEntries;
	}

	private boolean _isLessThan(String version1, String version2) {
		VersionComparator versionComparator = new VersionComparator();

		int result = versionComparator.compare(version1, version2);

		if (result <= 0) {
			return true;
		}

		return false;
	}

	private Pattern _toLikePattern(String name) {
		String[] segments = name.split("%", -1);

		StringBuilder sb = new StringBuilder();

		for (int i = 0; i < segments.length; i++) {
			if (i > 0) {
				sb.append(".*");
			}

			if (Validator.isNotNull(segments[i])) {
				sb.append(Pattern.quote(segments[i]));
			}
		}

		return Pattern.compile(sb.toString(), Pattern.CASE_INSENSITIVE);
	}

	private static final List<LicenseEntry> _licenseEntries;

	static {
		List<LicenseEntry> licenseEntries = new ArrayList<>();

		try (BufferedReader bufferedReader = new BufferedReader(
				new InputStreamReader(
					LicenseEntryService.class.getResourceAsStream(
						"/license-entries.csv"),
					StandardCharsets.UTF_8))) {

			String line = null;

			while ((line = bufferedReader.readLine()) != null) {
				if (Validator.isNull(line)) {
					continue;
				}

				String[] fields = line.split(",", 5);

				licenseEntries.add(
					new LicenseEntry(
						fields[0], fields[1], fields[2], fields[3], fields[4]));
			}

			_licenseEntries = Collections.unmodifiableList(licenseEntries);
		}
		catch (Exception exception) {
			throw new ExceptionInInitializerError(exception);
		}
	}

}
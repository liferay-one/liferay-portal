/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.license;

import com.liferay.petra.string.StringPool;
import com.liferay.portal.kernel.util.Validator;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import javax.annotation.PostConstruct;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * @author Ryan Schuhler
 */
@Component
@ConfigurationProperties(prefix = "liferay.one.license.key")
public class LicenseKeyTypeService {

	public String getAdminTypes() {
		return _adminTypes;
	}

	public boolean isAdminType(LicenseKeyType licenseKeyType) {
		return _adminLicenseKeyTypes.contains(licenseKeyType);
	}

	// Some key types are ours to issue rather than a customer's to ask for, so
	// they are offered only to an administrator.

	public void setAdminTypes(String adminTypes) {
		_adminTypes = adminTypes;
	}

	public List<LicenseKeyType> getLicenseKeyTypes(
		String externalReferenceCode) {

		return _licenseKeyTypes.getOrDefault(
			externalReferenceCode, Collections.emptyList());
	}

	public Map<String, String> getTypes() {
		return _types;
	}

	// A product offers the key types configured against its external reference
	// code, so a product is added by configuration rather than by code. Holding
	// no key types is what makes a product an add-on rather than one that can
	// lead an activation key.

	public void setTypes(Map<String, String> types) {
		_types = types;
	}

	@PostConstruct
	protected void init() {
		Map<String, List<LicenseKeyType>> licenseKeyTypes =
			new LinkedHashMap<>();

		for (Map.Entry<String, String> entry : _types.entrySet()) {
			licenseKeyTypes.put(
				entry.getKey(), _toLicenseKeyTypes(entry.getValue()));
		}

		_licenseKeyTypes = Collections.unmodifiableMap(licenseKeyTypes);

		_adminLicenseKeyTypes = Collections.unmodifiableSet(
			new HashSet<>(_toLicenseKeyTypes(_adminTypes)));
	}

	private List<LicenseKeyType> _toLicenseKeyTypes(String keys) {
		List<LicenseKeyType> licenseKeyTypes = new ArrayList<>();

		if (Validator.isNull(keys)) {
			return Collections.unmodifiableList(licenseKeyTypes);
		}

		for (String key : keys.split(StringPool.COMMA)) {
			String trimmedKey = key.trim();

			if (Validator.isNull(trimmedKey)) {
				continue;
			}

			LicenseKeyType licenseKeyType = LicenseKeyType.fetchLicenseKeyType(
				trimmedKey);

			if (licenseKeyType == null) {
				_log.error("Unable to find license key type " + trimmedKey);

				continue;
			}

			licenseKeyTypes.add(licenseKeyType);
		}

		return Collections.unmodifiableList(licenseKeyTypes);
	}

	private static final Log _log = LogFactory.getLog(
		LicenseKeyTypeService.class);

	private volatile Set<LicenseKeyType> _adminLicenseKeyTypes =
		Collections.emptySet();
	private String _adminTypes = StringPool.BLANK;
	private volatile Map<String, List<LicenseKeyType>> _licenseKeyTypes =
		Collections.emptyMap();
	private Map<String, String> _types = new HashMap<>();

}
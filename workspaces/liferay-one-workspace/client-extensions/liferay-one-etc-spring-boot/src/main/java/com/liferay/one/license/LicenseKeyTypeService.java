/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.license;

import com.liferay.one.constants.LicenseKeyGenerationConstants;
import com.liferay.portal.kernel.util.HashMapBuilder;
import com.liferay.portal.kernel.util.Validator;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import javax.annotation.PostConstruct;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * @author Ryan Schuhler
 */
@Component
public class LicenseKeyTypeService {

	public List<LicenseKeyType> getLicenseKeyTypes(
		String externalReferenceCode) {

		return _licenseKeyTypes.getOrDefault(
			externalReferenceCode, Collections.emptyList());
	}

	@PostConstruct
	protected void init() {
		_licenseKeyTypes = Collections.unmodifiableMap(
			HashMapBuilder.put(
				LicenseKeyGenerationConstants.
					PRODUCT_EXTERNAL_REFERENCE_CODE_CLOUD_NATIVE,
				_toLicenseKeyTypes(_cloudNativeKeys)
			).put(
				LicenseKeyGenerationConstants.
					PRODUCT_EXTERNAL_REFERENCE_CODE_DXP,
				_toLicenseKeyTypes(_dxpKeys)
			).put(
				LicenseKeyGenerationConstants.
					PRODUCT_EXTERNAL_REFERENCE_CODE_PORTAL,
				_toLicenseKeyTypes(_portalKeys)
			).build());
	}

	private List<LicenseKeyType> _toLicenseKeyTypes(List<String> keys) {
		List<LicenseKeyType> licenseKeyTypes = new ArrayList<>();

		if (keys == null) {
			return Collections.unmodifiableList(licenseKeyTypes);
		}

		for (String key : keys) {
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

	@Value("${liferay.one.license.key.types.cloud.native}")
	private List<String> _cloudNativeKeys;

	@Value("${liferay.one.license.key.types.dxp}")
	private List<String> _dxpKeys;

	private volatile Map<String, List<LicenseKeyType>> _licenseKeyTypes =
		Collections.emptyMap();

	@Value("${liferay.one.license.key.types.portal}")
	private List<String> _portalKeys;

}
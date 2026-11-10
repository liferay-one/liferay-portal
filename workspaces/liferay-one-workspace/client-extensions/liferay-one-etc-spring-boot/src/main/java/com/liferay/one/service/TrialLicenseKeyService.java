/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.one.constants.LicenseKeyGenerationConstants;
import com.liferay.one.constants.LicenseVersion;
import com.liferay.one.license.LicenseKeyExporter;
import com.liferay.one.license.LicenseKeyGenerator;
import com.liferay.petra.string.StringBundler;
import com.liferay.petra.string.StringPool;
import com.liferay.portal.ee.license.shared.LicenseConstants;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.time.temporal.IsoFields;

import java.util.Date;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * @author Amos Fong
 */
@Component
public class TrialLicenseKeyService {

	public String getCMSTrialLicenseKeyXML(
			long licenseLifetime, String owner, long startTime)
		throws Exception {

		return _toLicenseKeyXML(
			licenseLifetime, owner, _PRODUCT_NAME_CMS, startTime);
	}

	public String getDXPTrialLicenseKeyXML(
			long licenseLifetime, String owner, long startTime)
		throws Exception {

		return _toLicenseKeyXML(
			licenseLifetime, owner, _PRODUCT_NAME_DXP, startTime);
	}

	private String _getProductVersion(Instant startInstant) {
		LocalDate localDate = LocalDate.ofInstant(startInstant, ZoneOffset.UTC);

		return StringBundler.concat(
			localDate.getYear(), ".Q",
			localDate.get(IsoFields.QUARTER_OF_YEAR));
	}

	private String _toLicenseKeyXML(
			long licenseLifetime, String owner, String productName,
			long startTime)
		throws Exception {

		Instant startInstant = Instant.ofEpochMilli(
			startTime
		).truncatedTo(
			ChronoUnit.SECONDS
		);

		String productVersion = _getProductVersion(startInstant);

		int licenseVersion = LicenseVersion.getLicenseVersion(
			productName, productVersion);

		Date expirationDate = Date.from(
			startInstant.plusMillis(
				licenseLifetime
			).truncatedTo(
				ChronoUnit.SECONDS
			));
		Date startDate = Date.from(startInstant);

		String key = _licenseKeyGenerator.generateKey(
			_ACCOUNT_NAME, productName, LicenseConstants.TYPE_DEVELOPER,
			licenseVersion, productName, LicenseConstants.PRODUCT_ID_PORTAL,
			productVersion, owner, 0, 0,
			LicenseKeyGenerationConstants.DEVELOPER_MAX_HTTP_SESSIONS, 0, 0,
			StringPool.BLANK, _DESCRIPTION, StringPool.BLANK, StringPool.BLANK,
			StringPool.BLANK, StringPool.BLANK, StringPool.BLANK, startDate,
			expirationDate);

		return _licenseKeyExporter.toXML(
			key, _ACCOUNT_NAME, productName, LicenseConstants.TYPE_DEVELOPER,
			licenseVersion, productName, LicenseConstants.PRODUCT_ID_PORTAL,
			productVersion, owner, 0, 0,
			LicenseKeyGenerationConstants.DEVELOPER_MAX_HTTP_SESSIONS, 0, 0,
			StringPool.BLANK, _DESCRIPTION, StringPool.BLANK, StringPool.BLANK,
			StringPool.BLANK, StringPool.BLANK, StringPool.BLANK, startDate,
			expirationDate);
	}

	private static final String _ACCOUNT_NAME = "Liferay Docker";

	private static final String _DESCRIPTION = "Trial Activation Key";

	private static final String _PRODUCT_NAME_CMS = "CMS Developer";

	private static final String _PRODUCT_NAME_DXP = "DXP Development";

	@Autowired
	private LicenseKeyExporter _licenseKeyExporter;

	@Autowired
	private LicenseKeyGenerator _licenseKeyGenerator;

}
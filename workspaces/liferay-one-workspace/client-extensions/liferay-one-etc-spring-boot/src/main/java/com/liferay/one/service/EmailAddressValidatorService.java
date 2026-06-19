/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * @author Karoline Silva
 */
@Component
public class EmailAddressValidatorService {

	public boolean isLiferayDomain(String emailAddress) {
		String domain = emailAddress.substring(emailAddress.indexOf('@') + 1);

		return _liferayDomains.contains(domain);
	}

	public void validateDomain(String emailAddress) {
		if (isLiferayDomain(emailAddress)) {
			throw new IllegalArgumentException(
				"Email address uses a reserved Liferay domain");
		}
	}

	@Value("${liferay.one.email.address.validator.liferay.domains}")
	private Set<String> _liferayDomains;

}
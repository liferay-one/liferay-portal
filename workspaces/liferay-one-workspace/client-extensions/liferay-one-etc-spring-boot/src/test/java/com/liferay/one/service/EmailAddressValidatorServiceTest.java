/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import java.util.Set;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[SVC-EMAILADDRESSVALIDATORSERVICE] EmailAddressValidatorService")
public class EmailAddressValidatorServiceTest {

	@BeforeEach
	public void setUp() {
		ReflectionTestUtils.setField(
			_emailAddressValidatorService, "_liferayDomains",
			Set.of("liferay.com", "liferay.io"));
	}

	@Test
	public void testIsLiferayDomainMatchesOnlyTheExactDomain() {
		Assertions.assertTrue(
			_emailAddressValidatorService.isLiferayDomain("test@liferay.com"));
		Assertions.assertTrue(
			_emailAddressValidatorService.isLiferayDomain("test@liferay.io"));
		Assertions.assertFalse(
			_emailAddressValidatorService.isLiferayDomain(
				"test@sub.liferay.com"));
		Assertions.assertFalse(
			_emailAddressValidatorService.isLiferayDomain("test@example.com"));
	}

	@Test
	public void testIsLiferayDomainWithoutAtSignComparesTheWholeValue() {
		Assertions.assertFalse(
			_emailAddressValidatorService.isLiferayDomain("test.liferay.com"));
		Assertions.assertTrue(
			_emailAddressValidatorService.isLiferayDomain("liferay.com"));
	}

	@Test
	public void testValidateDomainAcceptsExternalDomain() {
		Assertions.assertDoesNotThrow(
			() -> _emailAddressValidatorService.validateDomain(
				"test@example.com"));
	}

	@Test
	public void testValidateDomainRejectsLiferayDomain() {
		IllegalArgumentException illegalArgumentException =
			Assertions.assertThrows(
				IllegalArgumentException.class,
				() -> _emailAddressValidatorService.validateDomain(
					"test@liferay.com"));

		Assertions.assertEquals(
			"Email address uses a reserved Liferay domain",
			illegalArgumentException.getMessage());
	}

	private final EmailAddressValidatorService _emailAddressValidatorService =
		new EmailAddressValidatorService();

}
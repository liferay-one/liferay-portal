/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.okta.model.OktaUser;
import com.liferay.one.okta.service.OktaService;
import com.liferay.one.service.EmailAddressValidatorService;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Allen Ziegenfus
 */
public class ContactsRestControllerTest {

	@BeforeEach
	public void setUp() throws Exception {
		_contactsRestController = new ContactsRestController();

		_emailAddressValidatorService = Mockito.mock(
			EmailAddressValidatorService.class);
		_oktaService = Mockito.mock(OktaService.class);

		ReflectionTestUtils.setField(
			_contactsRestController, "_emailAddressValidatorService",
			_emailAddressValidatorService);
		ReflectionTestUtils.setField(
			_contactsRestController, "_oktaService", _oktaService);
	}

	@Test
	public void testGetContactsValidateReturnsFalseForUnknownLiferayEmail()
		throws Exception {

		Mockito.when(
			_oktaService.fetchContactByEmailAddress("ghost@liferay.com")
		).thenReturn(
			null
		);

		Mockito.when(
			_emailAddressValidatorService.isLiferayDomain("ghost@liferay.com")
		).thenReturn(
			true
		);

		Assertions.assertFalse(
			_contactsRestController.getContactsValidate("ghost@liferay.com"));
	}

	@Test
	public void testGetContactsValidateReturnsTrueForExistingContact()
		throws Exception {

		Mockito.when(
			_oktaService.fetchContactByEmailAddress("jane@liferay.com")
		).thenReturn(
			Mockito.mock(OktaUser.class)
		);

		Assertions.assertTrue(
			_contactsRestController.getContactsValidate("jane@liferay.com"));
	}

	@Test
	public void testGetContactsValidateReturnsTrueForMalformedEmail()
		throws Exception {

		Mockito.when(
			_oktaService.fetchContactByEmailAddress("not-an-email")
		).thenReturn(
			null
		);

		Mockito.when(
			_emailAddressValidatorService.isLiferayDomain("not-an-email")
		).thenReturn(
			false
		);

		Assertions.assertTrue(
			_contactsRestController.getContactsValidate("not-an-email"));
	}

	@Test
	public void testGetContactsValidateReturnsTrueForUnknownExternalEmail()
		throws Exception {

		Mockito.when(
			_oktaService.fetchContactByEmailAddress("jane@acme.com")
		).thenReturn(
			null
		);

		Mockito.when(
			_emailAddressValidatorService.isLiferayDomain("jane@acme.com")
		).thenReturn(
			false
		);

		Assertions.assertTrue(
			_contactsRestController.getContactsValidate("jane@acme.com"));
	}

	private ContactsRestController _contactsRestController;
	private EmailAddressValidatorService _emailAddressValidatorService;
	private OktaService _oktaService;

}
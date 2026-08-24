/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import java.util.Collections;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;

/**
 * @author Amos Fong
 */
public class AccountInvitationServiceTest {

	@BeforeEach
	public void setUp() throws Exception {
		_accountInvitationService = Mockito.spy(new AccountInvitationService());

		Mockito.doReturn(
			Collections.emptyList()
		).when(
			_accountInvitationService
		).getAllItems(
			ArgumentMatchers.anyString(), ArgumentMatchers.anyString(),
			ArgumentMatchers.any()
		);
	}

	@Test
	public void testFetchPendingAccountInvitationMatchesBlankProject()
		throws Exception {

		_accountInvitationService.fetchPendingAccountInvitation(
			_ACCOUNT_EXTERNAL_REFERENCE_CODE, _EMAIL_ADDRESS, null);

		String filterString = _captureFilterString();

		Assertions.assertTrue(
			filterString.contains("projectExternalReferenceCode eq ''"),
			filterString);
		Assertions.assertTrue(
			filterString.contains("projectExternalReferenceCode eq null"),
			filterString);
	}

	@Test
	public void testFetchPendingAccountInvitationMatchesProject()
		throws Exception {

		_accountInvitationService.fetchPendingAccountInvitation(
			_ACCOUNT_EXTERNAL_REFERENCE_CODE, _EMAIL_ADDRESS,
			_PROJECT_EXTERNAL_REFERENCE_CODE);

		String filterString = _captureFilterString();

		Assertions.assertTrue(
			filterString.contains(
				"projectExternalReferenceCode eq '" +
					_PROJECT_EXTERNAL_REFERENCE_CODE + "'"),
			filterString);
		Assertions.assertFalse(
			filterString.contains("projectExternalReferenceCode eq null"),
			filterString);
	}

	@Test
	public void testGetPendingAccountInvitationsIncludesProjectInvitations()
		throws Exception {

		_accountInvitationService.getPendingAccountInvitations(
			_ACCOUNT_EXTERNAL_REFERENCE_CODE);

		String filterString = _captureFilterString();

		Assertions.assertFalse(
			filterString.contains("projectExternalReferenceCode"),
			filterString);
	}

	private String _captureFilterString() throws Exception {
		ArgumentCaptor<String> argumentCaptor = ArgumentCaptor.forClass(
			String.class);

		Mockito.verify(
			_accountInvitationService
		).getAllItems(
			ArgumentMatchers.anyString(), argumentCaptor.capture(),
			ArgumentMatchers.any()
		);

		return argumentCaptor.getValue();
	}

	private static final String _ACCOUNT_EXTERNAL_REFERENCE_CODE = "ACCNT-013";

	private static final String _EMAIL_ADDRESS = "invitee@liferay.example";

	private static final String _PROJECT_EXTERNAL_REFERENCE_CODE = "PRJCT-013";

	private AccountInvitationService _accountInvitationService;

}
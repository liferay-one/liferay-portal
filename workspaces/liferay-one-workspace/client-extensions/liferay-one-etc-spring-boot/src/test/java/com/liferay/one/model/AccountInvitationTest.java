/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.model;

import java.time.Instant;

import java.util.Collections;
import java.util.List;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-ACCOUNTINVITATION] AccountInvitation")
public class AccountInvitationTest {

	@Test
	public void testCustomExpirationDateInstantIsNullWhenBlank() {
		AccountInvitation accountInvitation = _createAccountInvitation(
			"customExpirationDate", "");

		Assertions.assertNull(
			accountInvitation.getCustomExpirationDateInstant());
	}

	@Test
	public void testCustomExpirationDateInstantIsNullWhenUnparseable() {
		AccountInvitation accountInvitation = _createAccountInvitation(
			"customExpirationDate", "not a date");

		Assertions.assertNull(
			accountInvitation.getCustomExpirationDateInstant());
	}

	@Test
	public void testCustomExpirationDateInstantParsesISOInstant() {
		AccountInvitation accountInvitation = _createAccountInvitation(
			"customExpirationDate", "2030-01-02T03:04:05Z");

		Assertions.assertEquals(
			Instant.parse("2030-01-02T03:04:05Z"),
			accountInvitation.getCustomExpirationDateInstant());
	}

	@Test
	public void testFieldsReadFromJSON() {
		AccountInvitation accountInvitation = new AccountInvitation(
			new JSONObject(
			).put(
				"accepted", true
			).put(
				"accountExternalReferenceCode", "ACCOUNT_ERC"
			).put(
				"emailAddress", "test@liferay.com"
			).put(
				"externalReferenceCode", "INVITATION_ERC"
			).put(
				"familyName", "Last"
			).put(
				"givenName", "First"
			).put(
				"id", 5L
			).put(
				"projectExternalReferenceCode", "PROJECT_ERC"
			).put(
				"projectRoleExternalReferenceCode", "PROJECT_ROLE_ERC"
			).put(
				"token", "token"
			));

		Assertions.assertTrue(accountInvitation.isAccepted());
		Assertions.assertEquals(
			"ACCOUNT_ERC", accountInvitation.getAccountExternalReferenceCode());
		Assertions.assertEquals(5L, accountInvitation.getAccountInvitationId());
		Assertions.assertEquals(
			"test@liferay.com", accountInvitation.getEmailAddress());
		Assertions.assertEquals(
			"INVITATION_ERC", accountInvitation.getExternalReferenceCode());
		Assertions.assertEquals("Last", accountInvitation.getFamilyName());
		Assertions.assertEquals("First", accountInvitation.getGivenName());
		Assertions.assertEquals(
			"PROJECT_ERC", accountInvitation.getProjectExternalReferenceCode());
		Assertions.assertEquals(
			"PROJECT_ROLE_ERC",
			accountInvitation.getProjectRoleExternalReferenceCode());
		Assertions.assertEquals("token", accountInvitation.getToken());
	}

	@Test
	public void testIsExpiredComparesExpirationWithNow() {
		Assertions.assertFalse(
			_createAccountInvitation(
				"customExpirationDate", "2999-01-01T00:00:00Z"
			).isExpired());
		Assertions.assertTrue(
			_createAccountInvitation(
				"customExpirationDate", "2000-01-01T00:00:00Z"
			).isExpired());
	}

	@Test
	public void testIsExpiredWhenExpirationIsMissing() {
		Assertions.assertTrue(
			_createAccountInvitation(
				"emailAddress", "test@liferay.com"
			).isExpired());
		Assertions.assertTrue(
			_createAccountInvitation(
				"customExpirationDate", "not a date"
			).isExpired());
	}

	@Test
	public void testRoleExternalReferenceCodesAreEmptyWhenBlank() {
		Assertions.assertEquals(
			Collections.emptyList(),
			_createAccountInvitation(
				"roleExternalReferenceCodes", ""
			).getRoleExternalReferenceCodes());
		Assertions.assertEquals(
			Collections.emptyList(),
			_createAccountInvitation(
				"emailAddress", "test@liferay.com"
			).getRoleExternalReferenceCodes());
	}

	@Test
	public void testRoleExternalReferenceCodesFallBackToCommaSeparatedList() {
		AccountInvitation accountInvitation = _createAccountInvitation(
			"roleExternalReferenceCodes", " ROLE_A , ,ROLE_B,");

		Assertions.assertEquals(
			List.of("ROLE_A", "ROLE_B"),
			accountInvitation.getRoleExternalReferenceCodes());
	}

	@Test
	public void testRoleExternalReferenceCodesParseJSONArray() {
		AccountInvitation accountInvitation = _createAccountInvitation(
			"roleExternalReferenceCodes", "[\"ROLE_A\", \"\", \"ROLE_B\"]");

		Assertions.assertEquals(
			List.of("ROLE_A", "ROLE_B"),
			accountInvitation.getRoleExternalReferenceCodes());
	}

	private AccountInvitation _createAccountInvitation(
		String key, String value) {

		return new AccountInvitation(
			new JSONObject(
			).put(
				key, value
			).put(
				"id", 1L
			));
	}

}
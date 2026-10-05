/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.okta.model;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-OKTAUSER] OktaUser")
public class OktaUserTest {

	@Test
	public void testIsDeactivatedOnlyForDeprovisioned() {
		Assertions.assertTrue(
			_createOktaUser(
				"DEPROVISIONED"
			).isDeactivated());

		for (String status : new String[] {"ACTIVE", "PROVISIONED", "STAGED"}) {
			Assertions.assertFalse(
				_createOktaUser(
					status
				).isDeactivated(),
				status);
		}
	}

	@Test
	public void testIsEmailAddressVerifiedForActiveFamily() {
		for (String status :
				new String[] {
					"ACTIVE", "LOCKED_OUT", "PASSWORD_EXPIRED", "RECOVERY",
					"SUSPENDED"
				}) {

			OktaUser oktaUser = _createOktaUser(status);

			Assertions.assertTrue(oktaUser.isEmailAddressVerified(), status);
			Assertions.assertFalse(oktaUser.isDeactivated(), status);
			Assertions.assertFalse(oktaUser.isPending(), status);
		}

		Assertions.assertFalse(
			_createOktaUser(
				"PROVISIONED"
			).isEmailAddressVerified());
		Assertions.assertFalse(
			_createOktaUser(
				"DEPROVISIONED"
			).isEmailAddressVerified());
	}

	@Test
	public void testIsPendingForProvisionedOrStaged() {
		Assertions.assertTrue(
			_createOktaUser(
				"PROVISIONED"
			).isPending());
		Assertions.assertTrue(
			_createOktaUser(
				"STAGED"
			).isPending());
		Assertions.assertFalse(
			_createOktaUser(
				"ACTIVE"
			).isPending());
		Assertions.assertFalse(
			_createOktaUser(
				""
			).isPending());
	}

	@Test
	public void testMissingProfileYieldsBlankNames() {
		OktaUser oktaUser = new OktaUser(
			new JSONObject(
			).put(
				"status", "ACTIVE"
			));

		Assertions.assertEquals("", oktaUser.getEmail());
		Assertions.assertEquals("", oktaUser.getFirstName());
		Assertions.assertEquals("", oktaUser.getLastName());
		Assertions.assertEquals("", oktaUser.getMiddleName());
		Assertions.assertEquals("", oktaUser.getUuid());
	}

	@Test
	public void testProfileFieldsReadFromJSON() {
		OktaUser oktaUser = new OktaUser(
			new JSONObject(
			).put(
				"profile",
				new JSONObject(
				).put(
					"email", "test@liferay.com"
				).put(
					"firstName", "First"
				).put(
					"lastName", "Last"
				).put(
					"middleName", "Middle"
				).put(
					"uuid", "UUID"
				)
			));

		Assertions.assertEquals("test@liferay.com", oktaUser.getEmail());
		Assertions.assertEquals("First", oktaUser.getFirstName());
		Assertions.assertEquals("Last", oktaUser.getLastName());
		Assertions.assertEquals("Middle", oktaUser.getMiddleName());
		Assertions.assertEquals("UUID", oktaUser.getUuid());
	}

	private OktaUser _createOktaUser(String status) {
		return new OktaUser(
			new JSONObject(
			).put(
				"status", status
			));
	}

}
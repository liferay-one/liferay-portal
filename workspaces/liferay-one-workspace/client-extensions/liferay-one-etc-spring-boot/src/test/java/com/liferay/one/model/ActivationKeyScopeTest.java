/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.model;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-ACTIVATIONKEYSCOPE] ActivationKeyScope")
public class ActivationKeyScopeTest {

	@Test
	public void testOfAccount() {
		Account account = new Account();

		account.setId(40001L);
		account.setName("Account One");

		ActivationKeyScope activationKeyScope = ActivationKeyScope.of(account);

		Assertions.assertEquals(40001L, activationKeyScope.getAccountId());
		Assertions.assertEquals(
			"account-40001", activationKeyScope.getLockKey());
		Assertions.assertEquals("Account One", activationKeyScope.getName());
		Assertions.assertNull(
			activationKeyScope.getProjectExternalReferenceCode());
		Assertions.assertFalse(activationKeyScope.isProject());
	}

	@Test
	public void testOfProject() {
		ActivationKeyScope activationKeyScope = ActivationKeyScope.of(
			new Project(
				new JSONObject(
				).put(
					"externalReferenceCode", "PRJCT-001"
				).put(
					"name", "Project One"
				).put(
					"r_accountEntryToProject_accountEntryId", 40001L
				)));

		Assertions.assertEquals(40001L, activationKeyScope.getAccountId());
		Assertions.assertEquals(
			"project-PRJCT-001", activationKeyScope.getLockKey());
		Assertions.assertEquals("Project One", activationKeyScope.getName());
		Assertions.assertEquals(
			"PRJCT-001", activationKeyScope.getProjectExternalReferenceCode());
		Assertions.assertTrue(activationKeyScope.isProject());
	}

	@Test
	public void testOfProjectWithoutExternalReferenceCode() {
		Project project = new Project(
			new JSONObject(
			).put(
				"name", "Project One"
			).put(
				"r_accountEntryToProject_accountEntryId", 40001L
			));

		Assertions.assertThrows(
			IllegalArgumentException.class,
			() -> ActivationKeyScope.of(project));
	}

}
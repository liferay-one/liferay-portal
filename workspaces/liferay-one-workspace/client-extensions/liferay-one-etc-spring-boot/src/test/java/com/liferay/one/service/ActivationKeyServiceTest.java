/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import java.net.URI;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Felipe Franca
 */
@DisplayName("[SVC-ACTIVATIONKEYSERVICE] ActivationKeyService")
public class ActivationKeyServiceTest {

	@Test
	public void testGetActivationKeysCount() throws Exception {
		TestActivationKeyService activationKeyService =
			new TestActivationKeyService();

		Assertions.assertEquals(
			2,
			activationKeyService.getActivationKeysCount(
				true, "PRJCT-1", "complimentary"));

		URI uri = activationKeyService.uri;

		Assertions.assertEquals("/o/c/activationkeys", uri.getPath());

		String query = uri.getQuery();

		Assertions.assertTrue(query.contains("pageSize=1"), query);
		Assertions.assertTrue(
			query.contains(
				"filter=(active eq true) and " +
					"(r_projectToActivationKey_c_projectERC eq 'PRJCT-1') " +
						"and (type eq 'complimentary')"),
			query);
	}

	@Test
	public void testGetActivationKeysCountEscapesTheProject() throws Exception {
		TestActivationKeyService activationKeyService =
			new TestActivationKeyService();

		activationKeyService.getActivationKeysCount(
			false, "O'Connor", "complimentary");

		String query = activationKeyService.uri.getQuery();

		Assertions.assertTrue(
			query.contains(
				"(active eq false) and " +
					"(r_projectToActivationKey_c_projectERC eq 'O''Connor')"),
			query);
	}

	private static class TestActivationKeyService extends ActivationKeyService {

		public URI uri;

		@Override
		protected String get(String authorization, URI uri) {
			this.uri = uri;

			return new JSONObject(
			).put(
				"totalCount", 2
			).toString();
		}

		@Override
		protected String getAuthorization() {
			return "";
		}

	}

}
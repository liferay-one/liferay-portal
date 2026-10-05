/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.one.model.UsageDefinition;

import java.net.URI;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[SVC-USAGEDEFINITIONSERVICE] UsageDefinitionService")
public class UsageDefinitionServiceTest {

	@Test
	public void testFetchUsageDefinition() throws Exception {
		_testUsageDefinitionService.response =
			"{\"externalReferenceCode\": \"UD-1\", \"id\": 7}";

		UsageDefinition usageDefinition =
			_testUsageDefinitionService.fetchUsageDefinition("UD-1");

		Assertions.assertNotNull(usageDefinition);

		Assertions.assertEquals(
			List.of("/o/c/usagedefinitions/by-external-reference-code/UD-1"),
			_testUsageDefinitionService.paths);
	}

	@Test
	public void testFetchUsageDefinitionReturnsNullWhenNotFound()
		throws Exception {

		Assertions.assertNull(
			_testUsageDefinitionService.fetchUsageDefinition("UD-2"));
	}

	private final TestUsageDefinitionService _testUsageDefinitionService =
		new TestUsageDefinitionService();

	private static class TestUsageDefinitionService
		extends UsageDefinitionService {

		public final List<String> paths = new ArrayList<>();
		public String response;

		@Override
		protected String fetch(String authorization, URI uri) {
			paths.add(uri.getPath());

			return response;
		}

		@Override
		protected String getAuthorization() {
			return "Bearer test";
		}

	}

}
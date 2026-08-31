/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.one.constants.EnvironmentConstants;
import com.liferay.one.exception.EnvironmentActivationAlreadyRequestedException;
import com.liferay.one.model.Environment;
import com.liferay.one.util.KeyedLock;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Amos Fong
 */
public class EnvironmentServiceTest {

	@BeforeEach
	public void setUp() throws Exception {
		_environmentService = Mockito.spy(new EnvironmentService());

		ReflectionTestUtils.setField(
			_environmentService, "_keyedLock", new KeyedLock());
	}

	@Test
	public void testAddActivationEnvironmentThrowsForDuplicate()
		throws Exception {

		Environment environment = Mockito.mock(Environment.class);

		Mockito.when(
			environment.getExternalReferenceCode()
		).thenReturn(
			"ENV-1"
		);

		Mockito.doReturn(
			environment
		).when(
			_environmentService
		).fetchActivationEnvironment(
			_ACCOUNT_ENTRY_ID, EnvironmentConstants.OFFERING_PAAS, _PROJECT_ERC
		);

		Assertions.assertEquals(
			"Environment ENV-1 already exists",
			Assertions.assertThrows(
				EnvironmentActivationAlreadyRequestedException.class,
				() -> _environmentService.addActivationEnvironment(
					_ACCOUNT_ENTRY_ID, _CONTRACT_ID, new JSONObject(),
					EnvironmentConstants.OFFERING_PAAS, _PROJECT_ERC)
			).getMessage());
	}

	private static final long _ACCOUNT_ENTRY_ID = 40001;

	private static final long _CONTRACT_ID = 50001;

	private static final String _PROJECT_ERC = "PRJCT-001";

	private EnvironmentService _environmentService;

}
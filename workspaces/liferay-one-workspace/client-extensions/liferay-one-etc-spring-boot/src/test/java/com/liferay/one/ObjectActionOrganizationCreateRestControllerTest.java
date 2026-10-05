/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.admin.user.client.dto.v1_0.Organization;
import com.liferay.headless.admin.user.client.problem.Problem;
import com.liferay.one.jira.synchronizer.OrganizationSynchronizer;
import com.liferay.one.service.OrganizationService;

import org.json.JSONException;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
public class ObjectActionOrganizationCreateRestControllerTest {

	@BeforeEach
	public void setUp() {
		_objectActionOrganizationCreateRestController =
			new ObjectActionOrganizationCreateRestController();

		ReflectionTestUtils.setField(
			_objectActionOrganizationCreateRestController,
			"_organizationService", _organizationService);
		ReflectionTestUtils.setField(
			_objectActionOrganizationCreateRestController,
			"_organizationSynchronizer", _organizationSynchronizer);
	}

	@Test
	public void testPost() throws Exception {
		Organization organization = new Organization();

		Mockito.when(
			_organizationService.getOrganization(_ORGANIZATION_ID)
		).thenReturn(
			organization
		);

		_objectActionOrganizationCreateRestController.post(_createJSON());

		Mockito.verify(
			_organizationSynchronizer
		).syncOrganization(
			organization
		);
	}

	@Test
	public void testPostPropagatesUnknownOrganization() throws Exception {
		Problem problem = new Problem();

		problem.setStatus("NOT_FOUND");

		Mockito.when(
			_organizationService.getOrganization(_ORGANIZATION_ID)
		).thenThrow(
			new Problem.ProblemException(problem)
		);

		Assertions.assertThrows(
			Problem.ProblemException.class,
			() -> _objectActionOrganizationCreateRestController.post(
				_createJSON()));

		Mockito.verifyNoInteractions(_organizationSynchronizer);
	}

	@Test
	public void testPostThrowsWhenPayloadIsMalformed() {
		Assertions.assertThrows(
			JSONException.class,
			() -> _objectActionOrganizationCreateRestController.post("{}"));

		Mockito.verifyNoInteractions(
			_organizationService, _organizationSynchronizer);
	}

	private String _createJSON() {
		return new JSONObject(
		).put(
			"classPK", _ORGANIZATION_ID
		).toString();
	}

	private static final long _ORGANIZATION_ID = 1000L;

	private ObjectActionOrganizationCreateRestController
		_objectActionOrganizationCreateRestController;
	private final OrganizationService _organizationService = Mockito.mock(
		OrganizationService.class);
	private final OrganizationSynchronizer _organizationSynchronizer =
		Mockito.mock(OrganizationSynchronizer.class);

}
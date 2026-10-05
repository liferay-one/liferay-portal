/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.jira.synchronizer.OrganizationSynchronizer;

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
public class ObjectActionOrganizationDeleteRestControllerTest {

	@BeforeEach
	public void setUp() {
		_objectActionOrganizationDeleteRestController =
			new ObjectActionOrganizationDeleteRestController();

		ReflectionTestUtils.setField(
			_objectActionOrganizationDeleteRestController,
			"_organizationSynchronizer", _organizationSynchronizer);
	}

	@Test
	public void testPost() throws Exception {
		_objectActionOrganizationDeleteRestController.post(
			new JSONObject(
			).put(
				"classPK", 1000L
			).put(
				"modelOrganization",
				new JSONObject(
				).put(
					"externalReferenceCode", _EXTERNAL_REFERENCE_CODE
				)
			).toString());

		Mockito.verify(
			_organizationSynchronizer
		).deleteOrganization(
			_EXTERNAL_REFERENCE_CODE
		);
	}

	@Test
	public void testPostThrowsWhenExternalReferenceCodeIsMissing() {
		Assertions.assertThrows(
			JSONException.class,
			() -> _objectActionOrganizationDeleteRestController.post(
				new JSONObject(
				).put(
					"modelOrganization", new JSONObject()
				).toString()));

		Mockito.verifyNoInteractions(_organizationSynchronizer);
	}

	@Test
	public void testPostThrowsWhenModelOrganizationIsMissing() {
		Assertions.assertThrows(
			JSONException.class,
			() -> _objectActionOrganizationDeleteRestController.post("{}"));

		Mockito.verifyNoInteractions(_organizationSynchronizer);
	}

	@Test
	public void testPostThrowsWhenPayloadIsMalformed() {
		Assertions.assertThrows(
			JSONException.class,
			() -> _objectActionOrganizationDeleteRestController.post(
				"not json"));

		Mockito.verifyNoInteractions(_organizationSynchronizer);
	}

	private static final String _EXTERNAL_REFERENCE_CODE = "ORG-001";

	private ObjectActionOrganizationDeleteRestController
		_objectActionOrganizationDeleteRestController;
	private final OrganizationSynchronizer _organizationSynchronizer =
		Mockito.mock(OrganizationSynchronizer.class);

}
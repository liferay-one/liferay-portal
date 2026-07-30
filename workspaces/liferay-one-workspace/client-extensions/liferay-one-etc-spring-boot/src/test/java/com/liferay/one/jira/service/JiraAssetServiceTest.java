/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.service;

import com.liferay.one.jira.converter.BaseJiraAssetObjectConverter;
import com.liferay.one.jira.model.JiraAssetObject;
import com.liferay.one.jira.synchronizer.LockSerializationTestHelper;

import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;
import org.mockito.stubbing.Answer;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Drew Brokke
 */
public class JiraAssetServiceTest {

	@BeforeEach
	public void setUp() throws Exception {
		_jiraAssetService = new JiraAssetService();

		_converter = Mockito.mock(BaseJiraAssetObjectConverter.class);

		Mockito.when(
			_converter.getAQLWithBuilder(Mockito.any())
		).thenReturn(
			"aql"
		);

		Mockito.when(
			_converter.getExternalKeyAttributeName()
		).thenReturn(
			"External Key"
		);

		Mockito.when(
			_converter.getObjectTypeId()
		).thenReturn(
			"objectTypeId"
		);

		Mockito.when(
			_converter.getObjectTypeName()
		).thenReturn(
			"Test Object"
		);

		_existingJiraAssetObject = Mockito.mock(JiraAssetObject.class);

		Mockito.when(
			_existingJiraAssetObject.getAttributeValue("External Key")
		).thenReturn(
			_EXTERNAL_KEY
		);

		Mockito.when(
			_existingJiraAssetObject.getObjectId()
		).thenReturn(
			_OBJECT_ID
		);

		_jiraAssetPersistence = Mockito.mock(JiraAssetPersistence.class);

		ReflectionTestUtils.setField(
			_jiraAssetService, "_jiraAssetPersistence", _jiraAssetPersistence);
	}

	@Test
	public void testDeleteWaitsForUpsert() throws Exception {
		LockSerializationTestHelper lockSerializationTestHelper =
			new LockSerializationTestHelper();

		Mockito.when(
			_jiraAssetPersistence.searchObjects(
				Mockito.anyString(), Mockito.any())
		).thenReturn(
			Collections.singletonList(_existingJiraAssetObject)
		);

		Mockito.when(
			_jiraAssetPersistence.updateObject(Mockito.any(), Mockito.any())
		).thenAnswer(
			lockSerializationTestHelper.block("update")
		);

		Mockito.when(
			_jiraAssetPersistence.deleteObject(Mockito.any())
		).thenAnswer(
			lockSerializationTestHelper.record("delete")
		);

		JiraAssetObject jiraAssetObject = Mockito.mock(JiraAssetObject.class);

		Mockito.when(
			jiraAssetObject.getAttributeValue("External Key")
		).thenReturn(
			_EXTERNAL_KEY
		);

		lockSerializationTestHelper.assertSerialized(
			() -> _jiraAssetService.upsert(_converter, jiraAssetObject),
			() -> _jiraAssetService.delete(_converter, _EXTERNAL_KEY), "update",
			"delete");
	}

	@Test
	public void testGetOrCreateReferenceObjectIdsWaitsForUpsert()
		throws Exception {

		LockSerializationTestHelper lockSerializationTestHelper =
			new LockSerializationTestHelper();

		AtomicBoolean created = new AtomicBoolean();

		Mockito.when(
			_jiraAssetPersistence.searchObjects(
				Mockito.anyString(), Mockito.any())
		).thenAnswer(
			invocation -> {
				if (created.get()) {
					return Collections.singletonList(_existingJiraAssetObject);
				}

				return Collections.emptyList();
			}
		);

		Answer<Object> blockAnswer = lockSerializationTestHelper.block(
			"create");

		Mockito.when(
			_jiraAssetPersistence.createObject(Mockito.any(), Mockito.any())
		).thenAnswer(
			invocation -> {
				blockAnswer.answer(invocation);

				created.set(true);

				return new JSONObject();
			}
		);

		JiraAssetObject jiraAssetObject = Mockito.mock(JiraAssetObject.class);

		Mockito.when(
			jiraAssetObject.getAttributeValue("External Key")
		).thenReturn(
			_EXTERNAL_KEY
		);

		AtomicReference<List<String>> objectIdsAtomicReference =
			new AtomicReference<>();

		lockSerializationTestHelper.assertSerialized(
			() -> _jiraAssetService.upsert(_converter, jiraAssetObject),
			() -> objectIdsAtomicReference.set(
				_jiraAssetService.getOrCreateReferenceObjectIds(
					_converter, Collections.singletonList(_EXTERNAL_KEY),
					externalKey -> externalKey,
					externalKey -> Mockito.mock(JiraAssetObject.class))),
			"create");

		Assertions.assertEquals(
			Collections.singletonList(_OBJECT_ID),
			objectIdsAtomicReference.get());

		Mockito.verify(
			_jiraAssetPersistence, Mockito.times(1)
		).createObject(
			Mockito.any(), Mockito.any()
		);
	}

	private static final String _EXTERNAL_KEY = "test-external-key";

	private static final String _OBJECT_ID = "test-object-id";

	private BaseJiraAssetObjectConverter _converter;
	private JiraAssetObject _existingJiraAssetObject;
	private JiraAssetPersistence _jiraAssetPersistence;
	private JiraAssetService _jiraAssetService;

}
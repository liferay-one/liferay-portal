/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.service;

import com.liferay.one.jira.converter.BaseJiraAssetObjectConverter;
import com.liferay.one.jira.model.JiraAssetObject;
import com.liferay.one.jira.synchronizer.LockSerializationTestHelper;
import com.liferay.one.jira.util.AQLUtil;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Consumer;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
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
	public void testFetchReferenceObjectIdsChunksExternalKeys() {
		Mockito.when(
			_jiraAssetPersistence.searchObjects(
				Mockito.anyString(), Mockito.any())
		).thenReturn(
			Collections.singletonList(_existingJiraAssetObject)
		);

		List<String> externalKeys = new ArrayList<>();

		for (int i = 0; i < 51; i++) {
			externalKeys.add("external-key-" + i);
		}

		_jiraAssetService.getExternalKeyToObjectIdMap(_converter, externalKeys);

		Mockito.verify(
			_jiraAssetPersistence, Mockito.times(2)
		).searchObjects(
			Mockito.anyString(), Mockito.any()
		);
	}

	@Test
	public void testFetchReferenceObjectIdsMapsResolvedExternalKeys() {
		Mockito.when(
			_jiraAssetPersistence.searchObjects(
				Mockito.anyString(), Mockito.any())
		).thenReturn(
			Collections.singletonList(_existingJiraAssetObject)
		);

		Map<String, String> externalKeyToObjectIdMap =
			_jiraAssetService.getExternalKeyToObjectIdMap(
				_converter, Arrays.asList(_EXTERNAL_KEY, "unresolved-key"));

		Assertions.assertEquals(
			Collections.singletonMap(_EXTERNAL_KEY, _OBJECT_ID),
			externalKeyToObjectIdMap);
	}

	@Test
	public void testFetchReferenceObjectIdsSkipsSearchWithoutExternalKeys() {
		Map<String, String> externalKeyToObjectIdMap =
			_jiraAssetService.getExternalKeyToObjectIdMap(
				_converter, Collections.emptyList());

		Assertions.assertTrue(externalKeyToObjectIdMap.isEmpty());

		Mockito.verify(
			_jiraAssetPersistence, Mockito.never()
		).searchObjects(
			Mockito.anyString(), Mockito.any()
		);
	}

	@Test
	public void testGetJiraAssetObjectsSearchesWithConverterAQL()
		throws Exception {

		Mockito.when(
			_jiraAssetPersistence.<JiraAssetObject>searchObjects(
				Mockito.eq("aql"), Mockito.any())
		).thenReturn(
			Collections.singletonList(_existingJiraAssetObject)
		);

		Assertions.assertEquals(
			Collections.singletonList(_existingJiraAssetObject),
			_jiraAssetService.getJiraAssetObjects(_converter, null));
	}

	@Test
	public void testGetOrCreateReferenceObjectIdsCreatesMissingObjects() {
		Mockito.when(
			_jiraAssetPersistence.searchObjects(
				Mockito.anyString(), Mockito.any())
		).thenReturn(
			Collections.singletonList(_existingJiraAssetObject)
		);

		Mockito.when(
			_jiraAssetPersistence.createObject(Mockito.any(), Mockito.any())
		).thenReturn(
			new JSONObject(
			).put(
				"id", "created-object-id"
			)
		);

		JiraAssetObject createdJiraAssetObject = Mockito.mock(
			JiraAssetObject.class);

		List<String> objectIds =
			_jiraAssetService.getOrCreateReferenceObjectIds(
				_converter, Arrays.asList(_EXTERNAL_KEY, "unresolved-key"),
				externalKey -> externalKey,
				externalKey -> createdJiraAssetObject);

		Assertions.assertEquals(
			Arrays.asList(_OBJECT_ID, "created-object-id"), objectIds);

		Mockito.verify(
			_jiraAssetPersistence
		).createObject(
			"objectTypeId", createdJiraAssetObject
		);
	}

	@Test
	public void testGetOrCreateReferenceObjectIdsSkipsNullCreatedObjects() {
		Mockito.when(
			_jiraAssetPersistence.searchObjects(
				Mockito.anyString(), Mockito.any())
		).thenReturn(
			Collections.emptyList()
		);

		List<String> objectIds =
			_jiraAssetService.getOrCreateReferenceObjectIds(
				_converter, Collections.singletonList("unresolved-key"),
				externalKey -> externalKey, externalKey -> null);

		Assertions.assertTrue(objectIds.isEmpty());

		Mockito.verify(
			_jiraAssetPersistence, Mockito.never()
		).createObject(
			Mockito.any(), Mockito.any()
		);
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

	@Test
	public void testIsUnchangedByExternalUpdatedAtReturnsFalseForDifferingExternalUpdatedAt()
		throws Exception {

		_mockExternalUpdatedAt();

		Date date = new Date();

		Assertions.assertFalse(
			_jiraAssetService.isUnchangedByExternalUpdatedAt(
				_converter, _mockJiraAssetObjectUpdatedAt(date),
				_mockJiraAssetObjectUpdatedAt(
					new Date(date.getTime() + 60000))));
	}

	@Test
	public void testIsUnchangedByExternalUpdatedAtReturnsFalseForMissingExternalUpdatedAt()
		throws Exception {

		_mockExternalUpdatedAt();

		Assertions.assertFalse(
			_jiraAssetService.isUnchangedByExternalUpdatedAt(
				_converter, _mockJiraAssetObjectUpdatedAt(new Date()),
				Mockito.mock(JiraAssetObject.class)));
	}

	@Test
	public void testIsUnchangedByExternalUpdatedAtReturnsTrueForSameExternalUpdatedAt()
		throws Exception {

		_mockExternalUpdatedAt();

		Date date = new Date();

		Assertions.assertTrue(
			_jiraAssetService.isUnchangedByExternalUpdatedAt(
				_converter, _mockJiraAssetObjectUpdatedAt(date),
				_mockJiraAssetObjectUpdatedAt(date)));
	}

	@Test
	public void testIsUpdatedSinceReturnsFalseForMissingExternalUpdatedAt()
		throws Exception {

		_mockExternalUpdatedAt();

		Assertions.assertFalse(
			_jiraAssetService.isUpdatedSince(
				_converter, new Date(), Mockito.mock(JiraAssetObject.class)));
	}

	@Test
	public void testIsUpdatedSinceReturnsFalseForOlderExternalUpdatedAt()
		throws Exception {

		_mockExternalUpdatedAt();

		Date date = new Date();

		Assertions.assertFalse(
			_jiraAssetService.isUpdatedSince(
				_converter, date,
				_mockJiraAssetObjectUpdatedAt(
					new Date(date.getTime() - 60000))));
	}

	@Test
	public void testIsUpdatedSinceReturnsTrueForSameOrNewerExternalUpdatedAt()
		throws Exception {

		_mockExternalUpdatedAt();

		Date date = new Date();

		Assertions.assertTrue(
			_jiraAssetService.isUpdatedSince(
				_converter, date, _mockJiraAssetObjectUpdatedAt(date)));
		Assertions.assertTrue(
			_jiraAssetService.isUpdatedSince(
				_converter, date,
				_mockJiraAssetObjectUpdatedAt(
					new Date(date.getTime() + 60000))));
	}

	@Test
	public void testSoftDeleteByAttributeContinuesWhenSoftDeleteFails() {
		_mockSoftDeleteAttributes();

		Mockito.when(
			_converter.createJiraAssetObject()
		).thenReturn(
			Mockito.mock(JiraAssetObject.class)
		);

		JiraAssetObject secondJiraAssetObject = Mockito.mock(
			JiraAssetObject.class);

		Mockito.when(
			secondJiraAssetObject.getObjectId()
		).thenReturn(
			"second-object-id"
		);

		Mockito.when(
			_jiraAssetPersistence.searchObjects(
				Mockito.anyString(), Mockito.any())
		).thenReturn(
			Arrays.asList(_existingJiraAssetObject, secondJiraAssetObject)
		);

		Mockito.when(
			_jiraAssetPersistence.updateObject(
				Mockito.eq(_OBJECT_ID), Mockito.any())
		).thenThrow(
			new RuntimeException()
		);

		_jiraAssetService.softDeleteByAttribute(
			_converter, "Team External Key", "team-key");

		Mockito.verify(
			_jiraAssetPersistence
		).updateObject(
			Mockito.eq("second-object-id"), Mockito.any()
		);
	}

	@Test
	public void testSoftDeleteByAttributeFiltersDeletedAndPatchesEveryMatch() {
		_mockSoftDeleteAttributes();

		List<JiraAssetObject> patchJiraAssetObjects = new ArrayList<>();

		Mockito.when(
			_converter.createJiraAssetObject()
		).thenAnswer(
			invocation -> {
				JiraAssetObject patchJiraAssetObject = Mockito.mock(
					JiraAssetObject.class);

				patchJiraAssetObjects.add(patchJiraAssetObject);

				return patchJiraAssetObject;
			}
		);

		JiraAssetObject secondJiraAssetObject = Mockito.mock(
			JiraAssetObject.class);

		Mockito.when(
			secondJiraAssetObject.getObjectId()
		).thenReturn(
			"second-object-id"
		);

		Mockito.when(
			_jiraAssetPersistence.searchObjects(
				Mockito.anyString(), Mockito.any())
		).thenReturn(
			Arrays.asList(_existingJiraAssetObject, secondJiraAssetObject)
		);

		_jiraAssetService.softDeleteByAttribute(
			_converter, "Team External Key", "team-key");

		ArgumentCaptor<Consumer<AQLUtil.Builder>> consumerArgumentCaptor =
			ArgumentCaptor.forClass(Consumer.class);

		Mockito.verify(
			_converter
		).getAQLWithBuilder(
			consumerArgumentCaptor.capture()
		);

		AQLUtil.Builder aqlBuilder = AQLUtil.builder("base");

		Consumer<AQLUtil.Builder> consumer = consumerArgumentCaptor.getValue();

		consumer.accept(aqlBuilder);

		Assertions.assertEquals(
			"base AND \"Team External Key\" = \"team-key\" AND \"Deleted\" = " +
				"false",
			aqlBuilder.build());

		Mockito.verify(
			_jiraAssetPersistence
		).updateObject(
			Mockito.eq(_OBJECT_ID), Mockito.any()
		);

		Mockito.verify(
			_jiraAssetPersistence
		).updateObject(
			Mockito.eq("second-object-id"), Mockito.any()
		);

		Mockito.verify(
			_jiraAssetPersistence, Mockito.never()
		).deleteObject(
			Mockito.any()
		);

		Assertions.assertEquals(2, patchJiraAssetObjects.size());

		for (JiraAssetObject patchJiraAssetObject : patchJiraAssetObjects) {
			Mockito.verify(
				patchJiraAssetObject
			).setAttributeValue(
				"Deleted", true
			);

			Mockito.verify(
				patchJiraAssetObject
			).setAttributeValue(
				"External Updated At", "formatted-date"
			);
		}
	}

	@Test
	public void testSoftDeleteByAttributeRejectsUnsupportedConverter() {
		Mockito.when(
			_converter.getAQLWithBuilder(Mockito.any())
		).thenAnswer(
			invocation -> {
				Consumer<AQLUtil.Builder> consumer = invocation.getArgument(0);

				AQLUtil.Builder aqlBuilder = AQLUtil.builder("base");

				consumer.accept(aqlBuilder);

				return aqlBuilder.build();
			}
		);

		Mockito.when(
			_converter.getDeletedAttributeName()
		).thenThrow(
			new UnsupportedOperationException()
		);

		Assertions.assertThrows(
			UnsupportedOperationException.class,
			() -> _jiraAssetService.softDeleteByAttribute(
				_converter, "Team External Key", "team-key"));

		Mockito.verify(
			_jiraAssetPersistence, Mockito.never()
		).searchObjects(
			Mockito.anyString(), Mockito.any()
		);
	}

	@Test
	public void testSoftDeleteByAttributeSkipsNullValue() {
		_jiraAssetService.softDeleteByAttribute(
			_converter, "Team External Key", null);

		Mockito.verify(
			_jiraAssetPersistence, Mockito.never()
		).searchObjects(
			Mockito.anyString(), Mockito.any()
		);
	}

	@Test
	public void testSoftDeleteRejectsUnsupportedConverter() {
		Mockito.when(
			_converter.getDeletedAttributeName()
		).thenThrow(
			new UnsupportedOperationException()
		);

		Assertions.assertThrows(
			UnsupportedOperationException.class,
			() -> _jiraAssetService.softDelete(
				_converter, _existingJiraAssetObject));

		Mockito.verify(
			_jiraAssetPersistence, Mockito.never()
		).updateObject(
			Mockito.any(), Mockito.any()
		);
	}

	@Test
	public void testSoftDeleteSkipsMissingObject() {
		_mockSoftDeleteAttributes();

		Mockito.when(
			_jiraAssetPersistence.searchObjects(
				Mockito.anyString(), Mockito.any())
		).thenReturn(
			Collections.emptyList()
		);

		_jiraAssetService.softDelete(
			_converter, _existingJiraAssetObject,
			existingJiraAssetObject -> false);

		Mockito.verify(
			_jiraAssetPersistence, Mockito.never()
		).updateObject(
			Mockito.any(), Mockito.any()
		);
	}

	@Test
	public void testSoftDeleteSkipsUpdateForMatchingPredicate() {
		_mockSoftDeleteAttributes();

		Mockito.when(
			_jiraAssetPersistence.searchObjects(
				Mockito.anyString(), Mockito.any())
		).thenReturn(
			Collections.singletonList(_existingJiraAssetObject)
		);

		_jiraAssetService.softDelete(
			_converter, _existingJiraAssetObject,
			existingJiraAssetObject -> true);

		Mockito.verify(
			_jiraAssetPersistence, Mockito.never()
		).updateObject(
			Mockito.any(), Mockito.any()
		);
	}

	@Test
	public void testSoftDeleteUpdatesForNonmatchingPredicate() {
		_mockSoftDeleteAttributes();

		JiraAssetObject patchJiraAssetObject = Mockito.mock(
			JiraAssetObject.class);

		Mockito.when(
			_converter.createJiraAssetObject()
		).thenReturn(
			patchJiraAssetObject
		);

		Mockito.when(
			_jiraAssetPersistence.searchObjects(
				Mockito.anyString(), Mockito.any())
		).thenReturn(
			Collections.singletonList(_existingJiraAssetObject)
		);

		_jiraAssetService.softDelete(
			_converter, _existingJiraAssetObject,
			existingJiraAssetObject -> false);

		Mockito.verify(
			_jiraAssetPersistence
		).updateObject(
			Mockito.eq(_OBJECT_ID), Mockito.any()
		);

		Mockito.verify(
			patchJiraAssetObject
		).setAttributeValue(
			"Deleted", true
		);

		Mockito.verify(
			patchJiraAssetObject
		).setAttributeValue(
			"External Updated At", "formatted-date"
		);
	}

	@Test
	public void testSoftDeleteWaitsForDelete() throws Exception {
		LockSerializationTestHelper lockSerializationTestHelper =
			new LockSerializationTestHelper();

		_mockSoftDeleteAttributes();

		Mockito.when(
			_converter.createJiraAssetObject()
		).thenReturn(
			Mockito.mock(JiraAssetObject.class)
		);

		Mockito.when(
			_jiraAssetPersistence.searchObjects(
				Mockito.anyString(), Mockito.any())
		).thenReturn(
			Collections.singletonList(_existingJiraAssetObject)
		);

		Mockito.when(
			_jiraAssetPersistence.deleteObject(Mockito.any())
		).thenAnswer(
			lockSerializationTestHelper.block("delete")
		);

		Mockito.when(
			_jiraAssetPersistence.updateObject(Mockito.any(), Mockito.any())
		).thenAnswer(
			lockSerializationTestHelper.record("update")
		);

		lockSerializationTestHelper.assertSerialized(
			() -> _jiraAssetService.delete(_converter, _EXTERNAL_KEY),
			() -> _jiraAssetService.softDelete(
				_converter, _existingJiraAssetObject),
			"delete", "update");
	}

	@Test
	public void testUpsertCreatesMissingObject() throws Exception {
		Mockito.when(
			_jiraAssetPersistence.searchObjects(
				Mockito.anyString(), Mockito.any())
		).thenReturn(
			Collections.emptyList()
		);

		JiraAssetObject jiraAssetObject = Mockito.mock(JiraAssetObject.class);

		Mockito.when(
			jiraAssetObject.getAttributeValue("External Key")
		).thenReturn(
			_EXTERNAL_KEY
		);

		_jiraAssetService.upsert(_converter, jiraAssetObject);

		Mockito.verify(
			_jiraAssetPersistence
		).createObject(
			"objectTypeId", jiraAssetObject
		);

		Mockito.verify(
			_jiraAssetPersistence, Mockito.never()
		).updateObject(
			Mockito.any(), Mockito.any()
		);
	}

	@Test
	public void testUpsertSkipsMissingExternalKey() throws Exception {
		_jiraAssetService.upsert(
			_converter, Mockito.mock(JiraAssetObject.class));

		Mockito.verify(
			_jiraAssetPersistence, Mockito.never()
		).searchObjects(
			Mockito.anyString(), Mockito.any()
		);

		Mockito.verify(
			_jiraAssetPersistence, Mockito.never()
		).createObject(
			Mockito.any(), Mockito.any()
		);
	}

	@Test
	public void testUpsertSkipsUpdateForMatchingBiPredicate() throws Exception {
		JiraAssetObject jiraAssetObject = _mockUpsertJiraAssetObject();

		_jiraAssetService.upsert(
			_converter, jiraAssetObject,
			(existingJiraAssetObject, newJiraAssetObject) -> true);

		Mockito.verify(
			_jiraAssetPersistence, Mockito.never()
		).updateObject(
			Mockito.any(), Mockito.any()
		);
	}

	@Test
	public void testUpsertUpdatesForNonmatchingBiPredicate() throws Exception {
		JiraAssetObject jiraAssetObject = _mockUpsertJiraAssetObject();

		_jiraAssetService.upsert(
			_converter, jiraAssetObject,
			(existingJiraAssetObject, newJiraAssetObject) -> false);

		Mockito.verify(
			_jiraAssetPersistence
		).updateObject(
			_OBJECT_ID, jiraAssetObject
		);
	}

	private void _mockExternalUpdatedAt() {
		Mockito.when(
			_converter.formatDate(Mockito.any())
		).thenCallRealMethod();

		Mockito.when(
			_converter.getExternalUpdatedAtAttributeName()
		).thenReturn(
			"External Updated At"
		);
	}

	private JiraAssetObject _mockJiraAssetObjectUpdatedAt(Date date) {
		String externalUpdatedAt = _converter.formatDate(date);

		JiraAssetObject jiraAssetObject = Mockito.mock(JiraAssetObject.class);

		Mockito.when(
			jiraAssetObject.getAttributeValue("External Updated At")
		).thenReturn(
			externalUpdatedAt
		);

		return jiraAssetObject;
	}

	private void _mockSoftDeleteAttributes() {
		Mockito.when(
			_converter.formatDate(Mockito.any())
		).thenReturn(
			"formatted-date"
		);

		Mockito.when(
			_converter.getDeletedAttributeName()
		).thenReturn(
			"Deleted"
		);

		Mockito.when(
			_converter.getExternalUpdatedAtAttributeName()
		).thenReturn(
			"External Updated At"
		);
	}

	private JiraAssetObject _mockUpsertJiraAssetObject() {
		Mockito.when(
			_jiraAssetPersistence.searchObjects(
				Mockito.anyString(), Mockito.any())
		).thenReturn(
			Collections.singletonList(_existingJiraAssetObject)
		);

		JiraAssetObject jiraAssetObject = Mockito.mock(JiraAssetObject.class);

		Mockito.when(
			jiraAssetObject.getAttributeValue("External Key")
		).thenReturn(
			_EXTERNAL_KEY
		);

		return jiraAssetObject;
	}

	private static final String _EXTERNAL_KEY = "test-external-key";

	private static final String _OBJECT_ID = "test-object-id";

	private BaseJiraAssetObjectConverter _converter;
	private JiraAssetObject _existingJiraAssetObject;
	private JiraAssetPersistence _jiraAssetPersistence;
	private JiraAssetService _jiraAssetService;

}
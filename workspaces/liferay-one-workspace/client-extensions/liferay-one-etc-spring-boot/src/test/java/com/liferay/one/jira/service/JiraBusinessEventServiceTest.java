/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.service;

import com.liferay.one.jira.converter.JiraBusinessEventConverter;
import com.liferay.one.jira.converter.JiraBusinessEventVersionConverter;
import com.liferay.one.jira.model.JiraAssetObject;
import com.liferay.one.jira.model.JiraAssetObjectFieldOption;
import com.liferay.one.jira.model.JiraBusinessEvent;
import com.liferay.one.jira.model.JiraBusinessEventVersion;
import com.liferay.one.jira.model.JiraProductVersion;
import com.liferay.one.jira.util.AQLUtil;
import com.liferay.petra.string.StringPool;

import java.util.Arrays;
import java.util.List;
import java.util.function.Consumer;
import java.util.function.Function;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[SVC-JIRABUSINESSEVENTSERVICE] JiraBusinessEventService")
public class JiraBusinessEventServiceTest {

	@BeforeEach
	public void setUp() {
		ReflectionTestUtils.setField(
			_jiraBusinessEventService, "_accountAssetService",
			_accountAssetService);
		ReflectionTestUtils.setField(
			_jiraBusinessEventService, "_businessEventConverter",
			_jiraBusinessEventConverter);
		ReflectionTestUtils.setField(
			_jiraBusinessEventService, "_businessEventVersionConverter",
			_jiraBusinessEventVersionConverter);
		ReflectionTestUtils.setField(
			_jiraBusinessEventService, "_jiraAssetPersistence",
			_jiraAssetPersistence);

		Mockito.when(
			_jiraBusinessEventConverter.getObjectTypeId()
		).thenReturn(
			"OT-1"
		);

		Mockito.when(
			_jiraBusinessEventConverter.getAQLWithBuilder(
				ArgumentMatchers.any())
		).thenAnswer(
			invocation -> _buildAQL(invocation.getArgument(0))
		);

		Mockito.when(
			_jiraBusinessEventVersionConverter.getAQLWithBuilder(
				ArgumentMatchers.any())
		).thenAnswer(
			invocation -> _buildAQL(invocation.getArgument(0))
		);
	}

	@Test
	public void testCreateJiraBusinessEvent() throws Exception {
		JiraAssetObject jiraAssetObject = Mockito.mock(JiraAssetObject.class);

		JiraBusinessEvent jiraBusinessEvent = Mockito.mock(
			JiraBusinessEvent.class);

		Mockito.when(
			jiraBusinessEvent.getProjectExternalReferenceCode()
		).thenReturn(
			"PRJ-1"
		);

		Mockito.when(
			_accountAssetService.getAccountObjectKey("PRJ-1")
		).thenReturn(
			"ACC-1"
		);

		Mockito.when(
			_jiraBusinessEventConverter.toAssetObject(
				"ACC-1", jiraBusinessEvent)
		).thenReturn(
			jiraAssetObject
		);

		_jiraBusinessEventService.createJiraBusinessEvent(jiraBusinessEvent);

		Mockito.verify(
			_jiraAssetPersistence
		).createObject(
			"OT-1", jiraAssetObject
		);
	}

	@Test
	public void testDeleteJiraBusinessEvent() throws Exception {
		_jiraBusinessEventService.deleteJiraBusinessEvent("42");

		Mockito.verify(
			_jiraAssetPersistence
		).deleteObject(
			"42"
		);
	}

	@Test
	public void testGetFieldOptionsReturnsEmptyListWhenFieldIsMissing()
		throws Exception {

		_whenGetObjectTypeAttributes(
			new JSONObject(
			).put(
				"name", "Event Type"
			).put(
				"options", "A,B"
			));

		Assertions.assertTrue(
			_jiraBusinessEventService.getFieldOptions(
				"Time Zone"
			).isEmpty());
	}

	@Test
	public void testGetFieldOptionsReturnsEmptyListWhenOptionsAreBlank()
		throws Exception {

		_whenGetObjectTypeAttributes(
			new JSONObject(
			).put(
				"name", "Event Type"
			));

		Assertions.assertTrue(
			_jiraBusinessEventService.getFieldOptions(
				"Event Type"
			).isEmpty());
	}

	@Test
	public void testGetFieldOptionsStopsAtFirstMatchingField()
		throws Exception {

		_whenGetObjectTypeAttributes(
			new JSONObject(
			).put(
				"name", "Time Zone"
			).put(
				"options", "UTC"
			),
			new JSONObject(
			).put(
				"name", "Event Type"
			).put(
				"options", " Go Live , Upgrade"
			),
			new JSONObject(
			).put(
				"name", "Event Type"
			).put(
				"options", "Ignored"
			));

		List<JiraAssetObjectFieldOption> jiraAssetObjectFieldOptions =
			_jiraBusinessEventService.getFieldOptions("Event Type");

		Assertions.assertEquals(2, jiraAssetObjectFieldOptions.size());

		JiraAssetObjectFieldOption jiraAssetObjectFieldOption =
			jiraAssetObjectFieldOptions.get(0);

		Assertions.assertEquals(
			"Go Live", jiraAssetObjectFieldOption.getLabel());
		Assertions.assertEquals(
			"Go Live", jiraAssetObjectFieldOption.getValue());

		jiraAssetObjectFieldOption = jiraAssetObjectFieldOptions.get(1);

		Assertions.assertEquals(
			"Upgrade", jiraAssetObjectFieldOption.getValue());
	}

	@Test
	public void testGetJiraBusinessEvent() throws Exception {
		JiraBusinessEvent jiraBusinessEvent = Mockito.mock(
			JiraBusinessEvent.class);

		JSONObject jsonObject = new JSONObject();

		Mockito.when(
			_jiraAssetPersistence.getObject("42")
		).thenReturn(
			jsonObject
		);

		Mockito.when(
			_jiraBusinessEventConverter.toJiraBusinessEvent(
				jsonObject, StringPool.BLANK)
		).thenReturn(
			jiraBusinessEvent
		);

		Assertions.assertSame(
			jiraBusinessEvent,
			_jiraBusinessEventService.getJiraBusinessEvent("42"));
	}

	@Test
	public void testGetJiraBusinessEventVersions() throws Exception {
		JiraBusinessEventVersion jiraBusinessEventVersion = Mockito.mock(
			JiraBusinessEventVersion.class);
		JSONObject jsonObject = new JSONObject();

		Mockito.when(
			_jiraBusinessEventVersionConverter.toJiraBusinessEventVersion(
				jsonObject)
		).thenReturn(
			jiraBusinessEventVersion
		);

		_whenSearchObjects(jsonObject);

		Assertions.assertEquals(
			List.of(jiraBusinessEventVersion),
			_jiraBusinessEventService.getJiraBusinessEventVersions("42"));

		String aql = _captureAQL();

		Assertions.assertTrue(aql.contains(" = 42"), aql);
		Assertions.assertTrue(aql.endsWith(" ORDER BY Updated DESC"), aql);
	}

	@Test
	public void testGetJiraBusinessEventVersionsSkipsNonnumericId()
		throws Exception {

		Assertions.assertTrue(
			_jiraBusinessEventService.getJiraBusinessEventVersions(
				"abc"
			).isEmpty());

		Mockito.verifyNoInteractions(_jiraAssetPersistence);
	}

	@Test
	public void testGetJiraBusinessEvents() throws Exception {
		JiraBusinessEvent jiraBusinessEvent = Mockito.mock(
			JiraBusinessEvent.class);
		JSONObject jsonObject = new JSONObject();

		Mockito.when(
			_jiraBusinessEventConverter.toJiraBusinessEvent(jsonObject, "PRJ-1")
		).thenReturn(
			jiraBusinessEvent
		);

		_whenSearchObjects(jsonObject);

		Assertions.assertEquals(
			List.of(jiraBusinessEvent),
			_jiraBusinessEventService.getJiraBusinessEvents("PRJ-1"));

		String aql = _captureAQL();

		Assertions.assertTrue(aql.startsWith("BASE"), aql);
		Assertions.assertTrue(aql.contains("\"PRJ-1\""), aql);
	}

	@Test
	public void testGetJiraProductVersions() throws Exception {
		_whenSearchObjects(
			new JSONObject(
			).put(
				"id", "101"
			).put(
				"name", "2025.Q1"
			),
			new JSONObject(
			).put(
				"id", "102"
			).put(
				"name", "2025.Q2"
			));

		List<JiraProductVersion> jiraProductVersions =
			_jiraBusinessEventService.getJiraProductVersions();

		Assertions.assertEquals(2, jiraProductVersions.size());

		JiraProductVersion jiraProductVersion = jiraProductVersions.get(0);

		Assertions.assertEquals("101", jiraProductVersion.getId());
		Assertions.assertEquals("2025.Q1", jiraProductVersion.getName());

		jiraProductVersion = jiraProductVersions.get(1);

		Assertions.assertEquals("102", jiraProductVersion.getId());
		Assertions.assertEquals("2025.Q2", jiraProductVersion.getName());

		Mockito.verify(
			_jiraAssetPersistence
		).searchObjects(
			ArgumentMatchers.eq(
				"objectSchema = \"Business Events\" AND objectType = " +
					"\"Product Version\""),
			ArgumentMatchers.any(Function.class)
		);
	}

	@Test
	public void testUpdateJiraBusinessEvent() throws Exception {
		JiraAssetObject jiraAssetObject = Mockito.mock(JiraAssetObject.class);
		JiraBusinessEvent jiraBusinessEvent = Mockito.mock(
			JiraBusinessEvent.class);
		JiraBusinessEvent updatedJiraBusinessEvent = Mockito.mock(
			JiraBusinessEvent.class);

		JSONObject jsonObject = new JSONObject();

		Mockito.when(
			_jiraAssetPersistence.getObject("42")
		).thenReturn(
			jsonObject
		);

		Mockito.when(
			_jiraBusinessEventConverter.toAssetObject(null, jiraBusinessEvent)
		).thenReturn(
			jiraAssetObject
		);

		Mockito.when(
			_jiraBusinessEventConverter.toJiraBusinessEvent(
				jsonObject, StringPool.BLANK)
		).thenReturn(
			updatedJiraBusinessEvent
		);

		Assertions.assertSame(
			updatedJiraBusinessEvent,
			_jiraBusinessEventService.updateJiraBusinessEvent(
				jiraBusinessEvent, "42"));

		Mockito.verify(
			_jiraAssetPersistence
		).updateObject(
			"42", jiraAssetObject
		);
	}

	private String _buildAQL(Consumer<AQLUtil.Builder> consumer) {
		AQLUtil.Builder builder = AQLUtil.builder("BASE");

		consumer.accept(builder);

		return builder.build();
	}

	private String _captureAQL() {
		ArgumentCaptor<String> aqlArgumentCaptor = ArgumentCaptor.forClass(
			String.class);

		Mockito.verify(
			_jiraAssetPersistence
		).searchObjects(
			aqlArgumentCaptor.capture(), ArgumentMatchers.any(Function.class)
		);

		return aqlArgumentCaptor.getValue();
	}

	private void _whenGetObjectTypeAttributes(JSONObject... jsonObjects) {
		Mockito.when(
			_jiraAssetPersistence.getObjectTypeAttributes("OT-1")
		).thenReturn(
			new JSONArray(jsonObjects)
		);
	}

	private void _whenSearchObjects(JSONObject... jsonObjects) {
		Mockito.when(
			_jiraAssetPersistence.searchObjects(
				ArgumentMatchers.anyString(),
				ArgumentMatchers.any(Function.class))
		).thenAnswer(
			invocation -> {
				Function<JSONObject, Object> function = invocation.getArgument(
					1);

				return Arrays.stream(
					jsonObjects
				).map(
					function
				).toList();
			}
		);
	}

	private final AccountAssetService _accountAssetService = Mockito.mock(
		AccountAssetService.class);
	private final JiraAssetPersistence _jiraAssetPersistence = Mockito.mock(
		JiraAssetPersistence.class);
	private final JiraBusinessEventConverter _jiraBusinessEventConverter =
		Mockito.mock(JiraBusinessEventConverter.class);
	private final JiraBusinessEventService _jiraBusinessEventService =
		new JiraBusinessEventService();
	private final JiraBusinessEventVersionConverter
		_jiraBusinessEventVersionConverter = Mockito.mock(
			JiraBusinessEventVersionConverter.class);

}
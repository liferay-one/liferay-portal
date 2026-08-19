/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.converter;

import com.liferay.one.jira.service.JiraAssetSchemaService;

import java.util.AbstractMap;
import java.util.Collections;
import java.util.Map;
import java.util.Set;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Drew Brokke
 */
public class JiraAssetObjectConverterTestUtil {

	public static <T extends BaseJiraAssetObjectConverter> T prepare(
		T converter) {

		JiraAssetSchemaService jiraAssetSchemaService = Mockito.mock(
			JiraAssetSchemaService.class);

		Mockito.when(
			jiraAssetSchemaService.getAttributeIds(Mockito.any(), Mockito.any())
		).thenReturn(
			new PassthroughAttributeIdMap()
		);

		Mockito.when(
			jiraAssetSchemaService.getAttributeOptions(
				Mockito.any(), Mockito.any())
		).thenReturn(
			Collections.emptyMap()
		);

		ReflectionTestUtils.setField(
			converter, "_jiraAssetSchemaService", jiraAssetSchemaService);

		return converter;
	}

	/**
	 * Maps every attribute name to itself so that converted attribute values
	 * can be read back by name without loading a real schema.
	 */
	private static class PassthroughAttributeIdMap
		extends AbstractMap<String, String> {

		@Override
		public Set<Map.Entry<String, String>> entrySet() {
			return Collections.emptySet();
		}

		@Override
		public String get(Object key) {
			return (String)key;
		}

	}

}
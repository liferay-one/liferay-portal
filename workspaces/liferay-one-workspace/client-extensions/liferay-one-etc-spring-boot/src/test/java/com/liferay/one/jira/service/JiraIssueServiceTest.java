/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.service;

import com.liferay.one.jira.converter.JiraOrganizationConverter;
import com.liferay.one.jira.exception.OrganizationNotFoundException;
import com.liferay.one.jira.model.JiraOrganization;
import com.liferay.one.jira.model.JiraSupportIssue;

import java.net.URI;

import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.http.HttpHeaders;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[SVC-JIRAISSUESERVICE] JiraIssueService")
public class JiraIssueServiceTest {

	@BeforeEach
	public void setUp() {
		ReflectionTestUtils.setField(
			_testJiraIssueService, "_jiraAssetPersistence",
			_jiraAssetPersistence);
		ReflectionTestUtils.setField(
			_testJiraIssueService, "_jiraIssueSupportHCFieldOrganization",
			"customfield_100");
		ReflectionTestUtils.setField(
			_testJiraIssueService, "_jiraIssueSupportHCFieldRequestType",
			"customfield_200");
		ReflectionTestUtils.setField(
			_testJiraIssueService, "_jiraProjectSupportFLS", "FLS");
		ReflectionTestUtils.setField(
			_testJiraIssueService, "_jiraProjectSupportFLSURL",
			"https://fls.example.com");
		ReflectionTestUtils.setField(
			_testJiraIssueService, "_jiraProjectSupportHCURL",
			"https://hc.example.com");
		ReflectionTestUtils.setField(
			_testJiraIssueService, "_jiraURL", "https://jira.example.com");
		ReflectionTestUtils.setField(
			_testJiraIssueService, "_organizationConverter",
			_jiraOrganizationConverter);
	}

	@Test
	public void testAddComment() {
		_testJiraIssueService.addComment("{}", "LRHC-1");

		Assertions.assertEquals(
			List.of("POST /rest/api/3/issue/LRHC-1/comment"),
			_testJiraIssueService.requests);
		Assertions.assertEquals(
			"Basic test",
			_testJiraIssueService.headers.get(HttpHeaders.AUTHORIZATION));
	}

	@Test
	public void testAddIssue() throws Exception {
		_testJiraIssueService.postResponse = "{\"key\": \"LRHC-2\"}";

		Assertions.assertEquals(
			"LRHC-2",
			_testJiraIssueService.addIssue(
				Map.of("customfield_300", "value"), new JSONObject(), "10",
				"LRHC", "Summary"));

		JSONObject fieldsJSONObject = new JSONObject(
			_testJiraIssueService.bodies.get(0)
		).getJSONObject(
			"fields"
		);

		Assertions.assertEquals(
			"value", fieldsJSONObject.getString("customfield_300"));
		Assertions.assertEquals(
			"10",
			fieldsJSONObject.getJSONObject(
				"issuetype"
			).getString(
				"id"
			));
		Assertions.assertEquals(
			"LRHC",
			fieldsJSONObject.getJSONObject(
				"project"
			).getString(
				"key"
			));
		Assertions.assertEquals(
			"Summary", fieldsJSONObject.getString("summary"));

		Assertions.assertEquals(
			List.of("POST /rest/api/3/issue"), _testJiraIssueService.requests);
	}

	@Test
	public void testAddIssueWrapsFailure() {
		_testJiraIssueService.postResponse = "not json";

		Exception exception = Assertions.assertThrows(
			Exception.class,
			() -> _testJiraIssueService.addIssue(
				Map.of(), new JSONObject(), "10", "LRHC", "Summary"));

		Assertions.assertEquals(
			"Unable to add Jira issue", exception.getMessage());
	}

	@Test
	public void testGetJiraSupportIssue() throws Exception {
		JiraOrganization jiraOrganization = Mockito.mock(
			JiraOrganization.class);

		JSONObject organizationJSONObject = new JSONObject();

		Mockito.when(
			_jiraAssetPersistence.getObject("77")
		).thenReturn(
			organizationJSONObject
		);

		Mockito.when(
			_jiraOrganizationConverter.toJiraOrganization(
				organizationJSONObject)
		).thenReturn(
			jiraOrganization
		);

		_testJiraIssueService.getResponses.add(
			_createIssueJSONObject(
				"LRHC-1"
			).put(
				"fields",
				new JSONObject(
				).put(
					"customfield_100",
					new JSONArray(
					).put(
						new JSONObject(
						).put(
							"objectId", "77"
						)
					)
				)
			).toString());

		JiraSupportIssue jiraSupportIssue =
			_testJiraIssueService.getJiraSupportIssue("LRHC-1");

		Assertions.assertEquals("LRHC-1", jiraSupportIssue.getKey());
		Assertions.assertSame(
			jiraOrganization, jiraSupportIssue.getJiraOrganization());

		Assertions.assertEquals(
			"/rest/api/3/issue/LRHC-1",
			_testJiraIssueService.uris.get(
				0
			).getPath());
	}

	@Test
	public void testGetJiraSupportIssueReturnsNullOnRequestFailure()
		throws Exception {

		_testJiraIssueService.getResponses.add("not json");

		Assertions.assertNull(
			_testJiraIssueService.getJiraSupportIssue("LRHC-1"));
	}

	@Test
	public void testGetJiraSupportIssueThrowsWhenOrganizationIsMissing() {
		_testJiraIssueService.getResponses.add(
			_createIssueJSONObject(
				"LRHC-1"
			).toString());
		_testJiraIssueService.getResponses.add(
			_createIssueJSONObject(
				"LRHC-1"
			).put(
				"fields",
				new JSONObject(
				).put(
					"customfield_100", new JSONArray()
				)
			).toString());

		Assertions.assertThrows(
			OrganizationNotFoundException.class,
			() -> _testJiraIssueService.getJiraSupportIssue("LRHC-1"));
		Assertions.assertThrows(
			OrganizationNotFoundException.class,
			() -> _testJiraIssueService.getJiraSupportIssue("LRHC-1"));
	}

	@Test
	public void testGetJiraSupportIssueWrapsOrganizationLookupFailure() {
		Mockito.when(
			_jiraAssetPersistence.getObject("77")
		).thenThrow(
			new RuntimeException()
		);

		_testJiraIssueService.getResponses.add(
			_createIssueJSONObject(
				"LRHC-1"
			).put(
				"fields",
				new JSONObject(
				).put(
					"customfield_100",
					new JSONArray(
					).put(
						new JSONObject(
						).put(
							"objectId", "77"
						)
					)
				)
			).toString());

		Assertions.assertThrows(
			OrganizationNotFoundException.class,
			() -> _testJiraIssueService.getJiraSupportIssue("LRHC-1"));
	}

	@Test
	public void testGetJiraSupportIssuesAppendsIssueKeys() throws Exception {
		_testJiraIssueService.getResponses.add(_createSearchResponse(null));

		_testJiraIssueService.getJiraSupportIssues(
			"PRJ-1", new String[] {"LRHC-1", "LRHC-2"});

		String jql = _getQueryParam(_testJiraIssueService.uris.get(0), "jql");

		Assertions.assertTrue(
			jql.startsWith(
				"Organization in aqlFunction('\\\"External Key\\\" = " +
					"\\\"PRJ-1\\\"') and (status not in ('Closed','"),
			jql);
		Assertions.assertTrue(
			jql.contains("')) and cf[200] = 'General Request'"), jql);
		Assertions.assertTrue(
			jql.endsWith(" or key in ('LRHC-1','LRHC-2')"), jql);
	}

	@Test
	public void testGetJiraSupportIssuesOmitsEmptyIssueKeys() throws Exception {
		_testJiraIssueService.getResponses.add(_createSearchResponse(null));

		_testJiraIssueService.getJiraSupportIssues("PRJ-1", new String[0]);

		String jql = _getQueryParam(_testJiraIssueService.uris.get(0), "jql");

		Assertions.assertTrue(jql.endsWith("= 'General Request'"), jql);
	}

	@Test
	public void testSearchRoutesTicketURLByPrefix() throws Exception {
		_testJiraIssueService.getResponses.add(
			_createSearchResponse(
				null, _createIssueJSONObject("FLS-1"),
				_createIssueJSONObject("LRHC-1")));

		List<JiraSupportIssue> jiraSupportIssues = _testJiraIssueService.search(
			"jql", new String[] {"key"});

		Assertions.assertEquals(
			"https://fls.example.com/FLS-1",
			jiraSupportIssues.get(
				0
			).getTicketURL());
		Assertions.assertEquals(
			"https://hc.example.com/LRHC-1",
			jiraSupportIssues.get(
				1
			).getTicketURL());
	}

	@Test
	public void testSearchStopsWhenRequestFails() throws Exception {
		_testJiraIssueService.getResponses.add(
			_createSearchResponse("TOKEN-2", _createIssueJSONObject("LRHC-1")));
		_testJiraIssueService.getResponses.add("not json");

		List<JiraSupportIssue> jiraSupportIssues = _testJiraIssueService.search(
			"jql", new String[] {"key"});

		Assertions.assertEquals(1, jiraSupportIssues.size());

		Assertions.assertEquals(2, _testJiraIssueService.uris.size());
	}

	@Test
	public void testSearchWalksNextPageToken() throws Exception {
		_testJiraIssueService.getResponses.add(
			_createSearchResponse("TOKEN-2", _createIssueJSONObject("LRHC-1")));
		_testJiraIssueService.getResponses.add(
			_createSearchResponse("", _createIssueJSONObject("LRHC-2")));

		List<JiraSupportIssue> jiraSupportIssues = _testJiraIssueService.search(
			"jql", new String[] {"key", "summary"});

		Assertions.assertEquals(2, jiraSupportIssues.size());

		Assertions.assertEquals(
			"",
			_getQueryParam(_testJiraIssueService.uris.get(0), "nextPageToken"));
		Assertions.assertEquals(
			"TOKEN-2",
			_getQueryParam(_testJiraIssueService.uris.get(1), "nextPageToken"));
		Assertions.assertEquals(
			"key,summary",
			_getQueryParam(_testJiraIssueService.uris.get(0), "fields"));
		Assertions.assertEquals(
			"100",
			_getQueryParam(_testJiraIssueService.uris.get(0), "maxResults"));
	}

	private JSONObject _createIssueJSONObject(String key) {
		return new JSONObject(
		).put(
			"fields", new JSONObject()
		).put(
			"key", key
		);
	}

	private String _createSearchResponse(
		String nextPageToken, JSONObject... issueJSONObjects) {

		JSONObject jsonObject = new JSONObject(
		).put(
			"issues", new JSONArray(issueJSONObjects)
		);

		if (nextPageToken != null) {
			jsonObject.put("nextPageToken", nextPageToken);
		}

		return jsonObject.toString();
	}

	private String _getQueryParam(URI uri, String name) {
		String queryParam = null;

		String query = uri.getQuery();

		for (String parameter : query.split("&")) {
			if (parameter.startsWith(name + "=")) {
				queryParam = parameter.substring(name.length() + 1);
			}
		}

		return queryParam;
	}

	private final JiraAssetPersistence _jiraAssetPersistence = Mockito.mock(
		JiraAssetPersistence.class);
	private final JiraOrganizationConverter _jiraOrganizationConverter =
		Mockito.mock(JiraOrganizationConverter.class);
	private final TestJiraIssueService _testJiraIssueService =
		new TestJiraIssueService();

	private static class TestJiraIssueService extends JiraIssueService {

		public final List<String> bodies = new ArrayList<>();
		public final LinkedList<String> getResponses = new LinkedList<>();
		public Map<String, String> headers;
		public String postResponse = "{}";
		public final List<String> requests = new ArrayList<>();
		public final List<URI> uris = new ArrayList<>();

		@Override
		protected String get(String authorization, URI uri) {
			uris.add(uri);

			return getResponses.poll();
		}

		@Override
		protected String getAuthorization() {
			return "Basic test";
		}

		@Override
		protected String post(
			String body, Map<String, String> headers, URI uri) {

			bodies.add(body);
			requests.add("POST " + uri.getPath());

			this.headers = headers;

			return postResponse;
		}

	}

}
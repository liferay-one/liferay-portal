/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import java.net.URI;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[SVC-CONSOLESERVICE] ConsoleService")
public class ConsoleServiceTest {

	@BeforeEach
	public void setUp() {
		ReflectionTestUtils.setField(
			_testConsoleService, "_consoleAuthEmailAddress",
			_CONSOLE_EMAIL_ADDRESS);
		ReflectionTestUtils.setField(
			_testConsoleService, "_consoleAuthPassword", "secret");
		ReflectionTestUtils.setField(
			_testConsoleService, "_consoleAuthURL", _CONSOLE_URL);
	}

	@Test
	public void testGetAuthorizationCachesTheToken() throws Exception {
		Assertions.assertEquals(
			"Bearer token-1", _testConsoleService.getAuthorization());
		Assertions.assertEquals(
			"Bearer token-1", _testConsoleService.getAuthorization());

		Assertions.assertEquals(1, _testConsoleService.getLoginCount());

		JSONObject jsonObject = new JSONObject(
			_testConsoleService._requests.get(0)._body);

		Assertions.assertEquals(
			_CONSOLE_EMAIL_ADDRESS, jsonObject.getString("email"));
		Assertions.assertEquals("secret", jsonObject.getString("password"));
	}

	@Test
	public void testGetAuthorizationRefreshesTheTokenInsideTheExpiryBuffer()
		throws Exception {

		_testConsoleService.getAuthorization();

		ReflectionTestUtils.setField(
			_testConsoleService, "_tokenExpirationMillis",
			System.currentTimeMillis() + 20000);

		Assertions.assertEquals(
			"Bearer token-2", _testConsoleService.getAuthorization());

		Assertions.assertEquals(2, _testConsoleService.getLoginCount());
	}

	@Test
	public void testGetAuthorizationThrowsWithoutLoginResponse() {
		_testConsoleService._loginResponseNull = true;

		Exception exception = Assertions.assertThrows(
			Exception.class, _testConsoleService::getAuthorization);

		Assertions.assertEquals(
			"Unable to get authorization", exception.getMessage());
	}

	@Test
	public void testGetProjectUsageReturnsTheUserProjectOfTheEnvironment()
		throws Exception {

		_testConsoleService._getResponse = new JSONObject(
		).put(
			"userProjects",
			Arrays.asList(
				new JSONObject(
				).put(
					"environments",
					Arrays.asList(
						new JSONObject(
						).put(
							"projectId", "other"
						))
				).put(
					"name", "first"
				),
				new JSONObject(
				).put(
					"environments",
					Arrays.asList(
						new JSONObject(
						).put(
							"projectId", "project-1"
						))
				).put(
					"name", "second"
				))
		).toString();

		JSONObject jsonObject = _testConsoleService.getProjectUsage(
			"user@example.com", "project-1");

		Assertions.assertEquals("second", jsonObject.getString("name"));

		Assertions.assertNull(
			_testConsoleService.getProjectUsage(
				"user@example.com", "project-2"));
	}

	@Test
	public void testSetUpProjectSkipsSelfInviteAndContinuesPastFailedInvite()
		throws Exception {

		_testConsoleService._failingInviteEmailAddress = "fail@example.com";

		_testConsoleService.setUpProject(
			"cluster-1", true, "dxp-uid", "dxp-instance",
			new String[] {
				_CONSOLE_EMAIL_ADDRESS, "fail@example.com", "ok@example.com"
			},
			42L, "project-1");

		List<String> paths = new ArrayList<>();

		for (Request request : _testConsoleService._requests) {
			JSONObject bodyJSONObject = new JSONObject(request._body);

			paths.add(
				request._uri.getPath() + " " +
					bodyJSONObject.optString("email"));
		}

		Assertions.assertEquals(
			Arrays.asList(
				"/api/login " + _CONSOLE_EMAIL_ADDRESS, "/api/projects ",
				"/api/projects/project-1/invite fail@example.com",
				"/api/projects/project-1/invite ok@example.com",
				"/api/lxc-extension-links ",
				"/api/admin/projects/project-1/apps "),
			paths);

		Request inviteRequest = _testConsoleService._requests.get(3);

		Assertions.assertEquals("Bearer token-1", inviteRequest._authorization);

		JSONObject linkJSONObject = new JSONObject(
			_testConsoleService._requests.get(4)._body);

		Assertions.assertEquals(
			"console-project-id",
			linkJSONObject.getString("extensionProjectUid"));

		JSONObject deployJSONObject = new JSONObject(
			_testConsoleService._requests.get(5)._body);

		Assertions.assertEquals("42", deployJSONObject.getString("orderId"));
		Assertions.assertEquals(
			_CONSOLE_EMAIL_ADDRESS, deployJSONObject.getString("userEmail"));
	}

	@Test
	public void testSetUpProjectWithoutDeployableSkipsDeployApp()
		throws Exception {

		_testConsoleService.setUpProject(
			"cluster-1", false, "dxp-uid", "dxp-instance", new String[0], 42L,
			"project-1");

		Request request = _testConsoleService._requests.get(
			_testConsoleService._requests.size() - 1);

		Assertions.assertEquals(
			"/api/lxc-extension-links", request._uri.getPath());
	}

	private static final String _CONSOLE_EMAIL_ADDRESS = "console@example.com";

	private static final String _CONSOLE_URL =
		"https://console.example.com/api";

	private final TestConsoleService _testConsoleService =
		new TestConsoleService();

	private static class Request {

		private Request(String authorization, String body, URI uri) {
			_authorization = authorization;
			_body = body;
			_uri = uri;
		}

		private final String _authorization;
		private final String _body;
		private final URI _uri;

	}

	private static class TestConsoleService extends ConsoleService {

		public int getLoginCount() {
			int loginCount = 0;

			for (Request request : _requests) {
				if (request._uri.getPath(
					).endsWith(
						"/login"
					)) {

					loginCount++;
				}
			}

			return loginCount;
		}

		@Override
		protected String get(String authorization, URI uri) {
			_requests.add(new Request(authorization, null, uri));

			return _getResponse;
		}

		@Override
		protected String post(String authorization, String body, URI uri) {
			_requests.add(new Request(authorization, body, uri));

			String path = uri.getPath();

			if (path.endsWith("/login")) {
				if (_loginResponseNull) {
					return null;
				}

				return new JSONObject(
				).put(
					"token", "token-" + getLoginCount()
				).toString();
			}

			if (path.endsWith("/invite") &&
				body.contains(_failingInviteEmailAddress)) {

				throw new IllegalStateException();
			}

			if (path.endsWith("/projects")) {
				return new JSONObject(
				).put(
					"id", "console-project-id"
				).toString();
			}

			return "{}";
		}

		private String _failingInviteEmailAddress = "none";
		private String _getResponse;
		private boolean _loginResponseNull;
		private final List<Request> _requests = new ArrayList<>();

	}

}
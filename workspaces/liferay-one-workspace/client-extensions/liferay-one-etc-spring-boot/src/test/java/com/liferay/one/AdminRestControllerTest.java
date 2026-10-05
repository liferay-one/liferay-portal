/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.exception.InvalidUsageParameterException;
import com.liferay.one.jira.synchronizer.TeamRoleSynchronizer;
import com.liferay.one.permission.AdminPermission;
import com.liferay.one.pubsub.Message;
import com.liferay.one.pubsub.subscriber.BasePubsubSubscriber;
import com.liferay.one.service.LDPEventUsageReportService;
import com.liferay.petra.string.StringPool;
import com.liferay.portal.kernel.security.auth.PrincipalException;

import java.time.YearMonth;
import java.time.ZoneOffset;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

/**
 * @author Karoline Silva
 */
public class AdminRestControllerTest {

	@Test
	public void testGetPubsubSubscribersChecksAdminPermission()
		throws Exception {

		AdminRestController adminRestController = _createController(
			_createSubscriber("test-topic"));

		_denyAdminPermission();

		Assertions.assertThrows(
			PrincipalException.class,
			() -> adminRestController.getPubsubSubscribers(null));
	}

	@Test
	public void testGetPubsubSubscribersSkipsSubscribersWithoutTopic()
		throws Exception {

		AdminRestController adminRestController = _createController(
			_createSubscriber("test-topic"), _createSubscriber(null),
			_createSubscriber(StringPool.BLANK));

		ResponseEntity<String> responseEntity =
			adminRestController.getPubsubSubscribers(null);

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		JSONArray jsonArray = new JSONArray(responseEntity.getBody());

		Assertions.assertEquals(1, jsonArray.length());

		JSONObject jsonObject = jsonArray.getJSONObject(0);

		Assertions.assertTrue(
			jsonObject.getString(
				"name"
			).startsWith(
				BasePubsubSubscriber.class.getSimpleName()
			));
		Assertions.assertEquals("test-topic", jsonObject.getString("topic"));
	}

	@Test
	public void testPostDispatchesMessageToMatchingSubscriber()
		throws Exception {

		BasePubsubSubscriber basePubsubSubscriber = _createSubscriber(
			"test-topic");

		AdminRestController adminRestController = _createController(
			basePubsubSubscriber);

		String json = new JSONObject(
		).put(
			"attributes", "a=1\nb=2"
		).put(
			"payload", "line1\nline2"
		).put(
			"topic", "test-topic"
		).toString();

		ResponseEntity<Void> responseEntity =
			adminRestController.postPubsubDispatch(null, json);

		Assertions.assertEquals(
			HttpStatus.OK.value(),
			responseEntity.getStatusCode(
			).value());

		ArgumentCaptor<Message> messageArgumentCaptor = ArgumentCaptor.forClass(
			Message.class);

		Mockito.verify(
			basePubsubSubscriber
		).receive(
			messageArgumentCaptor.capture()
		);

		Message message = messageArgumentCaptor.getValue();

		Assertions.assertEquals("line1line2", message.getPayload());
		Assertions.assertEquals("test-topic", message.getTopic());
		Assertions.assertEquals(
			Arrays.asList("a", "b"),
			new ArrayList<>(
				message.getAttributes(
				).keySet()));
		Assertions.assertEquals("1", message.get("a"));
		Assertions.assertEquals("2", message.get("b"));
	}

	@Test
	public void testPostJiraTeamRolesSyncRefreshesAndReturnsObjectId()
		throws Exception {

		AdminRestController adminRestController = _createController();

		TeamRoleSynchronizer teamRoleSynchronizer = Mockito.mock(
			TeamRoleSynchronizer.class);

		Mockito.when(
			teamRoleSynchronizer.getFirstLineSupportTeamRoleObjectId()
		).thenReturn(
			"12345"
		);

		ReflectionTestUtils.setField(
			adminRestController, "_teamRoleSynchronizer", teamRoleSynchronizer);

		ResponseEntity<String> responseEntity =
			adminRestController.postJiraTeamRolesSync(null);

		Assertions.assertEquals(
			HttpStatus.OK.value(),
			responseEntity.getStatusCode(
			).value());

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		Assertions.assertEquals(
			"12345", jsonObject.getString("firstLineSupportTeamRoleObjectId"));

		Mockito.verify(
			teamRoleSynchronizer
		).syncTeamRoles();
	}

	@Test
	public void testPostLDPEventUsageReportsGenerateChecksAdminPermission()
		throws Exception {

		AdminRestController adminRestController = _createController();

		_denyAdminPermission();

		Assertions.assertThrows(
			PrincipalException.class,
			() -> adminRestController.postLDPEventUsageReportsGenerate(
				null, "2026-08"));

		Mockito.verifyNoInteractions(_ldpEventUsageReportService);
	}

	@Test
	public void testPostLDPEventUsageReportsGenerateDefaultsToThePreviousMonth()
		throws Exception {

		AdminRestController adminRestController = _createController();

		YearMonth beforeYearMonth = _getPreviousYearMonth();

		ResponseEntity<String> responseEntity =
			adminRestController.postLDPEventUsageReportsGenerate(null, null);

		YearMonth afterYearMonth = _getPreviousYearMonth();

		ArgumentCaptor<YearMonth> argumentCaptor = ArgumentCaptor.forClass(
			YearMonth.class);

		Mockito.verify(
			_ldpEventUsageReportService
		).generateUsageReports(
			argumentCaptor.capture()
		);

		YearMonth yearMonth = argumentCaptor.getValue();

		Assertions.assertTrue(
			List.of(
				beforeYearMonth, afterYearMonth
			).contains(
				yearMonth
			));

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		Assertions.assertEquals(
			yearMonth.toString(), jsonObject.getString("yearMonth"));
	}

	@Test
	public void testPostLDPEventUsageReportsGenerateGeneratesTheGivenMonth()
		throws Exception {

		AdminRestController adminRestController = _createController();

		ResponseEntity<String> responseEntity =
			adminRestController.postLDPEventUsageReportsGenerate(
				null, "2026-08");

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		Mockito.verify(
			_ldpEventUsageReportService
		).generateUsageReports(
			YearMonth.of(2026, 8)
		);

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		Assertions.assertEquals("2026-08", jsonObject.getString("yearMonth"));
	}

	@Test
	public void testPostLDPEventUsageReportsGenerateRejectsAMalformedMonth()
		throws Exception {

		AdminRestController adminRestController = _createController();

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> adminRestController.postLDPEventUsageReportsGenerate(
					null, "08-2026"));

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST, responseStatusException.getStatusCode());

		Mockito.verifyNoInteractions(_ldpEventUsageReportService);
	}

	@Test
	public void testPostLDPEventUsageReportsGenerateRejectsAnInvalidParameter()
		throws Exception {

		AdminRestController adminRestController = _createController();

		Mockito.doThrow(
			new InvalidUsageParameterException("Month is in the future")
		).when(
			_ldpEventUsageReportService
		).generateUsageReports(
			YearMonth.of(2099, 1)
		);

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> adminRestController.postLDPEventUsageReportsGenerate(
					null, "2099-01"));

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST, responseStatusException.getStatusCode());
		Assertions.assertEquals(
			"Month is in the future", responseStatusException.getReason());
	}

	@Test
	public void testPostParsesValueContainingEquals() throws Exception {
		BasePubsubSubscriber basePubsubSubscriber = _createSubscriber(
			"test-topic");

		AdminRestController adminRestController = _createController(
			basePubsubSubscriber);

		String json = new JSONObject(
		).put(
			"attributes", "url=https://example.com?a=1&b=2"
		).put(
			"payload", "body"
		).put(
			"topic", "test-topic"
		).toString();

		adminRestController.postPubsubDispatch(null, json);

		ArgumentCaptor<Message> messageArgumentCaptor = ArgumentCaptor.forClass(
			Message.class);

		Mockito.verify(
			basePubsubSubscriber
		).receive(
			messageArgumentCaptor.capture()
		);

		Message message = messageArgumentCaptor.getValue();

		Assertions.assertEquals(
			"https://example.com?a=1&b=2", message.get("url"));
	}

	@Test
	public void testPostThrowsBadGatewayWhenDispatchFails() throws Exception {
		BasePubsubSubscriber basePubsubSubscriber = _createSubscriber(
			"test-topic");

		Mockito.doThrow(
			new RuntimeException("downstream boom")
		).when(
			basePubsubSubscriber
		).receive(
			Mockito.any()
		);

		AdminRestController adminRestController = _createController(
			basePubsubSubscriber);

		String json = new JSONObject(
		).put(
			"attributes", StringPool.BLANK
		).put(
			"payload", "body"
		).put(
			"topic", "test-topic"
		).toString();

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> adminRestController.postPubsubDispatch(null, json));

		Assertions.assertEquals(
			HttpStatus.BAD_GATEWAY.value(),
			responseStatusException.getStatusCode(
			).value());
	}

	@Test
	public void testPostThrowsBadRequestWhenPropertiesAreMalformed()
		throws Exception {

		BasePubsubSubscriber basePubsubSubscriber = _createSubscriber(
			"test-topic");

		AdminRestController adminRestController = _createController(
			basePubsubSubscriber);

		String json = new JSONObject(
		).put(
			"attributes", "missing-delimiter"
		).put(
			"payload", "body"
		).put(
			"topic", "test-topic"
		).toString();

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> adminRestController.postPubsubDispatch(null, json));

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST.value(),
			responseStatusException.getStatusCode(
			).value());

		Mockito.verify(
			basePubsubSubscriber, Mockito.never()
		).receive(
			Mockito.any()
		);
	}

	@Test
	public void testPostThrowsNotFoundWhenTopicIsUnknown() throws Exception {
		BasePubsubSubscriber basePubsubSubscriber = _createSubscriber(
			"other-topic");

		AdminRestController adminRestController = _createController(
			basePubsubSubscriber);

		String json = new JSONObject(
		).put(
			"attributes", StringPool.BLANK
		).put(
			"payload", "body"
		).put(
			"topic", "test-topic"
		).toString();

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> adminRestController.postPubsubDispatch(null, json));

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND.value(),
			responseStatusException.getStatusCode(
			).value());

		Mockito.verify(
			basePubsubSubscriber, Mockito.never()
		).receive(
			Mockito.any()
		);
	}

	private AdminRestController _createController(
		BasePubsubSubscriber... basePubsubSubscribers) {

		AdminRestController adminRestController = new AdminRestController();

		ReflectionTestUtils.setField(
			adminRestController, "_basePubsubSubscribers",
			Arrays.asList(basePubsubSubscribers));
		ReflectionTestUtils.setField(
			adminRestController, "_adminPermission", _adminPermission);
		ReflectionTestUtils.setField(
			adminRestController, "_ldpEventUsageReportService",
			_ldpEventUsageReportService);

		return adminRestController;
	}

	private BasePubsubSubscriber _createSubscriber(String topic) {
		BasePubsubSubscriber basePubsubSubscriber = Mockito.mock(
			BasePubsubSubscriber.class);

		Mockito.when(
			basePubsubSubscriber.getTopic()
		).thenReturn(
			topic
		);

		return basePubsubSubscriber;
	}

	private void _denyAdminPermission() throws Exception {
		Mockito.doThrow(
			new PrincipalException()
		).when(
			_adminPermission
		).check(
			null
		);
	}

	private YearMonth _getPreviousYearMonth() {
		return YearMonth.now(
			ZoneOffset.UTC
		).minusMonths(
			1
		);
	}

	private final AdminPermission _adminPermission = Mockito.mock(
		AdminPermission.class);
	private final LDPEventUsageReportService _ldpEventUsageReportService =
		Mockito.mock(LDPEventUsageReportService.class);

}
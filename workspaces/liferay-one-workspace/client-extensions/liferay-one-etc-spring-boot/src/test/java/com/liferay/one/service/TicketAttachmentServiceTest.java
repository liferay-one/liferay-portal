/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.one.exception.TicketAttachmentAlreadyApprovedException;
import com.liferay.one.exception.TicketAttachmentNotFoundException;
import com.liferay.one.model.TicketAttachment;

import java.net.URI;
import java.net.URLDecoder;

import java.nio.charset.StandardCharsets;

import java.util.ArrayList;
import java.util.List;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.springframework.http.HttpHeaders;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.reactive.function.client.WebClientResponseException;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[SVC-TICKETATTACHMENTSERVICE] TicketAttachmentService")
public class TicketAttachmentServiceTest {

	@BeforeEach
	public void setUp() {
		ReflectionTestUtils.setField(
			_testTicketAttachmentService, "_gcsBucketName", "bucket");
	}

	@Test
	public void testAddTicketAttachment() throws Exception {
		_testTicketAttachmentService.response = _createTicketAttachmentJSON(2);

		TicketAttachment ticketAttachment =
			_testTicketAttachmentService.addTicketAttachment(
				"ACCNT-1", "Bearer user", "TA-1", "file.txt", "10", "LRHC-1",
				"abc", "PRJ-1", TicketAttachment.STATUS_DRAFT, "type");

		Assertions.assertEquals(7, ticketAttachment.getTicketAttachmentId());

		Assertions.assertEquals(
			List.of("POST /o/c/ticketattachments"),
			_testTicketAttachmentService.requests);
		Assertions.assertEquals(
			"Bearer user", _testTicketAttachmentService.authorization);

		JSONObject jsonObject = new JSONObject(
			_testTicketAttachmentService.bodies.get(0));

		Assertions.assertEquals("ACCNT-1", jsonObject.getString("accountKey"));
		Assertions.assertEquals(
			"TA-1", jsonObject.getString("externalReferenceCode"));
		Assertions.assertEquals(
			"bucket", jsonObject.getString("gcsBucketName"));
		Assertions.assertEquals("abc", jsonObject.getString("md5Checksum"));
		Assertions.assertEquals("PRJ-1", jsonObject.getString("projectKey"));
		Assertions.assertEquals(
			"ACCNT-1",
			jsonObject.getString(
				"r_accountEntryToTicketAttachment_accountEntryERC"));
		Assertions.assertEquals(
			TicketAttachment.STATUS_DRAFT,
			jsonObject.getJSONObject(
				"status"
			).getInt(
				"code"
			));
		Assertions.assertEquals(
			TicketAttachment.STORAGE_PROVIDER_GCS,
			jsonObject.getString("storageProvider"));
	}

	@Test
	public void testAddTicketAttachmentOmitsBlankChecksum() throws Exception {
		_testTicketAttachmentService.response = _createTicketAttachmentJSON(2);

		_testTicketAttachmentService.addTicketAttachment(
			"ACCNT-1", "Bearer user", "TA-1", "file.txt", "10", "LRHC-1", "",
			"PRJ-1", TicketAttachment.STATUS_DRAFT, "type");

		JSONObject jsonObject = new JSONObject(
			_testTicketAttachmentService.bodies.get(0));

		Assertions.assertFalse(jsonObject.has("md5Checksum"));
	}

	@Test
	public void testApproveTicketAttachment() throws Exception {
		_testTicketAttachmentService.response = _createTicketAttachmentJSON(
			TicketAttachment.STATUS_DRAFT);

		_testTicketAttachmentService.approveTicketAttachment("Bearer user", 7);

		Assertions.assertEquals(
			List.of(
				"GET /o/c/ticketattachments/7",
				"PATCH /o/c/ticketattachments/7"),
			_testTicketAttachmentService.requests);
		Assertions.assertEquals(
			TicketAttachment.STATUS_APPROVED,
			new JSONObject(
				_testTicketAttachmentService.bodies.get(0)
			).getJSONObject(
				"status"
			).getInt(
				"code"
			));
	}

	@Test
	public void testApproveTicketAttachmentRejectsApprovedAttachment() {
		_testTicketAttachmentService.response = _createTicketAttachmentJSON(
			TicketAttachment.STATUS_APPROVED);

		Assertions.assertThrows(
			TicketAttachmentAlreadyApprovedException.class,
			() -> _testTicketAttachmentService.approveTicketAttachment(
				"Bearer user", 7));
		Assertions.assertEquals(
			List.of("GET /o/c/ticketattachments/7"),
			_testTicketAttachmentService.requests);
	}

	@Test
	public void testDeleteTicketAttachment() throws Exception {
		_testTicketAttachmentService.deleteTicketAttachment("Bearer user", 7);

		Assertions.assertEquals(
			List.of("DELETE /o/c/ticketattachments/7"),
			_testTicketAttachmentService.requests);
	}

	@Test
	public void testFetchTicketAttachment() throws Exception {
		_testTicketAttachmentService.response = new JSONObject(
		).put(
			"items",
			new JSONArray(
			).put(
				new JSONObject(_createTicketAttachmentJSON(2))
			)
		).toString();

		TicketAttachment ticketAttachment =
			_testTicketAttachmentService.fetchTicketAttachment(
				"Bearer user", "file.txt", "LRHC-1", "abc");

		Assertions.assertEquals(7, ticketAttachment.getTicketAttachmentId());

		Assertions.assertEquals(
			"fileName eq 'file.txt' and jiraIssueKey eq 'LRHC-1' and " +
				"md5Checksum eq 'abc'",
			_getFilter());
	}

	@Test
	public void testFetchTicketAttachmentOmitsBlankChecksum() throws Exception {
		_testTicketAttachmentService.response = "{\"items\": []}";

		Assertions.assertNull(
			_testTicketAttachmentService.fetchTicketAttachment(
				"Bearer user", "file.txt", "LRHC-1", null));
		Assertions.assertEquals(
			"fileName eq 'file.txt' and jiraIssueKey eq 'LRHC-1'",
			_getFilter());
	}

	@Test
	public void testFetchTicketAttachmentReturnsNullForEmptyResponse()
		throws Exception {

		Assertions.assertNull(
			_testTicketAttachmentService.fetchTicketAttachment(
				"Bearer user", "file.txt", "LRHC-1", null));
	}

	@Test
	public void testGetTicketAttachmentByExternalReferenceCode()
		throws Exception {

		_testTicketAttachmentService.response = _createTicketAttachmentJSON(2);

		TicketAttachment ticketAttachment =
			_testTicketAttachmentService.getTicketAttachment(
				"Bearer user", "TA-1");

		Assertions.assertEquals(7, ticketAttachment.getTicketAttachmentId());

		Assertions.assertEquals(
			List.of(
				"GET /o/c/ticketattachments/by-external-reference-code/TA-1"),
			_testTicketAttachmentService.requests);
	}

	@Test
	public void testGetTicketAttachmentByExternalReferenceCodeMapsErrors() {
		_testTicketAttachmentService.response = "{}";

		Assertions.assertThrows(
			TicketAttachmentNotFoundException.class,
			() -> _testTicketAttachmentService.getTicketAttachment(
				"Bearer user", "TA-1"));

		_testTicketAttachmentService.runtimeException = _createException(404);

		Assertions.assertThrows(
			TicketAttachmentNotFoundException.class,
			() -> _testTicketAttachmentService.getTicketAttachment(
				"Bearer user", "TA-1"));

		_testTicketAttachmentService.runtimeException = _createException(500);

		Assertions.assertThrows(
			WebClientResponseException.class,
			() -> _testTicketAttachmentService.getTicketAttachment(
				"Bearer user", "TA-1"));
	}

	@Test
	public void testGetTicketAttachmentMapsErrors() {
		_testTicketAttachmentService.response = "{\"id\": null}";

		Assertions.assertThrows(
			TicketAttachmentNotFoundException.class,
			() -> _testTicketAttachmentService.getTicketAttachment(
				"Bearer user", 7));

		_testTicketAttachmentService.runtimeException = _createException(404);

		Assertions.assertThrows(
			TicketAttachmentNotFoundException.class,
			() -> _testTicketAttachmentService.getTicketAttachment(
				"Bearer user", 7));

		_testTicketAttachmentService.runtimeException = _createException(500);

		Assertions.assertThrows(
			WebClientResponseException.class,
			() -> _testTicketAttachmentService.getTicketAttachment(
				"Bearer user", 7));
	}

	@Test
	public void testSearch() throws Exception {
		_testTicketAttachmentService.response = new JSONObject(
		).put(
			"items",
			new JSONArray(
			).put(
				new JSONObject(_createTicketAttachmentJSON(2))
			).put(
				new JSONObject(_createTicketAttachmentJSON(0))
			)
		).toString();

		List<TicketAttachment> ticketAttachments =
			_testTicketAttachmentService.search(
				"Bearer user", "type eq 'x'", 2, 50);

		Assertions.assertEquals(2, ticketAttachments.size());

		URI uri = _testTicketAttachmentService.uris.get(0);

		Assertions.assertTrue(
			uri.getQuery(
			).contains(
				"page=2"
			),
			uri.getQuery());
		Assertions.assertTrue(
			uri.getQuery(
			).contains(
				"pageSize=50"
			),
			uri.getQuery());
	}

	@Test
	public void testUpdateTicketAttachmentDraftCommentBody() throws Exception {
		_testTicketAttachmentService.response = _createTicketAttachmentJSON(2);

		_testTicketAttachmentService.updateTicketAttachmentDraftCommentBody(
			"Bearer user", "Draft", 7);

		Assertions.assertEquals(
			List.of("PATCH /o/c/ticketattachments/7"),
			_testTicketAttachmentService.requests);
		Assertions.assertEquals(
			"{\"draftCommentBody\":\"Draft\"}",
			_testTicketAttachmentService.bodies.get(0));
	}

	@Test
	public void testUpdateTicketAttachmentState() throws Exception {
		_testTicketAttachmentService.response = _createTicketAttachmentJSON(2);

		_testTicketAttachmentService.updateTicketAttachmentState(
			"Bearer user", 3, 7);

		Assertions.assertEquals(
			List.of("PATCH /o/c/ticketattachments/7"),
			_testTicketAttachmentService.requests);
		Assertions.assertEquals(
			"{\"state\":3}", _testTicketAttachmentService.bodies.get(0));
	}

	private WebClientResponseException _createException(int statusCode) {
		return WebClientResponseException.create(
			statusCode, "Error", HttpHeaders.EMPTY,
			"error".getBytes(StandardCharsets.UTF_8), StandardCharsets.UTF_8);
	}

	private String _createTicketAttachmentJSON(int statusCode) {
		return new JSONObject(
		).put(
			"accountKey", "ACCNT-1"
		).put(
			"creator",
			new JSONObject(
			).put(
				"id", 3
			)
		).put(
			"fileName", "file.txt"
		).put(
			"fileSize", "10"
		).put(
			"gcsBucketName", "bucket"
		).put(
			"id", 7
		).put(
			"status",
			new JSONObject(
			).put(
				"code", statusCode
			)
		).put(
			"storageProvider", TicketAttachment.STORAGE_PROVIDER_GCS
		).toString();
	}

	private String _getFilter() {
		URI uri = _testTicketAttachmentService.uris.get(0);

		String rawQuery = uri.getRawQuery();

		return URLDecoder.decode(
			rawQuery.substring("filter=".length()), StandardCharsets.UTF_8);
	}

	private final TestTicketAttachmentService _testTicketAttachmentService =
		new TestTicketAttachmentService();

	private static class TestTicketAttachmentService
		extends TicketAttachmentService {

		public String authorization;
		public final List<String> bodies = new ArrayList<>();
		public final List<String> requests = new ArrayList<>();
		public String response;
		public RuntimeException runtimeException;
		public final List<URI> uris = new ArrayList<>();

		@Override
		protected String delete(String authorization, String body, URI uri) {
			_record("DELETE", authorization, null, uri);

			return null;
		}

		@Override
		protected String get(String authorization, URI uri) {
			_record("GET", authorization, null, uri);

			if (runtimeException != null) {
				throw runtimeException;
			}

			return response;
		}

		@Override
		protected String patch(String authorization, String body, URI uri) {
			_record("PATCH", authorization, body, uri);

			return response;
		}

		@Override
		protected String post(String authorization, String body, URI uri) {
			_record("POST", authorization, body, uri);

			return response;
		}

		private void _record(
			String method, String authorization, String body, URI uri) {

			this.authorization = authorization;

			if (body != null) {
				bodies.add(body);
			}

			requests.add(method + " " + uri.getPath());
			uris.add(uri);
		}

	}

}
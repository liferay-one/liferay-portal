/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.google.cloud.storage.StorageException;

import com.liferay.headless.admin.user.client.dto.v1_0.RoleBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.constants.RoleConstants;
import com.liferay.one.exception.TicketAttachmentAlreadyApprovedException;
import com.liferay.one.jira.constants.IssueConstants;
import com.liferay.one.jira.model.JiraOrganization;
import com.liferay.one.jira.model.JiraSupportIssue;
import com.liferay.one.jira.service.JiraIssueService;
import com.liferay.one.model.Project;
import com.liferay.one.model.TicketAttachment;
import com.liferay.one.permission.ProjectPermission;
import com.liferay.one.service.GoogleCloudStorageService;
import com.liferay.one.service.ProjectService;
import com.liferay.one.service.TicketAttachmentService;
import com.liferay.one.service.UserAccountService;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.security.auth.PrincipalException;
import com.liferay.portal.kernel.security.permission.ActionKeys;
import com.liferay.portal.kernel.workflow.WorkflowConstants;

import java.net.URI;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mockito;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
public class TicketAttachmentsRestControllerTest {

	@BeforeEach
	public void setUp() throws Exception {
		_ticketAttachmentsRestController =
			new TicketAttachmentsRestController() {

				@Override
				protected String get(String authorization, URI uri) {
					return new JSONObject(
					).put(
						"emailAddress", "jane@example.com"
					).put(
						"name", "Jane Doe"
					).toString();
				}

			};

		ReflectionTestUtils.setField(
			_ticketAttachmentsRestController, "_googleCloudStorageService",
			_googleCloudStorageService);
		ReflectionTestUtils.setField(
			_ticketAttachmentsRestController, "_jiraIssueService",
			_jiraIssueService);
		ReflectionTestUtils.setField(
			_ticketAttachmentsRestController, "_onePortalURL", _ONE_PORTAL_URL);
		ReflectionTestUtils.setField(
			_ticketAttachmentsRestController, "_projectPermission",
			_projectPermission);
		ReflectionTestUtils.setField(
			_ticketAttachmentsRestController, "_projectService",
			_projectService);
		ReflectionTestUtils.setField(
			_ticketAttachmentsRestController, "_ticketAttachmentService",
			_ticketAttachmentService);
		ReflectionTestUtils.setField(
			_ticketAttachmentsRestController, "_userAccountService",
			_userAccountService);

		Mockito.when(
			_jwt.getTokenValue()
		).thenReturn(
			"token"
		);

		Mockito.when(
			_googleCloudStorageService.getUploadSessionURL(
				Mockito.anyString(), Mockito.anyString(), Mockito.anyString(),
				Mockito.anyString())
		).thenReturn(
			_UPLOAD_SESSION_URL
		);

		Mockito.when(
			_projectService.getProject(_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			new Project(
				new JSONObject(
				).put(
					"externalReferenceCode", _PROJECT_EXTERNAL_REFERENCE_CODE
				).put(
					"r_accountEntryToProject_accountEntryERC",
					_ACCOUNT_EXTERNAL_REFERENCE_CODE
				))
		);

		_mockRoleNames();
		_mockTicketStatus("Open");
	}

	@Test
	public void testDeleteReturnsAcceptedWhenStorageDeleteFails()
		throws Exception {

		TicketAttachment ticketAttachment = _mockGetTicketAttachment();

		Mockito.doThrow(
			new StorageException(503, "Unavailable")
		).when(
			_googleCloudStorageService
		).deleteObject(
			_BUCKET_NAME, ticketAttachment.getGCSObjectName()
		);

		ResponseEntity<String> responseEntity =
			_ticketAttachmentsRestController.delete(
				_jwt, _TICKET_ATTACHMENT_ID);

		Assertions.assertEquals(
			HttpStatus.ACCEPTED, responseEntity.getStatusCode());

		Mockito.verify(
			_ticketAttachmentService
		).updateTicketAttachmentState(
			_AUTHORIZATION, WorkflowConstants.STATUS_IN_TRASH,
			_TICKET_ATTACHMENT_ID
		);

		Mockito.verify(
			_ticketAttachmentService, Mockito.never()
		).deleteTicketAttachment(
			Mockito.anyString(), Mockito.anyLong()
		);
	}

	@Test
	public void testDeleteThrowsForbiddenWithoutProjectPermission()
		throws Exception {

		_mockGetTicketAttachment();
		_mockPermissionDenied(ActionKeys.UPDATE);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _ticketAttachmentsRestController.delete(
				_jwt, _TICKET_ATTACHMENT_ID));

		Mockito.verify(
			_ticketAttachmentService, Mockito.never()
		).updateTicketAttachmentState(
			Mockito.anyString(), Mockito.anyInt(), Mockito.anyLong()
		);

		Mockito.verifyNoInteractions(_googleCloudStorageService);
	}

	@Test
	public void testDeleteTrashesAndDeletesTicketAttachment() throws Exception {
		TicketAttachment ticketAttachment = _mockGetTicketAttachment();

		ResponseEntity<String> responseEntity =
			_ticketAttachmentsRestController.delete(
				_jwt, _TICKET_ATTACHMENT_ID);

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		InOrder inOrder = Mockito.inOrder(
			_googleCloudStorageService, _projectPermission,
			_ticketAttachmentService);

		inOrder.verify(
			_projectPermission
		).check(
			ActionKeys.UPDATE, _jwt, _PROJECT_EXTERNAL_REFERENCE_CODE
		);

		inOrder.verify(
			_ticketAttachmentService
		).updateTicketAttachmentState(
			_AUTHORIZATION, WorkflowConstants.STATUS_IN_TRASH,
			_TICKET_ATTACHMENT_ID
		);

		inOrder.verify(
			_googleCloudStorageService
		).deleteObject(
			_BUCKET_NAME, ticketAttachment.getGCSObjectName()
		);

		inOrder.verify(
			_ticketAttachmentService
		).deleteTicketAttachment(
			_AUTHORIZATION, _TICKET_ATTACHMENT_ID
		);
	}

	@Test
	public void testGetByExternalReferenceCodeDownloadMapsStorageFailure()
		throws Exception {

		TicketAttachment ticketAttachment = _createTicketAttachment(
			TicketAttachment.STATUS_APPROVED);

		Mockito.when(
			_ticketAttachmentService.getTicketAttachment(
				_AUTHORIZATION, _TICKET_ATTACHMENT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			ticketAttachment
		);

		StorageException storageException = new StorageException(
			404, "Not Found");

		Mockito.when(
			_googleCloudStorageService.getDownloadURL(
				_BUCKET_NAME, ticketAttachment.getGCSObjectName())
		).thenThrow(
			storageException
		);

		Assertions.assertSame(
			storageException,
			Assertions.assertThrows(
				StorageException.class,
				() ->
					_ticketAttachmentsRestController.
						getByExternalReferenceCodeDownload(
							_jwt, _TICKET_ATTACHMENT_EXTERNAL_REFERENCE_CODE)));

		ResponseEntity<String> responseEntity =
			_ticketAttachmentsRestController.handleException(storageException);

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND, responseEntity.getStatusCode());
		Assertions.assertEquals(
			"FILE_NOT_FOUND_IN_STORAGE", responseEntity.getBody());

		responseEntity = _ticketAttachmentsRestController.handleException(
			new StorageException(503, "Unavailable"));

		Assertions.assertEquals(
			HttpStatus.SERVICE_UNAVAILABLE, responseEntity.getStatusCode());
		Assertions.assertEquals(
			"FILE_SERVER_UNAVAILABLE", responseEntity.getBody());
	}

	@Test
	public void testGetByExternalReferenceCodeDownloadReturnsDownloadURL()
		throws Exception {

		TicketAttachment ticketAttachment = _createTicketAttachment(
			TicketAttachment.STATUS_APPROVED);

		Mockito.when(
			_ticketAttachmentService.getTicketAttachment(
				_AUTHORIZATION, _TICKET_ATTACHMENT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			ticketAttachment
		);

		_mockDownloadURL(ticketAttachment);

		ResponseEntity<String> responseEntity =
			_ticketAttachmentsRestController.getByExternalReferenceCodeDownload(
				_jwt, _TICKET_ATTACHMENT_EXTERNAL_REFERENCE_CODE);

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());
		Assertions.assertEquals(_DOWNLOAD_URL, responseEntity.getBody());

		Mockito.verify(
			_projectPermission
		).check(
			ActionKeys.VIEW, _jwt, _PROJECT_EXTERNAL_REFERENCE_CODE
		);
	}

	@Test
	public void testGetByIdDownloadReturnsDownloadURL() throws Exception {
		TicketAttachment ticketAttachment = _mockGetTicketAttachment();

		_mockDownloadURL(ticketAttachment);

		ResponseEntity<String> responseEntity =
			_ticketAttachmentsRestController.getByIdDownload(
				_jwt, _TICKET_ATTACHMENT_ID);

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());
		Assertions.assertEquals(_DOWNLOAD_URL, responseEntity.getBody());

		Mockito.verify(
			_projectPermission
		).check(
			ActionKeys.VIEW, _jwt, _PROJECT_EXTERNAL_REFERENCE_CODE
		);
	}

	@Test
	public void testGetByIdDownloadThrowsForbiddenWithoutViewPermission()
		throws Exception {

		_mockGetTicketAttachment();
		_mockPermissionDenied(ActionKeys.VIEW);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _ticketAttachmentsRestController.getByIdDownload(
				_jwt, _TICKET_ATTACHMENT_ID));

		Mockito.verifyNoInteractions(_googleCloudStorageService);
	}

	@Test
	public void testPostCompleteUploadApprovesAndPostsJiraComment()
		throws Exception {

		_mockGetTicketAttachment();
		_mockApproveTicketAttachment();

		ResponseEntity<String> responseEntity =
			_ticketAttachmentsRestController.postCompleteUpload(
				_jwt, _createCommentJSON(), _TICKET_ATTACHMENT_ID);

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		ArgumentCaptor<String> argumentCaptor = ArgumentCaptor.forClass(
			String.class);

		Mockito.verify(
			_jiraIssueService
		).addComment(
			argumentCaptor.capture(), Mockito.eq(_TICKET_ID)
		);

		String body = argumentCaptor.getValue();

		Assertions.assertTrue(
			body.contains("Jane Doe (jane@example.com) wrote:"));
		Assertions.assertTrue(body.contains("https://example.com/logs"));
		Assertions.assertTrue(
			body.contains(
				StringBundler.concat(
					_ONE_PORTAL_URL, "/support/ticket-attachments/#/id/",
					_TICKET_ATTACHMENT_ID)));

		Mockito.verify(
			_ticketAttachmentService, Mockito.never()
		).updateTicketAttachmentDraftCommentBody(
			Mockito.anyString(), Mockito.anyString(), Mockito.anyLong()
		);
	}

	@Test
	public void testPostCompleteUploadSavesDraftCommentWhenJiraCommentFails()
		throws Exception {

		_mockGetTicketAttachment();
		_mockApproveTicketAttachment();

		Mockito.doThrow(
			new IllegalStateException()
		).when(
			_jiraIssueService
		).addComment(
			Mockito.anyString(), Mockito.eq(_TICKET_ID)
		);

		ResponseEntity<String> responseEntity =
			_ticketAttachmentsRestController.postCompleteUpload(
				_jwt, _createCommentJSON(), _TICKET_ATTACHMENT_ID);

		Assertions.assertEquals(
			HttpStatus.ACCEPTED, responseEntity.getStatusCode());
		Assertions.assertEquals(
			"COMMENT_POST_FAILED_RETRYING", responseEntity.getBody());

		Mockito.verify(
			_ticketAttachmentService
		).updateTicketAttachmentDraftCommentBody(
			Mockito.eq(_AUTHORIZATION), Mockito.contains("Jane Doe"),
			Mockito.eq(_TICKET_ATTACHMENT_ID)
		);
	}

	@Test
	public void testPostCompleteUploadThrowsForbiddenWithoutProjectPermission()
		throws Exception {

		_mockGetTicketAttachment();
		_mockPermissionDenied(ActionKeys.UPDATE);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _ticketAttachmentsRestController.postCompleteUpload(
				_jwt, _createCommentJSON(), _TICKET_ATTACHMENT_ID));

		Mockito.verify(
			_ticketAttachmentService, Mockito.never()
		).approveTicketAttachment(
			Mockito.anyString(), Mockito.anyLong()
		);

		Mockito.verifyNoInteractions(_jiraIssueService);
	}

	@Test
	public void testPostInitiateUploadAddsDraftTicketAttachment()
		throws Exception {

		TicketAttachment ticketAttachment = _createTicketAttachment(
			TicketAttachment.STATUS_DRAFT);

		Mockito.when(
			_ticketAttachmentService.addTicketAttachment(
				_ACCOUNT_EXTERNAL_REFERENCE_CODE, _AUTHORIZATION, "TA-1",
				_FILE_NAME, _FILE_SIZE, _TICKET_ID, _MD5_CHECKSUM,
				_PROJECT_EXTERNAL_REFERENCE_CODE, TicketAttachment.STATUS_DRAFT,
				"log")
		).thenReturn(
			ticketAttachment
		);

		ResponseEntity<String> responseEntity =
			_ticketAttachmentsRestController.postInitiateUpload(
				_jwt,
				_createJSONObject(
				).put(
					"externalReferenceCode", "TA-1"
				).put(
					"type", "log"
				).toString(),
				_ORIGIN);

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		Assertions.assertEquals(
			_UPLOAD_SESSION_URL, jsonObject.getString("gcsSessionURL"));
		Assertions.assertEquals(
			_PROJECT_EXTERNAL_REFERENCE_CODE,
			jsonObject.getString("projectKey"));
		Assertions.assertEquals(
			_TICKET_ATTACHMENT_ID, jsonObject.getLong("ticketAttachmentId"));

		Mockito.verify(
			_projectPermission
		).check(
			ActionKeys.UPDATE, _jwt, _PROJECT_EXTERNAL_REFERENCE_CODE
		);

		Mockito.verify(
			_googleCloudStorageService
		).getUploadSessionURL(
			_BUCKET_NAME, _FILE_SIZE, ticketAttachment.getGCSObjectName(),
			_ORIGIN
		);
	}

	@Test
	public void testPostInitiateUploadReturnsBadRequestWhenTicketIsClosed()
		throws Exception {

		_mockTicketStatus(IssueConstants.STATUS_CLOSED);

		ResponseEntity<String> responseEntity =
			_ticketAttachmentsRestController.postInitiateUpload(
				_jwt, _createJSONObject().toString(), _ORIGIN);

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST, responseEntity.getStatusCode());
		Assertions.assertEquals("TICKET_IS_CLOSED", responseEntity.getBody());

		Mockito.verifyNoInteractions(
			_projectPermission, _ticketAttachmentService);
	}

	@Test
	public void testPostInitiateUploadReturnsNotFoundWhenTicketIsUnknown()
		throws Exception {

		Mockito.when(
			_jiraIssueService.getJiraSupportIssue(_TICKET_ID)
		).thenReturn(
			null
		);

		ResponseEntity<String> responseEntity =
			_ticketAttachmentsRestController.postInitiateUpload(
				_jwt, _createJSONObject().toString(), _ORIGIN);

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND, responseEntity.getStatusCode());
		Assertions.assertEquals(
			"INVALID_TICKET_NUMBER", responseEntity.getBody());

		Mockito.verifyNoInteractions(
			_projectPermission, _ticketAttachmentService);
	}

	@Test
	public void testPostInitiateUploadReturnsProvidedGCSSessionURL()
		throws Exception {

		_mockFetchTicketAttachment(
			_createTicketAttachment(TicketAttachment.STATUS_DRAFT));

		ResponseEntity<String> responseEntity =
			_ticketAttachmentsRestController.postInitiateUpload(
				_jwt,
				_createJSONObject(
				).put(
					"gcsSessionURL", "https://storage.example.com/resumable"
				).toString(),
				_ORIGIN);

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		Assertions.assertEquals(
			"https://storage.example.com/resumable",
			jsonObject.getString("gcsSessionURL"));

		Mockito.verifyNoInteractions(_googleCloudStorageService);
	}

	@Test
	public void testPostInitiateUploadReusesDraftTicketAttachment()
		throws Exception {

		_mockFetchTicketAttachment(
			_createTicketAttachment(TicketAttachment.STATUS_DRAFT));

		ResponseEntity<String> responseEntity =
			_ticketAttachmentsRestController.postInitiateUpload(
				_jwt, _createJSONObject().toString(), _ORIGIN);

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		Assertions.assertEquals(
			_TICKET_ATTACHMENT_ID, jsonObject.getLong("ticketAttachmentId"));

		Mockito.verify(
			_ticketAttachmentService, Mockito.never()
		).addTicketAttachment(
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.anyInt(), Mockito.any()
		);
	}

	@Test
	public void testPostInitiateUploadSkipsProjectPermissionForProvisioningMember()
		throws Exception {

		_mockRoleNames(RoleConstants.NAME_PROVISIONING_MEMBER);

		_mockFetchTicketAttachment(
			_createTicketAttachment(TicketAttachment.STATUS_DRAFT));

		ResponseEntity<String> responseEntity =
			_ticketAttachmentsRestController.postInitiateUpload(
				_jwt, _createJSONObject().toString(), _ORIGIN);

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		Mockito.verifyNoInteractions(_projectPermission);
	}

	@Test
	public void testPostInitiateUploadThrowsForbiddenWithoutProjectPermission()
		throws Exception {

		Mockito.doThrow(
			new PrincipalException()
		).when(
			_projectPermission
		).check(
			ActionKeys.UPDATE, _jwt, _PROJECT_EXTERNAL_REFERENCE_CODE
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _ticketAttachmentsRestController.postInitiateUpload(
				_jwt, _createJSONObject().toString(), _ORIGIN));

		Mockito.verifyNoInteractions(
			_googleCloudStorageService, _ticketAttachmentService);
	}

	@Test
	public void testPostInitiateUploadThrowsWhenTicketAttachmentIsApproved()
		throws Exception {

		_mockFetchTicketAttachment(
			_createTicketAttachment(TicketAttachment.STATUS_APPROVED));

		Assertions.assertThrows(
			TicketAttachmentAlreadyApprovedException.class,
			() -> _ticketAttachmentsRestController.postInitiateUpload(
				_jwt, _createJSONObject().toString(), _ORIGIN));

		Mockito.verifyNoInteractions(_googleCloudStorageService);
	}

	private String _createCommentJSON() {
		return new JSONObject(
		).put(
			"commentBody", "See https://example.com/logs for details"
		).toString();
	}

	private JSONObject _createJSONObject() {
		return new JSONObject(
		).put(
			"fileName", _FILE_NAME
		).put(
			"fileSize", _FILE_SIZE
		).put(
			"md5Checksum", _MD5_CHECKSUM
		).put(
			"ticketId", _TICKET_ID
		);
	}

	private TicketAttachment _createTicketAttachment(int status) {
		return new TicketAttachment(
			new JSONObject(
			).put(
				"accountKey", _ACCOUNT_EXTERNAL_REFERENCE_CODE
			).put(
				"creator",
				new JSONObject(
				).put(
					"id", 1L
				)
			).put(
				"fileName", _FILE_NAME
			).put(
				"fileSize", _FILE_SIZE
			).put(
				"gcsBucketName", _BUCKET_NAME
			).put(
				"id", _TICKET_ATTACHMENT_ID
			).put(
				"jiraIssueKey", _TICKET_ID
			).put(
				"projectKey", _PROJECT_EXTERNAL_REFERENCE_CODE
			).put(
				"status",
				new JSONObject(
				).put(
					"code", status
				)
			).put(
				"storageProvider", TicketAttachment.STORAGE_PROVIDER_GCS
			));
	}

	private void _mockApproveTicketAttachment() throws Exception {
		TicketAttachment ticketAttachment = _createTicketAttachment(
			TicketAttachment.STATUS_APPROVED);

		Mockito.when(
			_ticketAttachmentService.approveTicketAttachment(
				_AUTHORIZATION, _TICKET_ATTACHMENT_ID)
		).thenReturn(
			ticketAttachment
		);
	}

	private void _mockDownloadURL(TicketAttachment ticketAttachment)
		throws Exception {

		Mockito.when(
			_googleCloudStorageService.getDownloadURL(
				_BUCKET_NAME, ticketAttachment.getGCSObjectName())
		).thenReturn(
			_DOWNLOAD_URL
		);
	}

	private void _mockFetchTicketAttachment(TicketAttachment ticketAttachment)
		throws Exception {

		Mockito.when(
			_ticketAttachmentService.fetchTicketAttachment(
				_AUTHORIZATION, _FILE_NAME, _TICKET_ID, _MD5_CHECKSUM)
		).thenReturn(
			ticketAttachment
		);
	}

	private TicketAttachment _mockGetTicketAttachment() throws Exception {
		TicketAttachment ticketAttachment = _createTicketAttachment(
			TicketAttachment.STATUS_DRAFT);

		Mockito.when(
			_ticketAttachmentService.getTicketAttachment(
				_AUTHORIZATION, _TICKET_ATTACHMENT_ID)
		).thenReturn(
			ticketAttachment
		);

		return ticketAttachment;
	}

	private void _mockPermissionDenied(String actionId) throws Exception {
		Mockito.doThrow(
			new PrincipalException()
		).when(
			_projectPermission
		).check(
			actionId, _jwt, _PROJECT_EXTERNAL_REFERENCE_CODE
		);
	}

	private void _mockRoleNames(String... roleNames) throws Exception {
		RoleBrief[] roleBriefs = new RoleBrief[roleNames.length];

		for (int i = 0; i < roleNames.length; i++) {
			RoleBrief roleBrief = new RoleBrief();

			roleBrief.setName(roleNames[i]);

			roleBriefs[i] = roleBrief;
		}

		UserAccount userAccount = new UserAccount();

		userAccount.setRoleBriefs(roleBriefs);

		Mockito.when(
			_userAccountService.getMyUserAccount(_jwt)
		).thenReturn(
			userAccount
		);
	}

	private void _mockTicketStatus(String status) throws Exception {
		Mockito.when(
			_jiraIssueService.getJiraSupportIssue(_TICKET_ID)
		).thenReturn(
			new JiraSupportIssue(
				new JSONObject(
				).put(
					"fields",
					new JSONObject(
					).put(
						"status",
						new JSONObject(
						).put(
							"name", status
						)
					)
				).put(
					"key", _TICKET_ID
				),
				new JiraOrganization(
					_PROJECT_EXTERNAL_REFERENCE_CODE, "1", "Acme"))
		);
	}

	private static final String _ACCOUNT_EXTERNAL_REFERENCE_CODE = "ACCNT-001";

	private static final String _AUTHORIZATION = "Bearer token";

	private static final String _BUCKET_NAME = "ticket-attachments";

	private static final String _DOWNLOAD_URL =
		"https://storage.example.com/download";

	private static final String _FILE_NAME = "heap.hprof";

	private static final String _FILE_SIZE = "1048576";

	private static final String _MD5_CHECKSUM = "d41d8cd98f00b204";

	private static final String _ONE_PORTAL_URL = "https://one.liferay.com";

	private static final String _ORIGIN = "https://one.liferay.com";

	private static final String _PROJECT_EXTERNAL_REFERENCE_CODE = "PRJCT-001";

	private static final String _TICKET_ATTACHMENT_EXTERNAL_REFERENCE_CODE =
		"TA-1";

	private static final long _TICKET_ATTACHMENT_ID = 5000L;

	private static final String _TICKET_ID = "LRHC-1";

	private static final String _UPLOAD_SESSION_URL =
		"https://storage.example.com/upload";

	private final GoogleCloudStorageService _googleCloudStorageService =
		Mockito.mock(GoogleCloudStorageService.class);
	private final JiraIssueService _jiraIssueService = Mockito.mock(
		JiraIssueService.class);
	private final Jwt _jwt = Mockito.mock(Jwt.class);
	private final ProjectPermission _projectPermission = Mockito.mock(
		ProjectPermission.class);
	private final ProjectService _projectService = Mockito.mock(
		ProjectService.class);
	private final TicketAttachmentService _ticketAttachmentService =
		Mockito.mock(TicketAttachmentService.class);
	private TicketAttachmentsRestController _ticketAttachmentsRestController;
	private final UserAccountService _userAccountService = Mockito.mock(
		UserAccountService.class);

}
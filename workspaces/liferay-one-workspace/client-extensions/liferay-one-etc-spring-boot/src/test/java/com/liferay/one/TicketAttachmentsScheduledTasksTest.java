/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.client.extension.util.spring.boot3.client.LiferayOAuth2AccessTokenManager;
import com.liferay.one.jira.model.JiraSupportIssue;
import com.liferay.one.jira.service.JiraIssueService;
import com.liferay.one.model.TicketAttachment;
import com.liferay.one.service.GoogleCloudStorageService;
import com.liferay.one.service.NotificationQueueEntryService;
import com.liferay.one.service.TicketAttachmentService;
import com.liferay.petra.string.StringPool;
import com.liferay.portal.kernel.workflow.WorkflowConstants;

import java.util.Collections;
import java.util.List;

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
@DisplayName(
	"[CRON-SCHEDULEDCLEANUP] [CRON-SCHEDULEDDELETETICKETATTACHMENT] " +
		"[CRON-SCHEDULEDUPDATETICKETATTACHMENTDRAFTCOMMENTBODY] " +
			"TicketAttachmentsRestController scheduled tasks"
)
public class TicketAttachmentsScheduledTasksTest {

	@BeforeEach
	public void setUp() throws Exception {
		_googleCloudStorageService = Mockito.mock(
			GoogleCloudStorageService.class);
		_jiraIssueService = Mockito.mock(JiraIssueService.class);
		_notificationQueueEntryService = Mockito.mock(
			NotificationQueueEntryService.class);
		_ticketAttachmentService = Mockito.mock(TicketAttachmentService.class);

		LiferayOAuth2AccessTokenManager liferayOAuth2AccessTokenManager =
			Mockito.mock(LiferayOAuth2AccessTokenManager.class);

		Mockito.when(
			liferayOAuth2AccessTokenManager.getAuthorization(
				ArgumentMatchers.anyString())
		).thenReturn(
			_AUTHORIZATION
		);

		_ticketAttachmentsRestController =
			new TicketAttachmentsRestController();

		ReflectionTestUtils.setField(
			_ticketAttachmentsRestController, "_googleCloudStorageService",
			_googleCloudStorageService);
		ReflectionTestUtils.setField(
			_ticketAttachmentsRestController, "_jiraIssueService",
			_jiraIssueService);
		ReflectionTestUtils.setField(
			_ticketAttachmentsRestController, "_jiraProjectSupportFLS", "FLS");
		ReflectionTestUtils.setField(
			_ticketAttachmentsRestController, "_jiraProjectSupportHC", "HC");
		ReflectionTestUtils.setField(
			_ticketAttachmentsRestController,
			"_liferayOAuth2AccessTokenManager",
			liferayOAuth2AccessTokenManager);
		ReflectionTestUtils.setField(
			_ticketAttachmentsRestController, "_notificationQueueEntryService",
			_notificationQueueEntryService);
		ReflectionTestUtils.setField(
			_ticketAttachmentsRestController, "_ticketAttachmentService",
			_ticketAttachmentService);
	}

	@Test
	public void testScheduledCleanUpDeletesAttachmentsOfRecentlyClosedIssues()
		throws Exception {

		JiraSupportIssue jiraSupportIssue = Mockito.mock(
			JiraSupportIssue.class);

		Mockito.when(
			jiraSupportIssue.getKey()
		).thenReturn(
			"LRP-1"
		);

		Mockito.when(
			_jiraIssueService.search(
				ArgumentMatchers.anyString(), ArgumentMatchers.any())
		).thenReturn(
			List.of(jiraSupportIssue)
		);

		TicketAttachment ticketAttachment = _createTicketAttachment(
			"", "LRP-1", 1L);

		Mockito.when(
			_ticketAttachmentService.search(
				_AUTHORIZATION, "jiraIssueKey eq 'LRP-1'", 1, 500)
		).thenReturn(
			List.of(ticketAttachment)
		);

		_ticketAttachmentsRestController.scheduledCleanUp();

		ArgumentCaptor<String> argumentCaptor = ArgumentCaptor.forClass(
			String.class);

		Mockito.verify(
			_jiraIssueService
		).search(
			argumentCaptor.capture(), ArgumentMatchers.eq(new String[] {"key"})
		);

		String jql = argumentCaptor.getValue();

		Assertions.assertTrue(
			jql.startsWith("(project in (FLS,HC)) and (status in ('"), jql);
		Assertions.assertTrue(jql.endsWith("') after -8d before -7d)"), jql);

		Mockito.verify(
			_ticketAttachmentService
		).deleteTicketAttachment(
			_AUTHORIZATION, 1L
		);

		Mockito.verify(
			_googleCloudStorageService
		).deleteObject(
			_BUCKET_NAME, ticketAttachment.getGCSObjectName()
		);
	}

	@Test
	public void testScheduledCleanUpIsIdempotentWithoutClosedIssues()
		throws Exception {

		Mockito.when(
			_jiraIssueService.search(
				ArgumentMatchers.anyString(), ArgumentMatchers.any())
		).thenReturn(
			Collections.emptyList()
		);

		_ticketAttachmentsRestController.scheduledCleanUp();
		_ticketAttachmentsRestController.scheduledCleanUp();

		Mockito.verifyNoInteractions(
			_googleCloudStorageService, _ticketAttachmentService);
	}

	@Test
	public void testScheduledDeleteTicketAttachmentContinuesAfterFailure()
		throws Exception {

		TicketAttachment ticketAttachment1 = _createTicketAttachment(
			"", "LRP-1", 1L);
		TicketAttachment ticketAttachment2 = _createTicketAttachment(
			"", "LRP-2", 2L);

		_mockSearch(
			"state eq " + WorkflowConstants.STATUS_IN_TRASH, ticketAttachment1,
			ticketAttachment2);

		Mockito.doThrow(
			new RuntimeException("Unable to delete object")
		).when(
			_googleCloudStorageService
		).deleteObject(
			_BUCKET_NAME, ticketAttachment1.getGCSObjectName()
		);

		_ticketAttachmentsRestController.scheduledDeleteTicketAttachment();

		Mockito.verify(
			_ticketAttachmentService, Mockito.never()
		).deleteTicketAttachment(
			_AUTHORIZATION, 1L
		);

		Mockito.verify(
			_notificationQueueEntryService
		).addNotificationQueueEntry(
			ArgumentMatchers.eq("solutions@liferay.com"),
			ArgumentMatchers.eq("Liferay One"),
			ArgumentMatchers.eq("is-support@liferay.com"),
			ArgumentMatchers.eq("Liferay One Error Notification"),
			ArgumentMatchers.contains("error deleting a large file")
		);

		Mockito.verify(
			_ticketAttachmentService
		).deleteTicketAttachment(
			_AUTHORIZATION, 2L
		);
	}

	@Test
	public void testScheduledDeleteTicketAttachmentDeletesTrashedAttachments()
		throws Exception {

		TicketAttachment ticketAttachment = _createTicketAttachment(
			"", "LRP-1", 1L);

		_mockSearch(
			"state eq " + WorkflowConstants.STATUS_IN_TRASH, ticketAttachment);

		_ticketAttachmentsRestController.scheduledDeleteTicketAttachment();

		Mockito.verify(
			_googleCloudStorageService
		).deleteObject(
			_BUCKET_NAME, ticketAttachment.getGCSObjectName()
		);

		Mockito.verify(
			_ticketAttachmentService
		).deleteTicketAttachment(
			_AUTHORIZATION, 1L
		);

		Mockito.verifyNoInteractions(_notificationQueueEntryService);
	}

	@Test
	public void testScheduledDeleteTicketAttachmentIsIdempotentWhenTrashIsEmpty()
		throws Exception {

		Mockito.when(
			_ticketAttachmentService.search(
				ArgumentMatchers.anyString(), ArgumentMatchers.anyString(),
				ArgumentMatchers.anyInt(), ArgumentMatchers.anyInt())
		).thenReturn(
			Collections.emptyList()
		);

		_ticketAttachmentsRestController.scheduledDeleteTicketAttachment();
		_ticketAttachmentsRestController.scheduledDeleteTicketAttachment();

		Mockito.verifyNoInteractions(
			_googleCloudStorageService, _notificationQueueEntryService);
	}

	@Test
	public void testScheduledUpdateTicketAttachmentDraftCommentBodyContinuesAfterFailure()
		throws Exception {

		_mockSearch(
			_DRAFT_COMMENT_BODY_FILTER,
			_createTicketAttachment("Comment 1", "LRP-1", 1L),
			_createTicketAttachment("Comment 2", "LRP-2", 2L));

		Mockito.doThrow(
			new RuntimeException("Unable to add comment")
		).when(
			_jiraIssueService
		).addComment(
			"Comment 1", "LRP-1"
		);

		_ticketAttachmentsRestController.
			scheduledUpdateTicketAttachmentDraftCommentBody();

		Mockito.verify(
			_ticketAttachmentService, Mockito.never()
		).updateTicketAttachmentDraftCommentBody(
			_AUTHORIZATION, StringPool.BLANK, 1L
		);

		Mockito.verify(
			_notificationQueueEntryService
		).addNotificationQueueEntry(
			ArgumentMatchers.anyString(), ArgumentMatchers.anyString(),
			ArgumentMatchers.anyString(), ArgumentMatchers.anyString(),
			ArgumentMatchers.contains("error posting a large file uploader")
		);

		Mockito.verify(
			_ticketAttachmentService
		).updateTicketAttachmentDraftCommentBody(
			_AUTHORIZATION, StringPool.BLANK, 2L
		);
	}

	@Test
	public void testScheduledUpdateTicketAttachmentDraftCommentBodyPostsAndClearsDraft()
		throws Exception {

		_mockSearch(
			_DRAFT_COMMENT_BODY_FILTER,
			_createTicketAttachment("Comment 1", "LRP-1", 1L));

		_ticketAttachmentsRestController.
			scheduledUpdateTicketAttachmentDraftCommentBody();

		Mockito.verify(
			_jiraIssueService
		).addComment(
			"Comment 1", "LRP-1"
		);

		Mockito.verify(
			_ticketAttachmentService
		).updateTicketAttachmentDraftCommentBody(
			_AUTHORIZATION, StringPool.BLANK, 1L
		);

		Mockito.verifyNoInteractions(_notificationQueueEntryService);
	}

	private TicketAttachment _createTicketAttachment(
		String draftCommentBody, String jiraIssueKey, long ticketAttachmentId) {

		return new TicketAttachment(
			new JSONObject(
			).put(
				"accountKey", "ACCOUNT"
			).put(
				"creator",
				new JSONObject(
				).put(
					"id", 1L
				)
			).put(
				"draftCommentBody", draftCommentBody
			).put(
				"fileName", "file.zip"
			).put(
				"fileSize", "1024"
			).put(
				"gcsBucketName", _BUCKET_NAME
			).put(
				"id", ticketAttachmentId
			).put(
				"jiraIssueKey", jiraIssueKey
			).put(
				"status",
				new JSONObject(
				).put(
					"code", TicketAttachment.STATUS_APPROVED
				)
			).put(
				"storageProvider", TicketAttachment.STORAGE_PROVIDER_GCS
			));
	}

	private void _mockSearch(
			String filterString, TicketAttachment... ticketAttachments)
		throws Exception {

		Mockito.when(
			_ticketAttachmentService.search(
				_AUTHORIZATION, filterString, 1, 500)
		).thenReturn(
			List.of(ticketAttachments)
		);
	}

	private static final String _AUTHORIZATION = "Bearer token";

	private static final String _BUCKET_NAME = "bucket";

	private static final String _DRAFT_COMMENT_BODY_FILTER =
		"draftCommentBody ne null and draftCommentBody ne '' and (state eq 0 " +
			"or state eq null) and status/any(s:s eq 0)";

	private GoogleCloudStorageService _googleCloudStorageService;
	private JiraIssueService _jiraIssueService;
	private NotificationQueueEntryService _notificationQueueEntryService;
	private TicketAttachmentService _ticketAttachmentService;
	private TicketAttachmentsRestController _ticketAttachmentsRestController;

}
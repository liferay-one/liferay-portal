/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.model;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-TICKETATTACHMENT] TicketAttachment")
public class TicketAttachmentTest {

	@Test
	public void testFieldsReadFromJSON() {
		TicketAttachment ticketAttachment = _createTicketAttachment(
			TicketAttachment.STATUS_DRAFT);

		Assertions.assertEquals("ACCOUNT", ticketAttachment.getAccountKey());
		Assertions.assertEquals(
			"Draft comment", ticketAttachment.getDraftCommentBody());
		Assertions.assertEquals("logs.zip", ticketAttachment.getFileName());
		Assertions.assertEquals("2048", ticketAttachment.getFileSize());
		Assertions.assertEquals("bucket", ticketAttachment.getGCSBucketName());
		Assertions.assertEquals("LRP-9", ticketAttachment.getJiraIssueKey());
		Assertions.assertEquals("MD5", ticketAttachment.getMD5Checksum());
		Assertions.assertEquals("PROJECT", ticketAttachment.getProjectKey());
		Assertions.assertEquals(
			TicketAttachment.STATUS_DRAFT, ticketAttachment.getStatus());
		Assertions.assertEquals(
			TicketAttachment.STORAGE_PROVIDER_GCS,
			ticketAttachment.getStorageProvider());
		Assertions.assertEquals(55L, ticketAttachment.getTicketAttachmentId());
		Assertions.assertEquals("log", ticketAttachment.getType());
		Assertions.assertEquals(66L, ticketAttachment.getUserId());
	}

	@Test
	public void testGetGCSObjectName() {
		Assertions.assertEquals(
			"tickets/LRP-9/55/logs.zip",
			_createTicketAttachment(
				TicketAttachment.STATUS_APPROVED
			).getGCSObjectName());
	}

	@Test
	public void testIsApprovedOnlyForStatusCodeZero() {
		Assertions.assertTrue(
			_createTicketAttachment(
				TicketAttachment.STATUS_APPROVED
			).isApproved());
		Assertions.assertFalse(
			_createTicketAttachment(
				TicketAttachment.STATUS_DRAFT
			).isApproved());
		Assertions.assertFalse(
			_createTicketAttachment(
				1
			).isApproved());
	}

	private TicketAttachment _createTicketAttachment(int status) {
		return new TicketAttachment(
			new JSONObject(
			).put(
				"accountKey", "ACCOUNT"
			).put(
				"creator",
				new JSONObject(
				).put(
					"id", 66L
				)
			).put(
				"draftCommentBody", "Draft comment"
			).put(
				"fileName", "logs.zip"
			).put(
				"fileSize", "2048"
			).put(
				"gcsBucketName", "bucket"
			).put(
				"id", 55L
			).put(
				"jiraIssueKey", "LRP-9"
			).put(
				"md5Checksum", "MD5"
			).put(
				"projectKey", "PROJECT"
			).put(
				"status",
				new JSONObject(
				).put(
					"code", status
				)
			).put(
				"storageProvider", TicketAttachment.STORAGE_PROVIDER_GCS
			).put(
				"type", "log"
			));
	}

}
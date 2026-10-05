/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.admin.user.client.dto.v1_0.RoleBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.constants.RoleConstants;
import com.liferay.one.jira.constants.IssueConstants;
import com.liferay.one.jira.model.JiraOrganization;
import com.liferay.one.jira.model.JiraSupportIssue;
import com.liferay.one.jira.service.JiraIssueService;
import com.liferay.one.permission.ProjectPermission;
import com.liferay.one.service.UserAccountService;
import com.liferay.portal.kernel.security.auth.PrincipalException;
import com.liferay.portal.kernel.security.permission.ActionKeys;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
public class TicketsTicketAttachmentsRestControllerTest {

	@BeforeEach
	public void setUp() throws Exception {
		_ticketsTicketAttachmentsRestController =
			new TicketsTicketAttachmentsRestController();

		ReflectionTestUtils.setField(
			_ticketsTicketAttachmentsRestController, "_jiraIssueService",
			_jiraIssueService);
		ReflectionTestUtils.setField(
			_ticketsTicketAttachmentsRestController, "_projectPermission",
			_projectPermission);
		ReflectionTestUtils.setField(
			_ticketsTicketAttachmentsRestController, "_userAccountService",
			_userAccountService);

		_mockRoleNames();
		_mockTicketStatus("Open");
	}

	@Test
	public void testGetDownloadAccessCheckAllowsClosedTicket()
		throws Exception {

		_mockTicketStatus(IssueConstants.STATUS_CLOSED);

		ResponseEntity<String> responseEntity =
			_ticketsTicketAttachmentsRestController.getDownloadAccessCheck(
				_jwt, _TICKET_ID);

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		Mockito.verify(
			_projectPermission
		).check(
			ActionKeys.VIEW, _jwt, _PROJECT_EXTERNAL_REFERENCE_CODE
		);
	}

	@Test
	public void testGetDownloadAccessCheckReturnsNotFoundWhenTicketIsUnknown()
		throws Exception {

		_mockUnknownTicket();

		ResponseEntity<String> responseEntity =
			_ticketsTicketAttachmentsRestController.getDownloadAccessCheck(
				_jwt, _TICKET_ID);

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND, responseEntity.getStatusCode());
		Assertions.assertEquals(
			"INVALID_TICKET_NUMBER", responseEntity.getBody());

		Mockito.verifyNoInteractions(_projectPermission);
	}

	@Test
	public void testGetDownloadAccessCheckReturnsOK() throws Exception {
		ResponseEntity<String> responseEntity =
			_ticketsTicketAttachmentsRestController.getDownloadAccessCheck(
				_jwt, _TICKET_ID);

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());
		Assertions.assertEquals("", responseEntity.getBody());
	}

	@Test
	public void testGetDownloadAccessCheckThrowsForbiddenWithoutViewPermission()
		throws Exception {

		_mockPermissionDenied(ActionKeys.VIEW);

		Assertions.assertThrows(
			PrincipalException.class,
			() ->
				_ticketsTicketAttachmentsRestController.getDownloadAccessCheck(
					_jwt, _TICKET_ID));

		ResponseEntity<String> responseEntity =
			_ticketsTicketAttachmentsRestController.handleException(
				null, new PrincipalException());

		Assertions.assertEquals(
			HttpStatus.FORBIDDEN, responseEntity.getStatusCode());
	}

	@Test
	public void testGetUploadAccessCheckReturnsBadRequestWhenTicketIsClosed()
		throws Exception {

		_mockTicketStatus(IssueConstants.STATUS_CLOSED);

		ResponseEntity<String> responseEntity =
			_ticketsTicketAttachmentsRestController.getUploadAccessCheck(
				_jwt, _TICKET_ID);

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST, responseEntity.getStatusCode());
		Assertions.assertEquals("TICKET_IS_CLOSED", responseEntity.getBody());

		Mockito.verifyNoInteractions(_projectPermission);
	}

	@Test
	public void testGetUploadAccessCheckReturnsNotFoundWhenTicketIsUnknown()
		throws Exception {

		_mockUnknownTicket();

		ResponseEntity<String> responseEntity =
			_ticketsTicketAttachmentsRestController.getUploadAccessCheck(
				_jwt, _TICKET_ID);

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND, responseEntity.getStatusCode());

		Mockito.verifyNoInteractions(_projectPermission);
	}

	@Test
	public void testGetUploadAccessCheckReturnsOKWithUpdatePermission()
		throws Exception {

		ResponseEntity<String> responseEntity =
			_ticketsTicketAttachmentsRestController.getUploadAccessCheck(
				_jwt, _TICKET_ID);

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		Mockito.verify(
			_projectPermission
		).check(
			ActionKeys.UPDATE, _jwt, _PROJECT_EXTERNAL_REFERENCE_CODE
		);
	}

	@Test
	public void testGetUploadAccessCheckSkipsPermissionForProvisioningMember()
		throws Exception {

		_mockRoleNames(RoleConstants.NAME_PROVISIONING_MEMBER);

		ResponseEntity<String> responseEntity =
			_ticketsTicketAttachmentsRestController.getUploadAccessCheck(
				_jwt, _TICKET_ID);

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		Mockito.verifyNoInteractions(_projectPermission);
	}

	@Test
	public void testGetUploadAccessCheckThrowsForbiddenWithoutUpdatePermission()
		throws Exception {

		_mockPermissionDenied(ActionKeys.UPDATE);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _ticketsTicketAttachmentsRestController.getUploadAccessCheck(
				_jwt, _TICKET_ID));
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

	private void _mockUnknownTicket() throws Exception {
		Mockito.when(
			_jiraIssueService.getJiraSupportIssue(_TICKET_ID)
		).thenReturn(
			null
		);
	}

	private static final String _PROJECT_EXTERNAL_REFERENCE_CODE = "PRJCT-001";

	private static final String _TICKET_ID = "LRHC-1";

	private final JiraIssueService _jiraIssueService = Mockito.mock(
		JiraIssueService.class);
	private final Jwt _jwt = Mockito.mock(Jwt.class);
	private final ProjectPermission _projectPermission = Mockito.mock(
		ProjectPermission.class);
	private TicketsTicketAttachmentsRestController
		_ticketsTicketAttachmentsRestController;
	private final UserAccountService _userAccountService = Mockito.mock(
		UserAccountService.class);

}
/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.permission;

import com.liferay.headless.admin.user.client.dto.v1_0.AccountBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.OrganizationBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.RoleBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.constants.RoleConstants;
import com.liferay.one.model.Project;
import com.liferay.one.model.ProjectMembership;
import com.liferay.one.service.AccountService;
import com.liferay.one.service.ProjectMembershipService;
import com.liferay.one.service.ProjectService;
import com.liferay.one.service.UserAccountService;
import com.liferay.portal.kernel.security.auth.PrincipalException;
import com.liferay.portal.kernel.security.permission.ActionKeys;

import java.util.List;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Amos Fong
 */
public class ProjectPermissionTest {

	@Test
	public void testCheckAssignMembersAllowsAccountManager() throws Exception {
		ProjectPermission projectPermission = _createPermission(List.of());

		Mockito.when(
			_accountPermission.contains(
				_ACCOUNT_EXTERNAL_REFERENCE_CODE, ActionKeys.ASSIGN_MEMBERS,
				null, _userAccount)
		).thenReturn(
			true
		);

		Assertions.assertDoesNotThrow(
			() -> projectPermission.check(
				ActionKeys.ASSIGN_MEMBERS, null,
				_PROJECT_EXTERNAL_REFERENCE_CODE));
	}

	@Test
	public void testCheckAssignMembersAllowsProjectAdmin() throws Exception {
		ProjectPermission projectPermission = _createPermission(
			List.of(_createProjectMembership(RoleConstants.ERC_PROJECT_ADMIN)));

		Assertions.assertDoesNotThrow(
			() -> projectPermission.check(
				ActionKeys.ASSIGN_MEMBERS, null,
				_PROJECT_EXTERNAL_REFERENCE_CODE));
	}

	@Test
	public void testCheckAssignMembersRejectsOrganizationMember()
		throws Exception {

		OrganizationBrief organizationBrief = new OrganizationBrief();

		organizationBrief.setId(_ORGANIZATION_ID);

		_userAccount = _createUserAccount(organizationBrief);

		ProjectPermission projectPermission = _createPermission(List.of());

		Assertions.assertThrows(
			PrincipalException.class,
			() -> projectPermission.check(
				ActionKeys.ASSIGN_MEMBERS, null,
				_PROJECT_EXTERNAL_REFERENCE_CODE));

		Mockito.verifyNoInteractions(_accountService);
	}

	@Test
	public void testCheckAssignMembersRejectsProjectUser() throws Exception {
		ProjectPermission projectPermission = _createPermission(
			List.of(_createProjectMembership(RoleConstants.ERC_PROJECT_USER)));

		Assertions.assertThrows(
			PrincipalException.class,
			() -> projectPermission.check(
				ActionKeys.ASSIGN_MEMBERS, null,
				_PROJECT_EXTERNAL_REFERENCE_CODE));
	}

	@Test
	public void testCheckAssignMembersRejectsUnknownProject() throws Exception {
		ProjectPermission projectPermission = _createPermission(List.of());

		Assertions.assertThrows(
			PrincipalException.class,
			() -> projectPermission.check(
				ActionKeys.ASSIGN_MEMBERS, null, "PRJCT-UNKNOWN"));

		Mockito.verifyNoInteractions(_accountPermission);
	}

	@Test
	public void testCheckUpdateGrantsSecondaryTicketRole() throws Exception {
		ProjectPermission projectPermission = _createPermission(
			List.of(
				_createProjectMembership(RoleConstants.ERC_PROJECT_USER),
				_createProjectMembership(RoleConstants.ERC_PROJECT_REQUESTER)));

		projectPermission.check(
			ActionKeys.UPDATE, null, _PROJECT_EXTERNAL_REFERENCE_CODE);
	}

	@Test
	public void testCheckUpdateThrowsWithoutTicketRole() throws Exception {
		ProjectPermission projectPermission = _createPermission(
			List.of(_createProjectMembership(RoleConstants.ERC_PROJECT_USER)));

		Assertions.assertThrows(
			PrincipalException.class,
			() -> projectPermission.check(
				ActionKeys.UPDATE, null, _PROJECT_EXTERNAL_REFERENCE_CODE));
	}

	@Test
	public void testCheckViewGrantsWhenSupportRoleIsFirst() throws Exception {
		ProjectPermission projectPermission = _createPermission(
			List.of(
				_createProjectMembership(RoleConstants.ERC_PROJECT_USER),
				_createProjectMembership("C_SOME_OTHER_ROLE")));

		projectPermission.check(
			ActionKeys.VIEW, null, _PROJECT_EXTERNAL_REFERENCE_CODE);
	}

	@Test
	public void testCheckViewGrantsWhenSupportRoleIsNotFirst()
		throws Exception {

		ProjectPermission projectPermission = _createPermission(
			List.of(
				_createProjectMembership("C_SOME_OTHER_ROLE"),
				_createProjectMembership(RoleConstants.ERC_PROJECT_USER)));

		projectPermission.check(
			ActionKeys.VIEW, null, _PROJECT_EXTERNAL_REFERENCE_CODE);
	}

	@Test
	public void testCheckViewThrowsWithoutSupportRole() throws Exception {
		ProjectPermission projectPermission = _createPermission(
			List.of(_createProjectMembership("C_SOME_OTHER_ROLE")));

		Assertions.assertThrows(
			PrincipalException.class,
			() -> projectPermission.check(
				ActionKeys.VIEW, null, _PROJECT_EXTERNAL_REFERENCE_CODE));
	}

	private ProjectPermission _createPermission(
			List<ProjectMembership> projectMemberships)
		throws Exception {

		ProjectPermission projectPermission = new ProjectPermission();

		UserAccountService userAccountService = Mockito.mock(
			UserAccountService.class);

		Mockito.when(
			userAccountService.getMyUserAccount(Mockito.any())
		).thenReturn(
			_userAccount
		);

		ProjectService projectService = Mockito.mock(ProjectService.class);

		Mockito.when(
			projectService.fetchProject(_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			_createProject()
		);

		ProjectMembershipService projectMembershipService = Mockito.mock(
			ProjectMembershipService.class);

		Mockito.when(
			projectMembershipService.getProjectMemberships(
				_PROJECT_EXTERNAL_REFERENCE_CODE, _USER_ID)
		).thenReturn(
			projectMemberships
		);

		ReflectionTestUtils.setField(
			projectPermission, "_accountPermission", _accountPermission);
		ReflectionTestUtils.setField(
			projectPermission, "_accountService", _accountService);
		ReflectionTestUtils.setField(
			projectPermission, "_projectMembershipService",
			projectMembershipService);
		ReflectionTestUtils.setField(
			projectPermission, "_projectService", projectService);
		ReflectionTestUtils.setField(
			projectPermission, "_userAccountService", userAccountService);

		return projectPermission;
	}

	private Project _createProject() {
		return new Project(
			new JSONObject(
			).put(
				"externalReferenceCode", _PROJECT_EXTERNAL_REFERENCE_CODE
			).put(
				"r_accountEntryToProject_accountEntryERC",
				_ACCOUNT_EXTERNAL_REFERENCE_CODE
			));
	}

	private ProjectMembership _createProjectMembership(
		String roleExternalReferenceCode) {

		return new ProjectMembership(
			new JSONObject(
			).put(
				"r_projectToProjectMembership_c_projectERC",
				_PROJECT_EXTERNAL_REFERENCE_CODE
			).put(
				"r_userToProjectMembership_userId", _USER_ID
			).put(
				"roleExternalReferenceCode", roleExternalReferenceCode
			));
	}

	private UserAccount _createUserAccount(
		OrganizationBrief... organizationBriefs) {

		UserAccount userAccount = Mockito.mock(UserAccount.class);

		Mockito.when(
			userAccount.getAccountBriefs()
		).thenReturn(
			new AccountBrief[0]
		);

		Mockito.when(
			userAccount.getId()
		).thenReturn(
			_USER_ID
		);

		Mockito.when(
			userAccount.getOrganizationBriefs()
		).thenReturn(
			organizationBriefs
		);

		Mockito.when(
			userAccount.getRoleBriefs()
		).thenReturn(
			new RoleBrief[0]
		);

		return userAccount;
	}

	private static final String _ACCOUNT_EXTERNAL_REFERENCE_CODE = "ACC-1";

	private static final String _PROJECT_EXTERNAL_REFERENCE_CODE = "PRJCT-1";

	private static final long _ORGANIZATION_ID = 44444;

	private static final long _USER_ID = 22222;

	private final AccountPermission _accountPermission = Mockito.mock(
		AccountPermission.class);
	private final AccountService _accountService = Mockito.mock(
		AccountService.class);
	private UserAccount _userAccount = _createUserAccount();

}
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
public class ProjectMembershipPermissionTest {

	@Test
	public void testCheckUpdateGrantsSecondaryTicketRole() throws Exception {
		ProjectMembershipPermission projectMembershipPermission =
			_createPermission(
				List.of(
					_createProjectMembership(RoleConstants.ERC_PROJECT_USER),
					_createProjectMembership(
						RoleConstants.ERC_PROJECT_REQUESTER)));

		projectMembershipPermission.check(
			ActionKeys.UPDATE, null, _PROJECT_EXTERNAL_REFERENCE_CODE);
	}

	@Test
	public void testCheckUpdateThrowsWithoutTicketRole() throws Exception {
		ProjectMembershipPermission projectMembershipPermission =
			_createPermission(
				List.of(
					_createProjectMembership(RoleConstants.ERC_PROJECT_USER)));

		Assertions.assertThrows(
			PrincipalException.class,
			() -> projectMembershipPermission.check(
				ActionKeys.UPDATE, null, _PROJECT_EXTERNAL_REFERENCE_CODE));
	}

	@Test
	public void testCheckViewGrantsWhenSupportRoleIsFirst() throws Exception {
		ProjectMembershipPermission projectMembershipPermission =
			_createPermission(
				List.of(
					_createProjectMembership(RoleConstants.ERC_PROJECT_USER),
					_createProjectMembership("C_SOME_OTHER_ROLE")));

		projectMembershipPermission.check(
			ActionKeys.VIEW, null, _PROJECT_EXTERNAL_REFERENCE_CODE);
	}

	@Test
	public void testCheckViewGrantsWhenSupportRoleIsNotFirst()
		throws Exception {

		ProjectMembershipPermission projectMembershipPermission =
			_createPermission(
				List.of(
					_createProjectMembership("C_SOME_OTHER_ROLE"),
					_createProjectMembership(RoleConstants.ERC_PROJECT_USER)));

		projectMembershipPermission.check(
			ActionKeys.VIEW, null, _PROJECT_EXTERNAL_REFERENCE_CODE);
	}

	@Test
	public void testCheckViewThrowsWithoutSupportRole() throws Exception {
		ProjectMembershipPermission projectMembershipPermission =
			_createPermission(
				List.of(_createProjectMembership("C_SOME_OTHER_ROLE")));

		Assertions.assertThrows(
			PrincipalException.class,
			() -> projectMembershipPermission.check(
				ActionKeys.VIEW, null, _PROJECT_EXTERNAL_REFERENCE_CODE));
	}

	private ProjectMembershipPermission _createPermission(
			List<ProjectMembership> projectMemberships)
		throws Exception {

		ProjectMembershipPermission projectMembershipPermission =
			new ProjectMembershipPermission();

		UserAccount userAccount = _createUserAccount();

		UserAccountService userAccountService = Mockito.mock(
			UserAccountService.class);

		Mockito.when(
			userAccountService.getMyUserAccount(Mockito.any())
		).thenReturn(
			userAccount
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
			projectMembershipPermission, "_accountService",
			Mockito.mock(AccountService.class));
		ReflectionTestUtils.setField(
			projectMembershipPermission, "_projectMembershipService",
			projectMembershipService);
		ReflectionTestUtils.setField(
			projectMembershipPermission, "_projectService", projectService);
		ReflectionTestUtils.setField(
			projectMembershipPermission, "_userAccountService",
			userAccountService);

		return projectMembershipPermission;
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

	private UserAccount _createUserAccount() {
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
			new OrganizationBrief[0]
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

	private static final long _USER_ID = 22222;

}
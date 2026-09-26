/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.synchronizer;

import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.model.ProjectMembership;

/**
 * @author Drew Brokke
 */
public class ProjectMember {

	public ProjectMember(
		ProjectMembership projectMembership, UserAccount userAccount) {

		_projectMembership = projectMembership;
		_userAccount = userAccount;
	}

	public ProjectMembership getProjectMembership() {
		return _projectMembership;
	}

	public UserAccount getUserAccount() {
		return _userAccount;
	}

	private final ProjectMembership _projectMembership;
	private final UserAccount _userAccount;

}
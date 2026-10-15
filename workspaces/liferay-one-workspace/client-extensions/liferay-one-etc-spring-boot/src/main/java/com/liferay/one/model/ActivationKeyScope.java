/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.model;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.portal.kernel.util.Validator;

/**
 * @author Ryan Schuhler
 */
public final class ActivationKeyScope {

	public static ActivationKeyScope of(Account account) {
		return new ActivationKeyScope(account.getId(), account.getName(), null);
	}

	public static ActivationKeyScope of(Project project) {
		if (Validator.isNull(project.getExternalReferenceCode())) {
			throw new IllegalArgumentException(
				"The project has no external reference code");
		}

		return new ActivationKeyScope(
			project.getAccountId(), project.getName(),
			project.getExternalReferenceCode());
	}

	public long getAccountId() {
		return _accountId;
	}

	public String getLockKey() {
		if (isProject()) {
			return "project-" + _projectExternalReferenceCode;
		}

		return "account-" + _accountId;
	}

	public String getName() {
		return _name;
	}

	public String getProjectExternalReferenceCode() {
		return _projectExternalReferenceCode;
	}

	public String getType() {
		if (isProject()) {
			return "project";
		}

		return "account";
	}

	public boolean isProject() {
		return Validator.isNotNull(_projectExternalReferenceCode);
	}

	private ActivationKeyScope(
		long accountId, String name, String projectExternalReferenceCode) {

		_accountId = accountId;
		_name = name;
		_projectExternalReferenceCode = projectExternalReferenceCode;
	}

	private final long _accountId;
	private final String _name;
	private final String _projectExternalReferenceCode;

}
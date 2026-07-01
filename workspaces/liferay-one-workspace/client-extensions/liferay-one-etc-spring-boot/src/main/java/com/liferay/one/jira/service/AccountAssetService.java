/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.service;

import com.liferay.one.jira.converter.AccountConverter;
import com.liferay.one.jira.exception.AccountNotFoundException;
import com.liferay.one.jira.model.JiraAssetObject;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * @author Amos Fong
 */
@Component
public class AccountAssetService {

	public String getAccountObjectKey(String externalKey) throws Exception {
		List<JiraAssetObject> jiraAssetObjects =
			_jiraAssetService.searchObjects(
				_accountConverter.getAQLWithBuilder(
					aqlBuilder -> aqlBuilder.andEquals(
						externalKey, "External Key")),
				_accountConverter::toJiraAssetObject);

		if (jiraAssetObjects.isEmpty()) {
			throw new AccountNotFoundException();
		}

		JiraAssetObject jiraAssetObject = jiraAssetObjects.get(0);

		return jiraAssetObject.getObjectKey();
	}

	@Autowired
	private AccountConverter _accountConverter;

	@Autowired
	private JiraAssetService _jiraAssetService;

}
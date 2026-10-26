/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.service;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.jira.converter.AccountConverter;
import com.liferay.one.jira.converter.BaseJiraAssetObjectConverter;
import com.liferay.one.jira.converter.ContactConverter;
import com.liferay.one.jira.exception.AccountNotFoundException;
import com.liferay.one.jira.model.JiraAssetObject;
import com.liferay.one.model.Project;
import com.liferay.one.service.ProjectService;
import com.liferay.one.service.UserAccountService;
import com.liferay.portal.kernel.util.Validator;

import java.util.ArrayList;
import java.util.List;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * @author Amos Fong
 * @author Drew Brokke
 */
@Component
public class AccountAssetService {

	public JiraAssetObject fetchAccountJiraAssetObjectByExternalKey(
		String externalKey) {

		List<JiraAssetObject> objects = _jiraAssetService.getJiraAssetObjects(
			_accountConverter,
			aqlBuilder -> aqlBuilder.andEquals(
				externalKey, _accountConverter.getExternalKeyAttributeName()));

		if (objects.isEmpty()) {
			return null;
		}

		return objects.get(0);
	}

	public String getAccountObjectKey(String externalKey) throws Exception {
		JiraAssetObject jiraAssetObject =
			fetchAccountJiraAssetObjectByExternalKey(externalKey);

		if (jiraAssetObject == null) {
			throw new AccountNotFoundException();
		}

		return jiraAssetObject.getObjectKey();
	}

	/**
	 * Reads the JSM asset objects that the account sync writes for an account:
	 * the Account objects of the account and its projects, and the Contact
	 * objects of the account's users. The read creates and changes nothing.
	 */
	public JSONObject getJiraAssetsJSONObject(Account account)
		throws Exception {

		List<String> accountExternalKeys = new ArrayList<>();

		accountExternalKeys.add(account.getExternalReferenceCode());

		for (Project project : _projectService.getProjects(account.getId())) {
			_addExternalKey(
				accountExternalKeys, project.getExternalReferenceCode());
		}

		List<String> contactExternalKeys = new ArrayList<>();

		for (UserAccount userAccount :
				_userAccountService.getAccountUserAccounts(account.getId())) {

			_addExternalKey(
				contactExternalKeys, userAccount.getExternalReferenceCode());
		}

		return new JSONObject(
		).put(
			"accounts", _toJSONArray(_accountConverter, accountExternalKeys)
		).put(
			"contacts", _toJSONArray(_contactConverter, contactExternalKeys)
		);
	}

	private void _addExternalKey(
		List<String> externalKeys, String externalKey) {

		if (Validator.isNotNull(externalKey)) {
			externalKeys.add(externalKey);
		}
	}

	private JSONArray _toJSONArray(
		BaseJiraAssetObjectConverter converter, List<String> externalKeys) {

		JSONArray jsonArray = new JSONArray();

		if (externalKeys.isEmpty()) {
			return jsonArray;
		}

		for (JiraAssetObject jiraAssetObject :
				_jiraAssetService.getJiraAssetObjectsByExternalKeys(
					converter, externalKeys)) {

			jsonArray.put(
				jiraAssetObject.toJSONObject(
				).put(
					"externalKey",
					jiraAssetObject.getAttributeValue(
						converter.getExternalKeyAttributeName())
				));
		}

		return jsonArray;
	}

	@Autowired
	private AccountConverter _accountConverter;

	@Autowired
	private ContactConverter _contactConverter;

	@Autowired
	private JiraAssetService _jiraAssetService;

	@Autowired
	private ProjectService _projectService;

	@Autowired
	private UserAccountService _userAccountService;

}
/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.synchronizer;

import com.liferay.headless.admin.user.client.dto.v1_0.Role;
import com.liferay.one.jira.converter.ContactRoleConverter;
import com.liferay.one.jira.service.JiraAssetService;
import com.liferay.one.service.RoleService;

import java.util.List;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * @author Drew Brokke
 */
@Component
public class AccountRoleSynchronizer {

	@Async
	@EventListener(ApplicationReadyEvent.class)
	public void onApplicationReady() {
		try {
			syncAccountRoles();
		}
		catch (Exception exception) {
			_log.error(
				"Unable to sync account roles on application startup",
				exception);
		}
	}

	@Scheduled(cron = "${liferay.one.jira.account.role.sync.cron}")
	public void syncAccountRoles() throws Exception {
		List<Role> roles = _roleService.getAccountRoles();

		if (_log.isInfoEnabled()) {
			_log.info("Syncing " + roles.size() + " account roles to JSM");
		}

		for (Role role : roles) {
			try {
				_jiraAssetService.upsert(
					_contactRoleConverter,
					_contactRoleConverter.toAssetObject(role),
					(existingJiraAssetObject, jiraAssetObject) ->
						_jiraAssetService.isUnchangedByExternalUpdatedAt(
							_contactRoleConverter, existingJiraAssetObject,
							jiraAssetObject));
			}
			catch (Exception exception) {
				_log.error(
					"Unable to sync account role " +
						role.getExternalReferenceCode(),
					exception);
			}
		}
	}

	private static final Log _log = LogFactory.getLog(
		AccountRoleSynchronizer.class);

	@Autowired
	private ContactRoleConverter _contactRoleConverter;

	@Autowired
	private JiraAssetService _jiraAssetService;

	@Autowired
	private RoleService _roleService;

}
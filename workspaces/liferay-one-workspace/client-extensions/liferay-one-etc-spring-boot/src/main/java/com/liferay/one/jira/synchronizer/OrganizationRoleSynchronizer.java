/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.synchronizer;

import com.liferay.headless.admin.user.client.dto.v1_0.Role;
import com.liferay.one.jira.converter.ContactRoleConverter;
import com.liferay.one.jira.service.AssetObjectUpsertService;
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
public class OrganizationRoleSynchronizer {

	@Async
	@EventListener(ApplicationReadyEvent.class)
	public void onApplicationReady() {
		try {
			syncOrganizationRoles();
		}
		catch (Exception exception) {
			_log.error(
				"Unable to sync organization roles on application startup",
				exception);
		}
	}

	@Scheduled(cron = "${liferay.one.jira.organization.role.sync.cron}")
	public void syncOrganizationRoles() throws Exception {
		List<Role> roles = _roleService.getOrganizationRoles();

		if (_log.isInfoEnabled()) {
			_log.info("Syncing " + roles.size() + " organization roles to JSM");
		}

		for (Role role : roles) {
			try {
				_assetObjectUpsertService.upsert(
					_contactRoleConverter,
					_contactRoleConverter.toAssetObject(role),
					(existingJiraAssetObject, jiraAssetObject) ->
						_assetObjectUpsertService.
							isUnchangedByExternalUpdatedAt(
								_contactRoleConverter, existingJiraAssetObject,
								jiraAssetObject));
			}
			catch (Exception exception) {
				_log.error(
					"Unable to sync organization role " +
						role.getExternalReferenceCode(),
					exception);
			}
		}
	}

	private static final Log _log = LogFactory.getLog(
		OrganizationRoleSynchronizer.class);

	@Autowired
	private AssetObjectUpsertService _assetObjectUpsertService;

	@Autowired
	private ContactRoleConverter _contactRoleConverter;

	@Autowired
	private RoleService _roleService;

}
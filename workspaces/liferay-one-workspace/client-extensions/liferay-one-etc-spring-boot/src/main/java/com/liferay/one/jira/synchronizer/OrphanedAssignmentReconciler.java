/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.synchronizer;

import com.liferay.one.jira.constants.AccountContactRoleAssignmentConstants;
import com.liferay.one.jira.constants.AccountTeamRoleAssignmentConstants;
import com.liferay.one.jira.constants.TeamContactRoleAssignmentConstants;
import com.liferay.one.jira.converter.AccountContactRoleAssignmentConverter;
import com.liferay.one.jira.converter.AccountConverter;
import com.liferay.one.jira.converter.AccountTeamRoleAssignmentConverter;
import com.liferay.one.jira.converter.BaseJiraAssetObjectConverter;
import com.liferay.one.jira.converter.ContactConverter;
import com.liferay.one.jira.converter.ContactRoleConverter;
import com.liferay.one.jira.converter.TeamContactRoleAssignmentConverter;
import com.liferay.one.jira.converter.TeamConverter;
import com.liferay.one.jira.converter.TeamRoleConverter;
import com.liferay.one.jira.model.JiraAssetObject;
import com.liferay.one.jira.service.JiraAssetService;
import com.liferay.petra.function.transform.TransformUtil;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.Validator;

import java.util.Arrays;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;

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
public class OrphanedAssignmentReconciler {

	@Async
	@EventListener(ApplicationReadyEvent.class)
	public void onApplicationReady() {
		try {
			reconcileOrphanedAssignments();
		}
		catch (Exception exception) {
			_log.error(
				"Unable to reconcile orphaned assignments on application " +
					"startup",
				exception);
		}
	}

	@Scheduled(cron = "${liferay.one.jira.orphaned.assignment.reconcile.cron}")
	public void reconcileOrphanedAssignments() {
		if (!_reconciling.compareAndSet(false, true)) {
			if (_log.isInfoEnabled()) {
				_log.info(
					"Skipping orphaned assignment reconciliation because " +
						"another reconciliation is in progress");
			}

			return;
		}

		try {
			_reconcileOrphanedAssignments();
		}
		finally {
			_reconciling.set(false);
		}
	}

	private boolean _isOrphaned(
		JiraAssetObject jiraAssetObject,
		Map<AssignmentReference, Set<String>> liveExternalKeysMap) {

		for (Map.Entry<AssignmentReference, Set<String>> entry :
				liveExternalKeysMap.entrySet()) {

			AssignmentReference assignmentReference = entry.getKey();

			String externalKey = jiraAssetObject.getAttributeValue(
				assignmentReference.getExternalKeyAttributeName());

			Set<String> liveExternalKeys = entry.getValue();

			if (Validator.isNull(externalKey) ||
				!liveExternalKeys.contains(externalKey)) {

				return true;
			}
		}

		return false;
	}

	private void _reconcile(
		BaseJiraAssetObjectConverter converter,
		List<AssignmentReference> assignmentReferences) {

		try {
			_reconcile(converter, assignmentReferences, new Date());
		}
		catch (Exception exception) {
			_log.error(
				StringBundler.concat(
					"Unable to reconcile orphaned ",
					converter.getObjectTypeName(), " asset objects"),
				exception);
		}
	}

	private void _reconcile(
		BaseJiraAssetObjectConverter converter,
		List<AssignmentReference> assignmentReferences, Date startDate) {

		List<String> referenceAttributeNames = TransformUtil.transform(
			assignmentReferences,
			AssignmentReference::getReferenceAttributeName);

		// JSM clears inbound references when an asset object is deleted, so
		// an empty reference attribute marks a candidate whose referenced
		// entity may be gone

		List<JiraAssetObject> jiraAssetObjects =
			_jiraAssetService.getJiraAssetObjects(
				converter,
				aqlBuilder -> aqlBuilder.andEquals(
					false, converter.getDeletedAttributeName()
				).andAnyEmpty(
					referenceAttributeNames.toArray(new String[0])
				));

		if (jiraAssetObjects.isEmpty()) {
			return;
		}

		if (_log.isInfoEnabled()) {
			_log.info(
				StringBundler.concat(
					"Found ", jiraAssetObjects.size(), " orphaned ",
					converter.getObjectTypeName(), " asset object candidates"));
		}

		Map<AssignmentReference, Set<String>> liveExternalKeysMap =
			new LinkedHashMap<>();

		for (AssignmentReference assignmentReference : assignmentReferences) {
			Set<String> externalKeys = new LinkedHashSet<>();

			for (JiraAssetObject jiraAssetObject : jiraAssetObjects) {
				String externalKey = jiraAssetObject.getAttributeValue(
					assignmentReference.getExternalKeyAttributeName());

				if (Validator.isNotNull(externalKey)) {
					externalKeys.add(externalKey);
				}
			}

			Map<String, String> externalKeyToObjectIdMap =
				_jiraAssetService.getExternalKeyToObjectIdMap(
					assignmentReference.getConverter(), externalKeys);

			liveExternalKeysMap.put(
				assignmentReference, externalKeyToObjectIdMap.keySet());
		}

		for (JiraAssetObject jiraAssetObject : jiraAssetObjects) {
			if (!_isOrphaned(jiraAssetObject, liveExternalKeysMap)) {
				continue;
			}

			try {
				_jiraAssetService.softDelete(
					converter, jiraAssetObject,
					existingJiraAssetObject -> _jiraAssetService.isUpdatedSince(
						converter, startDate, existingJiraAssetObject));
			}
			catch (Exception exception) {
				_log.error(
					StringBundler.concat(
						"Unable to soft delete orphaned ",
						converter.getObjectTypeName(), " asset object ",
						jiraAssetObject.getObjectId()),
					exception);
			}
		}
	}

	private void _reconcileOrphanedAssignments() {
		_reconcile(
			_accountContactRoleAssignmentConverter,
			Arrays.asList(
				new AssignmentReference(
					_accountConverter,
					AccountContactRoleAssignmentConstants.
						ATTRIBUTE_NAME_ACCOUNT_EXTERNAL_KEY,
					AccountContactRoleAssignmentConstants.
						ATTRIBUTE_NAME_ACCOUNT),
				new AssignmentReference(
					_contactConverter,
					AccountContactRoleAssignmentConstants.
						ATTRIBUTE_NAME_CONTACT_EXTERNAL_KEY,
					AccountContactRoleAssignmentConstants.
						ATTRIBUTE_NAME_CONTACT),
				new AssignmentReference(
					_contactRoleConverter,
					AccountContactRoleAssignmentConstants.
						ATTRIBUTE_NAME_CONTACT_ROLE_EXTERNAL_KEY,
					AccountContactRoleAssignmentConstants.
						ATTRIBUTE_NAME_CONTACT_ROLE)));
		_reconcile(
			_accountTeamRoleAssignmentConverter,
			Arrays.asList(
				new AssignmentReference(
					_accountConverter,
					AccountTeamRoleAssignmentConstants.
						ATTRIBUTE_NAME_ACCOUNT_EXTERNAL_KEY,
					AccountTeamRoleAssignmentConstants.ATTRIBUTE_NAME_ACCOUNT),
				new AssignmentReference(
					_teamConverter,
					AccountTeamRoleAssignmentConstants.
						ATTRIBUTE_NAME_TEAM_EXTERNAL_KEY,
					AccountTeamRoleAssignmentConstants.ATTRIBUTE_NAME_TEAM),
				new AssignmentReference(
					_teamRoleConverter,
					AccountTeamRoleAssignmentConstants.
						ATTRIBUTE_NAME_TEAM_ROLE_EXTERNAL_KEY,
					AccountTeamRoleAssignmentConstants.
						ATTRIBUTE_NAME_TEAM_ROLE)));
		_reconcile(
			_teamContactRoleAssignmentConverter,
			Arrays.asList(
				new AssignmentReference(
					_contactConverter,
					TeamContactRoleAssignmentConstants.
						ATTRIBUTE_NAME_CONTACT_EXTERNAL_KEY,
					TeamContactRoleAssignmentConstants.ATTRIBUTE_NAME_CONTACT),
				new AssignmentReference(
					_contactRoleConverter,
					TeamContactRoleAssignmentConstants.
						ATTRIBUTE_NAME_CONTACT_ROLE_EXTERNAL_KEY,
					TeamContactRoleAssignmentConstants.
						ATTRIBUTE_NAME_CONTACT_ROLE),
				new AssignmentReference(
					_teamConverter,
					TeamContactRoleAssignmentConstants.
						ATTRIBUTE_NAME_TEAM_EXTERNAL_KEY,
					TeamContactRoleAssignmentConstants.ATTRIBUTE_NAME_TEAM)));
	}

	private static final Log _log = LogFactory.getLog(
		OrphanedAssignmentReconciler.class);

	@Autowired
	private AccountContactRoleAssignmentConverter
		_accountContactRoleAssignmentConverter;

	@Autowired
	private AccountConverter _accountConverter;

	@Autowired
	private AccountTeamRoleAssignmentConverter
		_accountTeamRoleAssignmentConverter;

	@Autowired
	private ContactConverter _contactConverter;

	@Autowired
	private ContactRoleConverter _contactRoleConverter;

	@Autowired
	private JiraAssetService _jiraAssetService;

	private final AtomicBoolean _reconciling = new AtomicBoolean();

	@Autowired
	private TeamContactRoleAssignmentConverter
		_teamContactRoleAssignmentConverter;

	@Autowired
	private TeamConverter _teamConverter;

	@Autowired
	private TeamRoleConverter _teamRoleConverter;

	private static class AssignmentReference {

		public BaseJiraAssetObjectConverter getConverter() {
			return _converter;
		}

		public String getExternalKeyAttributeName() {
			return _externalKeyAttributeName;
		}

		public String getReferenceAttributeName() {
			return _referenceAttributeName;
		}

		private AssignmentReference(
			BaseJiraAssetObjectConverter converter,
			String externalKeyAttributeName, String referenceAttributeName) {

			_converter = converter;
			_externalKeyAttributeName = externalKeyAttributeName;
			_referenceAttributeName = referenceAttributeName;
		}

		private final BaseJiraAssetObjectConverter _converter;
		private final String _externalKeyAttributeName;
		private final String _referenceAttributeName;

	}

}
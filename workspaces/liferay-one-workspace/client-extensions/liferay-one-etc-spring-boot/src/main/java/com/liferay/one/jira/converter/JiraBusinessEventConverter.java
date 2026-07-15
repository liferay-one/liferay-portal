/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.converter;

import com.liferay.one.jira.constants.JiraBusinessEventConstants;
import com.liferay.one.jira.model.JiraAssetObject;
import com.liferay.one.jira.model.JiraBusinessEvent;
import com.liferay.petra.string.StringPool;

import org.json.JSONObject;

import org.springframework.stereotype.Component;

/**
 * @author Amos Fong
 */
@Component
public class JiraBusinessEventConverter extends BaseJiraAssetObjectConverter {

	@Override
	public String getObjectTypeName() {
		return JiraBusinessEventConstants.OBJECT_TYPE_BUSINESS_EVENT;
	}

	public JiraAssetObject toAssetObject(
		String accountObjectKey, JiraBusinessEvent jiraBusinessEvent) {

		JiraAssetObject jiraAssetObject = createJiraAssetObject();

		jiraAssetObject.setAttributeValue(
			JiraBusinessEventConstants.ATTRIBUTE_NAME_ACTUAL_EVENT_DATE,
			jiraBusinessEvent.getActualEventDate());
		jiraAssetObject.setAttributeValue(
			JiraBusinessEventConstants.ATTRIBUTE_NAME_ASSOCIATED_TICKETS,
			jiraBusinessEvent.getAssociatedTickets());
		jiraAssetObject.setAttributeValue(
			JiraBusinessEventConstants.ATTRIBUTE_NAME_CURRENT_VERSION,
			jiraBusinessEvent.getCurrentLiferayVersionKey());
		jiraAssetObject.setAttributeValue(
			JiraBusinessEventConstants.ATTRIBUTE_NAME_DESCRIPTION,
			jiraBusinessEvent.getDescription());
		jiraAssetObject.setAttributeValue(
			JiraBusinessEventConstants.ATTRIBUTE_NAME_EVENT_STATUS,
			jiraBusinessEvent.getEventStatusName());
		jiraAssetObject.setAttributeValue(
			JiraBusinessEventConstants.ATTRIBUTE_NAME_EVENT_TYPE,
			jiraBusinessEvent.getEventTypeName());
		jiraAssetObject.setAttributeValue(
			JiraBusinessEventConstants.ATTRIBUTE_NAME_LAST_COMMENT,
			jiraBusinessEvent.getLastComment());
		jiraAssetObject.setAttributeValue(
			JiraBusinessEventConstants.ATTRIBUTE_NAME_LAST_UPDATED_AUTHOR,
			jiraBusinessEvent.getLastUpdatedAuthorEmailAddress());
		jiraAssetObject.setAttributeValue(
			JiraBusinessEventConstants.ATTRIBUTE_NAME_NAME,
			jiraBusinessEvent.getName());
		jiraAssetObject.setAttributeValue(
			JiraBusinessEventConstants.ATTRIBUTE_NAME_NEW_VERSION,
			jiraBusinessEvent.getNewLiferayVersionKey());
		jiraAssetObject.setAttributeValue(
			JiraBusinessEventConstants.ATTRIBUTE_NAME_PLANNED_EVENT_DATE,
			jiraBusinessEvent.getPlannedEventDate());
		jiraAssetObject.setAttributeValue(
			JiraBusinessEventConstants.ATTRIBUTE_NAME_TIME_ZONE,
			jiraBusinessEvent.getTimeZoneName());

		if (accountObjectKey != null) {
			jiraAssetObject.setAttributeValue(
				JiraBusinessEventConstants.ATTRIBUTE_NAME_ACCOUNT,
				accountObjectKey);
			jiraAssetObject.setAttributeValue(
				JiraBusinessEventConstants.ATTRIBUTE_NAME_AUTHOR,
				jiraBusinessEvent.getAuthorEmailAddress());
		}

		return jiraAssetObject;
	}

	public JiraBusinessEvent toJiraBusinessEvent(
		JSONObject jiraAssetObjectJSONObject,
		String projectExternalReferenceCode) {

		JiraAssetObject jiraAssetObject = toJiraAssetObject(
			jiraAssetObjectJSONObject);

		return new JiraBusinessEvent(
			jiraAssetObject.getAttributeValue(
				JiraBusinessEventConstants.ATTRIBUTE_NAME_ACTUAL_EVENT_DATE),
			jiraAssetObject.getAttributeDisplayValue(
				JiraBusinessEventConstants.ATTRIBUTE_NAME_ASSOCIATED_TICKETS),
			jiraAssetObject.getAttributeDisplayValue(
				JiraBusinessEventConstants.ATTRIBUTE_NAME_AUTHOR),
			jiraAssetObject.getObjectId(),
			jiraAssetObject.getAttributeValue(
				JiraBusinessEventConstants.ATTRIBUTE_NAME_CURRENT_VERSION),
			jiraAssetObject.getAttributeDisplayValue(
				JiraBusinessEventConstants.ATTRIBUTE_NAME_CURRENT_VERSION),
			jiraAssetObject.getAttributeDisplayValue(
				JiraBusinessEventConstants.ATTRIBUTE_NAME_DESCRIPTION),
			jiraAssetObject.getAttributeDisplayValue(
				JiraBusinessEventConstants.ATTRIBUTE_NAME_EVENT_STATUS),
			jiraAssetObject.getAttributeDisplayValue(
				JiraBusinessEventConstants.ATTRIBUTE_NAME_EVENT_TYPE),
			jiraAssetObject.getAttributeDisplayValue(
				JiraBusinessEventConstants.ATTRIBUTE_NAME_LAST_COMMENT),
			jiraAssetObject.getAttributeDisplayValue(
				JiraBusinessEventConstants.ATTRIBUTE_NAME_LAST_UPDATED_AUTHOR),
			jiraAssetObject.getAttributeDisplayValue(
				JiraBusinessEventConstants.ATTRIBUTE_NAME_NAME),
			jiraAssetObject.getAttributeValue(
				JiraBusinessEventConstants.ATTRIBUTE_NAME_NEW_VERSION),
			jiraAssetObject.getAttributeDisplayValue(
				JiraBusinessEventConstants.ATTRIBUTE_NAME_NEW_VERSION),
			jiraAssetObject.getAttributeValue(
				JiraBusinessEventConstants.ATTRIBUTE_NAME_PLANNED_EVENT_DATE),
			projectExternalReferenceCode,
			jiraAssetObject.getAttributeDisplayValue(
				JiraBusinessEventConstants.ATTRIBUTE_NAME_TIME_ZONE));
	}

	public JiraBusinessEvent toJiraBusinessEvent(
		String attributesJSON, String authorEmailAddress,
		String projectExternalReferenceCode) {

		JSONObject attributesJSONObject = new JSONObject(attributesJSON);

		return new JiraBusinessEvent(
			attributesJSONObject.optString("actualEventDate"),
			attributesJSONObject.optString("associatedTickets"),
			authorEmailAddress, StringPool.BLANK,
			attributesJSONObject.optString("currentLiferayVersion"),
			StringPool.BLANK, attributesJSONObject.optString("description"),
			attributesJSONObject.optString("eventStatus"),
			attributesJSONObject.optString("eventType"),
			attributesJSONObject.optString("lastComment"), authorEmailAddress,
			attributesJSONObject.optString("name"),
			attributesJSONObject.optString("newLiferayVersion"),
			StringPool.BLANK,
			attributesJSONObject.optString("plannedEventDate"),
			projectExternalReferenceCode,
			attributesJSONObject.optString("timeZone"));
	}

	@Override
	protected String getObjectSchemaName() {
		return JiraBusinessEventConstants.OBJECT_SCHEMA_BUSINESS_EVENTS;
	}

}
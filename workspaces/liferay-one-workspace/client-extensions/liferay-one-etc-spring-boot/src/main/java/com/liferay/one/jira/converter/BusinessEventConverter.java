/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.converter;

import com.liferay.one.jira.constants.BusinessEventConstants;
import com.liferay.one.jira.model.BusinessEvent;
import com.liferay.petra.string.StringPool;
import com.liferay.portal.kernel.util.Validator;

import java.util.Map;

import org.json.JSONObject;

import org.springframework.stereotype.Component;

/**
 * @author Amos Fong
 */
@Component
public class BusinessEventConverter extends AssetObjectConverter {

	public JSONObject toAttributesJSONObject(
		String accountObjectKey, BusinessEvent businessEvent) {

		Map<String, String> attributeIds = getAttributeIds();

		JSONObject attributesJSONObject = new JSONObject();

		_put(
			attributesJSONObject, attributeIds,
			BusinessEventConstants.ATTRIBUTE_NAME_ACTUAL_EVENT_DATE,
			businessEvent.getActualEventDate());
		_put(
			attributesJSONObject, attributeIds,
			BusinessEventConstants.ATTRIBUTE_NAME_ASSOCIATED_TICKETS,
			businessEvent.getAssociatedTickets());
		_put(
			attributesJSONObject, attributeIds,
			BusinessEventConstants.ATTRIBUTE_NAME_CURRENT_VERSION,
			businessEvent.getCurrentLiferayVersionKey());
		_put(
			attributesJSONObject, attributeIds,
			BusinessEventConstants.ATTRIBUTE_NAME_DESCRIPTION,
			businessEvent.getDescription());
		_put(
			attributesJSONObject, attributeIds,
			BusinessEventConstants.ATTRIBUTE_NAME_EVENT_STATUS,
			businessEvent.getEventStatusName());
		_put(
			attributesJSONObject, attributeIds,
			BusinessEventConstants.ATTRIBUTE_NAME_EVENT_TYPE,
			businessEvent.getEventTypeName());
		_put(
			attributesJSONObject, attributeIds,
			BusinessEventConstants.ATTRIBUTE_NAME_LAST_COMMENT,
			businessEvent.getLastComment());
		_put(
			attributesJSONObject, attributeIds,
			BusinessEventConstants.ATTRIBUTE_NAME_LAST_UPDATED_AUTHOR,
			businessEvent.getLastUpdatedAuthorEmailAddress());
		_put(
			attributesJSONObject, attributeIds,
			BusinessEventConstants.ATTRIBUTE_NAME_NAME,
			businessEvent.getName());
		_put(
			attributesJSONObject, attributeIds,
			BusinessEventConstants.ATTRIBUTE_NAME_NEW_VERSION,
			businessEvent.getNewLiferayVersionKey());
		_put(
			attributesJSONObject, attributeIds,
			BusinessEventConstants.ATTRIBUTE_NAME_PLANNED_EVENT_DATE,
			businessEvent.getPlannedEventDate());
		_put(
			attributesJSONObject, attributeIds,
			BusinessEventConstants.ATTRIBUTE_NAME_TIME_ZONE,
			businessEvent.getTimeZoneName());

		if (accountObjectKey != null) {
			_put(
				attributesJSONObject, attributeIds,
				BusinessEventConstants.ATTRIBUTE_NAME_ACCOUNT,
				accountObjectKey);
			_put(
				attributesJSONObject, attributeIds,
				BusinessEventConstants.ATTRIBUTE_NAME_AUTHOR,
				businessEvent.getAuthorEmailAddress());
		}

		return attributesJSONObject;
	}

	public BusinessEvent toBusinessEvent(
		String accountExternalReferenceCode,
		JSONObject jiraAssetObjectJSONObject) {

		Map<String, String> attributeIds = getAttributeIds();

		return new BusinessEvent(
			accountExternalReferenceCode,
			getAttributeKey(
				attributeIds.get(
					BusinessEventConstants.ATTRIBUTE_NAME_ACTUAL_EVENT_DATE),
				jiraAssetObjectJSONObject),
			getAttributeValue(
				attributeIds.get(
					BusinessEventConstants.ATTRIBUTE_NAME_ASSOCIATED_TICKETS),
				jiraAssetObjectJSONObject),
			getAttributeValue(
				attributeIds.get(BusinessEventConstants.ATTRIBUTE_NAME_AUTHOR),
				jiraAssetObjectJSONObject),
			jiraAssetObjectJSONObject.optString("id"),
			getAttributeKey(
				attributeIds.get(
					BusinessEventConstants.ATTRIBUTE_NAME_CURRENT_VERSION),
				jiraAssetObjectJSONObject),
			getAttributeValue(
				attributeIds.get(
					BusinessEventConstants.ATTRIBUTE_NAME_CURRENT_VERSION),
				jiraAssetObjectJSONObject),
			getAttributeValue(
				attributeIds.get(
					BusinessEventConstants.ATTRIBUTE_NAME_DESCRIPTION),
				jiraAssetObjectJSONObject),
			getAttributeValue(
				attributeIds.get(
					BusinessEventConstants.ATTRIBUTE_NAME_EVENT_STATUS),
				jiraAssetObjectJSONObject),
			getAttributeValue(
				attributeIds.get(
					BusinessEventConstants.ATTRIBUTE_NAME_EVENT_TYPE),
				jiraAssetObjectJSONObject),
			getAttributeValue(
				attributeIds.get(
					BusinessEventConstants.ATTRIBUTE_NAME_LAST_COMMENT),
				jiraAssetObjectJSONObject),
			getAttributeValue(
				attributeIds.get(
					BusinessEventConstants.ATTRIBUTE_NAME_LAST_UPDATED_AUTHOR),
				jiraAssetObjectJSONObject),
			getAttributeValue(
				attributeIds.get(BusinessEventConstants.ATTRIBUTE_NAME_NAME),
				jiraAssetObjectJSONObject),
			getAttributeKey(
				attributeIds.get(
					BusinessEventConstants.ATTRIBUTE_NAME_NEW_VERSION),
				jiraAssetObjectJSONObject),
			getAttributeValue(
				attributeIds.get(
					BusinessEventConstants.ATTRIBUTE_NAME_NEW_VERSION),
				jiraAssetObjectJSONObject),
			getAttributeKey(
				attributeIds.get(
					BusinessEventConstants.ATTRIBUTE_NAME_PLANNED_EVENT_DATE),
				jiraAssetObjectJSONObject),
			getAttributeValue(
				attributeIds.get(
					BusinessEventConstants.ATTRIBUTE_NAME_TIME_ZONE),
				jiraAssetObjectJSONObject));
	}

	public BusinessEvent toBusinessEvent(
		String accountExternalReferenceCode, String attributesJSON,
		String authorEmailAddress) {

		JSONObject attributesJSONObject = new JSONObject(attributesJSON);

		return new BusinessEvent(
			accountExternalReferenceCode,
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
			attributesJSONObject.optString("timeZone"));
	}

	@Override
	protected String getObjectSchemaName() {
		return BusinessEventConstants.OBJECT_SCHEMA_BUSINESS_EVENTS;
	}

	@Override
	protected String getObjectTypeName() {
		return BusinessEventConstants.OBJECT_TYPE_BUSINESS_EVENT;
	}

	private void _put(
		JSONObject attributesJSONObject, Map<String, String> attributeIds,
		String attributeName, String value) {

		String attributeId = attributeIds.get(attributeName);

		if (Validator.isNotNull(attributeId)) {
			attributesJSONObject.put(attributeId, value);
		}
	}

}
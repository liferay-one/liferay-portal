/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.converter;

import com.liferay.one.jira.model.BusinessEvent;
import com.liferay.petra.string.StringPool;

import org.json.JSONObject;

import org.springframework.stereotype.Component;

/**
 * @author Amos Fong
 */
@Component
public class BusinessEventConverter extends AssetObjectConverter {

	@Override
	public String getObjectSchemaName() {
		return Constants.OBJECT_SCHEMA_NAME;
	}

	@Override
	public String getObjectTypeName() {
		return Constants.OBJECT_TYPE_NAME;
	}

	public JSONObject toAttributesJSONObject(
		String accountObjectKey, BusinessEvent businessEvent) {

		JSONObject attributesJSONObject = new JSONObject();

		attributesJSONObject.put(
			attr(Constants.ATTRIBUTE_NAME_ACTUAL_EVENT_DATE),
			businessEvent.getActualEventDate()
		).put(
			attr(Constants.ATTRIBUTE_NAME_ASSOCIATED_TICKETS),
			businessEvent.getAssociatedTickets()
		).put(
			attr(Constants.ATTRIBUTE_NAME_CURRENT_VERSION),
			businessEvent.getCurrentLiferayVersionKey()
		).put(
			attr(Constants.ATTRIBUTE_NAME_DESCRIPTION),
			businessEvent.getDescription()
		).put(
			attr(Constants.ATTRIBUTE_NAME_EVENT_STATUS),
			businessEvent.getEventStatusName()
		).put(
			attr(Constants.ATTRIBUTE_NAME_EVENT_TYPE),
			businessEvent.getEventTypeName()
		).put(
			attr(Constants.ATTRIBUTE_NAME_LAST_COMMENT),
			businessEvent.getLastComment()
		).put(
			attr(Constants.ATTRIBUTE_NAME_LAST_UPDATED_AUTHOR),
			businessEvent.getLastUpdatedAuthorEmailAddress()
		).put(
			attr(Constants.ATTRIBUTE_NAME_NAME), businessEvent.getName()
		).put(
			attr(Constants.ATTRIBUTE_NAME_NEW_VERSION),
			businessEvent.getNewLiferayVersionKey()
		).put(
			attr(Constants.ATTRIBUTE_NAME_PLANNED_EVENT_DATE),
			businessEvent.getPlannedEventDate()
		).put(
			attr(Constants.ATTRIBUTE_NAME_TIME_ZONE),
			businessEvent.getTimeZoneName()
		);

		if (accountObjectKey != null) {
			attributesJSONObject.put(
				attr(Constants.ATTRIBUTE_NAME_ACCOUNT), accountObjectKey
			).put(
				attr(Constants.ATTRIBUTE_NAME_AUTHOR),
				businessEvent.getAuthorEmailAddress()
			);
		}

		return attributesJSONObject;
	}

	public BusinessEvent toBusinessEvent(
		String accountExternalReferenceCode,
		JSONObject jiraAssetObjectJSONObject) {

		return new BusinessEvent(
			accountExternalReferenceCode,
			getAttributeKey(
				attr(Constants.ATTRIBUTE_NAME_ACTUAL_EVENT_DATE),
				jiraAssetObjectJSONObject),
			getAttributeValue(
				attr(Constants.ATTRIBUTE_NAME_ASSOCIATED_TICKETS),
				jiraAssetObjectJSONObject),
			getAttributeValue(
				attr(Constants.ATTRIBUTE_NAME_AUTHOR),
				jiraAssetObjectJSONObject),
			jiraAssetObjectJSONObject.optString("id"),
			getAttributeKey(
				attr(Constants.ATTRIBUTE_NAME_CURRENT_VERSION),
				jiraAssetObjectJSONObject),
			getAttributeValue(
				attr(Constants.ATTRIBUTE_NAME_CURRENT_VERSION),
				jiraAssetObjectJSONObject),
			getAttributeValue(
				attr(Constants.ATTRIBUTE_NAME_DESCRIPTION),
				jiraAssetObjectJSONObject),
			getAttributeValue(
				attr(Constants.ATTRIBUTE_NAME_EVENT_STATUS),
				jiraAssetObjectJSONObject),
			getAttributeValue(
				attr(Constants.ATTRIBUTE_NAME_EVENT_TYPE),
				jiraAssetObjectJSONObject),
			getAttributeValue(
				attr(Constants.ATTRIBUTE_NAME_LAST_COMMENT),
				jiraAssetObjectJSONObject),
			getAttributeValue(
				attr(Constants.ATTRIBUTE_NAME_LAST_UPDATED_AUTHOR),
				jiraAssetObjectJSONObject),
			getAttributeValue(
				attr(Constants.ATTRIBUTE_NAME_NAME), jiraAssetObjectJSONObject),
			getAttributeKey(
				attr(Constants.ATTRIBUTE_NAME_NEW_VERSION),
				jiraAssetObjectJSONObject),
			getAttributeValue(
				attr(Constants.ATTRIBUTE_NAME_NEW_VERSION),
				jiraAssetObjectJSONObject),
			getAttributeKey(
				attr(Constants.ATTRIBUTE_NAME_PLANNED_EVENT_DATE),
				jiraAssetObjectJSONObject),
			getAttributeValue(
				attr(Constants.ATTRIBUTE_NAME_TIME_ZONE),
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

	public static class Constants {

		public static final String ATTRIBUTE_NAME_ACCOUNT = "Account";

		public static final String ATTRIBUTE_NAME_ACTUAL_EVENT_DATE =
			"Actual Event Date";

		public static final String ATTRIBUTE_NAME_ASSOCIATED_TICKETS =
			"Associated Tickets";

		public static final String ATTRIBUTE_NAME_AUTHOR = "Author";

		public static final String ATTRIBUTE_NAME_CURRENT_VERSION =
			"Current Version";

		public static final String ATTRIBUTE_NAME_DESCRIPTION = "Description";

		public static final String ATTRIBUTE_NAME_EVENT_STATUS = "Event Status";

		public static final String ATTRIBUTE_NAME_EVENT_TYPE = "Event Type";

		public static final String ATTRIBUTE_NAME_LAST_COMMENT = "Last Comment";

		public static final String ATTRIBUTE_NAME_LAST_UPDATED_AUTHOR =
			"Last Updated Author";

		public static final String ATTRIBUTE_NAME_NAME = "Name";

		public static final String ATTRIBUTE_NAME_NEW_VERSION = "New Version";

		public static final String ATTRIBUTE_NAME_PLANNED_EVENT_DATE =
			"Planned Event Date";

		public static final String ATTRIBUTE_NAME_TIME_ZONE = "Time Zone";

		public static final String OBJECT_SCHEMA_NAME = "Business Events";

		public static final String OBJECT_TYPE_NAME = "Business Event";

	}

}
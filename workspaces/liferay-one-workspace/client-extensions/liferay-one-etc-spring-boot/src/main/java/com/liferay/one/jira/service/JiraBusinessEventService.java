/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.service;

import com.liferay.one.jira.constants.JiraBusinessEventConstants;
import com.liferay.one.jira.converter.JiraBusinessEventConverter;
import com.liferay.one.jira.converter.JiraBusinessEventVersionConverter;
import com.liferay.one.jira.model.JiraAssetObjectFieldOption;
import com.liferay.one.jira.model.JiraBusinessEvent;
import com.liferay.one.jira.model.JiraBusinessEventVersion;
import com.liferay.one.jira.model.JiraProductVersion;
import com.liferay.one.jira.util.AQLUtil;
import com.liferay.petra.string.StringPool;
import com.liferay.portal.kernel.util.Validator;

import java.util.ArrayList;
import java.util.List;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * @author Jenny Chen
 * @author Drew Brokke
 */
@Component
public class JiraBusinessEventService {

	public void createJiraBusinessEvent(JiraBusinessEvent jiraBusinessEvent)
		throws Exception {

		_jiraAssetService.createObject(
			_businessEventConverter.getObjectTypeId(),
			_businessEventConverter.toAssetObject(
				_accountAssetService.getAccountObjectKey(
					jiraBusinessEvent.getProjectExternalReferenceCode()),
				jiraBusinessEvent));
	}

	public void deleteJiraBusinessEvent(String id) throws Exception {
		_jiraAssetService.deleteObject(id);
	}

	@Cacheable("assetObjectFieldOptions")
	public List<JiraAssetObjectFieldOption> getFieldOptions(String fieldName)
		throws Exception {

		List<JiraAssetObjectFieldOption> jiraAssetObjectFieldOptions =
			new ArrayList<>();

		JSONArray objectTypeAttributesJSONArray =
			_jiraAssetService.getObjectTypeAttributes(
				_businessEventConverter.getObjectTypeId());

		for (int i = 0; i < objectTypeAttributesJSONArray.length(); i++) {
			JSONObject objectTypeAttributeJSONObject =
				objectTypeAttributesJSONArray.getJSONObject(i);

			if (!fieldName.equals(
					objectTypeAttributeJSONObject.optString("name"))) {

				continue;
			}

			String options = objectTypeAttributeJSONObject.optString("options");

			if (Validator.isNotNull(options)) {
				for (String option : options.split(",")) {
					option = option.trim();

					jiraAssetObjectFieldOptions.add(
						new JiraAssetObjectFieldOption(option, option));
				}
			}

			break;
		}

		return jiraAssetObjectFieldOptions;
	}

	public JiraBusinessEvent getJiraBusinessEvent(String id) throws Exception {
		return _businessEventConverter.toJiraBusinessEvent(
			_jiraAssetService.getObject(id), StringPool.BLANK);
	}

	public List<JiraBusinessEvent> getJiraBusinessEvents(
			String projectExternalReferenceCode)
		throws Exception {

		return _jiraAssetService.searchObjects(
			_businessEventConverter.getAQLWithBuilder(
				aqlBuilder -> aqlBuilder.andEquals(
					projectExternalReferenceCode,
					JiraBusinessEventConstants.ATTRIBUTE_NAME_ACCOUNT,
					"External Key")),
			jsonObject -> _businessEventConverter.toJiraBusinessEvent(
				jsonObject, projectExternalReferenceCode));
	}

	public List<JiraBusinessEventVersion> getJiraBusinessEventVersions(
			String businessEventId)
		throws Exception {

		if (!Validator.isNumber(businessEventId)) {
			return new ArrayList<>();
		}

		return _jiraAssetService.searchObjects(
			_businessEventVersionConverter.getAQLWithBuilder(
				aqlBuilder -> aqlBuilder.andEqualsObject(
					businessEventId,
					JiraBusinessEventConstants.OBJECT_TYPE_BUSINESS_EVENT
				).orderByDescending(
					"Updated"
				)),
			_businessEventVersionConverter::toJiraBusinessEventVersion);
	}

	@Cacheable("productVersions")
	public List<JiraProductVersion> getJiraProductVersions() throws Exception {
		return _jiraAssetService.searchObjects(
			AQLUtil.getBaseAQL(
				JiraBusinessEventConstants.OBJECT_SCHEMA_BUSINESS_EVENTS,
				JiraBusinessEventConstants.OBJECT_TYPE_PRODUCT_VERSION),
			JiraProductVersion::new);
	}

	@CacheEvict(
		allEntries = true,
		value = {
			"assetObjectFieldOptions", "assetObjectTypeAttributeIds",
			"assetObjectTypeAttributeOptions", "assetObjectTypeIds",
			"productVersions"
		}
	)
	@Scheduled(cron = "0 0 0 * * *")
	public void scheduledAssetObjectsCacheEviction() throws Exception {
	}

	public JiraBusinessEvent updateJiraBusinessEvent(
			JiraBusinessEvent jiraBusinessEvent, String id)
		throws Exception {

		_jiraAssetService.updateObject(
			id, _businessEventConverter.toAssetObject(null, jiraBusinessEvent));

		return getJiraBusinessEvent(id);
	}

	@Autowired
	private AccountAssetService _accountAssetService;

	@Autowired
	private JiraBusinessEventConverter _businessEventConverter;

	@Autowired
	private JiraBusinessEventVersionConverter _businessEventVersionConverter;

	@Autowired
	private JiraAssetService _jiraAssetService;

}
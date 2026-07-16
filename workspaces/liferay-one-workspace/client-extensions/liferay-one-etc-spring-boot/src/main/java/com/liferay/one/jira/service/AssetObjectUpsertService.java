/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.service;

import com.liferay.one.jira.converter.BaseJiraAssetObjectConverter;
import com.liferay.one.jira.model.JiraAssetObject;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.Validator;

import java.util.List;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * @author Drew Brokke
 */
@Component
public class AssetObjectUpsertService {

	public void upsert(
		BaseJiraAssetObjectConverter converter,
		JiraAssetObject jiraAssetObject) {

		String externalKeyAttributeName =
			converter.getExternalKeyAttributeName();

		String externalKey = jiraAssetObject.getAttributeValue(
			externalKeyAttributeName);

		if (Validator.isNull(externalKey)) {
			if (_log.isWarnEnabled()) {
				_log.warn(
					StringBundler.concat(
						"Unable to upsert a ", converter.getObjectTypeName(),
						" asset object with no \"", externalKeyAttributeName,
						"\" value"));
			}

			return;
		}

		List<JiraAssetObject> jiraAssetObjects =
			_jiraAssetService.searchObjects(
				converter.getAQLWithBuilder(
					aqlBuilder -> aqlBuilder.andEquals(
						externalKey, externalKeyAttributeName)),
				converter::toJiraAssetObject);

		if (jiraAssetObjects.isEmpty()) {
			if (_log.isInfoEnabled()) {
				_log.info(
					StringBundler.concat(
						"Creating ", converter.getObjectTypeName(),
						" asset object for external key ", externalKey));
			}

			_jiraAssetService.createObject(
				converter.getObjectTypeId(), jiraAssetObject);
		}
		else {
			JiraAssetObject existingJiraAssetObject = jiraAssetObjects.get(0);

			if (_log.isInfoEnabled()) {
				_log.info(
					StringBundler.concat(
						"Updating ", converter.getObjectTypeName(),
						" asset object for external key ", externalKey));
			}

			_jiraAssetService.updateObject(
				existingJiraAssetObject.getObjectId(), jiraAssetObject);
		}
	}

	private static final Log _log = LogFactory.getLog(
		AssetObjectUpsertService.class);

	@Autowired
	private JiraAssetService _jiraAssetService;

}
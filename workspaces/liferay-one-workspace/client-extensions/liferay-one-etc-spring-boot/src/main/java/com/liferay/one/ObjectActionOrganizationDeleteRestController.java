/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.one.jira.synchronizer.OrganizationSynchronizer;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * @author Drew Brokke
 */
@RequestMapping("/object/action/organization/delete")
@RestController
public class ObjectActionOrganizationDeleteRestController
	extends OneBaseRestController {

	@PostMapping
	public void post(@RequestBody String json) throws Exception {
		JSONObject jsonObject = new JSONObject(json);

		JSONObject modelJSONObject = jsonObject.getJSONObject(
			"modelOrganization");

		String externalReferenceCode = modelJSONObject.getString(
			"externalReferenceCode");

		if (_log.isInfoEnabled()) {
			_log.info(
				"Organization " + externalReferenceCode +
					" was deleted, triggering a delete from JSM");
		}

		_organizationSynchronizer.deleteOrganization(externalReferenceCode);
	}

	private static final Log _log = LogFactory.getLog(
		ObjectActionOrganizationDeleteRestController.class);

	@Autowired
	private OrganizationSynchronizer _organizationSynchronizer;

}
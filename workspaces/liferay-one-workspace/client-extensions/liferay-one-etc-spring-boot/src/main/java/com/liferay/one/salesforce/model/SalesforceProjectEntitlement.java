/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.salesforce.model;

import org.json.JSONObject;

/**
 * @author Felipe Franca
 */
public class SalesforceProjectEntitlement {

	public SalesforceProjectEntitlement(JSONObject jsonObject) {
		_id = jsonObject.optString("Id");
		_projectId = jsonObject.optString("Project__c");
		_purchasingOpportunityId = jsonObject.optString(
			"Purchasing_Opportunity__c");
	}

	public String getId() {
		return _id;
	}

	public String getProjectId() {
		return _projectId;
	}

	public String getPurchasingOpportunityId() {
		return _purchasingOpportunityId;
	}

	private final String _id;
	private final String _projectId;
	private final String _purchasingOpportunityId;

}
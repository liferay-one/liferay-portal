/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.one.constants.EnvironmentConstants;
import com.liferay.one.model.Contract;
import com.liferay.one.model.Environment;
import com.liferay.one.salesforce.model.SalesforceOpportunityLineItem;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.ArrayUtil;
import com.liferay.portal.kernel.util.StringUtil;

import java.util.List;
import java.util.UUID;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * @author Amos Fong
 */
@Component
public class ProvisioningEnvironmentService {

	public void provisionCloudNativeEnvironments(
			Account account, Contract contract,
			List<SalesforceOpportunityLineItem> salesforceOpportunityLineItems)
		throws Exception {

		if (contract == null) {
			return;
		}

		boolean cloudNative = false;

		for (SalesforceOpportunityLineItem salesforceOpportunityLineItem :
				salesforceOpportunityLineItems) {

			if (ArrayUtil.contains(
					EnvironmentConstants.NAMES_CLOUD_NATIVE,
					salesforceOpportunityLineItem.getProductName())) {

				cloudNative = true;

				break;
			}
		}

		if (!cloudNative) {
			return;
		}

		List<Environment> environments = _environmentService.getEnvironments(
			StringBundler.concat(
				"(r_accountEntryToEnvironment_accountEntryId eq '",
				account.getId(), "') and (type eq '",
				EnvironmentConstants.TYPE_CNE, "')"));

		if (!environments.isEmpty()) {
			return;
		}

		for (String environmentType : _ENVIRONMENT_TYPES) {
			try {
				_environmentService.addCloudNativeEnvironment(
					account.getId(), _generateActivationCode(),
					contract.getExternalReferenceCode(), environmentType,
					contract.getProjectExternalReferenceCode());
			}
			catch (Exception exception) {
				_log.error(
					StringBundler.concat(
						"Unable to add the ", environmentType,
						" cloud native environment for account ",
						account.getExternalReferenceCode()),
					exception);
			}
		}
	}

	private String _generateActivationCode() {
		UUID uuid = UUID.randomUUID();

		return StringUtil.removeChar(uuid.toString(), '-');
	}

	private static final String[] _ENVIRONMENT_TYPES = {
		EnvironmentConstants.ENVIRONMENT_TYPE_NONPRODUCTION,
		EnvironmentConstants.ENVIRONMENT_TYPE_PRODUCTION,
		EnvironmentConstants.ENVIRONMENT_TYPE_UAT
	};

	private static final Log _log = LogFactory.getLog(
		ProvisioningEnvironmentService.class);

	@Autowired
	private EnvironmentService _environmentService;

}
/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.one.constants.CommerceProductConstants;
import com.liferay.one.constants.EnvironmentConstants;
import com.liferay.one.model.Contract;
import com.liferay.one.model.Environment;
import com.liferay.one.salesforce.model.SalesforceOpportunityLineItem;
import com.liferay.one.util.ActivationCodeUtil;
import com.liferay.one.util.ContractUtil;
import com.liferay.petra.string.StringBundler;

import java.util.List;

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
			Account account, List<Contract> contracts,
			List<SalesforceOpportunityLineItem> salesforceOpportunityLineItems)
		throws Exception {

		SalesforceOpportunityLineItem cloudNativeSalesforceOpportunityLineItem =
			null;

		for (SalesforceOpportunityLineItem salesforceOpportunityLineItem :
				salesforceOpportunityLineItems) {

			if (CommerceProductConstants.namesCloudNativeProducts.contains(
					salesforceOpportunityLineItem.getProductName())) {

				cloudNativeSalesforceOpportunityLineItem =
					salesforceOpportunityLineItem;

				break;
			}
		}

		if (cloudNativeSalesforceOpportunityLineItem == null) {
			return;
		}

		Contract contract = ContractUtil.matchContract(
			contracts,
			cloudNativeSalesforceOpportunityLineItem.getEndDateInstant());

		if ((contract == null) && (contracts.size() == 1)) {
			contract = contracts.get(0);
		}

		if (contract == null) {
			return;
		}

		List<Environment> environments = _environmentService.getEnvironments(
			StringBundler.concat(
				"(r_accountEntryToEnvironment_accountEntryId eq '",
				account.getId(), "') and (offering eq '",
				EnvironmentConstants.OFFERING_CLOUD_NATIVE, "')"));

		if (!environments.isEmpty()) {
			return;
		}

		for (String type : EnvironmentConstants.types) {
			try {
				_environmentService.addCloudNativeEnvironment(
					account.getId(), ActivationCodeUtil.generate(),
					contract.getExternalReferenceCode(),
					contract.getProjectExternalReferenceCode(), type);
			}
			catch (Exception exception) {
				_log.error(
					StringBundler.concat(
						"Unable to add the ", type,
						" cloud native environment for account ",
						account.getExternalReferenceCode()),
					exception);
			}
		}
	}

	private static final Log _log = LogFactory.getLog(
		ProvisioningEnvironmentService.class);

	@Autowired
	private EnvironmentService _environmentService;

}
/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.one.constants.CommerceOrderConstants;
import com.liferay.one.salesforce.model.SalesforceOpportunity;
import com.liferay.one.salesforce.model.SalesforceProject;
import com.liferay.one.salesforce.model.SalesforceProjectContactRole;
import com.liferay.one.util.KeyedLock;
import com.liferay.petra.string.StringBundler;
import com.liferay.petra.string.StringPool;
import com.liferay.portal.kernel.util.GetterUtil;
import com.liferay.portal.kernel.util.HashMapBuilder;
import com.liferay.portal.kernel.util.StringUtil;
import com.liferay.portal.kernel.util.Validator;

import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * @author Wellington Barbosa
 */
@Component
public class ProvisioningAnalyticsCloudService {

	public void provisionAnalyticsCloudProject(
			Account account, long orderId,
			SalesforceOpportunity salesforceOpportunity,
			SalesforceProject salesforceProject,
			List<SalesforceProjectContactRole> salesforceProjectContactRoles,
			List<String> warningMessages)
		throws Exception {

		_keyedLock.withLock(
			account.getExternalReferenceCode(),
			() -> _provisionAnalyticsCloudProject(
				account, orderId, salesforceOpportunity, salesforceProject,
				salesforceProjectContactRoles, warningMessages));
	}

	private void _addWarning(
		Exception exception, String warningMessage,
		List<String> warningMessages) {

		warningMessages.add(warningMessage);

		if (_log.isWarnEnabled()) {
			_log.warn(warningMessage, exception);
		}
	}

	private Order _fetchCommerceOrder(
		long orderId, List<String> warningMessages) {

		try {
			return _commerceOrderService.fetchCommerceOrder(orderId);
		}
		catch (Exception exception) {
			_addWarning(
				exception,
				"Unable to get order " + orderId +
					" to provision the Analytics Cloud workspace",
				warningMessages);

			return null;
		}
	}

	private JSONObject _getAnalyticsCloudProjectJSONObject(
		Account account, boolean ldp,
		SalesforceOpportunity salesforceOpportunity,
		SalesforceProject salesforceProject,
		List<SalesforceProjectContactRole> salesforceProjectContactRoles) {

		JSONArray incidentReportEmailAddressesJSONArray = new JSONArray();

		for (String emailAddress :
				StringUtil.split(
					salesforceProject.getSecurityContactEmailAddress())) {

			if (Validator.isNotNull(emailAddress)) {
				incidentReportEmailAddressesJSONArray.put(emailAddress.trim());
			}
		}

		JSONObject jsonObject = new JSONObject(
		).put(
			"corpProjectName", account.getName()
		).put(
			"incidentReportEmailAddresses",
			incidentReportEmailAddressesJSONArray
		).put(
			"name", salesforceProject.getLDPWorkspaceName()
		).put(
			"ownerEmailAddress",
			_getOwnerEmailAddress(
				incidentReportEmailAddressesJSONArray, ldp,
				salesforceOpportunity, salesforceProjectContactRoles)
		).put(
			"serverLocation",
			_getServerLocation(salesforceProject.getDataCenterLocation())
		);

		if (ldp) {
			jsonObject.put(
				"friendlyURL",
				_getFriendlyURL(salesforceProject.getFriendlyWorkspaceURL()));
		}

		return jsonObject;
	}

	private String _getFriendlyURL(String friendlyURL) {
		if (Validator.isNull(friendlyURL)) {
			return StringPool.BLANK;
		}

		friendlyURL = friendlyURL.trim(
		).replaceAll(
			"^/+", ""
		);

		if (Validator.isNull(friendlyURL)) {
			return StringPool.BLANK;
		}

		return StringPool.SLASH + friendlyURL;
	}

	private String _getOwnerEmailAddress(
		JSONArray incidentReportEmailAddressesJSONArray, boolean ldp,
		SalesforceOpportunity salesforceOpportunity,
		List<SalesforceProjectContactRole> salesforceProjectContactRoles) {

		String administratorContactRole =
			ldp ? "LDP Administrator" : "DSR Administrator";

		for (SalesforceProjectContactRole salesforceProjectContactRole :
				salesforceProjectContactRoles) {

			if (Objects.equals(
					salesforceProjectContactRole.getContactRole(),
					administratorContactRole) &&
				Validator.isNotNull(
					salesforceProjectContactRole.getEmailAddress())) {

				return salesforceProjectContactRole.getEmailAddress();
			}
		}

		if (!incidentReportEmailAddressesJSONArray.isEmpty()) {
			return incidentReportEmailAddressesJSONArray.getString(0);
		}

		return salesforceOpportunity.getOwnerEmailAddress();
	}

	private String _getServerLocation(String dataCenterLocation) {
		String serverLocation = _serverLocations.get(dataCenterLocation);

		if (serverLocation != null) {
			return serverLocation;
		}

		if (_serverLocations.containsValue(dataCenterLocation)) {
			return dataCenterLocation;
		}

		return "us-west1-s2-c1";
	}

	private String _getWorkspaceName(SalesforceProject salesforceProject) {
		if (salesforceProject == null) {
			return StringPool.BLANK;
		}

		return salesforceProject.getLDPWorkspaceName();
	}

	private void _provisionAnalyticsCloudProject(
			Account account, long orderId,
			SalesforceOpportunity salesforceOpportunity,
			SalesforceProject salesforceProject,
			List<SalesforceProjectContactRole> salesforceProjectContactRoles,
			List<String> warningMessages)
		throws Exception {

		Order order = _fetchCommerceOrder(orderId, warningMessages);

		if (order == null) {
			return;
		}

		String orderTypeExternalReferenceCode =
			order.getOrderTypeExternalReferenceCode();

		boolean ldp = Objects.equals(
			orderTypeExternalReferenceCode,
			CommerceOrderConstants.ORDER_TYPE_EXTERNAL_REFERENCE_CODE_LDP);

		if (!ldp &&
			!Objects.equals(
				orderTypeExternalReferenceCode,
				CommerceOrderConstants.
					ORDER_TYPE_EXTERNAL_REFERENCE_CODE_DSR)) {

			return;
		}

		String customFieldPrefix = ldp ? "ldp" : "dsr";

		Map<String, String> customFields =
			(Map<String, String>)order.getCustomFields();

		if ((customFields != null) &&
			Validator.isNotNull(
				customFields.get(
					customFieldPrefix + "AnalyticsCloudProject"))) {

			return;
		}

		try {
			JSONObject analyticsCloudProjectJSONObject =
				_analyticsCloudService.getAnalyticsCloudProjectJSONObject(
					StringPool.BLANK, account.getExternalReferenceCode());

			if (analyticsCloudProjectJSONObject == null) {
				if ((salesforceProject == null) ||
					Validator.isNull(salesforceProject.getLDPWorkspaceName()) ||
					Validator.isNull(
						salesforceProject.getDataCenterLocation())) {

					_addWarning(
						null,
						StringBundler.concat(
							"Unable to provision the Analytics Cloud ",
							"workspace for opportunity ",
							salesforceOpportunity.getId(),
							" without a workspace name and a data center ",
							"location"),
						warningMessages);

					return;
				}

				analyticsCloudProjectJSONObject =
					_analyticsCloudService.provisionAnalyticsCloudProject(
						StringPool.BLANK,
						_getAnalyticsCloudProjectJSONObject(
							account, ldp, salesforceOpportunity,
							salesforceProject, salesforceProjectContactRoles),
						account.getExternalReferenceCode());
			}
			else if (_log.isInfoEnabled()) {
				_log.info(
					"Reusing the Analytics Cloud workspace already " +
						"provisioned for account " +
							account.getExternalReferenceCode());
			}

			_commerceOrderService.patchOrderCustomFields(
				orderId,
				HashMapBuilder.put(
					customFieldPrefix + "AnalyticsCloudProject",
					analyticsCloudProjectJSONObject.toString()
				).put(
					customFieldPrefix + "WorkspaceName",
					analyticsCloudProjectJSONObject.optString(
						"name", _getWorkspaceName(salesforceProject))
				).build());
		}
		catch (Exception exception1) {
			_addWarning(
				exception1,
				"Unable to provision the Analytics Cloud workspace for " +
					"opportunity " + salesforceOpportunity.getId(),
				warningMessages);

			try {
				_commerceOrderService.patchOrderCustomFields(
					orderId,
					HashMapBuilder.put(
						customFieldPrefix + "Error",
						GetterUtil.getString(exception1.getMessage())
					).put(
						customFieldPrefix + "ErrorDate",
						ZonedDateTime.now(
						).format(
							DateTimeFormatter.ISO_INSTANT
						)
					).build());
			}
			catch (Exception exception2) {
				_addWarning(
					exception2,
					"Unable to record the Analytics Cloud provisioning error " +
						"on order " + orderId,
					warningMessages);
			}
		}
	}

	private static final Log _log = LogFactory.getLog(
		ProvisioningAnalyticsCloudService.class);

	private static final Map<String, String> _serverLocations =
		HashMapBuilder.put(
			"asia-south1", "asia-south1-ac5-c1"
		).put(
			"europe-west2", "europe-west2-ac2-c1"
		).put(
			"europe-west3", "europe-west3-ac3-c1"
		).put(
			"southamerica-east1", "southamerica-east1-ac1-c1"
		).put(
			"us-west1", "us-west1-ac4-c1"
		).build();

	@Autowired
	private AnalyticsCloudService _analyticsCloudService;

	@Autowired
	private CommerceOrderService _commerceOrderService;

	@Autowired
	private KeyedLock _keyedLock;

}
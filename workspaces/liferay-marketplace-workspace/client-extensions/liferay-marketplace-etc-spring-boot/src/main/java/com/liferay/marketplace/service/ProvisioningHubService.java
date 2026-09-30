/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.marketplace.service;

import com.liferay.client.extension.util.spring.boot3.client.LiferayOAuth2AccessTokenManager;
import com.liferay.client.extension.util.spring.boot3.service.BaseService;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.marketplace.constants.MarketplaceConstants;
import com.liferay.marketplace.util.MarketplaceUtil;
import com.liferay.osb.koroneiki.phloem.rest.client.dto.v1_0.Account;
import com.liferay.osb.koroneiki.phloem.rest.client.dto.v1_0.Contact;
import com.liferay.osb.koroneiki.phloem.rest.client.dto.v1_0.ContactRole;
import com.liferay.osb.koroneiki.phloem.rest.client.dto.v1_0.Product;
import com.liferay.osb.koroneiki.phloem.rest.client.dto.v1_0.ProductPurchase;
import com.liferay.osb.koroneiki.phloem.rest.client.pagination.Page;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.ArrayUtil;
import com.liferay.portal.kernel.util.HashMapBuilder;
import com.liferay.portal.kernel.util.Validator;

import java.net.URL;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * @author Caleb Hall
 */
@Component
public class ProvisioningHubService extends BaseService {

	public void provision(
			Account koroneikiAccount, Order order,
			ProductPurchase productPurchase)
		throws Exception {

		Product product = productPurchase.getProduct();

		String productName = product.getName();

		if (productName.contains("LR Tokens")) {
			_creditAIHubTokens(order, productPurchase);

			return;
		}

		String orderTypeExternalReferenceCode =
			order.getOrderTypeExternalReferenceCode();

		if (Objects.equals(orderTypeExternalReferenceCode, "CMP")) {
			_provisionCMP(order, productPurchase);

			return;
		}

		if (Objects.equals(orderTypeExternalReferenceCode, "DSR")) {
			_provisionDSR(koroneikiAccount, order, productPurchase);

			return;
		}

		if (Objects.equals(orderTypeExternalReferenceCode, "SEO_STUDIO")) {
			_provisionSEOStudio(koroneikiAccount, order);

			return;
		}

		if (productName.startsWith("AI Hub")) {
			_provisionAiHUB(koroneikiAccount, order, productPurchase);

			return;
		}

		if (Objects.equals(productName, "Liferay Data Platform") ||
			Objects.equals(
				productName, "Liferay Data Platform (Private Beta)")) {

			_provisionLDP(koroneikiAccount, order);
		}
	}

	private void _creditAIHubTokens(
			Order order, ProductPurchase productPurchase)
		throws Exception {

		Integer size = productPurchase.getQuantity();

		if ((size == null) || (size <= 0)) {
			_log.error(
				StringBundler.concat(
					"Unable to credit AI Hub tokens for product purchase ",
					productPurchase.getKey(), " because its quantity ", size,
					" is not a positive number of tokens"));

			return;
		}

		JSONObject orderMetadataJSONObject =
			MarketplaceUtil.getOrderMetadataJSONObject(order);

		JSONArray aiHubTokenCreditsJSONArray =
			orderMetadataJSONObject.optJSONArray(_AI_HUB_TOKEN_CREDITS);

		if (aiHubTokenCreditsJSONArray == null) {
			aiHubTokenCreditsJSONArray = new JSONArray();
		}

		for (int i = 0; i < aiHubTokenCreditsJSONArray.length(); i++) {
			JSONObject aiHubTokenCreditJSONObject =
				aiHubTokenCreditsJSONArray.getJSONObject(i);

			if (Objects.equals(
					aiHubTokenCreditJSONObject.getString("productPurchaseKey"),
					productPurchase.getKey())) {

				if (_log.isInfoEnabled()) {
					_log.info(
						StringBundler.concat(
							"Skipping AI Hub tokens for product purchase ",
							productPurchase.getKey(),
							" because they were already credited to order ",
							order.getId()));
				}

				return;
			}
		}

		String aiHubApplicationExternalReferenceCode =
			"AI-HUB-" + order.getAccountExternalReferenceCode();

		JSONObject aiHubApplicationJSONObject = null;

		try {
			aiHubApplicationJSONObject =
				_marketplaceService.getAIHubApplicationJSONObject(
					aiHubApplicationExternalReferenceCode);
		}
		catch (Exception exception) {
			if (_log.isDebugEnabled()) {
				_log.debug(exception);
			}
		}

		if ((aiHubApplicationJSONObject == null) ||
			!aiHubApplicationJSONObject.has("accountEntryId")) {

			throw new Exception(
				StringBundler.concat(
					"Unable to credit AI Hub tokens for product purchase ",
					productPurchase.getKey(), ", AI Hub application ",
					aiHubApplicationExternalReferenceCode, " was not found"));
		}

		_aiHubService.purchaseQuotaPrepaidBlock(
			aiHubApplicationJSONObject.getInt("accountEntryId"),
			new JSONObject(
			).put(
				"size", size
			).put(
				"transactionId", order.getId()
			));

		_marketplaceService.updateOrderCustomFields(
			HashMapBuilder.put(
				"order-metadata",
				orderMetadataJSONObject.put(
					_AI_HUB_TOKEN_CREDITS,
					aiHubTokenCreditsJSONArray.put(
						new JSONObject(
						).put(
							"productPurchaseKey", productPurchase.getKey()
						).put(
							"size", size
						))
				).toString()
			).build(),
			order.getId());

		if (Objects.equals(
				order.getOrderTypeExternalReferenceCode(), "AI_HUB_TOKEN") &&
			!Objects.equals(
				order.getOrderStatus(),
				MarketplaceConstants.ORDER_STATUS_COMPLETED)) {

			_marketplaceService.completeOrder(
				order.getId(), order.getPaymentStatus());
		}
	}

	private Contact _getContact(String key, String... contactRoleNames)
		throws Exception {

		List<Contact> contacts = _getContacts(key, contactRoleNames);

		if (contacts.isEmpty()) {
			return null;
		}

		return contacts.get(0);
	}

	private String _getContactEmailAddress(
			String accountKey, String defaultEmailAddress)
		throws Exception {

		Contact contact = _getContact(
			accountKey, _CONTACT_ROLE_NAME_AI_HUB_ADMINISTRATOR,
			"DSR Administrator", "LDP Administrator");

		if (contact == null) {
			return defaultEmailAddress;
		}

		return contact.getEmailAddress();
	}

	private List<Contact> _getContacts(String key, String... contactRoleNames)
		throws Exception {

		List<Contact> contacts = new ArrayList<>();

		Page<Contact> contactsPage = _koroneikiService.getContactsPage(
			key, null);

		for (Contact contact : contactsPage.getItems()) {
			for (ContactRole contactRole : contact.getContactRoles()) {
				if (ArrayUtil.contains(
						contactRoleNames, contactRole.getName())) {

					contacts.add(contact);

					break;
				}
			}
		}

		return contacts;
	}

	private JSONObject _getDSRAnalyticsProjectJSONObject(
			Account koroneikiAccount)
		throws Exception {

		JSONObject analyticsProjectJSONObject =
			_analyticsService.getCorpProjectUuidJSONObject(
				koroneikiAccount.getKey());

		if (analyticsProjectJSONObject != null) {
			return analyticsProjectJSONObject;
		}

		if (_koroneikiService.hasEntitlement(
				koroneikiAccount,
				MarketplaceConstants.KORONEIKI_AC_ENTITLEMENTS)) {

			if (_log.isInfoEnabled()) {
				_log.info(
					StringBundler.concat(
						"Unable to find an Analytics Cloud project for the ",
						"entitled account ", koroneikiAccount.getKey()));
			}

			return null;
		}

		Map<String, String> properties = koroneikiAccount.getProperties();

		if (Validator.isNull(properties.get("dataCenterLocation")) ||
			Validator.isNull(properties.get("ldpWorkspaceName"))) {

			if (_log.isInfoEnabled()) {
				_log.info(
					StringBundler.concat(
						"Missing properties to provision the DSR workspace ",
						"for account ", koroneikiAccount.getKey(), ": ",
						properties));
			}

			return null;
		}

		String securityContactEmailAddress = properties.get(
			"securityContactEmailAddress");

		JSONArray incidentReportEmailAddressesJSONArray = new JSONArray();

		if (Validator.isNotNull(securityContactEmailAddress)) {
			incidentReportEmailAddressesJSONArray = new JSONArray(
				securityContactEmailAddress.split(","));
		}

		return new JSONObject(
			_analyticsService.provision(
				new JSONObject(
				).put(
					"corpProjectName", koroneikiAccount.getName()
				).put(
					"corpProjectUuid", koroneikiAccount.getKey()
				).put(
					"incidentReportEmailAddresses",
					incidentReportEmailAddressesJSONArray
				).put(
					"name", properties.get("ldpWorkspaceName")
				).put(
					"ownerEmailAddress",
					_getContactEmailAddress(
						koroneikiAccount.getKey(), securityContactEmailAddress)
				).put(
					"serverLocation",
					_getServerLocation(properties.get("dataCenterLocation"))
				)));
	}

	private String _getFriendlyURL(String friendlyURL) {
		if (Validator.isNull(friendlyURL)) {
			return "";
		}

		friendlyURL = friendlyURL.trim(
		).replaceAll(
			"^/+", ""
		);

		if (Validator.isNull(friendlyURL)) {
			return "";
		}

		return "/" + friendlyURL;
	}

	private int _getLDPProvisioningAttempts(Order order) {
		JSONObject orderMetadataJSONObject =
			MarketplaceUtil.getOrderMetadataJSONObject(order);

		return orderMetadataJSONObject.optInt(_LDP_PROVISIONING_ATTEMPTS);
	}

	private String _getServerLocation(String dataCenterLocation) {
		if (Objects.equals(dataCenterLocation, "asia-south1")) {
			return "asia-south1-ac5-c1";
		}

		if (Objects.equals(dataCenterLocation, "europe-west2")) {
			return "europe-west2-ac2-c1";
		}

		if (Objects.equals(dataCenterLocation, "europe-west3")) {
			return "europe-west3-ac3-c1";
		}

		if (Objects.equals(dataCenterLocation, "southamerica-east1")) {
			return "southamerica-east1-ac1-c1";
		}

		if (Objects.equals(dataCenterLocation, "us-west1")) {
			return "us-west1-ac4-c1";
		}

		return "us-west1-s2-c1";
	}

	private String _getTier(Product product) {
		if (product != null) {
			String productName = product.getName();

			if (Validator.isNotNull(productName) &&
				productName.contains("Studio")) {

				return "studio";
			}
		}

		return "activate";
	}

	private JSONArray _getUserAccountsJSONArray(List<Contact> contacts) {
		JSONArray jsonArray = new JSONArray();

		for (Contact contact : contacts) {
			jsonArray.put(
				new JSONObject(
				).put(
					"emailAddress", contact.getEmailAddress()
				).put(
					"firstName", contact.getFirstName()
				).put(
					"lastName", contact.getLastName()
				));
		}

		return jsonArray;
	}

	private void _provisionAiHUB(
			Account koroneikiAccount, Order order,
			ProductPurchase productPurchase)
		throws Exception {

		List<Contact> contacts = _getContacts(
			koroneikiAccount.getKey(), _CONTACT_ROLE_NAME_AI_HUB_ADMINISTRATOR);

		if (contacts.isEmpty()) {
			if (_log.isInfoEnabled()) {
				_log.info("Missing AI Hub Contact " + koroneikiAccount);
			}

			return;
		}

		Map<String, String> properties = koroneikiAccount.getProperties();

		JSONObject aiHubJSONObject = _aiHubService.provision(
			new JSONObject(
			).put(
				"accountEntryExternalReferenceCode",
				MarketplaceUtil.getEntityId(
					koroneikiAccount.getExternalLinks(), "salesforce",
					"project")
			).put(
				"accountEntryName", properties.get("aiHubAccountName")
			).put(
				"tier", _getTier(productPurchase.getProduct())
			).put(
				"userAccounts", _getUserAccountsJSONArray(contacts)
			));

		if (aiHubJSONObject == null) {
			return;
		}

		com.liferay.headless.commerce.admin.order.client.dto.v1_0.Account
			account = order.getAccount();

		_marketplaceService.putAIHubApplication(
			"AI-HUB-" + order.getAccountExternalReferenceCode(),
			new JSONObject(
			).put(
				"accountEntryId", aiHubJSONObject.getInt("accountEntryId")
			).put(
				"accountName", properties.get("aiHubAccountName")
			).put(
				"administratorEmailAddress",
				contacts.get(
					0
				).getEmailAddress()
			).put(
				"r_accountToAIHubApplication_accountEntryERC",
				account.getExternalReferenceCode()
			).put(
				"r_orderToAIHubApplication_commerceOrderERC",
				order.getExternalReferenceCode()
			));

		_marketplaceService.completeOrder(
			HashMapBuilder.put(
				"order-metadata",
				MarketplaceUtil.getOrderMetadataJSONObject(
					order
				).put(
					"aiHub", aiHubJSONObject
				).put(
					"salesforceProjectId",
					MarketplaceUtil.getEntityId(
						koroneikiAccount.getExternalLinks(), "salesforce",
						"project")
				).toString()
			).build(),
			order.getId(), order.getPaymentStatus());
	}

	private void _provisionCMP(Order order, ProductPurchase productPurchase)
		throws Exception {

		_koroneikiService.linkProductPurchaseToOrder(
			order.getId(), productPurchase.getKey());

		_marketplaceService.completeOrder(
			order.getId(),
			MarketplaceConstants.ORDER_PAYMENT_STATUS_NOT_REQUIRED);
	}

	private void _provisionDSR(
			Account koroneikiAccount, Order order,
			ProductPurchase productPurchase)
		throws Exception {

		_koroneikiService.linkProductPurchaseToOrder(
			order.getId(), productPurchase.getKey());

		JSONObject analyticsProjectJSONObject =
			_getDSRAnalyticsProjectJSONObject(koroneikiAccount);

		if (analyticsProjectJSONObject == null) {
			_marketplaceService.completeOrder(
				order.getId(),
				MarketplaceConstants.ORDER_PAYMENT_STATUS_NOT_REQUIRED);

			return;
		}

		_marketplaceService.completeOrder(
			HashMapBuilder.put(
				"order-metadata",
				MarketplaceUtil.getOrderMetadataJSONObject(
					order
				).put(
					"analyticsProject", analyticsProjectJSONObject
				).toString()
			).build(),
			order.getId(),
			MarketplaceConstants.ORDER_PAYMENT_STATUS_NOT_REQUIRED);
	}

	private void _provisionLDP(Account koroneikiAccount, Order order)
		throws Exception {

		Map<String, String> properties = koroneikiAccount.getProperties();

		if (Validator.isNull(properties.get("dataCenterLocation")) ||
			Validator.isNull(properties.get("ldpWorkspaceName"))) {

			if (_log.isInfoEnabled()) {
				_log.info(
					StringBundler.concat(
						"Missing properties to provision LDP for account ",
						koroneikiAccount.getKey(), ": ", properties));
			}

			return;
		}

		JSONObject analyticsProjectJSONObject =
			_analyticsService.getCorpProjectUuidJSONObject(
				koroneikiAccount.getKey());

		if (analyticsProjectJSONObject == null) {
			int ldpProvisioningAttempts = _getLDPProvisioningAttempts(order);

			if (ldpProvisioningAttempts >= _LDP_PROVISIONING_MAX_ATTEMPTS) {
				_log.error(
					StringBundler.concat(
						"Unable to provision LDP for account ",
						koroneikiAccount.getKey(), " after ",
						ldpProvisioningAttempts, " attempts"));

				return;
			}

			_updateLDPProvisioningAttempts(ldpProvisioningAttempts + 1, order);

			String securityContactEmailAddress = properties.get(
				"securityContactEmailAddress");

			JSONArray incidentReportEmailAddressesJSONArray = new JSONArray();

			if (Validator.isNotNull(securityContactEmailAddress)) {
				incidentReportEmailAddressesJSONArray = new JSONArray(
					securityContactEmailAddress.split(","));
			}

			analyticsProjectJSONObject = new JSONObject(
				_analyticsService.provision(
					new JSONObject(
					).put(
						"corpProjectName", koroneikiAccount.getName()
					).put(
						"corpProjectUuid", koroneikiAccount.getKey()
					).put(
						"friendlyURL",
						_getFriendlyURL(properties.get("friendlyWorkspaceURL"))
					).put(
						"incidentReportEmailAddresses",
						incidentReportEmailAddressesJSONArray
					).put(
						"name", properties.get("ldpWorkspaceName")
					).put(
						"ownerEmailAddress",
						_getContactEmailAddress(
							koroneikiAccount.getKey(),
							securityContactEmailAddress)
					).put(
						"serverLocation",
						_getServerLocation(properties.get("dataCenterLocation"))
					)));
		}
		else if (_log.isInfoEnabled()) {
			_log.info(
				StringBundler.concat(
					"Reusing the Analytics Cloud project already provisioned ",
					"for account ", koroneikiAccount.getKey()));
		}

		_marketplaceService.completeOrder(
			HashMapBuilder.put(
				"order-metadata",
				MarketplaceUtil.getOrderMetadataJSONObject(
					order
				).put(
					"analyticsProject", analyticsProjectJSONObject
				).toString()
			).build(),
			order.getId(), order.getPaymentStatus());
	}

	private void _provisionSEOStudio(Account koroneikiAccount, Order order)
		throws Exception {

		List<Contact> contacts = _getContacts(
			koroneikiAccount.getKey(), _CONTACT_ROLE_NAME_AI_HUB_ADMINISTRATOR);

		if (contacts.isEmpty()) {
			if (_log.isInfoEnabled()) {
				_log.info("Missing AI Hub Contact " + koroneikiAccount);
			}

			return;
		}

		Map<String, String> properties = koroneikiAccount.getProperties();

		JSONObject aiHubJSONObject = _aiHubService.provision(
			new JSONObject(
			).put(
				"accountEntryExternalReferenceCode",
				MarketplaceUtil.getEntityId(
					koroneikiAccount.getExternalLinks(), "salesforce",
					"project")
			).put(
				"accountEntryName", properties.get("aiHubAccountName")
			).put(
				"addOns",
				new JSONArray(
				).put(
					"SEOStudio"
				)
			).put(
				"tier", properties.get("aiHubTier")
			).put(
				"userAccounts", _getUserAccountsJSONArray(contacts)
			));

		if (aiHubJSONObject == null) {
			return;
		}

		_marketplaceService.completeOrder(
			HashMapBuilder.put(
				"order-metadata",
				MarketplaceUtil.getOrderMetadataJSONObject(
					order
				).put(
					"seoStudio", aiHubJSONObject
				).toString()
			).build(),
			order.getId(), order.getPaymentStatus());
	}

	private void _updateLDPProvisioningAttempts(
			int ldpProvisioningAttempts, Order order)
		throws Exception {

		_marketplaceService.updateOrderCustomFields(
			HashMapBuilder.put(
				"order-metadata",
				MarketplaceUtil.getOrderMetadataJSONObject(
					order
				).put(
					_LDP_PROVISIONING_ATTEMPTS, ldpProvisioningAttempts
				).toString()
			).build(),
			order.getId());
	}

	private static final String _AI_HUB_TOKEN_CREDITS = "aiHubTokenCredits";

	private static final String _CONTACT_ROLE_NAME_AI_HUB_ADMINISTRATOR =
		"AI Hub Administrator";

	private static final String _LDP_PROVISIONING_ATTEMPTS =
		"ldpProvisioningAttempts";

	private static final int _LDP_PROVISIONING_MAX_ATTEMPTS = 3;

	private static final Log _log = LogFactory.getLog(
		ProvisioningHubService.class);

	@Autowired
	private AIHubService _aiHubService;

	@Autowired
	private AnalyticsService _analyticsService;

	@Value("${external.ai.hub.oauth2.headless.server.home.page.url}")
	private URL _externalAIHubHomePageURL;

	@Autowired
	private KoroneikiService _koroneikiService;

	@Autowired
	private LiferayOAuth2AccessTokenManager _liferayOAuth2AccessTokenManager;

	@Autowired
	private MarketplaceService _marketplaceService;

}
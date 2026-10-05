/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.google.auth.oauth2.AccessToken;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.IdTokenCredentials;
import com.google.auth.oauth2.IdTokenProvider;
import com.google.auth.oauth2.ImpersonatedCredentials;

import com.liferay.client.extension.util.spring.boot3.service.BaseService;
import com.liferay.headless.admin.address.client.dto.v1_0.Country;
import com.liferay.headless.admin.address.client.dto.v1_0.Region;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Account;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.BillingAddress;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.OrderItem;
import com.liferay.one.util.CommerceOrderUtil;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.Validator;

import java.io.ByteArrayInputStream;
import java.io.InputStream;

import java.nio.charset.StandardCharsets;

import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Objects;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * @author Keven Leone
 */
@Component
public class SalesforceService extends BaseService {

	public JSONObject postSalesforceOpportunity(
			Country country, String licenseType, Order order,
			UserAccount userAccount)
		throws Exception {

		JSONObject salesforceOpportunityJSONObject =
			_getSalesforceOpportunityJSONObject(
				country, licenseType, order, userAccount);

		try {
			String response = post(
				_getAuthorization(), salesforceOpportunityJSONObject.toString(),
				UriComponentsBuilder.fromUriString(
					_gcfBaseUrl
				).path(
					"/marketplace-api/v1/opportunities"
				).build(
				).toUri());

			if (_log.isInfoEnabled()) {
				_log.info(
					"Created Salesforce opportunity " +
						salesforceOpportunityJSONObject);
			}

			return new JSONObject(response);
		}
		catch (WebClientResponseException webClientResponseException) {
			_log.error(
				StringBundler.concat(
					"Unable to create Salesforce opportunity ",
					salesforceOpportunityJSONObject, ":\n",
					webClientResponseException.getResponseBodyAsString()));

			return null;
		}
	}

	protected JSONArray getLineItemsJSONArray(String licenseType, Order order) {
		JSONArray jsonArray = new JSONArray();

		for (OrderItem orderItem : order.getOrderItems()) {
			JSONObject jsonObject = new JSONObject();

			if (!Objects.equals(
					order.getOrderTypeExternalReferenceCode(),
					"AI_HUB_TOKEN")) {

				jsonObject.put(
					"endDate",
					_format(
						CommerceOrderUtil.getOrderPurchaseEndDate(
							licenseType,
							CommerceOrderUtil.getSkuOptionValue(
								"license-usage-type", orderItem.getOptions())))
				).put(
					"startDate", _format(order.getCreateDate())
				);
			}

			jsonArray.put(
				jsonObject.put(
					"orderType", "New"
				).put(
					"productId", orderItem.getSkuExternalReferenceCode()
				).put(
					"quantity", orderItem.getQuantity()
				).put(
					"unitPrice", orderItem.getUnitPrice()
				));
		}

		return jsonArray;
	}

	private String _format(Date date) {
		if (date == null) {
			return null;
		}

		return date.toInstant(
		).atZone(
			ZoneOffset.UTC
		).toLocalDate(
		).format(
			DateTimeFormatter.ISO_LOCAL_DATE
		);
	}

	private String _getAccountId(Order order) {
		Account account = order.getAccount();

		return account.getExternalReferenceCode();
	}

	private String _getAuthorization() throws Exception {
		IdTokenCredentials idTokenCredentials = _getIdTokenCredentials();

		idTokenCredentials.refreshIfExpired();

		AccessToken accessToken = idTokenCredentials.getAccessToken();

		if (accessToken == null) {
			throw new Exception(
				"Unable to get access token for audience " + _gcfAudience);
		}

		return "Bearer " + accessToken.getTokenValue();
	}

	private JSONObject _getBillingAddressJSONObject(
		Country country, Order order) {

		BillingAddress billingAddress = order.getBillingAddress();

		return new JSONObject(
		).put(
			"addressName", billingAddress.getName()
		).put(
			"city", billingAddress.getCity()
		).put(
			"country",
			CommerceOrderUtil.getDefaultLocale(country.getTitle_i18n())
		).put(
			"postalCode", billingAddress.getZip()
		).put(
			"state", _getState(country, order)
		).put(
			"street",
			billingAddress.getStreet1() + " " + billingAddress.getStreet2()
		);
	}

	private GoogleCredentials _getGoogleCredentials() throws Exception {
		GoogleCredentials googleCredentials = _googleCredentials;

		if (googleCredentials == null) {
			googleCredentials = GoogleCredentials.getApplicationDefault();

			_googleCredentials = googleCredentials;
		}

		return googleCredentials;
	}

	private IdTokenCredentials _getIdTokenCredentials() throws Exception {
		IdTokenCredentials idTokenCredentials = _idTokenCredentials;

		if (idTokenCredentials == null) {
			idTokenCredentials = IdTokenCredentials.newBuilder(
			).setIdTokenProvider(
				_getIdTokenProvider()
			).setTargetAudience(
				_gcfAudience
			).build();

			_idTokenCredentials = idTokenCredentials;
		}

		return idTokenCredentials;
	}

	private IdTokenProvider _getIdTokenProvider() throws Exception {
		if (Validator.isNotNull(_gcfServiceAccount)) {
			return ImpersonatedCredentials.create(
				_getGoogleCredentials(), _gcfServiceAccount, null, _scopes,
				3600);
		}

		if (Validator.isNotNull(_gcfServiceAccountKey)) {
			try (InputStream inputStream = new ByteArrayInputStream(
					_gcfServiceAccountKey.getBytes(StandardCharsets.UTF_8))) {

				return (IdTokenProvider)GoogleCredentials.fromStream(
					inputStream);
			}
		}

		return (IdTokenProvider)_getGoogleCredentials();
	}

	private String _getPaymentMethodType(Order order) {
		if (Objects.equals(order.getPaymentMethod(), "money-order")) {
			return "Offline";
		}

		return "Online";
	}

	private String _getPrimaryContactEmailAddress(Order order) {
		JSONObject orderMetadataJSONObject =
			CommerceOrderUtil.getOrderMetadataJSONObject(order);

		if (Objects.equals(
				order.getOrderTypeExternalReferenceCode(), "AI_HUB")) {

			JSONObject aiHubFormJSONObject =
				orderMetadataJSONObject.optJSONObject(
					"aiHubForm", new JSONObject());

			return aiHubFormJSONObject.optString(
				"administratorEmailAddress", order.getCreatorEmailAddress());
		}

		JSONObject provisioningFormJSONObject =
			orderMetadataJSONObject.optJSONObject(
				"provisioningForm", new JSONObject());

		return provisioningFormJSONObject.optString(
			"ownerEmailAddress", order.getCreatorEmailAddress());
	}

	private JSONObject _getPrimaryContactJSONObject(
		Order order, UserAccount userAccount) {

		return new JSONObject(
		).put(
			"email", _getPrimaryContactEmailAddress(order)
		).put(
			"firstName", userAccount.getGivenName()
		).put(
			"lastName", userAccount.getFamilyName()
		).put(
			"role", "Opportunity Owner"
		);
	}

	private JSONObject _getProjectJSONObject(
		Order order, UserAccount userAccount) {

		JSONObject orderMetadataJSONObject =
			CommerceOrderUtil.getOrderMetadataJSONObject(order);

		JSONObject projectJSONObject = new JSONObject(
		).put(
			"projectId",
			orderMetadataJSONObject.getString("salesforceProjectId")
		);

		String salesforceContractId = orderMetadataJSONObject.optString(
			"salesforceContractId");

		if (Validator.isNotNull(salesforceContractId)) {
			projectJSONObject.put("contractId", salesforceContractId);
		}

		if (Objects.equals(
				order.getOrderTypeExternalReferenceCode(), "AI_HUB")) {

			JSONObject aiHubFormJSONObject =
				orderMetadataJSONObject.getJSONObject("aiHubForm");

			return projectJSONObject.put(
				"aiHubAccountName",
				aiHubFormJSONObject.optString("aiHubAccountName")
			).put(
				"projectContacts",
				new JSONArray(
				).put(
					_getPrimaryContactJSONObject(
						order, userAccount
					).put(
						"role", "AI Hub Administrator"
					)
				)
			);
		}

		if (Objects.equals(
				order.getOrderTypeExternalReferenceCode(), "AI_HUB_TOKEN")) {

			return projectJSONObject.put("projectContacts", new JSONArray());
		}

		JSONObject provisioningFormJSONObject =
			orderMetadataJSONObject.optJSONObject("provisioningForm");

		if (provisioningFormJSONObject == null) {
			return projectJSONObject;
		}

		return projectJSONObject.put(
			"allowedEmailDomains",
			provisioningFormJSONObject.optString("allowedEmailDomains")
		).put(
			"dataCenterLocation",
			provisioningFormJSONObject.optString("dataCenterLocation")
		).put(
			"friendlyWorkspaceURL",
			provisioningFormJSONObject.optString("friendlyWorkspaceURL")
		).put(
			"projectContacts",
			new JSONArray(
			).put(
				_getPrimaryContactJSONObject(
					order, userAccount
				).put(
					"role", "LDP Administrator"
				)
			)
		).put(
			"securityContactEmailAddress", order.getCreatorEmailAddress()
		).put(
			"workspaceName",
			provisioningFormJSONObject.optString("workspaceName")
		);
	}

	private JSONObject _getSalesforceOpportunityJSONObject(
		Country country, String licenseType, Order order,
		UserAccount userAccount) {

		return new JSONObject(
		).put(
			"accountId", _getAccountId(order)
		).put(
			"billingAddress", _getBillingAddressJSONObject(country, order)
		).put(
			"closeDate", _format(order.getCreateDate())
		).put(
			"lineItems", getLineItemsJSONArray(licenseType, order)
		).put(
			"marketplaceDealId", order.getId()
		).put(
			"opportunityCurrency", order.getCurrencyCode()
		).put(
			"opportunityOwner", "Marketplace Integration"
		).put(
			"paymentMethodType", _getPaymentMethodType(order)
		).put(
			"primaryContact", _getPrimaryContactJSONObject(order, userAccount)
		).put(
			"project", _getProjectJSONObject(order, userAccount)
		).put(
			"termType", "Single Year"
		).put(
			"typeOfBusiness", "Existing Business"
		);
	}

	private String _getState(Country country, Order order) {
		BillingAddress billingAddress = order.getBillingAddress();

		for (Region region : country.getRegions()) {
			if (Objects.equals(
					billingAddress.getRegionISOCode(),
					region.getRegionCode())) {

				return CommerceOrderUtil.getDefaultLocale(
					region.getTitle_i18n());
			}
		}

		return null;
	}

	private static final Log _log = LogFactory.getLog(SalesforceService.class);

	private static final List<String> _scopes = Collections.singletonList(
		"https://www.googleapis.com/auth/cloud-platform");

	@Value("${liferay.one.salesforce.gcf.audience}")
	private String _gcfAudience;

	@Value("${liferay.one.salesforce.gcf.base.url}")
	private String _gcfBaseUrl;

	@Value("${liferay.one.salesforce.gcf.service.account:}")
	private String _gcfServiceAccount;

	@Value("${liferay.one.salesforce.gcf.service.account.key:}")
	private String _gcfServiceAccountKey;

	private volatile GoogleCredentials _googleCredentials;
	private volatile IdTokenCredentials _idTokenCredentials;

}
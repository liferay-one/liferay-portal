/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.admin.user.client.dto.v1_0.AccountContactInformation;
import com.liferay.headless.admin.user.client.dto.v1_0.PostalAddress;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Currency;
import com.liferay.headless.commerce.admin.channel.client.dto.v1_0.Channel;
import com.liferay.one.constants.CommerceCurrencyConstants;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.ArrayUtil;
import com.liferay.portal.kernel.util.HashMapBuilder;
import com.liferay.portal.kernel.util.Validator;

import java.util.List;
import java.util.Map;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * @author Felipe Franca
 */
@Component
public class CommerceAccountCurrencyService extends OneBaseService {

	public void assignDefaultCurrency(Account account) throws Exception {
		String countryName = null;

		Long defaultBillingAddressId = account.getDefaultBillingAddressId();

		if ((defaultBillingAddressId != null) &&
			(defaultBillingAddressId > 0)) {

			PostalAddress postalAddress =
				_postalAddressService.getPostalAddress(defaultBillingAddressId);

			countryName = postalAddress.getAddressCountry();
		}

		if (Validator.isNull(countryName)) {
			AccountContactInformation accountContactInformation =
				account.getAccountContactInformation();

			if (accountContactInformation != null) {
				PostalAddress[] postalAddresses =
					accountContactInformation.getPostalAddresses();

				if (ArrayUtil.isNotEmpty(postalAddresses)) {
					PostalAddress billingPostalAddress = null;

					for (PostalAddress postalAddress : postalAddresses) {
						String addressType = postalAddress.getAddressType();

						if ((addressType != null) &&
							addressType.toLowerCase(
							).contains(
								"billing"
							)) {

							billingPostalAddress = postalAddress;

							break;
						}
					}

					if (billingPostalAddress == null) {
						billingPostalAddress = postalAddresses[0];
					}

					if (billingPostalAddress != null) {
						countryName = billingPostalAddress.getAddressCountry();
					}
				}
			}
		}

		if (Validator.isNotNull(countryName)) {
			assignDefaultCurrency(account, countryName);
		}
	}

	public void assignDefaultCurrency(Account account, String countryName)
		throws Exception {

		if (Validator.isNull(countryName)) {
			return;
		}

		JSONObject accountChannelCurrencyJSONObject =
			_fetchAccountChannelCurrencyJSONObject(
				account.getExternalReferenceCode());

		if (accountChannelCurrencyJSONObject != null) {
			return;
		}

		String currencyIsoCode = getCurrencyForCountry(countryName);

		if (Validator.isNull(currencyIsoCode)) {
			if (_log.isWarnEnabled()) {
				_log.warn(
					"No country-to-currency mapping found for country: " +
						countryName);
			}

			return;
		}

		upsertAccountCurrency(
			account.getExternalReferenceCode(), currencyIsoCode);
	}

	public String getCurrencyForCountry(String countryName) {
		if (Validator.isNull(countryName)) {
			return null;
		}

		return _countryToCurrencyMap.get(countryName);
	}

	public void upsertAccountCurrency(
			String accountExternalReferenceCode, String currencyIsoCode)
		throws Exception {

		if (Validator.isNull(accountExternalReferenceCode) ||
			Validator.isNull(currencyIsoCode)) {

			return;
		}

		if (!ArrayUtil.contains(
				CommerceCurrencyConstants.CODES_SUPPORTED_CURRENCIES,
				currencyIsoCode)) {

			if (_log.isWarnEnabled()) {
				_log.warn(
					StringBundler.concat(
						"Unable to set unsupported currency ", currencyIsoCode,
						" for account ", accountExternalReferenceCode));
			}

			return;
		}

		Currency currency = _commerceCurrencyService.fetchCurrency(
			currencyIsoCode);

		if ((currency == null) || !Boolean.TRUE.equals(currency.getActive())) {
			if (_log.isWarnEnabled()) {
				_log.warn("Unable to find active currency " + currencyIsoCode);
			}

			return;
		}

		_upsertAccountChannelCurrency(
			accountExternalReferenceCode, currency.getId());
	}

	private JSONObject _fetchAccountChannelCurrencyJSONObject(
			String accountExternalReferenceCode)
		throws Exception {

		Channel channel = _commerceChannelService.fetchChannel(
			_commerceChannelExternalReferenceCode);

		List<JSONObject> accountChannelEntryJSONObjects = getAllItems(
			_getAccountChannelCurrenciesPath(accountExternalReferenceCode),
			null, jsonObject -> jsonObject);

		for (JSONObject accountChannelEntryJSONObject :
				accountChannelEntryJSONObjects) {

			if (accountChannelEntryJSONObject.optLong("channelId") ==
					channel.getId()) {

				return accountChannelEntryJSONObject;
			}
		}

		return null;
	}

	private String _getAccountChannelCurrenciesPath(
		String accountExternalReferenceCode) {

		return UriComponentsBuilder.fromPath(
			StringBundler.concat(
				"/o/headless-commerce-admin-account/v1.0/accounts",
				"/by-externalReferenceCode/{externalReferenceCode}",
				"/account-channel-currencies")
		).buildAndExpand(
			accountExternalReferenceCode
		).toUriString();
	}

	private void _upsertAccountChannelCurrency(
			String accountExternalReferenceCode, long currencyId)
		throws Exception {

		JSONObject accountChannelEntryJSONObject =
			_fetchAccountChannelCurrencyJSONObject(
				accountExternalReferenceCode);

		if (accountChannelEntryJSONObject != null) {
			if (accountChannelEntryJSONObject.optLong("classPK") ==
					currencyId) {

				return;
			}

			patch(
				getAuthorization(),
				new JSONObject(
				).put(
					"classPK", currencyId
				).toString(),
				UriComponentsBuilder.fromPath(
					"/o/headless-commerce-admin-account/v1.0" +
						"/account-channel-currencies/{id}"
				).buildAndExpand(
					accountChannelEntryJSONObject.getLong("id")
				).toUri());

			return;
		}

		try {
			post(
				getAuthorization(),
				new JSONObject(
				).put(
					"channelExternalReferenceCode",
					_commerceChannelExternalReferenceCode
				).put(
					"classPK", currencyId
				).toString(),
				UriComponentsBuilder.fromPath(
					_getAccountChannelCurrenciesPath(
						accountExternalReferenceCode)
				).build(
				).toUri());
		}
		catch (WebClientResponseException webClientResponseException) {
			HttpStatusCode httpStatusCode =
				webClientResponseException.getStatusCode();

			if (httpStatusCode.isSameCodeAs(HttpStatus.CONFLICT)) {
				_commerceChannelService.evictChannel(
					_commerceChannelExternalReferenceCode);
			}

			throw webClientResponseException;
		}
	}

	private static final Log _log = LogFactory.getLog(
		CommerceAccountCurrencyService.class);

	private static final Map<String, String> _countryToCurrencyMap =
		HashMapBuilder.put(
			"Algeria", "USD"
		).put(
			"Andorra", "EUR"
		).put(
			"Angola", "USD"
		).put(
			"Argentina", "USD"
		).put(
			"Australia", "AUD"
		).put(
			"Austria", "EUR"
		).put(
			"Bahrain", "USD"
		).put(
			"Bangladesh", "INR"
		).put(
			"Belarus", "EUR"
		).put(
			"Belgium", "EUR"
		).put(
			"Bermuda", "USD"
		).put(
			"Brazil", "USD"
		).put(
			"Bulgaria", "EUR"
		).put(
			"Cambodia", "USD"
		).put(
			"Cameroon", "USD"
		).put(
			"Canada", "USD"
		).put(
			"Cayman Islands", "USD"
		).put(
			"Chile", "USD"
		).put(
			"China", "USD"
		).put(
			"Colombia", "USD"
		).put(
			"Costa Rica", "USD"
		).put(
			"Croatia", "EUR"
		).put(
			"Cyprus", "EUR"
		).put(
			"Czech Republic", "EUR"
		).put(
			"Ecuador", "USD"
		).put(
			"Egypt", "USD"
		).put(
			"El Salvador", "USD"
		).put(
			"Estonia", "EUR"
		).put(
			"Ethiopia", "USD"
		).put(
			"Finland", "EUR"
		).put(
			"France", "EUR"
		).put(
			"French Polynesia", "EUR"
		).put(
			"Germany", "EUR"
		).put(
			"Greece", "EUR"
		).put(
			"Guatemala", "EUR"
		).put(
			"Hong Kong", "USD"
		).put(
			"Hungary", "EUR"
		).put(
			"India", "INR"
		).put(
			"Indonesia", "USD"
		).put(
			"Ireland", "EUR"
		).put(
			"Israel", "USD"
		).put(
			"Italy", "EUR"
		).put(
			"Ivory Coast", "USD"
		).put(
			"Jamaica", "USD"
		).put(
			"Japan", "JPY"
		).put(
			"Kenya", "USD"
		).put(
			"Kuwait", "USD"
		).put(
			"Libyan Arab Jamahiriya", "USD"
		).put(
			"Luxembourg", "EUR"
		).put(
			"Malaysia", "USD"
		).put(
			"Mexico", "USD"
		).put(
			"Morocco", "USD"
		).put(
			"Netherlands", "EUR"
		).put(
			"New Zealand", "AUD"
		).put(
			"Norway", "EUR"
		).put(
			"Oman", "USD"
		).put(
			"Panama", "USD"
		).put(
			"Paraguay", "USD"
		).put(
			"Peru", "USD"
		).put(
			"Poland", "EUR"
		).put(
			"Portugal", "EUR"
		).put(
			"Qatar", "USD"
		).put(
			"Romania", "EUR"
		).put(
			"Saudi Arabia", "USD"
		).put(
			"Singapore", "USD"
		).put(
			"Slovenia", "EUR"
		).put(
			"South Africa", "USD"
		).put(
			"Spain", "EUR"
		).put(
			"Sweden", "EUR"
		).put(
			"Switzerland", "EUR"
		).put(
			"Taiwan ROC", "EUR"
		).put(
			"Thailand", "USD"
		).put(
			"Togo", "USD"
		).put(
			"Trinidad and Tobago", "USD"
		).put(
			"United Arab Emirates", "USD"
		).put(
			"United Kingdom", "GBP"
		).put(
			"United States", "USD"
		).put(
			"Uruguay", "USD"
		).put(
			"Vietnam", "USD"
		).build();

	@Value("${liferay.one.commerce.channel.external.reference.code}")
	private String _commerceChannelExternalReferenceCode;

	@Autowired
	private CommerceChannelService _commerceChannelService;

	@Autowired
	private CommerceCurrencyService _commerceCurrencyService;

	@Autowired
	private PostalAddressService _postalAddressService;

}
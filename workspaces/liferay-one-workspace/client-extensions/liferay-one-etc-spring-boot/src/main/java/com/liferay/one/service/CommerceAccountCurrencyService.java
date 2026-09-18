/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Currency;
import com.liferay.headless.commerce.admin.channel.client.dto.v1_0.Channel;
import com.liferay.one.constants.CommerceCurrencyConstants;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.ArrayUtil;
import com.liferay.portal.kernel.util.Validator;

import java.util.List;

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

	private void _upsertAccountChannelCurrency(
			String accountExternalReferenceCode, long currencyId)
		throws Exception {

		String path = UriComponentsBuilder.fromPath(
			StringBundler.concat(
				"/o/headless-commerce-admin-account/v1.0/accounts",
				"/by-externalReferenceCode/{externalReferenceCode}",
				"/account-channel-currencies")
		).buildAndExpand(
			accountExternalReferenceCode
		).toUriString();

		Channel channel = _commerceChannelService.fetchChannel(
			_commerceChannelExternalReferenceCode);

		List<JSONObject> accountChannelEntryJSONObjects = getAllItems(
			path, null, jsonObject -> jsonObject);

		for (JSONObject accountChannelEntryJSONObject :
				accountChannelEntryJSONObjects) {

			if (accountChannelEntryJSONObject.optLong("channelId") !=
					channel.getId()) {

				continue;
			}

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
					path
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

	@Value("${liferay.one.commerce.channel.external.reference.code}")
	private String _commerceChannelExternalReferenceCode;

	@Autowired
	private CommerceChannelService _commerceChannelService;

	@Autowired
	private CommerceCurrencyService _commerceCurrencyService;

}
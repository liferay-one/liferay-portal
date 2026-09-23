/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.admin.user.client.dto.v1_0.PostalAddress;
import com.liferay.one.service.AccountService;
import com.liferay.one.service.CommerceAccountCurrencyService;
import com.liferay.one.service.PostalAddressService;
import com.liferay.portal.kernel.util.Validator;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * @author Beatriz Costa
 */
@RequestMapping("/object/action/postal/address/create")
@RestController
public class ObjectActionPostalAddressCreateRestController
	extends OneBaseRestController {

	@PostMapping
	public void post(@RequestBody String json) throws Exception {
		if (_log.isInfoEnabled()) {
			_log.info("Received postal address create action: " + json);
		}

		JSONObject jsonObject = new JSONObject(json);

		long addressId = jsonObject.getLong("classPK");

		long accountId = 0;

		JSONObject modelAddressJSONObject = jsonObject.optJSONObject(
			"modelAddress");

		if (modelAddressJSONObject != null) {
			accountId = modelAddressJSONObject.optLong("classPK");
		}

		if (accountId <= 0) {
			accountId = jsonObject.optLong("accountId");
		}

		if (accountId <= 0) {
			accountId = jsonObject.optLong("parentClassPK");
		}

		if (accountId <= 0) {
			return;
		}

		Account account = _accountService.fetchAccount(accountId);

		if (account == null) {
			return;
		}

		Long defaultBillingAddressId = account.getDefaultBillingAddressId();

		if ((defaultBillingAddressId == null) ||
			(defaultBillingAddressId <= 0)) {

			Account patchAccount = new Account();

			patchAccount.setDefaultBillingAddressId(() -> addressId);

			_accountService.patchAccount(accountId, patchAccount);
		}

		PostalAddress postalAddress = _postalAddressService.getPostalAddress(
			addressId);

		String countryName = postalAddress.getAddressCountry();

		if (Validator.isNotNull(countryName)) {
			_commerceAccountCurrencyService.assignDefaultCurrency(
				account, countryName);
		}
	}

	private static final Log _log = LogFactory.getLog(
		ObjectActionPostalAddressCreateRestController.class);

	@Autowired
	private AccountService _accountService;

	@Autowired
	private CommerceAccountCurrencyService _commerceAccountCurrencyService;

	@Autowired
	private PostalAddressService _postalAddressService;

}
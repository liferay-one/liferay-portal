/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.one.exception.NoSuchActivationKeyException;
import com.liferay.one.model.ActivationKey;
import com.liferay.one.model.LicenseKey;
import com.liferay.petra.string.StringBundler;

import java.text.DateFormat;
import java.text.SimpleDateFormat;

import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.TimeZone;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * @author Pedro Oliveira
 */
@Component
public class ActivationKeyService extends OneBaseService {

	public ActivationKey addActivationKey(
			long accountEntryId, boolean active, Date endDate,
			String projectExternalReferenceCode, Date startDate, String type)
		throws Exception {

		JSONObject jsonObject = new JSONObject(
		).put(
			"active", active
		).put(
			"endDate", _toISO8601(endDate)
		).put(
			"r_accountEntryToActivationKey_accountEntryId", accountEntryId
		).put(
			"r_projectToActivationKey_c_projectERC",
			projectExternalReferenceCode
		).put(
			"startDate", _toISO8601(startDate)
		).put(
			"type", type
		);

		String response = post(
			getAuthorization(), jsonObject.toString(),
			UriComponentsBuilder.fromPath(
				"/o/c/activationkeys"
			).build(
			).toUri());

		return new ActivationKey(new JSONObject(response));
	}

	public ActivationKey fetchActivationKey(String externalReferenceCode)
		throws Exception {

		try {
			String response = get(
				getAuthorization(),
				UriComponentsBuilder.fromPath(
					"/o/c/activationkeys/by-external-reference-code/{erc}"
				).buildAndExpand(
					externalReferenceCode
				).toUri());

			return new ActivationKey(new JSONObject(response));
		}
		catch (WebClientResponseException webClientResponseException) {
			int statusCode = webClientResponseException.getStatusCode(
			).value();

			if (statusCode == HttpStatus.NOT_FOUND.value()) {
				return null;
			}

			throw webClientResponseException;
		}
	}

	public ActivationKey getActivationKey(Jwt jwt, long activationKeyId)
		throws Exception {

		return _getActivationKey(activationKeyId, getAuthorization(jwt));
	}

	public ActivationKey getActivationKey(long activationKeyId)
		throws Exception {

		return _getActivationKey(activationKeyId, getAuthorization());
	}

	public List<ActivationKey> getActivationKeys(String filterString)
		throws Exception {

		return getAllItems(
			"/o/c/activationkeys", filterString, ActivationKey::new);
	}

	public int getActivationKeysCount(
			boolean active, String projectExternalReferenceCode, String type)
		throws Exception {

		String filterString = StringBundler.concat(
			"(active eq ", active,
			") and (r_projectToActivationKey_c_projectERC eq '",
			escapeODataString(projectExternalReferenceCode),
			"') and (type eq '", escapeODataString(type), "')");

		String response = get(
			getAuthorization(),
			UriComponentsBuilder.fromPath(
				"/o/c/activationkeys"
			).queryParam(
				"filter", "{filter}"
			).queryParam(
				"pageSize", 1
			).encode(
			).buildAndExpand(
				Collections.singletonMap("filter", filterString)
			).toUri());

		JSONObject jsonObject = new JSONObject(response);

		return jsonObject.optInt("totalCount");
	}

	public List<ActivationKey> getExpiringActivationKeys(
			Date endDateGT, Date endDateLT, Date startDateLT)
		throws Exception {

		return getActivationKeys(
			StringBundler.concat(
				"(active eq true) and (endDate gt ", _toISO8601(endDateGT),
				") and (endDate lt ", _toISO8601(endDateLT),
				") and (startDate lt ", _toISO8601(startDateLT), ")"));
	}

	public ActivationKey updateActivationKeyActive(
			long activationKeyId, boolean active)
		throws Exception {

		JSONObject jsonObject = new JSONObject(
		).put(
			"active", active
		);

		String response = patch(
			getAuthorization(), jsonObject.toString(),
			UriComponentsBuilder.fromPath(
				"/o/c/activationkeys/{id}"
			).buildAndExpand(
				activationKeyId
			).toUri());

		for (LicenseKey licenseKey :
				_licenseKeyService.getLicenseKeysByActivationKeyId(
					activationKeyId)) {

			_licenseKeyService.updateLicenseKeyActive(
				active, licenseKey.getLicenseKeyId());
		}

		return new ActivationKey(new JSONObject(response));
	}

	private ActivationKey _getActivationKey(
			long activationKeyId, String authorization)
		throws Exception {

		try {
			String response = get(
				authorization,
				UriComponentsBuilder.fromPath(
					"/o/c/activationkeys/{id}"
				).buildAndExpand(
					activationKeyId
				).toUri());

			return new ActivationKey(new JSONObject(response));
		}
		catch (WebClientResponseException webClientResponseException) {
			int statusCode = webClientResponseException.getStatusCode(
			).value();

			if (statusCode == HttpStatus.NOT_FOUND.value()) {
				throw new NoSuchActivationKeyException(
					"No activation key exists with ID " + activationKeyId);
			}

			throw webClientResponseException;
		}
	}

	private String _toISO8601(Date date) {
		if (date == null) {
			return null;
		}

		DateFormat dateFormat = new SimpleDateFormat(
			"yyyy-MM-dd'T'HH:mm:ss'Z'");

		dateFormat.setTimeZone(TimeZone.getTimeZone("UTC"));

		return dateFormat.format(date);
	}

	@Autowired
	@Lazy
	private LicenseKeyService _licenseKeyService;

}
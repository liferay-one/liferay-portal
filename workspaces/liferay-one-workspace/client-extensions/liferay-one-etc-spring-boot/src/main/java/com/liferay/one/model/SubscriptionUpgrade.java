/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.model;

import java.time.Instant;

import java.util.Objects;

import org.json.JSONObject;

/**
 * @author Felipe Veloso
 */
public final class SubscriptionUpgrade {

	public SubscriptionUpgrade(
		Instant contractEndDateInstant, String currentSkuExternalReferenceCode,
		String key, String targetProduct, String targetSkuExternalReferenceCode,
		String type) {

		_contractEndDateInstant = Objects.requireNonNull(
			contractEndDateInstant);
		_currentSkuExternalReferenceCode = currentSkuExternalReferenceCode;
		_key = key;
		_targetProduct = targetProduct;
		_targetSkuExternalReferenceCode = targetSkuExternalReferenceCode;
		_type = type;
	}

	public Instant getContractEndDateInstant() {
		return _contractEndDateInstant;
	}

	public String getCurrentSkuExternalReferenceCode() {
		return _currentSkuExternalReferenceCode;
	}

	public String getKey() {
		return _key;
	}

	public String getTargetProduct() {
		return _targetProduct;
	}

	public String getTargetSkuExternalReferenceCode() {
		return _targetSkuExternalReferenceCode;
	}

	public String getType() {
		return _type;
	}

	public JSONObject toJSONObject() {
		return new JSONObject(
		).put(
			"contractEndDate", _contractEndDateInstant.toString()
		).put(
			"currentSkuExternalReferenceCode", _currentSkuExternalReferenceCode
		).put(
			"key", _key
		).put(
			"targetProduct", _targetProduct
		).put(
			"targetSkuExternalReferenceCode", _targetSkuExternalReferenceCode
		).put(
			"type", _type
		);
	}

	private final Instant _contractEndDateInstant;
	private final String _currentSkuExternalReferenceCode;
	private final String _key;
	private final String _targetProduct;
	private final String _targetSkuExternalReferenceCode;
	private final String _type;

}
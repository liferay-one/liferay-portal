/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.model;

import com.liferay.portal.kernel.util.Validator;

import java.math.BigDecimal;

import java.util.Objects;

import org.json.JSONObject;

/**
 * The overage rate and SKU an entitlement copies from its definition at grant
 * time. The SKU makes an overage orderable: a usage report names it with the
 * bucket quantity. The rate makes an overage priceable: it is the price of
 * one bucket. Without a rate, the amount is unknown and is priced
 * downstream.
 *
 * @author Drew Brokke
 */
public class OveragePricing {

	/**
	 * Returns <code>null</code> unless the JSON object has a SKU. A rate that
	 * is not positive is read as no rate.
	 */
	public static OveragePricing of(JSONObject jsonObject) {
		OveragePricing overagePricing = new OveragePricing(jsonObject);

		if (Validator.isNull(overagePricing.getSkuExternalReferenceCode())) {
			return null;
		}

		return overagePricing;
	}

	@Override
	public boolean equals(Object object) {
		if (this == object) {
			return true;
		}

		if (!(object instanceof OveragePricing overagePricing)) {
			return false;
		}

		if (Objects.equals(_rate, overagePricing.getRate()) &&
			Objects.equals(
				_skuExternalReferenceCode,
				overagePricing.getSkuExternalReferenceCode())) {

			return true;
		}

		return false;
	}

	/**
	 * Returns <code>null</code> when there is no rate.
	 */
	public Double getAmount(long bucketQuantity) {
		if (_rate == null) {
			return null;
		}

		if (bucketQuantity <= 0) {
			return 0D;
		}

		return BigDecimal.valueOf(
			_rate
		).multiply(
			BigDecimal.valueOf(bucketQuantity)
		).doubleValue();
	}

	public Double getRate() {
		return _rate;
	}

	public String getSkuExternalReferenceCode() {
		return _skuExternalReferenceCode;
	}

	@Override
	public int hashCode() {
		return Objects.hash(_rate, _skuExternalReferenceCode);
	}

	public JSONObject toJSONObject() {
		return new JSONObject(
		).put(
			"overageRate", _rate
		).put(
			"overageSkuExternalReferenceCode", _skuExternalReferenceCode
		);
	}

	private OveragePricing(JSONObject jsonObject) {
		Double rate = jsonObject.optDoubleObject("overageRate", null);

		if ((rate != null) && (rate <= 0)) {
			rate = null;
		}

		_rate = rate;

		_skuExternalReferenceCode = jsonObject.optString(
			"overageSkuExternalReferenceCode", null);
	}

	private final Double _rate;
	private final String _skuExternalReferenceCode;

}
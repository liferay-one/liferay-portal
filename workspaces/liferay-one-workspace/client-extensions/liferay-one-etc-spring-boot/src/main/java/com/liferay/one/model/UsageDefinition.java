/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.model;

import com.liferay.portal.kernel.util.Validator;

import org.json.JSONObject;

/**
 * A metered quantity a product sells. The usage source fields declare where
 * the consumed quantity is read from: the source names the API shape, the
 * metric key names the field in that API's response, and the source unit is
 * the unit that field is reported in, which may differ from the definition's
 * own unit.
 *
 * @author Drew Brokke
 */
public final class UsageDefinition {

	public UsageDefinition(JSONObject jsonObject) {
		_aggregationType = jsonObject.optString("aggregationType");
		_externalReferenceCode = jsonObject.optString("externalReferenceCode");
		_overageBucketSize = jsonObject.optDoubleObject(
			"overageBucketSize", null);
		_period = jsonObject.optString("period");
		_unit = jsonObject.optString("unit");
		_usageDefinitionId = jsonObject.getLong("id");
		_usageSource = jsonObject.optString("usageSource");
		_usageSourceMetricKey = jsonObject.optString("usageSourceMetricKey");
		_usageSourceUnit = jsonObject.optString("usageSourceUnit");
	}

	public String getAggregationType() {
		return _aggregationType;
	}

	public String getExternalReferenceCode() {
		return _externalReferenceCode;
	}

	/**
	 * The number of whole overage buckets needed to cover the given overage. A
	 * partial bucket bills as a whole one, because a bucket is the smallest
	 * quantity that can go on an order.
	 */
	public long getOverageBucketQuantity(double overageQuantity) {
		if ((overageQuantity <= 0) || !hasOverageBucketSize()) {
			return 0;
		}

		return (long)Math.ceil(overageQuantity / _overageBucketSize);
	}

	public Double getOverageBucketSize() {
		return _overageBucketSize;
	}

	public String getPeriod() {
		return _period;
	}

	public String getUnit() {
		return _unit;
	}

	public long getUsageDefinitionId() {
		return _usageDefinitionId;
	}

	public String getUsageSource() {
		return _usageSource;
	}

	public String getUsageSourceMetricKey() {
		return _usageSourceMetricKey;
	}

	/**
	 * Returns the unit the usage source reports the metric in, falling back to
	 * the definition's own unit when the source does not declare one.
	 */
	public String getUsageSourceUnit() {
		if (Validator.isNull(_usageSourceUnit)) {
			return _unit;
		}

		return _usageSourceUnit;
	}

	public boolean hasOverageBucketSize() {
		if ((_overageBucketSize == null) || (_overageBucketSize <= 0)) {
			return false;
		}

		return true;
	}

	/**
	 * Returns <code>true</code> when a usage report can be generated for this
	 * definition, which takes both a source and a metric key to read from it.
	 */
	public boolean hasUsageSource() {
		if (Validator.isNull(_usageSource) ||
			Validator.isNull(_usageSourceMetricKey)) {

			return false;
		}

		return true;
	}

	private final String _aggregationType;
	private final String _externalReferenceCode;
	private final Double _overageBucketSize;
	private final String _period;
	private final String _unit;
	private final long _usageDefinitionId;
	private final String _usageSource;
	private final String _usageSourceMetricKey;
	private final String _usageSourceUnit;

}
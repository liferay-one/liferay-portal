/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.model;

import com.liferay.one.constants.EntitlementConstants;
import com.liferay.one.constants.SkuOptionConstants;
import com.liferay.one.util.UsageUnitUtil;

import java.util.Collections;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * The quantity of one metric a project is entitled to, rolled up from the
 * entitlements that share the metric's usage definition. Each entitlement
 * contributes according to the <code>consumption-role</code> option of the
 * SKU that granted it: an allotment adds its quantity, an add-on bucket counts
 * buckets and is multiplied by the usage definition's bucket size, and an
 * overage bucket is ignored because it bills past consumption rather than
 * granting future consumption. An entitlement whose SKU carries no role
 * contributes nothing and its SKU is reported instead, since the role cannot be
 * guessed without risking a wrong entitled quantity. An entitlement with no SKU
 * at all is an allotment. Overage pricing is read from the allotments alone.
 *
 * @author Drew Brokke
 */
public class UsageAllotment {

	/**
	 * @param unit the unit of the usage definition, which allotment quantities
	 *        are converted to from the unit their entitlement definition sells
	 *        them in
	 */
	public UsageAllotment(
		Map<String, String> consumptionRolesBySkuExternalReferenceCode,
		List<Entitlement> entitlements, long overageBucketSize, String unit) {

		long addOnBucketCount = 0;
		double baseQuantity = 0;
		Set<OveragePricing> overagePricings = new LinkedHashSet<>();
		Set<String> skuExternalReferenceCodesWithoutConsumptionRole =
			new LinkedHashSet<>();
		boolean unlimited = false;

		for (Entitlement entitlement : entitlements) {
			String consumptionRole = _getConsumptionRole(
				consumptionRolesBySkuExternalReferenceCode, entitlement);

			if (consumptionRole == null) {
				skuExternalReferenceCodesWithoutConsumptionRole.add(
					_getSkuExternalReferenceCode(entitlement));

				continue;
			}

			if (!consumptionRole.equals(
					SkuOptionConstants.VALUE_CONSUMPTION_ROLE_ADD_ON) &&
				!consumptionRole.equals(
					SkuOptionConstants.VALUE_CONSUMPTION_ROLE_ALLOTMENT)) {

				continue;
			}

			if (consumptionRole.equals(
					SkuOptionConstants.VALUE_CONSUMPTION_ROLE_ALLOTMENT) &&
				(entitlement.getOveragePricing() != null)) {

				overagePricings.add(entitlement.getOveragePricing());
			}

			if (Objects.equals(
					entitlement.getGrantType(),
					EntitlementConstants.GRANT_TYPE_UNLIMITED)) {

				unlimited = true;

				continue;
			}

			Double quantity = entitlement.getQuantity();

			if (quantity == null) {
				continue;
			}

			if (quantity < 0) {
				unlimited = true;

				continue;
			}

			if (consumptionRole.equals(
					SkuOptionConstants.VALUE_CONSUMPTION_ROLE_ALLOTMENT)) {

				baseQuantity += UsageUnitUtil.convert(
					quantity, _getUnit(entitlement), unit);
			}
			else {
				addOnBucketCount += quantity.longValue();
			}
		}

		_overageBucketSize = overageBucketSize;

		_addOnBucketCount = addOnBucketCount;
		_baseQuantity = baseQuantity;
		_conflictingOveragePricing = overagePricings.size() > 1;
		_skuExternalReferenceCodesWithoutConsumptionRole =
			Collections.unmodifiableSet(
				skuExternalReferenceCodesWithoutConsumptionRole);
		_unlimited = unlimited;

		if (overagePricings.size() == 1) {
			Iterator<OveragePricing> iterator = overagePricings.iterator();

			_overagePricing = iterator.next();
		}
		else {
			_overagePricing = null;
		}
	}

	public long getAddOnBucketCount() {
		return _addOnBucketCount;
	}

	public double getAddOnQuantity() {
		return _addOnBucketCount * _overageBucketSize;
	}

	public double getBaseQuantity() {
		return _baseQuantity;
	}

	public double getEntitledQuantity() {
		return _baseQuantity + getAddOnQuantity();
	}

	/**
	 * Returns <code>null</code> when the pricing is missing or conflicting.
	 */
	public OveragePricing getOveragePricing() {
		return _overagePricing;
	}

	/**
	 * Returns the SKUs that granted an entitlement but carry no
	 * <code>consumption-role</code> option, which leaves the entitled quantity
	 * unknown.
	 */
	public Set<String> getSkuExternalReferenceCodesWithoutConsumptionRole() {
		return _skuExternalReferenceCodesWithoutConsumptionRole;
	}

	public boolean hasConflictingOveragePricing() {
		return _conflictingOveragePricing;
	}

	public boolean isEntitledQuantityKnown() {
		if ((_addOnBucketCount > 0) && (_overageBucketSize <= 0)) {
			return false;
		}

		return true;
	}

	public boolean isUnlimited() {
		return _unlimited;
	}

	private String _getConsumptionRole(
		Map<String, String> consumptionRolesBySkuExternalReferenceCode,
		Entitlement entitlement) {

		String skuExternalReferenceCode = _getSkuExternalReferenceCode(
			entitlement);

		if (skuExternalReferenceCode == null) {
			return SkuOptionConstants.VALUE_CONSUMPTION_ROLE_ALLOTMENT;
		}

		return consumptionRolesBySkuExternalReferenceCode.get(
			skuExternalReferenceCode);
	}

	private String _getSkuExternalReferenceCode(Entitlement entitlement) {
		EntitlementDefinition entitlementDefinition =
			entitlement.getEntitlementDefinition();

		if (entitlementDefinition == null) {
			return null;
		}

		return entitlementDefinition.getSkuExternalReferenceCode();
	}

	private String _getUnit(Entitlement entitlement) {
		EntitlementDefinition entitlementDefinition =
			entitlement.getEntitlementDefinition();

		if (entitlementDefinition == null) {
			return null;
		}

		return entitlementDefinition.getUnit();
	}

	private final long _addOnBucketCount;
	private final double _baseQuantity;
	private final boolean _conflictingOveragePricing;
	private final long _overageBucketSize;
	private final OveragePricing _overagePricing;
	private final Set<String> _skuExternalReferenceCodesWithoutConsumptionRole;
	private final boolean _unlimited;

}
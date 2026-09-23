/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.model;

import com.liferay.one.constants.EntitlementConstants;

import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * The number of Liferay Data Platform events a project is entitled to, rolled
 * up from its <code>events</code> and <code>events-add-on-bucket</code>
 * entitlements. An add-on bucket entitlement counts buckets, so its quantity
 * is multiplied by the bucket size the usage definition declares.
 *
 * @author Drew Brokke
 */
public class LDPEventAllotment {

	public LDPEventAllotment(
		List<Entitlement> entitlements, long overageBucketSize) {

		long addOnBucketCount = 0;
		long baseQuantity = 0;
		Set<OveragePricing> overagePricings = new LinkedHashSet<>();
		boolean unlimited = false;

		for (Entitlement entitlement : entitlements) {
			String name = entitlement.getName();

			if (!name.equals(EntitlementConstants.NAME_EVENTS) &&
				!name.equals(EntitlementConstants.NAME_EVENTS_ADD_ON_BUCKET)) {

				continue;
			}

			if (name.equals(EntitlementConstants.NAME_EVENTS) &&
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

			if (name.equals(EntitlementConstants.NAME_EVENTS)) {
				baseQuantity += quantity.longValue();
			}

			if (name.equals(EntitlementConstants.NAME_EVENTS_ADD_ON_BUCKET)) {
				addOnBucketCount += quantity.longValue();
			}
		}

		_overageBucketSize = overageBucketSize;

		_addOnBucketCount = addOnBucketCount;
		_baseQuantity = baseQuantity;
		_conflictingOveragePricing = overagePricings.size() > 1;
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

	public long getAddOnQuantity() {
		return _addOnBucketCount * _overageBucketSize;
	}

	public long getBaseQuantity() {
		return _baseQuantity;
	}

	public long getEntitledQuantity() {
		return _baseQuantity + getAddOnQuantity();
	}

	/**
	 * Returns <code>null</code> when the pricing is missing or conflicting.
	 */
	public OveragePricing getOveragePricing() {
		return _overagePricing;
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

	private final long _addOnBucketCount;
	private final long _baseQuantity;
	private final boolean _conflictingOveragePricing;
	private final long _overageBucketSize;
	private final OveragePricing _overagePricing;
	private final boolean _unlimited;

}
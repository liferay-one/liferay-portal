/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.subscription.upgrade;

import com.liferay.one.model.Entitlement;
import com.liferay.one.model.SubscriptionUpgrade;

import java.util.List;

/**
 * @author Felipe Veloso
 */
public interface SubscriptionUpgradeChecker {

	public SubscriptionUpgrade check(List<Entitlement> unexpiredEntitlements)
		throws Exception;

	public String getKey();

}
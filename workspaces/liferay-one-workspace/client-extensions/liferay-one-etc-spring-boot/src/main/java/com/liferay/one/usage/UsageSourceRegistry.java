/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.usage;

import java.util.Collections;
import java.util.List;
import java.util.Objects;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Finds the {@link UsageSource} a usage definition names. Every implementation
 * registered as a Spring component is a candidate, so adding an API shape is
 * one new class and no wiring.
 *
 * @author Drew Brokke
 */
@Component
public class UsageSourceRegistry {

	/**
	 * Returns <code>null</code> when no source has the key.
	 */
	public UsageSource fetchUsageSource(String key) {
		for (UsageSource usageSource : _usageSources) {
			if (Objects.equals(usageSource.getKey(), key)) {
				return usageSource;
			}
		}

		return null;
	}

	@Autowired(required = false)
	private List<UsageSource> _usageSources = Collections.emptyList();

}
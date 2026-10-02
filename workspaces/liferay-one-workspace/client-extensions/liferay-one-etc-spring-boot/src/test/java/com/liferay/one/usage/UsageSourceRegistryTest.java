/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.usage;

import java.util.Collections;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Drew Brokke
 */
@DisplayName("[CLS-USAGESOURCEREGISTRY] UsageSourceRegistry")
public class UsageSourceRegistryTest {

	@Test
	public void testFindsSourceByKey() {
		UsageSourceRegistry usageSourceRegistry = new UsageSourceRegistry();

		LDPEventSummaryUsageSource ldpEventSummaryUsageSource =
			new LDPEventSummaryUsageSource();

		ReflectionTestUtils.setField(
			usageSourceRegistry, "_usageSources",
			Collections.singletonList(ldpEventSummaryUsageSource));

		Assertions.assertNull(usageSourceRegistry.fetchUsageSource("unknown"));

		Assertions.assertSame(
			ldpEventSummaryUsageSource,
			usageSourceRegistry.fetchUsageSource(
				LDPEventSummaryUsageSource.KEY));
	}

	@Test
	public void testNoSourcesMeansNothingFound() {
		UsageSourceRegistry usageSourceRegistry = new UsageSourceRegistry();

		Assertions.assertNull(
			usageSourceRegistry.fetchUsageSource(
				LDPEventSummaryUsageSource.KEY));
	}

}
/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.usage;

import com.liferay.one.model.Project;
import com.liferay.one.model.UsageDefinition;

import java.time.YearMonth;

/**
 * Reads a project's consumption of one metric for one calendar month from a
 * DataOps API. There is one implementation per API shape, selected by the
 * usage definition's <code>usageSource</code>; the usage definition's metric
 * key names the field to read, so a new metric on an API that already has an
 * implementation needs no code.
 *
 * @author Drew Brokke
 */
public interface UsageSource {

	/**
	 * Returns the consumed quantity in the usage definition's source unit, or
	 * <code>null</code> when the API has no data for the project and month,
	 * which the caller reports as missing rather than as zero.
	 */
	public Double fetchUsage(
			Project project, UsageDefinition usageDefinition,
			YearMonth yearMonth)
		throws Exception;

	public String getKey();

}
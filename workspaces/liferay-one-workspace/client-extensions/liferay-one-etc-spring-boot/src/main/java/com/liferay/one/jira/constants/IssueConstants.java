/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.constants;

import com.liferay.petra.string.StringPool;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * @author Jenny Chen
 */
public interface IssueConstants {

	public static final String STATUS_CLOSED = "Closed";

	public static final String STATUS_FLS_CLOSED = "Closed (FLS)";

	public static final String STATUS_FLS_SOLVED = "Solved (FLS)";

	public static final String STATUS_INACTIVE = "Inactive";

	public static final String STATUS_SOLUTION_ACCEPTED = "Solution Accepted";

	public static final String STATUS_SOLUTION_PROPOSED = "Solution Proposed";

	public static final String TYPE_GENERAL_REQUEST = "General Request";

	public static final List<String> statusesClosed =
		Collections.unmodifiableList(
			Arrays.asList(
				STATUS_CLOSED, STATUS_FLS_CLOSED, STATUS_SOLUTION_ACCEPTED));
	public static final List<String> statusesSolvedAndClosed =
		Collections.unmodifiableList(
			Arrays.asList(
				STATUS_CLOSED, STATUS_FLS_CLOSED, STATUS_FLS_SOLVED,
				STATUS_INACTIVE, STATUS_SOLUTION_ACCEPTED,
				STATUS_SOLUTION_PROPOSED));

	public static String toJQLCustomField(String customField) {
		int index = customField.indexOf(StringPool.UNDERLINE);

		return "cf[" + customField.substring(index + 1) + "]";
	}

}
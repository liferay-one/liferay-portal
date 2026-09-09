/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.constants;

import java.util.Arrays;
import java.util.List;

/**
 * @author Ryan Schuhler
 */
public class TrialConstants {

	public static final int DURATION_DAYS_DEFAULT = 7;

	public static final int DURATION_DAYS_SELF_SERVICE = 90;

	public static final String ORDER_TYPE_EXTERNAL_REFERENCE_CODE_CMP_TRIAL =
		"CMP_TRIAL";

	public static final String ORDER_TYPE_EXTERNAL_REFERENCE_CODE_DSR_TRIAL =
		"DSR_TRIAL";

	public static int getDurationDays(String orderTypeExternalReferenceCode) {
		if (isSelfService(orderTypeExternalReferenceCode)) {
			return DURATION_DAYS_SELF_SERVICE;
		}

		return DURATION_DAYS_DEFAULT;
	}

	public static boolean isSelfService(String orderTypeExternalReferenceCode) {
		return _selfServiceOrderTypeExternalReferenceCodes.contains(
			orderTypeExternalReferenceCode);
	}

	private static final List<String>
		_selfServiceOrderTypeExternalReferenceCodes = Arrays.asList(
			ORDER_TYPE_EXTERNAL_REFERENCE_CODE_CMP_TRIAL,
			ORDER_TYPE_EXTERNAL_REFERENCE_CODE_DSR_TRIAL);

}
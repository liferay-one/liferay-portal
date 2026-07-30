/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import java.util.Arrays;
import java.util.List;
import java.util.function.Predicate;

/**
 * @author Drew Brokke
 */
public class FindUtil {

	public static <T> T findFirst(List<T> list, Predicate<T> predicate) {
		if (list == null) {
			return null;
		}

		for (T t : list) {
			if (predicate.test(t)) {
				return t;
			}
		}

		return null;
	}

	public static <T> T findFirst(T[] array, Predicate<T> predicate) {
		if (array == null) {
			return null;
		}

		return findFirst(Arrays.asList(array), predicate);
	}

}
/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import com.liferay.petra.function.UnsafeSupplier;

import org.apache.commons.logging.Log;

/**
 * @author Drew Brokke
 */
public class MemoizedValue<T> {

	public MemoizedValue(
		String description, Log log,
		UnsafeSupplier<T, Exception> unsafeSupplier) {

		_description = description;
		_log = log;
		_unsafeSupplier = unsafeSupplier;
	}

	public T get() {
		if (!_evaluated) {
			_evaluated = true;

			try {
				_value = _unsafeSupplier.get();
			}
			catch (Exception exception) {
				_log.error("Unable to get " + _description, exception);
			}
		}

		return _value;
	}

	private final String _description;
	private boolean _evaluated;
	private final Log _log;
	private final UnsafeSupplier<T, Exception> _unsafeSupplier;
	private T _value;

}
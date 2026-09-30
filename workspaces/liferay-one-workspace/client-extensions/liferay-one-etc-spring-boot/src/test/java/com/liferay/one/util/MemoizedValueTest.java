/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util;

import com.liferay.petra.function.UnsafeSupplier;

import org.apache.commons.logging.Log;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

/**
 * @author Drew Brokke
 */
public class MemoizedValueTest {

	@BeforeEach
	public void setUp() {
		_log = Mockito.mock(Log.class);
		_unsafeSupplier = Mockito.mock(UnsafeSupplier.class);

		_memoizedValue = new MemoizedValue<>(
			"value for test", _log, _unsafeSupplier);
	}

	@Test
	public void testGetEvaluatesOnceWhenSupplierFails() throws Exception {
		RuntimeException runtimeException = new RuntimeException();

		Mockito.when(
			_unsafeSupplier.get()
		).thenThrow(
			runtimeException
		);

		Assertions.assertNull(_memoizedValue.get());
		Assertions.assertNull(_memoizedValue.get());

		Mockito.verify(
			_unsafeSupplier
		).get();

		Mockito.verify(
			_log
		).error(
			"Unable to get value for test", runtimeException
		);
	}

	@Test
	public void testGetEvaluatesOnceWhenSupplierReturnsNull() throws Exception {
		Assertions.assertNull(_memoizedValue.get());
		Assertions.assertNull(_memoizedValue.get());

		Mockito.verify(
			_unsafeSupplier
		).get();

		Mockito.verifyNoInteractions(_log);
	}

	@Test
	public void testGetEvaluatesOnceWhenSupplierSucceeds() throws Exception {
		Mockito.when(
			_unsafeSupplier.get()
		).thenReturn(
			"value"
		);

		Assertions.assertEquals("value", _memoizedValue.get());
		Assertions.assertEquals("value", _memoizedValue.get());

		Mockito.verify(
			_unsafeSupplier
		).get();

		Mockito.verifyNoInteractions(_log);
	}

	private Log _log;
	private MemoizedValue<String> _memoizedValue;
	private UnsafeSupplier<String, Exception> _unsafeSupplier;

}
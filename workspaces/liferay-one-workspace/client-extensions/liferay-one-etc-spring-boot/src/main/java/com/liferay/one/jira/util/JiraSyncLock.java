/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.util;

import com.liferay.petra.function.UnsafeRunnable;
import com.liferay.portal.kernel.util.Validator;

import java.util.concurrent.locks.ReentrantLock;

import org.springframework.stereotype.Component;

/**
 * @author Drew Brokke
 */
@Component
public class JiraSyncLock {

	public JiraSyncLock() {
		for (int i = 0; i < _reentrantLocks.length; i++) {
			_reentrantLocks[i] = new ReentrantLock();
		}
	}

	public <E extends Throwable> void withLock(
			String key, UnsafeRunnable<E> unsafeRunnable)
		throws E {

		if (Validator.isNull(key)) {
			unsafeRunnable.run();

			return;
		}

		ReentrantLock reentrantLock =
			_reentrantLocks
				[Math.floorMod(key.hashCode(), _reentrantLocks.length)];

		reentrantLock.lock();

		try {
			unsafeRunnable.run();
		}
		finally {
			reentrantLock.unlock();
		}
	}

	private final ReentrantLock[] _reentrantLocks = new ReentrantLock[64];

}
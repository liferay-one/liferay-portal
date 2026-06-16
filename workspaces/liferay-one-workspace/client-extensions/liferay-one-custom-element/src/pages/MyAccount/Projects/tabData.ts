/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

export const STATUS_DOT_COLORS: {[key: string]: string} = {
	active: 'var(--color-success)',
	completed: 'var(--color-success)',
	expired: 'var(--color-danger)',
	paid: 'var(--color-success)',
	pending: 'var(--color-warning)',
	processing: 'var(--color-warning)',
};

export function getStatusColor(status: string): string {
	return STATUS_DOT_COLORS[status] ?? 'var(--color-neutral-6)';
}

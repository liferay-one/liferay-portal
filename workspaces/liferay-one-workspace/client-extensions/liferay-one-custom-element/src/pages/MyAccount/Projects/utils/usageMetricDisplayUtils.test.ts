/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import {
	EM_DASH,
	formatCount,
	formatUsageLimit,
	formatUsageUsed,
	hasOverageUsage,
	isUnlimitedUsage,
} from './usageMetricDisplayUtils';

import type {UsageMetric} from '~/pages/MyAccount/Projects/hooks/useProjectUsageDashboard';

function toMetric(metric: Partial<UsageMetric>): UsageMetric {
	return {maxCount: 0, percentage: '0', ...metric};
}

describe('[MOD-MYACCOUNT-PROJECTS-USAGEMETRICDISPLAYUTILS] usageMetricDisplayUtils', () => {
	it('formats counts for the locale with optional units', () => {
		expect(formatCount(1234567)).toBe('1,234,567');
		expect(formatCount(1500, 'GB')).toBe('1,500 GB');
	});

	it('shows Unlimited for a negative max count', () => {
		expect(formatUsageLimit(toMetric({maxCount: -1}))).toBe('Unlimited');
		expect(isUnlimitedUsage(toMetric({maxCount: -1}))).toBe(true);
	});

	it('formats a positive max count with its units', () => {
		expect(
			formatUsageLimit(toMetric({maxCount: 2000, maxCountUnits: 'users'}))
		).toBe('2,000 users');
		expect(isUnlimitedUsage(toMetric({maxCount: 2000}))).toBe(false);
	});

	it('shows an em dash for a zero or missing limit', () => {
		expect(formatUsageLimit(toMetric({maxCount: 0}))).toBe(EM_DASH);
		expect(formatUsageLimit()).toBe(EM_DASH);
		expect(isUnlimitedUsage()).toBe(false);
	});

	it('shows an em dash when the used count is undefined', () => {
		expect(formatUsageUsed(toMetric({}))).toBe(EM_DASH);
		expect(formatUsageUsed()).toBe(EM_DASH);
	});

	it('formats the used count with its units, including zero', () => {
		expect(
			formatUsageUsed(toMetric({usedCount: 1200, usedCountUnits: 'GB'}))
		).toBe('1,200 GB');
		expect(formatUsageUsed(toMetric({usedCount: 0}))).toBe('0');
	});

	it('detects overage only when a percentage exceeds 100', () => {
		expect(
			hasOverageUsage({
				a: toMetric({percentage: '50'}),
				b: toMetric({percentage: '100.5'}),
			})
		).toBe(true);
		expect(
			hasOverageUsage({
				a: toMetric({percentage: '100'}),
				b: toMetric({percentage: 'n/a'}),
			})
		).toBe(false);
		expect(hasOverageUsage({})).toBe(false);
	});
});

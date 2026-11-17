/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Word} from '~/i18n';

import {PROJECT_TAB_KEYS} from '../types';

import type {ProjectTabKey} from '../types';
import type {UtilizationProfile} from './resolveUtilizationProfile';

export const LAST_PROJECT_STORAGE_KEY = 'liferay-one:last-project';

export const PROJECT_SECTION_PATHS = [
	'activation',
	'applications',
	'contract',
	'products',
];

export const PROJECT_TAB_LABELS: Record<ProjectTabKey, Word> = {
	'activation': 'activation',
	'details': 'details',
	'download': 'download',
	'environment': 'environment',
	'help-and-support': 'help-and-support',
	'orders': 'orders',
	'utilization': 'utilization',
};

export const PROJECT_TAB_ORDER: ProjectTabKey[] = [...PROJECT_TAB_KEYS];

export const STATUS_DOT_COLORS: {[key: string]: string} = {
	'active': 'var(--color-state-success)',
	'approved': 'var(--color-state-success)',
	'canceled': 'var(--color-state-error)',
	'cancelled': 'var(--color-state-error)',
	'completed': 'var(--color-state-success)',
	'expired': 'var(--color-state-error)',
	'future': 'var(--color-state-info)',
	'in-progress': 'var(--color-state-info)',
	'on-hold': 'var(--color-state-warning)',
	'paid': 'var(--color-state-success)',
	'pending': 'var(--color-state-warning)',
	'pending-payment': 'var(--color-state-warning)',
	'processing': 'var(--color-state-warning)',
};

export type SupportLink = {
	href: (value: string) => string;
	label: Word;
	specificationKey: string;
};

function withProtocol(value: string): string {
	return /^https?:\/\//.test(value) ? value : `https://${value}`;
}

export const SUPPORT_LINKS: SupportLink[] = [
	{
		href: withProtocol,
		label: 'support-url',
		specificationKey: 'support-url',
	},
	{
		href: withProtocol,
		label: 'publisher-website',
		specificationKey: 'publisher-web-site-url',
	},
	{
		href: (value) => `mailto:${value}`,
		label: 'support-email-address',
		specificationKey: 'support-email-address',
	},
	{
		href: (value) => `tel:${value.replace(/\s/g, '')}`,
		label: 'support-phone-number',
		specificationKey: 'support-phone',
	},
	{
		href: withProtocol,
		label: 'app-usage-terms-eula-url',
		specificationKey: 'app-usage-terms-url',
	},
	{
		href: withProtocol,
		label: 'app-documentation-url',
		specificationKey: 'app-documentation-url',
	},
];

export const SUPPORT_SPECIFICATION_KEYS = SUPPORT_LINKS.map(
	(link) => link.specificationKey
);

export const ONE_TIME_PURCHASES = 'one-time-purchases';

export const ICON_BY_CATEGORY: {[key: string]: string} = {
	'Analytics': 'analytics',
	'Artificial Intelligence': 'magic',
	'Commerce': 'shopping-cart',
	'Customer Data': 'users',
	'Platform': 'globe',
};

export const LOGO_COLORS = [
	'#00b8a3',
	'#1b95e0',
	'#4b9fff',
	'#7b61ff',
	'#9b59b6',
	'#e9518a',
	'#f5b400',
	'#ff7847',
];

export const SKU_UTILIZATION_PROFILES: Record<string, UtilizationProfile> = {
	'01t0g00000UvVonAAF': 'none',
	'01t0g00000UvVosAAF': 'none',
	'01t0g00000UvVp2AAF': 'none',
	'01t0g00000UvVp7AAF': 'none',
	'01t0g00000UvVpCAAV': 'none',
	'01t0g00000UvVpHAAV': 'none',
	'01t0g00000UvVpMAAV': 'none',
	'01t0g00000UvVpRAAV': 'none',
	'01t0g00000UvVpWAAV': 'none',
	'01t0g00000UvVpbAAF': 'none',
	'01t0g00000UvVpgAAF': 'none',
	'01t0g00000UvVplAAF': 'none',
	'01t0g00000UvVpqAAF': 'none',
	'01t0g00000UvVpvAAF': 'none',
	'01t0g00000UvVq0AAF': 'none',
	'01t0g00000UvVq5AAF': 'none',
	'01t4u00000dIUryAAG': 'none',
	'01t4u00000dIUs3AAG': 'none',
	'01t4u00000dIUs8AAG': 'none',
	'01t4u00000dIUsIAAW': 'none',
	'01t4u00000dIUsNAAW': 'none',
	'01t4u00000dIUsSAAW': 'none',
	'01t4u00000dIUsXAAW': 'none',
	'01t4u00000dZBxAAAW': 'legacy',
	'01t4u00000dZBxBAAW': 'legacy',
	'01t4u00000dZBxCAAW': 'legacy',
	'01t4u00000dcJNHAA2': 'none',
	'01t4u00000dcJNMAA2': 'none',
	'01t4u00000dcJNRAA2': 'none',
	'01t4u00000dcJNWAA2': 'none',
	'01t4u00000dcJNbAAM': 'none',
	'01t4u00000dcJNgAAM': 'none',
	'01t4u00000dcJNqAAM': 'none',
	'01t4u00000dci4AAAQ': 'none',
	'01t4u00000dci4FAAQ': 'none',
	'01t4u00000dci4KAAQ': 'none',
	'01t4u00000dci4PAAQ': 'none',
	'01t4u00000dci4UAAQ': 'none',
	'01t4u00000dci4ZAAQ': 'none',
	'01t4u00000dci4qAAA': 'none',
	'01tVO000000jLLGYA2': 'none',
	'01tVO00000QYrl8YAD': 'none',
	'01tVO00000QYrl9YAD': 'none',
	'01tVO00000QYrlAYAT': 'none',
	'01tVO00000QYrlBYAT': 'none',
};

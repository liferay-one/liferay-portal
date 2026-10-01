/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {differenceInDays, format} from 'date-fns';
import {useMemo} from 'react';
import {useProject} from '~/context/ProjectContext';
import {
	ActivationKeyLicenseKey,
	LicenseKeyNode,
	toActivationKeyLicenseKey,
} from '~/hooks/useActivationKeyLicenseKeys';
import {useObjectItems} from '~/hooks/useObjectItems';
import {Word} from '~/i18n';
import {
	getLeadingProductLabel,
	getLeadingProductRank,
} from '~/pages/MyAccount/Projects/LicenseKeys/GenerateActivationKey/utils';
import {isUnassignedProject} from '~/pages/MyAccount/Projects/utils/isUnassignedProject';
import {Liferay} from '~/services/liferay/liferay';
import SearchBuilder from '~/utils/SearchBuilder';
import escapeODataString from '~/utils/escapeODataString';

export type ProjectActivationKey = {
	activationKeyId: string;
	active: boolean;
	badge?: Word;
	cloudNative?: boolean;
	complimentary: boolean;
	description: string;
	environmentId?: string;
	environmentType: Word;
	expirationDate: string;
	expirationDateValue: string;
	id: string;
	licenseKeyId?: string;
	name: string;
	offlineActivated?: boolean;
	productName: string;
	productVersion: string;
	startDate: string;
	startDateValue: string;
	status: Word;
	type: string;
	unaggregated?: boolean;
};

type ActivationKeyNode = {
	active: boolean;
	dateCreated?: string;
	endDate?: string;
	externalReferenceCode: string;
	id?: number;
	startDate?: string;
	type?: string;
};

const ACTIVATION_KEY_FIELDS =
	'active,dateCreated,endDate,externalReferenceCode,id,startDate,type';

const COMPLIMENTARY_KEY_TYPE = 'complimentary';

const NEW_KEY_WINDOW_DAYS = 15;

const NON_PRODUCTION_KEY_TYPES = [
	'developer',
	'developer-cluster',
	'free',
	'non-production',
	'uat',
];

const PROJECT_LICENSE_KEY_FIELDS = [
	'active',
	'complimentary',
	'customExpirationDate',
	'dateCreated',
	'description',
	'externalReferenceCode',
	'id',
	'licenseType',
	'name',
	'productName',
	'productVersion',
	'r_activationKeyToLicenseKey_c_activationKeyId',
	'r_commerceProductToLicenseKey_CProductERC',
	'startDate',
].join(',');

const RENEWAL_WINDOW_DAYS = 90;

function getBadge(node: ActivationKeyNode): Word | undefined {
	if (
		node.dateCreated &&
		differenceInDays(new Date(), new Date(node.dateCreated)) <=
			NEW_KEY_WINDOW_DAYS
	) {
		return 'new-activation-key';
	}

	if (!node.active || !node.endDate) {
		return undefined;
	}

	const daysUntilExpiration = differenceInDays(
		new Date(node.endDate),
		new Date()
	);

	if (
		daysUntilExpiration >= 0 &&
		daysUntilExpiration <= RENEWAL_WINDOW_DAYS
	) {
		return 'to-be-renewed';
	}

	return undefined;
}

function getEnvironmentType(type?: string): Word {
	if (type && NON_PRODUCTION_KEY_TYPES.includes(type)) {
		return 'non-production';
	}

	return 'production';
}

function getLeadingProductName(licenseKeys: ActivationKeyLicenseKey[]): string {
	let leadingRank = Number.MAX_SAFE_INTEGER;
	let leadingProductName = '';

	for (const licenseKey of licenseKeys) {
		const rank = getLeadingProductRank(
			licenseKey.productExternalReferenceCode
		);

		if (rank < leadingRank) {
			leadingProductName = getLeadingProductLabel(
				licenseKey.productExternalReferenceCode
			);
			leadingRank = rank;
		}
	}

	return leadingProductName;
}

function getStatus(node: ActivationKeyNode): Word {
	const now = new Date();

	if (!node.active || (node.startDate && now < new Date(node.startDate))) {
		return 'not-activated';
	}

	if (node.endDate && now > new Date(node.endDate)) {
		return 'expired';
	}

	return 'active';
}

function formatDate(value?: string): string {
	return value ? format(new Date(value), 'MMM d, yyyy') : '';
}

function getDateValue(value?: string): string {
	return value ? format(new Date(value), 'yyyy-MM-dd') : '';
}

function toUnaggregatedActivationKey(
	node: LicenseKeyNode
): ProjectActivationKey {
	const activationKeyNode: ActivationKeyNode = {
		active: node.active,
		dateCreated: node.dateCreated,
		endDate: node.customExpirationDate,
		externalReferenceCode: node.externalReferenceCode ?? '',
		startDate: node.startDate,
		type: node.licenseType,
	};

	return {
		activationKeyId: '',
		active: node.active,
		badge: getBadge(activationKeyNode),
		complimentary: node.complimentary ?? false,
		description: node.description ?? '',
		environmentType: getEnvironmentType(node.licenseType),
		expirationDate: formatDate(node.customExpirationDate),
		expirationDateValue: getDateValue(node.customExpirationDate),
		id: activationKeyNode.externalReferenceCode,
		licenseKeyId: node.id ? String(node.id) : '',
		name: node.name ?? '',
		productName:
			getLeadingProductLabel(
				node.r_commerceProductToLicenseKey_CProductERC ?? ''
			) ||
			node.productName ||
			'',
		productVersion: node.productVersion ?? '',
		startDate: formatDate(node.startDate),
		startDateValue: getDateValue(node.startDate),
		status: getStatus(activationKeyNode),
		type: node.licenseType ?? '',
		unaggregated: true,
	};
}

export function useProjectActivationKeys() {
	const {projectId} = useProject();

	const accountId = Liferay.CommerceContext.account?.accountId;

	const projectExternalReferenceCode =
		projectId && !isUnassignedProject(projectId) ? projectId : undefined;

	const enabled = Boolean(projectExternalReferenceCode || accountId);

	const scope = (projectField: string, accountField: string) =>
		projectExternalReferenceCode
			? SearchBuilder.eq(
					projectField,
					escapeODataString(projectExternalReferenceCode)
				)
			: SearchBuilder.eq(accountField, String(accountId));

	const {
		error,
		items: activationKeyNodes,
		loading,
		revalidate,
	} = useObjectItems<ActivationKeyNode>(
		enabled ? '/o/c/activationkeys' : null,
		{
			fields: ACTIVATION_KEY_FIELDS,
			filter: scope(
				'r_projectToActivationKey_c_projectERC',
				'r_accountEntryToActivationKey_accountEntryId'
			),
			sort: 'startDate:desc',
		}
	);

	const {items: licenseKeyNodes, loading: loadingLicenseKeys} =
		useObjectItems<LicenseKeyNode>(enabled ? '/o/c/licensekeys' : null, {
			fields: PROJECT_LICENSE_KEY_FIELDS,
			filter: scope(
				'r_projectToLicenseKey_c_projectERC',
				'r_accountEntryToLicenseKey_accountEntryId'
			),
		});

	const activationKeys = useMemo(() => {
		const licenseKeysByActivationKeyId = new Map<
			number,
			ActivationKeyLicenseKey[]
		>();

		const unaggregatedActivationKeys: ProjectActivationKey[] = [];

		for (const node of licenseKeyNodes ?? []) {
			const licenseKey = toActivationKeyLicenseKey(node);

			if (!licenseKey.activationKeyId) {
				if (licenseKey.externalReferenceCode) {
					unaggregatedActivationKeys.push(
						toUnaggregatedActivationKey(node)
					);
				}

				continue;
			}

			const activationKeyLicenseKeys =
				licenseKeysByActivationKeyId.get(licenseKey.activationKeyId) ??
				[];

			activationKeyLicenseKeys.push(licenseKey);

			licenseKeysByActivationKeyId.set(
				licenseKey.activationKeyId,
				activationKeyLicenseKeys
			);
		}

		const aggregatedActivationKeys: ProjectActivationKey[] = (
			activationKeyNodes ?? []
		).map((node) => {
			const activationKeyLicenseKeys = node.id
				? licenseKeysByActivationKeyId.get(node.id) ?? []
				: [];

			const [licenseKey] = activationKeyLicenseKeys;

			return {
				activationKeyId: node.id ? String(node.id) : '',
				active: node.active,
				badge: getBadge(node),
				complimentary: node.type === COMPLIMENTARY_KEY_TYPE,
				description: licenseKey?.description ?? '',
				environmentType: getEnvironmentType(node.type),
				expirationDate: formatDate(node.endDate),
				expirationDateValue: getDateValue(node.endDate),
				id: node.externalReferenceCode,
				name: licenseKey?.name ?? '',
				productName: getLeadingProductName(activationKeyLicenseKeys),
				productVersion: licenseKey?.productVersion ?? '',
				startDate: formatDate(node.startDate),
				startDateValue: getDateValue(node.startDate),
				status: getStatus(node),
				type: node.type ?? '',
			};
		});

		return [...aggregatedActivationKeys, ...unaggregatedActivationKeys];
	}, [activationKeyNodes, licenseKeyNodes]);

	return {
		activationKeys,
		error,
		loading: loading || loadingLicenseKeys,
		revalidate,
	};
}

/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {differenceInDays, format} from 'date-fns';
import {useProject} from '~/context/ProjectContext';
import {useFetch} from '~/hooks/useFetch';
import {Word} from '~/i18n';
import {isUnassignedProject} from '~/pages/MyAccount/Projects/utils/isUnassignedProject';
import {Liferay} from '~/services/liferay/liferay';

import type {APIResponse} from '~/types/api';

export type ProjectActivationKey = {
	activationKeyId: string;
	active: boolean;
	badge?: Word;
	complimentary: boolean;
	description: string;
	domain: string;
	environmentType: Word;
	expirationDate: string;
	expirationDateValue: string;
	id: string;
	keyType: string;
	licenseType: string;
	name: string;
	productVersion: string;
	startDate: string;
	startDateValue: string;
	status: Word;
};

type ActivationKeyNode = {
	active: boolean;
	complimentary?: boolean;
	customExpirationDate?: string;
	dateCreated?: string;
	description?: string;
	domains?: string;
	externalReferenceCode: string;
	id?: number;
	keyType?: string;
	licenseType?: string;
	name: string;
	productVersion?: string;
	startDate?: string;
};

const NEW_KEY_WINDOW_DAYS = 15;

const NON_PRODUCTION_LICENSE_TYPES = ['developer', 'developer-cluster', 'free'];

const RENEWAL_WINDOW_DAYS = 90;

function getBadge(node: ActivationKeyNode): Word | undefined {
	if (
		node.dateCreated &&
		differenceInDays(new Date(), new Date(node.dateCreated)) <=
			NEW_KEY_WINDOW_DAYS
	) {
		return 'new-activation-key';
	}

	if (!node.active || !node.customExpirationDate) {
		return undefined;
	}

	const daysUntilExpiration = differenceInDays(
		new Date(node.customExpirationDate),
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

function getEnvironmentType(licenseType?: string): Word {
	if (licenseType && NON_PRODUCTION_LICENSE_TYPES.includes(licenseType)) {
		return 'non-production';
	}

	return 'production';
}

function getStatus(node: ActivationKeyNode): Word {
	const now = new Date();

	if (!node.active || (node.startDate && now < new Date(node.startDate))) {
		return 'not-activated';
	}

	if (
		node.customExpirationDate &&
		now > new Date(node.customExpirationDate)
	) {
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

export function useProjectActivationKeys() {
	const {projectId} = useProject();

	const accountId = Liferay.CommerceContext.account?.accountId;

	const projectExternalReferenceCode =
		projectId && !isUnassignedProject(projectId) ? projectId : undefined;

	const scope = projectExternalReferenceCode
		? `r_projectToActivationKey_c_projectERC eq '${projectExternalReferenceCode}'`
		: `r_accountEntryToActivationKey_accountEntryId eq '${accountId}'`;

	const {
		data,
		error,
		isLoading: loading,
		revalidate,
	} = useFetch<APIResponse<ActivationKeyNode>>(
		projectExternalReferenceCode || accountId
			? '/o/c/activationkeys'
			: null,
		{
			params: {
				filter: scope,
				pageSize: 200,
				sort: 'startDate:desc',
			},
		}
	);

	const activationKeys: ProjectActivationKey[] = (data?.items ?? []).map(
		(node) => ({
			activationKeyId: node.id ? String(node.id) : '',
			active: node.active,
			badge: getBadge(node),
			complimentary: node.complimentary ?? false,
			description: node.description ?? '',
			domain: node.domains ?? '',
			environmentType: getEnvironmentType(node.licenseType),
			expirationDate: formatDate(node.customExpirationDate),
			expirationDateValue: getDateValue(node.customExpirationDate),
			id: node.externalReferenceCode,
			keyType: node.keyType ?? '',
			licenseType: node.licenseType ?? '',
			name: node.name,
			productVersion: node.productVersion ?? '',
			startDate: formatDate(node.startDate),
			startDateValue: getDateValue(node.startDate),
			status: getStatus(node),
		})
	);

	return {activationKeys, error, loading, revalidate};
}

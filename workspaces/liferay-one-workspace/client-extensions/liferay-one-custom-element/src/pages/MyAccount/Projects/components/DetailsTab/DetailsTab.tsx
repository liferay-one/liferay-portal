/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import Loading from '~/components/Loading/Loading';
import {useProject} from '~/context/ProjectContext';
import {useProductEnvironmentEntitlements} from '~/hooks/useProductEnvironmentEntitlements';
import {useProjectContacts} from '~/hooks/useProjectContacts';
import {SECURITY_INCIDENT_CONTACT_ERC} from '~/pages/MyAccount/ProjectMembers/projectRoles';
import {useOrderDate} from '~/pages/MyAccount/Projects/hooks/useOrderDate';
import {buildDetailsSections} from '~/pages/MyAccount/Projects/utils/buildDetailsSections';
import {isUnassignedProject} from '~/pages/MyAccount/Projects/utils/isUnassignedProject';
import {Liferay} from '~/services/liferay/liferay';

import SectionedDetailsCard from '../SectionedDetailsCard/SectionedDetailsCard';

import type {ProjectContract} from '~/hooks/useProjectCommerce';
import type {
	ProductOrderInfo,
	ProductOrderItem,
} from '~/hooks/useProjectOrders';
import type {DetailsProfile} from '~/pages/MyAccount/Projects/utils/resolveDetailsProfile';

type DetailsTabProps = {
	contract?: ProjectContract;
	orderInfo: ProductOrderInfo;
	orderItems: ProductOrderItem[];
	productName: string;
	profile: DetailsProfile;
};

const ENVIRONMENT_PROFILES: DetailsProfile[] = ['env-commerce', 'env-instance'];

export default function DetailsTab({
	contract,
	orderInfo,
	orderItems,
	productName,
	profile,
}: DetailsTabProps) {
	const {projectId} = useProject();

	const {environmentEntitlements, loading} =
		useProductEnvironmentEntitlements(
			ENVIRONMENT_PROFILES.includes(profile) ? orderItems : [],
			profile === 'env-instance'
		);

	const {contacts: securityIncidentContacts} = useProjectContacts(
		profile === 'basic-incident' && !isUnassignedProject(projectId)
			? projectId
			: '',
		SECURITY_INCIDENT_CONTACT_ERC
	);

	const {orderDate} = useOrderDate(orderInfo.orderId);

	if (loading) {
		return <Loading.Page />;
	}

	const sections = buildDetailsSections(profile, {
		accountName: Liferay.CommerceContext.account?.accountName ?? '',
		contract,
		environmentEntitlements,
		orderDate,
		orderInfo,
		productName,
		securityIncidentContacts,
	});

	return <SectionedDetailsCard sections={sections} />;
}

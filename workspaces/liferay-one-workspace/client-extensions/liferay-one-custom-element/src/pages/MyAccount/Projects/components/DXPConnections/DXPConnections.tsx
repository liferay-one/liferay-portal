/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayButton from '@clayui/button';
import DOMPurify from 'dompurify';
import {DetailedCard} from '~/components/DetailedCard/DetailedCard';
import EmptyState from '~/components/EmptyState/EmptyState';
import Loading from '~/components/Loading/Loading';
import Table from '~/components/Table/Table';
import {LearnLinks} from '~/enums/Learn';
import i18n from '~/i18n';
import {formatDateTime} from '~/utils/dateUtils';

import {useDXPConnections} from '../../hooks/useDXPConnections';

import type {Creator} from '../../hooks/useDXPConnections';

function DXPConnectionsTable() {
	const {connections, error, isLoading, isValidating, revalidate} =
		useDXPConnections();

	if (isLoading) {
		return <Loading className="my-6" shape="circle" size="md" />;
	}

	if (error) {
		return (
			<EmptyState
				description=""
				title={i18n.translate('something-went-wrong')}
				type="BLANK"
			>
				<ClayButton
					disabled={isValidating}
					displayType="secondary"
					onClick={() => revalidate()}
				>
					{i18n.translate('try-again')}
				</ClayButton>
			</EmptyState>
		);
	}

	if (!connections.length) {
		return (
			<EmptyState
				description=""
				title={i18n.translate('no-results-found')}
				type="BLANK"
			>
				<p
					dangerouslySetInnerHTML={{
						__html: DOMPurify.sanitize(
							i18n.sub(
								'to-learn-how-to-create-a-connection-see-the-x',
								[
									`<a href="${LearnLinks.CONNECTING_LIFERAY_DXP_TO_MARKETPLACE}">${i18n.translate('help-page')}</a>`,
								]
							)
						),
					}}
				/>

				<ClayButton
					disabled={isValidating}
					displayType="secondary"
					onClick={() => revalidate()}
				>
					{i18n.translate('refresh')}
				</ClayButton>
			</EmptyState>
		);
	}

	return (
		<Table
			className="table-borderless"
			columns={[
				{
					key: 'creator',
					render: (creator) => (creator as Creator).name,
					title: i18n.translate('user-name'),
				},
				{
					key: 'connectionSource',
					title: i18n.translate('source'),
				},
				{
					key: 'dateCreated',
					render: (dateCreated) =>
						formatDateTime(dateCreated as string),
					title: i18n.translate('connection-date'),
				},
			]}
			rows={connections}
		/>
	);
}

export default function DXPConnections() {
	return (
		<DetailedCard
			cardIconAltText={i18n.translate('dxp-connections')}
			cardTitle={i18n.translate('dxp-connections')}
			className="mt-3"
			clayIcon="device-check"
		>
			<div className="mt-3">
				<DXPConnectionsTable />
			</div>
		</DetailedCard>
	);
}

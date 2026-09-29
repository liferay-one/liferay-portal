/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayIcon from '@clayui/icon';
import {format} from 'date-fns';
import {useState} from 'react';
import {DetailedCard} from '~/components/DetailedCard/DetailedCard';
import {ActivationKeyLicenseKey} from '~/hooks/useActivationKeyLicenseKeys';
import i18n, {Word, translate} from '~/i18n';
import {getKeyType} from '~/pages/MyAccount/Projects/utils/getKeyType';
import {getIconSpriteMap} from '~/services/liferay/liferay';

type LicenseKeyListProps = {
	licenseKeys: ActivationKeyLicenseKey[];
};

type LicenseKeyRow = {
	label: Word;
	value: string;
};

function formatDate(value: string): string {
	return value ? format(new Date(value), 'MMM d, yyyy') : '';
}

function getRows(licenseKey: ActivationKeyLicenseKey): LicenseKeyRow[] {
	const rows: LicenseKeyRow[] = [
		{label: 'description', value: licenseKey.description},
		{label: 'product-name', value: licenseKey.productName},
		{label: 'product-version', value: licenseKey.productVersion},
		{label: 'license-name', value: licenseKey.licenseName},
		{label: 'license-type', value: licenseKey.licenseType},
		{
			label: 'key-type',
			value: licenseKey.licenseType
				? translate(getKeyType(licenseKey.licenseType))
				: '',
		},
		{label: 'ip-addresses', value: licenseKey.ipAddresses},
		{label: 'mac-addresses', value: licenseKey.macAddresses},
		{label: 'cluster-size', value: licenseKey.clusterSize},
		{label: 'instance-size', value: licenseKey.sizing},
		{label: 'data-center-location', value: licenseKey.dataCenterLocation},
		{label: 'workspace-name', value: licenseKey.workspaceName},
		{label: 'workspace-owner-email', value: licenseKey.workspaceOwnerEmail},
		{label: 'domains', value: licenseKey.domains},
		{label: 'order-id', value: licenseKey.orderId},
		{label: 'owner', value: licenseKey.owner},
		{label: 'start-date', value: formatDate(licenseKey.startDate)},
		{
			label: 'expiration-date',
			value: formatDate(licenseKey.expirationDate),
		},
		{
			label: 'subscription-type',
			value: translate(
				licenseKey.complimentary ? 'complimentary' : 'subscription'
			),
		},
	];

	return rows.filter((row) => row.value);
}

function getSummary(licenseKey: ActivationKeyLicenseKey): string {
	return [licenseKey.productName, licenseKey.licenseName]
		.filter(Boolean)
		.join(' — ');
}

export default function LicenseKeyList({licenseKeys}: LicenseKeyListProps) {
	const [expandedLicenseKeyIds, setExpandedLicenseKeyIds] = useState<
		Record<string, boolean>
	>({});

	return (
		<DetailedCard
			cardIconAltText={i18n.translate('license-keys')}
			cardTitle={i18n.translate('license-keys')}
			className="mt-3"
			clayIcon="key-horizontal"
			iconPosition="right"
		>
			{licenseKeys.length ? (
				<div className="mt-4">
					{licenseKeys.map((licenseKey) => {
						const expanded =
							expandedLicenseKeyIds[licenseKey.licenseKeyId] ??
							false;

						return (
							<div
								className="border-bottom"
								key={licenseKey.licenseKeyId}
							>
								<button
									aria-expanded={expanded}
									className="align-items-center bg-transparent border-0 d-flex p-3 text-left w-100"
									onClick={() =>
										setExpandedLicenseKeyIds(
											(previous) => ({
												...previous,
												[licenseKey.licenseKeyId]:
													!expanded,
											})
										)
									}
									style={{gap: 'var(--spacer-3)'}}
									type="button"
								>
									<ClayIcon
										spritemap={getIconSpriteMap()}
										symbol={
											expanded
												? 'angle-down'
												: 'angle-right'
										}
									/>

									<span
										className="flex-grow-1"
										style={{
											color: 'var(--color-neutral-10)',
											fontWeight: 600,
										}}
									>
										{getSummary(licenseKey)}
									</span>

									<span
										className="text-neutral-7"
										style={{whiteSpace: 'nowrap'}}
									>
										{licenseKey.hostName}
									</span>
								</button>

								{expanded && (
									<div
										className="pb-4 px-3"
										style={{
											columnGap: 'var(--spacer-5)',
											display: 'grid',
											gridTemplateColumns:
												'repeat(auto-fill, minmax(20rem, 1fr))',
											rowGap: 'var(--spacer-3)',
										}}
									>
										{getRows(licenseKey).map((row) => (
											<div
												className="align-items-baseline d-flex"
												key={row.label}
											>
												<span
													style={{
														color: 'var(--color-neutral-10)',
														flex: '0 0 45%',
														fontWeight: 600,
													}}
												>
													{translate(row.label)}
												</span>

												<span
													style={{
														color: 'var(--color-neutral-8)',
														overflowWrap:
															'anywhere',
													}}
												>
													{row.value}
												</span>
											</div>
										))}
									</div>
								)}
							</div>
						);
					})}
				</div>
			) : (
				<div className="mt-4 text-neutral-7">
					{translate('no-results-found')}
				</div>
			)}
		</DetailedCard>
	);
}

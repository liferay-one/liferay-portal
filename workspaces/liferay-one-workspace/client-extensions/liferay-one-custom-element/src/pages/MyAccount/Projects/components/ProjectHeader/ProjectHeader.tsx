/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useState} from 'react';
import contractTermIconUrl from '~/assets/icons/contract_term_icon.svg';
import EntitySelector, {
	SelectorItem,
} from '~/components/EntitySelector/EntitySelector';
import {useProject} from '~/context/ProjectContext';
import {useProjectCommerce} from '~/hooks/useProjectCommerce';
import i18n from '~/i18n';
import {ONE_TIME_PURCHASES} from '~/pages/MyAccount/Projects/projects';
import {formatTermRange} from '~/utils/dateUtils';

import type {ProjectContract} from '~/hooks/useProjectCommerce';

function getContractSubtitle(contract?: ProjectContract) {
	return contract?.externalReferenceCode === ONE_TIME_PURCHASES
		? i18n.translate('no-contract-linked')
		: contract?.name;
}

function getContractTitle(contract?: ProjectContract) {
	return contract?.externalReferenceCode === ONE_TIME_PURCHASES
		? contract.name
		: formatTermRange(contract?.endDate, contract?.startDate);
}

export default function ProjectHeader() {
	const {projectId, selectedContractERC, setSelectedContractERC} =
		useProject();

	const {contracts, loading, resolvedContractERC} = useProjectCommerce(
		projectId,
		selectedContractERC
	);

	const [searchValue, setSearchValue] = useState('');

	const selectedContract = contracts.find(
		(contract) => contract.externalReferenceCode === resolvedContractERC
	);

	const normalizedSearchValue = searchValue.trim().toLowerCase();

	const items: SelectorItem[] = contracts
		.map((contract) => ({
			id: contract.externalReferenceCode,
			name: getContractTitle(contract) ?? '',
			subtitle: getContractSubtitle(contract),
		}))
		.filter((item) =>
			[item.name, item.subtitle]
				.join(' ')
				.toLowerCase()
				.includes(normalizedSearchValue)
		);

	const handleSelect = (contractERC: string) => {
		setSearchValue('');

		setSelectedContractERC(contractERC);
	};

	const readOnly = contracts.length <= 1;

	return (
		<div
			className="d-flex flex-wrap mb-3"
			style={
				readOnly
					? undefined
					: {
							backgroundColor: 'var(--color-neutral-1)',
							border: '1px solid var(--color-neutral-2)',
							borderRadius: 'var(--border-radius-lg, 0.625rem)',
							padding: 'var(--spacer-3) var(--spacer-2)',
							width: 'fit-content',
						}
			}
		>
			<EntitySelector
				ariaLabel={i18n.translate('select-contract')}
				items={items}
				label={i18n.translate('contract-term')}
				loading={loading}
				name={getContractTitle(selectedContract) ?? ''}
				onSearchChange={setSearchValue}
				onSelect={handleSelect}
				readOnly={readOnly}
				searchValue={searchValue}
				selectedId={resolvedContractERC}
				subtitle={getContractSubtitle(selectedContract)}
				triggerIcon={<img alt="" src={contractTermIconUrl} />}
				variant="rich"
			/>
		</div>
	);
}

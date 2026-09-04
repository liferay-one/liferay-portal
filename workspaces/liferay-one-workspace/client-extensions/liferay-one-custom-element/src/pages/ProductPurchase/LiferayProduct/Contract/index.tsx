/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayLoadingIndicator from '@clayui/loading-indicator';
import {Navigate} from 'react-router-dom';
import ProductPurchase from '~/components/ProductPurchase/ProductPurchase';
import RadioCardList, {
	RadioOption,
} from '~/components/RadioCardList/RadioCardList';
import {useProperties} from '~/context/PropertiesContext';
import {useFetch} from '~/hooks/useFetch';
import i18n from '~/i18n';
import {useProductPurchaseLayoutContext} from '~/pages/ProductPurchase/components/ProductPurchaseLayout/ProductPurchaseLayout';
import {useAppPurchaseContext} from '~/pages/ProductPurchase/context/AppPurchaseContext';
import {Liferay} from '~/services/liferay/liferay';
import SearchBuilder from '~/utils/SearchBuilder';
import {formatTermRange} from '~/utils/dateUtils';

import NoContractAvailable from './NoContractAvailable/NoContractAvailable';

import type {APIResponse} from '~/types/api';
import type {SalesforceContract} from '~/types/salesforceContract';

type ContractAPIItem = {
	endDate?: string;
	externalReferenceCode: string;
	id: number;
	name?: string;
	startDate?: string;
};

const ContractSelection = () => {
	const {contactSupportURL} = useProperties();

	const {salesforceContract, salesforceProject, setSalesforceContract} =
		useAppPurchaseContext();

	const {
		actions: {nextStep, previousStep},
	} = useProductPurchaseLayoutContext();

	const {
		data: contractsData,
		error,
		isLoading,
	} = useFetch<APIResponse<ContractAPIItem>>(
		salesforceProject?.id ? '/o/c/contracts' : null,
		{
			params: {
				filter: SearchBuilder.eq(
					'r_projectToContract_c_projectId',
					salesforceProject?.id as number
				),
				pageSize: 200,
				sort: 'startDate:desc',
			},
		}
	);

	if (!salesforceProject) {
		return <Navigate replace to="/" />;
	}

	if (isLoading) {
		return <ClayLoadingIndicator />;
	}

	if (error) {
		return (
			<ProductPurchase.Shell title={i18n.translate('contract-selection')}>
				<span className="secondary-text">
					{i18n.translate('an-unexpected-error-occurred')}
				</span>
			</ProductPurchase.Shell>
		);
	}

	const contracts = contractsData?.items ?? [];

	if (!contracts.length) {
		return <NoContractAvailable />;
	}

	const continueButtonProps = {
		children: i18n.translate('continue'),
		disabled: isLoading || !salesforceContract,
		onClick: () => {
			nextStep();
		},
	};

	return (
		<ProductPurchase.Shell
			className="d-flex flex-column"
			footerProps={{
				backButtonProps: {onClick: previousStep},
				continueButtonProps,
			}}
			title={i18n.translate('contract-selection')}
		>
			<span
				className="mb-4 secondary-text"
				dangerouslySetInnerHTML={{
					__html: i18n.sub('x-available-for-you', [
						'contracts',
						Liferay.ThemeDisplay.getUserEmailAddress(),
					]),
				}}
			/>
			<RadioCardList<ContractAPIItem>
				contentList={contracts.map((contract, index) => ({
					description: formatTermRange(
						contract.endDate,
						contract.startDate
					),
					fullTitle: true,
					id: index,
					selected:
						contract.externalReferenceCode ===
						salesforceContract?.externalReferenceCode,
					title: (
						<span className="font-weight-semi-bold">
							{contract.name || contract.externalReferenceCode}
						</span>
					),
					value: contract,
				}))}
				leftRadio
				onSelect={(radioOption: RadioOption<ContractAPIItem>) =>
					setSalesforceContract({
						endDate: radioOption.value.endDate,
						externalReferenceCode:
							radioOption.value.externalReferenceCode,
						id: radioOption.value.id,
						name: radioOption.value.name,
						startDate: radioOption.value.startDate,
					} as SalesforceContract)
				}
			/>

			<p className="secondary-text">
				{i18n.translate('not-seeing-a-specific-contract')}

				<a
					className="font-weight-semi-bold ml-1"
					href={contactSupportURL}
					target="_blank"
				>
					{i18n.translate('contact-support')}
				</a>
			</p>
		</ProductPurchase.Shell>
	);
};

export default ContractSelection;

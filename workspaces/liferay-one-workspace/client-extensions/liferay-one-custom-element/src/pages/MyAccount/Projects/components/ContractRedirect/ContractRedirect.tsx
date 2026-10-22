/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useEffect} from 'react';
import {Navigate, Outlet, useLocation, useMatch, useParams} from 'react-router';
import Loading from '~/components/Loading/Loading';
import {useProject} from '~/context/ProjectContext';
import {useProjectContractERC} from '~/hooks/useProjectItems';

export default function ContractRedirect() {
	const {
		accountERC,
		contractERC: requestedContractERC,
		projectERC,
	} = useParams();

	const {search} = useLocation();

	const contractProductsMatch = useMatch(
		'/:accountERC/project/:projectERC/contract/:contractERC/products/*'
	);

	const productsMatch = useMatch(
		'/:accountERC/project/:projectERC/products/*'
	);

	const {rememberContractERC} = useProject();

	const {contractERC, error, loading} = useProjectContractERC();

	const requestedContractResolved =
		!loading && !error && contractERC === requestedContractERC;

	useEffect(() => {
		if (requestedContractResolved && contractERC) {
			rememberContractERC(contractERC);
		}
	}, [contractERC, rememberContractERC, requestedContractResolved]);

	if (loading) {
		return <Loading.Page fill />;
	}

	if (error || contractERC === requestedContractERC) {
		return <Outlet />;
	}

	const productPath =
		(contractProductsMatch ?? productsMatch)?.params['*'] ?? '';

	return (
		<Navigate
			replace
			to={`/${accountERC}/project/${projectERC}${contractERC ? `/contract/${contractERC}` : ''}/products${productPath ? `/${productPath}` : ''}${search}`}
		/>
	);
}

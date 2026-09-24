/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useState} from 'react';
import {HashRouter, Navigate, Outlet, useRoutes} from 'react-router-dom';
import useRequireSignIn from '~/hooks/useRequireSignIn';
import {safeJSONParse} from '~/utils/safeJSONParse';

import AccountSelection from './AccountSelection/AccountSelection';
import Congratulations from './Congratulations/Congratulations';

import type {Account} from '~/types/accounts';

import type {OAuth2AuthorizeContext} from './types';

const searchParams = new URLSearchParams(window.location.search);

const code = searchParams.get('code') ?? '';

const state = safeJSONParse<{origin?: unknown} | null>(
	searchParams.get('state'),
	null
);

const origin = typeof state?.origin === 'string' ? state.origin : '';

function OAuth2AuthorizeLayout() {
	const [selectedAccount, setSelectedAccount] = useState<Account>();

	const context: OAuth2AuthorizeContext = {
		code,
		origin,
		selectedAccount,
		setSelectedAccount,
	};

	return (
		<div className="container mt-5">
			<Outlet context={context} />
		</div>
	);
}

function OAuth2AuthorizeRoutes() {
	return useRoutes([
		{
			children: [
				{element: <AccountSelection />, index: true},
				{element: <Congratulations />, path: 'congratulations'},
				{element: <Navigate replace to="/" />, path: '*'},
			],
			element: <OAuth2AuthorizeLayout />,
			path: '/',
		},
	]);
}

export default function OAuth2AuthorizeRouter() {
	const isSignedIn = useRequireSignIn();

	if (!isSignedIn) {
		return null;
	}

	return (
		<HashRouter>
			<OAuth2AuthorizeRoutes />
		</HashRouter>
	);
}

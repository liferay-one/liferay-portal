/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useEffect, useState} from 'react';
import {Navigate} from 'react-router-dom';
import congratulationsIcon from '~/assets/icons/congratulations_icon.svg';
import {useOneContext} from '~/context/OneContextProvider';
import i18n from '~/i18n';
import fetcher from '~/services/fetcher/fetcher';
import {Liferay} from '~/services/liferay/liferay';
import DXP from '~/services/spring-boot/DXP';
import SearchBuilder from '~/utils/SearchBuilder';
import {safeJSONParse} from '~/utils/safeJSONParse';

import useOAuth2AuthorizeContext from '../hooks/useOAuth2AuthorizeContext';

const POST_MESSAGE_DELAY = 3000;

export default function Congratulations() {
	const {channel, myUserAccount} = useOneContext();
	const {selectedAccount} = useOAuth2AuthorizeContext();

	const [failed, setFailed] = useState(false);

	useEffect(() => {
		if (!selectedAccount || !myUserAccount) {
			return;
		}

		const searchParams = new URLSearchParams(window.location.search);

		const {origin} = safeJSONParse(searchParams.get('state'), {
			origin: '',
		});

		if (!origin) {
			setFailed(true);

			return;
		}

		let cancelled = false;
		let timeout: number | undefined;

		Promise.all([
			fetcher.post('/o/c/oauth2dxpauthorizations', {
				connectionSource: origin,
				r_accountEntryToOAuth2DxpAuthorization_accountEntryId:
					selectedAccount.id,
			}),
			DXP.getHomePageURL(),
		])
			.then(([, serviceURL]) => {
				if (cancelled) {
					return;
				}

				const payload = {
					code: searchParams.get('code'),
					serviceURL,
					settings: {
						account: {
							id: selectedAccount.id,
							image: selectedAccount.logoURL,
							name: selectedAccount.name,
						},
						channelId: channel.channelId,
						references: {
							fragmentsFilter: SearchBuilder.lambda(
								'categoryNames',
								'fragments'
							),
							paymentMethodFilter: SearchBuilder.lambda(
								'categoryNames',
								'payment-methods'
							),
						},
						siteId: Liferay.ThemeDisplay.getScopeGroupId(),
						userAccount: {
							id: myUserAccount.id,
							image: myUserAccount.image,
							name: myUserAccount.name,
						},
					},
				};

				timeout = window.setTimeout(() => {
					window.opener?.postMessage(payload, origin);
				}, POST_MESSAGE_DELAY);
			})
			.catch(() => {
				if (!cancelled) {
					setFailed(true);
				}
			});

		return () => {
			cancelled = true;

			window.clearTimeout(timeout);
		};
	}, [channel, myUserAccount, selectedAccount]);

	if (!selectedAccount) {
		return <Navigate replace to="/" />;
	}

	return (
		<div className="align-items-center border d-flex flex-column justify-content-center p-5 rounded">
			<img alt="" draggable={false} src={congratulationsIcon} />

			<h1 className="pt-7">
				{i18n.translate(
					failed ? 'something-went-wrong' : 'do-not-close-this-window'
				)}
			</h1>

			<p className="align-items-center d-flex mt-4 px-3 secondary-text">
				{i18n.translate(
					failed
						? 'an-unexpected-error-occurred'
						: 'you-are-finalizing-your-connection-with-the-marketplace'
				)}
			</p>
		</div>
	);
}

/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useEffect, useRef, useState} from 'react';
import {Navigate} from 'react-router-dom';
import congratulationsIcon from '~/assets/icons/congratulations_icon.svg';
import {useOneContext} from '~/context/OneContextProvider';
import i18n from '~/i18n';
import fetcher from '~/services/fetcher/fetcher';
import {Liferay} from '~/services/liferay/liferay';
import DXP from '~/services/spring-boot/DXP';
import SearchBuilder from '~/utils/SearchBuilder';

import useOAuth2AuthorizeContext from '../hooks/useOAuth2AuthorizeContext';

const POST_MESSAGE_DELAY = 3000;

export default function Congratulations() {
	const {channel, myUserAccount} = useOneContext();
	const {code, environment, origin, selectedAccount} =
		useOAuth2AuthorizeContext();

	const [failed, setFailed] = useState(false);

	const handedOffRef = useRef(false);

	useEffect(() => {
		if (!selectedAccount || !myUserAccount || handedOffRef.current) {
			return;
		}

		if (!code || !origin) {
			setFailed(true);

			return;
		}

		handedOffRef.current = true;

		let cancelled = false;

		DXP.getHomePageURL()
			.then(async (serviceURL) => {
				await fetcher.post('/o/c/oauth2dxpauthorizations', {
					connectionSource: origin,
					r_accountEntryToOAuth2DxpAuthorization_accountEntryId:
						selectedAccount.id,
				});

				const payload = {
					code,
					serviceURL,
					settings: {
						account: {
							id: selectedAccount.id,
							image: selectedAccount.logoURL,
							name: selectedAccount.name,
						},
						channelId: channel.channelId,
						cloudProject: environment?.projectId,
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

				window.setTimeout(() => {
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
		};
	}, [channel, code, environment, myUserAccount, origin, selectedAccount]);

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

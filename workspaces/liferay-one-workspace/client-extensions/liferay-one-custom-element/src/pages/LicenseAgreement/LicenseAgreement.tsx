/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import DOMPurify from 'dompurify';
import useSWR from 'swr';
import i18n from '~/i18n';
import {getEulaDescription} from '~/utils/publishUtils';

export default function LicenseAgreement() {
	const {data: eula = ''} = useSWR('/eula', getEulaDescription);

	return (
		<>
			<header className="d-flex justify-content-center">
				<h2>{i18n.translate('marketplace-licensor-eula')}</h2>
			</header>

			<hr />

			<main>
				<div
					dangerouslySetInnerHTML={{
						__html: DOMPurify.sanitize(eula),
					}}
				/>
			</main>
		</>
	);
}

/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ReactNode} from 'react';

import './EnvironmentCards.css';

type EnvironmentCardsProps = {
	children: ReactNode;
};

export default function EnvironmentCards({children}: EnvironmentCardsProps) {
	return <div className="environment-cards">{children}</div>;
}

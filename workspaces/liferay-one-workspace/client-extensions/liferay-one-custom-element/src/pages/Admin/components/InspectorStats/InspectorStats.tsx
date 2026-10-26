/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import classNames from 'classnames';
import {CSSProperties} from 'react';
import i18n from '~/i18n';

import type {Word} from '~/i18n';
import type {AccountFindingSeverity} from '~/types/accountInspection';

type InspectorStat = {
	label: Word;
	severity?: AccountFindingSeverity;
	value?: number;
};

type InspectorStatsProps = {
	stats: InspectorStat[];
};

export default function InspectorStats({stats}: InspectorStatsProps) {
	return (
		<div
			className="inspector-stats mb-3"
			style={
				{
					'--inspector-stats-columns': stats.length,
				} as CSSProperties
			}
		>
			{stats.map(({label, severity, value}) => (
				<div className="border px-4 py-3 rounded-lg" key={label}>
					<div className="small text-secondary">
						{i18n.translate(label)}
					</div>

					<div
						className={classNames('font-weight-bold h3 mb-0', {
							[`text-${severity}`]: severity,
						})}
					>
						{value ?? '-'}
					</div>
				</div>
			))}
		</div>
	);
}

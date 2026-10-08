/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayButton from '@clayui/button';
import ClayDropDown from '@clayui/drop-down';
import ClayIcon from '@clayui/icon';
import {useState} from 'react';
import {translate} from '~/i18n';
import {
	PubSubMessage,
	PubSubSample,
} from '~/pages/Admin/PubSub/utils/getPubSubSamples';

type GenerateSampleButtonProps = {
	onGenerate: (message: PubSubMessage) => void;
	samples: PubSubSample[];
};

function groupSamples(samples: PubSubSample[]) {
	const groupedSamples = new Map<string, PubSubSample[]>();

	for (const sample of samples) {
		const group = sample.group ?? '';

		groupedSamples.set(group, [
			...(groupedSamples.get(group) ?? []),
			sample,
		]);
	}

	return [...groupedSamples.entries()];
}

export default function GenerateSampleButton({
	onGenerate,
	samples,
}: GenerateSampleButtonProps) {
	const [active, setActive] = useState(false);

	if (!samples.length) {
		return null;
	}

	if (samples.length === 1) {
		return (
			<ClayButton
				displayType="secondary"
				onClick={() => onGenerate(samples[0].generate())}
				size="sm"
			>
				{translate('generate-sample')}
			</ClayButton>
		);
	}

	return (
		<ClayDropDown
			active={active}
			menuHeight="auto"
			onActiveChange={setActive}
			trigger={
				<ClayButton displayType="secondary" size="sm">
					{translate('generate-sample')}

					<ClayIcon className="ml-2" symbol="caret-bottom" />
				</ClayButton>
			}
		>
			<ClayDropDown.ItemList>
				{groupSamples(samples).map(([group, groupSamples]) => (
					<ClayDropDown.Group header={group} key={group}>
						{groupSamples.map((sample) => (
							<ClayDropDown.Item
								key={sample.label}
								onClick={() => {
									setActive(false);

									onGenerate(sample.generate());
								}}
							>
								{sample.label}
							</ClayDropDown.Item>
						))}
					</ClayDropDown.Group>
				))}
			</ClayDropDown.ItemList>
		</ClayDropDown>
	);
}

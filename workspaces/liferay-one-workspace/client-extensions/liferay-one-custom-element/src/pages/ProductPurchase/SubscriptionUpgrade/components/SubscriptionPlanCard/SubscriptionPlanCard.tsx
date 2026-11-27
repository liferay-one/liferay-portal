/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayButton from '@clayui/button';
import ClayIcon from '@clayui/icon';
import classNames from 'classnames';
import checkCircleFullIconUrl from '~/assets/icons/check_circle_full.svg';
import i18n from '~/i18n';

import './SubscriptionPlanCard.css';

import type {Word} from '~/i18n';

type SubscriptionPlanCardProps = {
	current?: boolean;
	description: Word;
	disabled?: boolean;
	features: Word[];
	name: Word;
	onPurchase?: () => void;
	price: string;
	priceSuffix?: string;
};

const SubscriptionPlanCard = ({
	current = false,
	description,
	disabled = false,
	features,
	name,
	onPurchase,
	price,
	priceSuffix,
}: SubscriptionPlanCardProps) => (
	<div
		className={classNames(
			'd-flex flex-column h-100 p-4 subscription-plan-card',
			{current}
		)}
	>
		<div className="align-items-center d-flex justify-content-between mb-4">
			<h2 className="h4 mb-0">{i18n.translate(name)}</h2>

			{current && (
				<span className="align-items-center d-inline-flex subscription-plan-card-current-badge">
					<img
						alt=""
						draggable="false"
						height={16}
						src={checkCircleFullIconUrl}
						width={16}
					/>

					{i18n.translate('current-plan')}
				</span>
			)}
		</div>

		<div className="align-items-baseline d-flex">
			<span className="h2 mb-0 mr-2">{price}</span>

			{priceSuffix && (
				<span className="text-secondary">{priceSuffix}</span>
			)}
		</div>

		<small className="mb-4 text-secondary">
			{i18n.translate('plus-usage-based-tokens')}
		</small>

		<p>{i18n.translate(description)}</p>

		<strong className="mb-2">{i18n.translate('whats-included')}</strong>

		<ul className="list-unstyled mb-4">
			{features.map((feature) => (
				<li className="d-flex mb-2" key={feature}>
					<ClayIcon className="mr-2 mt-1" symbol="check" />

					{i18n.translate(feature)}
				</li>
			))}
		</ul>

		<ClayButton
			className="mt-auto w-100"
			disabled={current || disabled}
			displayType={current ? 'secondary' : 'primary'}
			onClick={onPurchase}
		>
			{i18n.translate(current ? 'current-plan' : 'purchase')}
		</ClayButton>
	</div>
);

export default SubscriptionPlanCard;

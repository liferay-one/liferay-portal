/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useAccount} from '~/context/AccountContext';
import {SubscriptionUpgradeType} from '~/enums/SubscriptionUpgradeType';
import {useSubscriptionUpgrades} from '~/hooks/useSubscriptionUpgrades';
import {Liferay} from '~/services/liferay/liferay';

import AIHubUpgradeCard from './AIHubUpgradeCard';

import type {SubscriptionUpgrade} from '~/types/subscriptionUpgrade';

vi.mock('~/context/AccountContext', () => ({
	useAccount: vi.fn(),
}));

vi.mock('~/hooks/useSubscriptionUpgrades', () => ({
	useSubscriptionUpgrades: vi.fn(),
}));

vi.mock('~/utils/siteUtils', () => ({
	getSiteURL: () => '/web/one',
}));

const aiHubTierUpgrade: SubscriptionUpgrade = {
	contractEndDate: '2027-06-10',
	currentTier: 'activate',
	productExternalReferenceCode: 'AI-HUB',
	targetProductId: 4321,
	targetTier: 'studio',
	type: SubscriptionUpgradeType.AI_HUB_TIER,
};

function mockSubscriptionUpgrades(data?: SubscriptionUpgrade[]) {
	vi.mocked(useSubscriptionUpgrades).mockReturnValue({
		data,
		isLoading: false,
	} as ReturnType<typeof useSubscriptionUpgrades>);
}

function expectOnlyDetails() {
	expect(screen.getByText('Details')).toBeInTheDocument();
	expect(screen.queryByText('Move to Studio')).not.toBeInTheDocument();
}

function renderCard(
	projectExternalReferenceCode: string,
	productExternalReferenceCode = 'AI-HUB'
) {
	return render(
		<AIHubUpgradeCard
			productExternalReferenceCode={productExternalReferenceCode}
			projectExternalReferenceCode={projectExternalReferenceCode}
		>
			<div>Details</div>
		</AIHubUpgradeCard>
	);
}

describe('AIHubUpgradeCard', () => {
	beforeEach(() => {
		Liferay.Util.navigate = vi.fn();

		vi.mocked(useAccount).mockReturnValue({
			account: {id: 7},
			loading: false,
		} as ReturnType<typeof useAccount>);
	});

	it('asks for the upgrades of the account and the project', () => {
		mockSubscriptionUpgrades([]);

		renderCard('PROJECT-1');

		expect(useSubscriptionUpgrades).toHaveBeenCalledWith(7, 'PROJECT-1');
	});

	it('renders only the details when the AI Hub tier upgrade is not available', () => {
		mockSubscriptionUpgrades([
			{...aiHubTierUpgrade, type: SubscriptionUpgradeType.CMP_ADD_ON},
		]);

		renderCard('PROJECT-1');

		expectOnlyDetails();
	});

	it('renders only the details while the upgrades are unknown', () => {
		mockSubscriptionUpgrades(undefined);

		renderCard('PROJECT-1');

		expectOnlyDetails();
	});

	it('renders only the details when the upgrade is for another product', () => {
		mockSubscriptionUpgrades([aiHubTierUpgrade]);

		renderCard('PROJECT-1', 'OTHER-PRODUCT');

		expectOnlyDetails();
	});

	it('renders only the details when the upgrade goes to another tier', () => {
		mockSubscriptionUpgrades([{...aiHubTierUpgrade, targetTier: 'pro'}]);

		renderCard('PROJECT-1');

		expectOnlyDetails();
	});

	it('opens the upgrade flow of the target product for the project', async () => {
		mockSubscriptionUpgrades([aiHubTierUpgrade]);

		renderCard('PROJECT 1');

		expect(screen.getByText('Move to Studio')).toBeInTheDocument();

		await userEvent.click(
			screen.getByRole('button', {name: /Upgrade Now/})
		);

		expect(Liferay.Util.navigate).toHaveBeenCalledWith(
			'/web/one/product-purchase?productId=4321&projectExternalReferenceCode=PROJECT+1&upgradeType=ai-hub-tier#/'
		);
	});
});

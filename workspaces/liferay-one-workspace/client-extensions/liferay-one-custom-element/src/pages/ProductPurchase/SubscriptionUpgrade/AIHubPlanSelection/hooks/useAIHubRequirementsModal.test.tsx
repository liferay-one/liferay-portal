/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {ReactElement} from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import AIHubRequirementsModalContent from '~/pages/ProductPurchase/SubscriptionUpgrade/AIHubPlanSelection/components/AIHubRequirementsModalContent/AIHubRequirementsModalContent';

import {useAIHubRequirementsModal} from './useAIHubRequirementsModal';

const {onClose, onOpenModal} = vi.hoisted(() => ({
	onClose: vi.fn(),
	onOpenModal: vi.fn(),
}));

vi.mock('~/hooks/useModalContext', () => ({
	default: () => ({onClose, onOpenModal}),
}));

describe('useAIHubRequirementsModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('opens a medium modal with the AI Hub requirements content', () => {
		const onContinue = vi.fn();

		const {result} = renderHook(() => useAIHubRequirementsModal());

		result.current.openModal(onContinue);

		const [options] = onOpenModal.mock.calls[0] as [
			{body: ReactElement; header?: string; size: string},
		];

		expect(options.size).toBe('md');
		expect(options.header).toBeUndefined();
		expect(options.body.type).toBe(AIHubRequirementsModalContent);
		expect(options.body.props).toEqual({onClose, onContinue});
	});
});

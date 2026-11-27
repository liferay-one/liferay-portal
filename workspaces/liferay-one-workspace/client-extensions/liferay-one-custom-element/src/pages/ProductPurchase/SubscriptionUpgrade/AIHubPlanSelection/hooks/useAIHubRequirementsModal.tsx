/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import useModalContext from '~/hooks/useModalContext';
import AIHubRequirementsModalContent from '~/pages/ProductPurchase/SubscriptionUpgrade/AIHubPlanSelection/components/AIHubRequirementsModalContent/AIHubRequirementsModalContent';

const useAIHubRequirementsModal = () => {
	const modalContext = useModalContext();

	return {
		openModal: (onContinue: () => void) =>
			modalContext.onOpenModal({
				body: (
					<AIHubRequirementsModalContent
						onClose={modalContext.onClose}
						onContinue={onContinue}
					/>
				),
				size: 'md',
			}),
	};
};

export {useAIHubRequirementsModal};

/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayButton from '@clayui/button';
import Modal from '~/components/Modal/Modal';
import i18n from '~/i18n';

import type {Observer} from '@clayui/modal/lib/types';

type ConfirmPurchaseModalProps = {
	observer: Observer;
	onCancel: () => void;
	onConfirm: () => void;
	visible: boolean;
};

const ConfirmPurchaseModal = ({
	observer,
	onCancel,
	onConfirm,
	visible,
}: ConfirmPurchaseModalProps) => (
	<Modal
		last={
			<ClayButton.Group spaced>
				<ClayButton displayType="secondary" onClick={onCancel}>
					{i18n.translate('cancel')}
				</ClayButton>

				<ClayButton onClick={onConfirm}>
					{i18n.translate('continue')}
				</ClayButton>
			</ClayButton.Group>
		}
		observer={observer}
		title={i18n.translate('confirm-your-purchase')}
		visible={visible}
	>
		{i18n.translate(
			'by-confirming-you-will-receive-a-sales-order-to-review-and-sign-your-order-will-be-processed-and-the-payment-charged-under-your-payment-agreements-once-we-receive-the-signed-document'
		)}
	</Modal>
);

export default ConfirmPurchaseModal;

/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayButton, {ClayButtonWithIcon} from '@clayui/button';
import i18n from '~/i18n';

import './AIHubRequirementsModalContent.css';

type AIHubRequirementsModalContentProps = {
	onClose: () => void;
	onContinue: () => void;
};

const AIHubRequirementsModalContent = ({
	onClose,
	onContinue,
}: AIHubRequirementsModalContentProps) => (
	<div className="ai-hub-requirements-modal-content">
		<div className="align-items-start d-flex justify-content-between">
			<div>
				<span className="ai-hub-requirements-modal-content-eyebrow font-weight-semi-bold text-uppercase">
					{i18n.translate('liferay-ai-hub')}
				</span>

				<h2 className="ai-hub-requirements-modal-content-title">
					{i18n.translate('ai-hub-requirements')}
				</h2>
			</div>

			<ClayButtonWithIcon
				aria-label={i18n.translate('close')}
				displayType="unstyled"
				onClick={onClose}
				symbol="times"
			/>
		</div>

		<p className="ai-hub-requirements-modal-content-description">
			{i18n.translate(
				'the-liferay-ai-hub-requires-the-2026-q1-release-of-dxp-or-above-to-run'
			)}
		</p>

		<div className="d-flex justify-content-end mt-5">
			<ClayButton displayType="secondary" onClick={onClose}>
				{i18n.translate('cancel')}
			</ClayButton>

			<ClayButton
				className="ml-3"
				onClick={() => {
					onClose();
					onContinue();
				}}
			>
				{i18n.translate('continue')}
			</ClayButton>
		</div>
	</div>
);

export default AIHubRequirementsModalContent;

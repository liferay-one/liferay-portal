/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayButton from '@clayui/button';
import {useAIHubProduct} from '~/hooks/useAIHubProduct';
import useModalContext from '~/hooks/useModalContext';
import i18n from '~/i18n';
import {Liferay} from '~/services/liferay/liferay';
import {getProductPageURL} from '~/utils/productUtils';
import {getSiteURL} from '~/utils/siteUtils';

const useSEOStudioRequirementsModal = () => {
	const {data: aiHubProduct} = useAIHubProduct();

	const modalContext = useModalContext();

	return {
		openModal: () =>
			modalContext.onOpenModal({
				body: (
					<p className="text-muted">
						{i18n.translate(
							'this-product-is-only-available-for-ai-hub-customers'
						)}
					</p>
				),
				footer: [
					null,
					null,
					[
						<ClayButton
							displayType="secondary"
							key={0}
							onClick={modalContext.onClose}
						>
							{i18n.translate('cancel')}
						</ClayButton>,

						<ClayButton
							className="ml-2"
							key={1}
							onClick={() => {
								modalContext.onClose();

								Liferay.Util.navigate(
									getProductPageURL(aiHubProduct?.urls) ??
										`${getSiteURL()}/products`
								);
							}}
						>
							{i18n.translate('continue')}
						</ClayButton>,
					],
				],
				header: i18n.translate('seo-studio-requirements'),
				size: 'md',
				status: 'info',
			}),
	};
};

export {useSEOStudioRequirementsModal};

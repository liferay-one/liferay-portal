/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useNavigate} from 'react-router-dom';
import {useConfirmationModal} from '~/hooks/useConfirmationModal';
import i18n from '~/i18n';
import HeadlessCommerceAdminCatalog from '~/services/headless/HeadlessCommerceAdminCatalog';
import {Liferay} from '~/services/liferay/liferay';
import {formatDate} from '~/utils/dateUtils';
import {
	ProductWorkflowStatusCode,
	getProductPageURL,
} from '~/utils/productUtils';

import PublishedProductsListView, {
	renderProductName,
	renderProductStatus,
} from '../components/PublishedProductsListView/PublishedProductsListView';

import type {Product} from '~/types/product';

export default function PublishedSolutions() {
	const confirmationModal = useConfirmationModal();
	const navigate = useNavigate();

	return (
		<PublishedProductsListView
			categoryVocabulary="solution"
			ctaLabel="new-solution-template"
			description="manage-and-publish-solutions-on-the-marketplace"
			emptyStateDescription="publish-your-first-solution-to-make-it-available"
			emptyStateTitle="you-havent-published-any-solutions-yet"
			filterSchema="publisherSolutions"
			id="publisher-published-solutions"
			onCtaClick={() => navigate('/newsolution/publisher')}
			tableProps={{
				actions: [
					{
						disabled: (product: Product) =>
							product.productStatus ===
							ProductWorkflowStatusCode.PENDING,
						icon: 'pencil',
						name: i18n.translate('edit'),
						onClick: (product: Product) =>
							navigate(
								`/newsolution/${product.productId}/publisher/profile`
							),
					},
					{
						disabled: (product: Product) =>
							product.productStatus !==
							ProductWorkflowStatusCode.APPROVED,
						icon: 'shortcut',
						name: i18n.translate('open-in-marketplace'),
						onClick: (product: Product) => {
							const url = getProductPageURL(product.urls);

							if (url) {
								window.location.href = url;
							}
						},
					},
					{
						disabled: (product: Product) =>
							product.productStatus ===
							ProductWorkflowStatusCode.PENDING,
						icon: 'trash',
						name: i18n.translate('delete'),
						onClick: (product: Product, mutate) => {
							confirmationModal.openModal({
								body: (
									<p>
										{i18n.sub(
											'x-will-be-deleted-and-this-action-cant-be-undone-are-you-sure-you-want-to-delete-it',
											product.name?.en_US || ''
										)}
									</p>
								),
								header: i18n.translate('confirm-deletion'),
								onConfirm: async () => {
									try {
										await HeadlessCommerceAdminCatalog.deleteProduct(
											product.productId
										);

										mutate?.();

										Liferay.Util.openToast({
											message: i18n.translate(
												'solution-deleted-successfully'
											),
											type: 'success',
										});
									}
									catch {
										Liferay.Util.openToast({
											message: i18n.translate(
												'an-unexpected-error-occurred'
											),
											type: 'danger',
										});
									}
								},
							});
						},
					},
				],
				columns: [
					{
						id: 'name',
						name: i18n.translate('name'),
						render: renderProductName,
						sortable: true,
					},
					{
						id: 'modifiedDate',
						name: i18n.translate('last-update'),
						render: (modifiedDate) => formatDate(modifiedDate),
						sortable: true,
					},
					{
						id: 'workflowStatusInfo',
						name: i18n.translate('status'),
						render: renderProductStatus,
					},
				],
			}}
			title="published-solutions"
		/>
	);
}

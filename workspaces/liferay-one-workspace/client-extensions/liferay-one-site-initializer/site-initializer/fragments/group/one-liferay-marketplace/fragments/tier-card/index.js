/* eslint-disable no-undef */

/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

const AI_HUB_PRODUCT_EXTERNAL_REFERENCE_CODE = 'PRDCT-AI-HUB';

const available = configuration.available;
const buttonLink = configuration.buttonLink;
const purchasable = configuration.purchasable;
const skuExternalReferenceCode = configuration.skuExternalReferenceCode;

// The card sells a SKU of the product the display page renders, so the product
// comes from the element the page definition maps onto it and the SKU from an
// external reference code. Neither survives as a numeric identifier: those are
// assigned per environment, so a page carrying them points at whichever product
// happens to hold that identifier elsewhere.

const productId = fragmentElement
	.querySelector('.product-id')
	.innerText.replace(/[\n\r]+|[\s]{2,}/g, ' ')
	.trim();

function getSiteURL() {
	const layoutRelativeURL = Liferay.ThemeDisplay.getLayoutRelativeURL();

	if (layoutRelativeURL.startsWith('/web/')) {
		return layoutRelativeURL.split('/').slice(0, 3).join('/');
	}

	return '';
}

async function hasAIHubOrder(accountId) {
	if (!accountId || accountId === -1) {
		return false;
	}

	try {
		const channelId = Liferay.CommerceContext?.commerceChannelId;

		const filter = encodeURIComponent(
			"orderTypeExternalReferenceCode eq 'AI_HUB'"
		);

		const response = await Liferay.Util.fetch(
			`/o/headless-commerce-delivery-order/v1.0/channels/${channelId}/accounts/${accountId}/placed-orders?filter=${filter}&pageSize=1`
		);

		if (!response.ok) {
			return false;
		}

		const {items = []} = await response.json();

		return items.length > 0;
	}
	catch (error) {
		console.error('Unable to read the placed orders', error);

		return false;
	}
}

if (/^\d+$/.test(productId) && skuExternalReferenceCode) {
	(async () => {
		try {
			const channelId = Liferay.CommerceContext?.commerceChannelId;

			const response = await Liferay.Util.fetch(
				`/o/headless-commerce-delivery-catalog/v1.0/channels/${channelId}/products/${productId}?nestedFields=skus&accountId=-1`
			);

			if (!response.ok) {
				throw new Error(`Unable to load the product ID ${productId}`);
			}

			const product = await response.json();

			const sku = product.skus?.find(
				(item) =>
					item.externalReferenceCode === skuExternalReferenceCode
			);

			if (!sku) {
				throw new Error(
					`Unable to find the SKU ${skuExternalReferenceCode} in the product ID ${productId}`
				);
			}

			const priceElement = fragmentElement.querySelector(
				'[data-tier-card-price]'
			);

			const buttonElement = fragmentElement.querySelector(
				'[data-tier-card-button]'
			);

			if (!buttonElement) {
				return;
			}

			if (priceElement) {
				const formattedPrice =
					sku.price?.priceFormatted ?? sku.price?.formattedPrice;

				if (formattedPrice) {
					priceElement.textContent = formattedPrice;
				}
				else {
					console.warn('Unable to read the SKU price', sku);
				}
			}

			buttonElement.classList.remove('product-requirements-modal');

			delete buttonElement.dataset.purchaseInProgress;

			const accountId = Liferay.CommerceContext?.account?.accountId;

			if (
				product.externalReferenceCode ===
					AI_HUB_PRODUCT_EXTERNAL_REFERENCE_CODE &&
				(await hasAIHubOrder(accountId))
			) {
				buttonElement.href = '#';

				buttonElement.dataset.purchaseInProgress = 'true';

				delete buttonElement.dataset.destinationUrl;

				return;
			}

			if (!available) {
				return;
			}

			if (purchasable) {
				buttonElement.classList.add('product-requirements-modal');

				buttonElement.href = '#';

				buttonElement.dataset.destinationUrl =
					`${getSiteURL()}/product-purchase` +
					`?productId=${productId}` +
					`&skuRef=${sku.externalReferenceCode}`;
			}
			else if (buttonLink) {
				buttonElement.href = buttonLink;
			}
		}
		catch (error) {
			console.error(error);
		}
	})();
}
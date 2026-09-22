/* eslint-disable no-undef */

/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

const available = configuration.available;
const buttonLink = configuration.buttonLink;
const monthlyPrice = configuration.monthlyPrice;
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
				const skuPrice = sku.price?.price;

				if (skuPrice === undefined) {
					console.warn('Unable to read the SKU price', sku);
				}
				else {
					priceElement.textContent = new Intl.NumberFormat('en-US', {
						currency:
							Liferay.CommerceContext?.currency?.currencyCode ??
							'USD',
						style: 'currency',
					}).format(monthlyPrice ? skuPrice / 12 : skuPrice);
				}
			}

			buttonElement.classList.remove('product-requirements-modal');

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
				buttonElement.rel = 'noopener noreferrer';
				buttonElement.target = '_blank';
			}
		}
		catch (error) {
			console.error(error);
		}
	})();
}
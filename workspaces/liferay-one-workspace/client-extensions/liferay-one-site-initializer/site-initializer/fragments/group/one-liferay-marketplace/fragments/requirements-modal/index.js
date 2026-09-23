/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

const description = Liferay.Util.escapeHTML(configuration.description || '');
const header = Liferay.Util.escapeHTML(configuration.header || '');
const title = Liferay.Util.escapeHTML(configuration.title || '');

function addModalClass() {
	setTimeout(() => {
		document
			.querySelector('.modal.show .modal-dialog')
			?.classList.add('product-requirements-modal-dialog');
	}, 0);
}

function closeCurrentModal() {
	document.querySelector('.modal.show .close')?.click();
}

function isUserLoggedIn() {
	return Liferay.ThemeDisplay?.isSignedIn?.() || false;
}

function openPurchaseInProgressModal() {
	Liferay.Util.openModal({
		headerHTML: '<h2>LIFERAY AI HUB</h2>',

		bodyHTML: `
			<div>
				<h2 class="product-modal-title">
					Purchase Already In Progress
				</h2>

				<div class="product-modal-description">
					Your AI Hub purchase is being processed.
					We'll contact you by email with the outcome
					and the instructions to access the service.
					Please check your inbox. If you can't find
					our message, take a look in your Spam or
					Promotions folder.
				</div>

				<div class="product-modal-footer product-modal-footer--support">
					<div class="product-modal-support">
						<strong>Need help?</strong>
						<a href="mailto:support@liferay.com">
							support@liferay.com
						</a>
					</div>
				</div>
			</div>
		`,

		center: true,
		size: 'md',

		onOpen: addModalClass,
	});
}

function openUnloggedUserModal() {
	const signInURL = `${Liferay.ThemeDisplay.getPortalURL()}${Liferay.ThemeDisplay.getPathMain()}/portal/login?redirect=${encodeURIComponent(window.location.href)}`;

	Liferay.Util.openModal({
		headerHTML: '<h2>LIFERAY AI HUB</h2>',

		bodyHTML: `
			<div>
				<h2 class="product-modal-title">
					Sign In Required
				</h2>

				<div class="product-modal-description">
					You must be signed in to purchase this product.
				</div>

				<div class="product-modal-footer">
					<button
						class="btn btn-outline-primary"
						id="product-modal-cancel"
						type="button"
					>
						Cancel
					</button>

					<button
						class="btn btn-primary product-modal-primary-button"
						id="product-modal-sign-in"
						type="button"
					>
						Sign In
					</button>
				</div>
			</div>
		`,

		center: true,
		size: 'md',

		onOpen: () => {
			addModalClass();

			setTimeout(() => {
				document
					.querySelector('#product-modal-sign-in')
					?.addEventListener('click', () => {
						window.location.href = signInURL;
					});

				document
					.querySelector('#product-modal-cancel')
					?.addEventListener('click', () => {
						closeCurrentModal();
					});
			}, 0);
		},
	});
}

function openProductRequirementsModal(destinationUrl) {
	Liferay.Util.openModal({
		headerHTML: `<h2>${header}</h2>`,

		bodyHTML: `
			<div>
				<h2 class="product-modal-title">
					${title}
				</h2>

				<div class="product-modal-description">
					${description}
				</div>

				<div class="product-modal-footer">
					<button
						class="btn btn-outline-primary"
						id="product-modal-cancel"
						type="button"
					>
						Cancel
					</button>

					<button
						class="btn btn-primary"
						id="product-modal-continue"
						type="button"
					>
						Continue
					</button>
				</div>
			</div>
		`,

		center: true,
		size: 'md',

		onOpen: () => {
			addModalClass();

			setTimeout(() => {
				document
					.querySelector('#product-modal-cancel')
					?.addEventListener('click', () => {
						closeCurrentModal();
					});

				document
					.querySelector('#product-modal-continue')
					?.addEventListener('click', () => {
						closeCurrentModal();

						window.location.href = destinationUrl;
					});
			}, 0);
		},
	});
}

document.addEventListener(
	'click',
	(event) => {
		const purchaseInProgressButton = event.target.closest(
			'[data-purchase-in-progress="true"]'
		);

		if (purchaseInProgressButton) {
			event.preventDefault();
			event.stopPropagation();

			if (!isUserLoggedIn()) {
				openUnloggedUserModal();

				return;
			}

			openPurchaseInProgressModal();

			return;
		}

		const purchaseButton = event.target.closest(
			'.product-requirements-modal'
		);

		if (!purchaseButton) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();

		if (!isUserLoggedIn()) {
			openUnloggedUserModal();

			return;
		}

		openProductRequirementsModal(purchaseButton.dataset.destinationUrl);
	},
	true
);
/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

const PROPERTY_TO_CHECK = 'showContactForm';

const triggerButton = fragmentElement.querySelector('.modal-trigger');

let modalReady = false;

function getLastIdFromURL() {
	const parts = window.location.pathname
		.split('/')
		.filter((part) => part.length > 0 && !isNaN(part));

	return parts.length > 0 ? parts[parts.length - 1] : null;
}

function setupModal(button) {
	if (modalReady) {
		return;
	}

	const modal = document.getElementById(configuration.modalId);

	if (!modal) {
		return;
	}

	modalReady = true;

	const modalContent = modal.firstElementChild;

	button.addEventListener('click', () => {
		Liferay.Util.openModal({
			bodyHTML: '<div></div>',
			center: true,
			containerProps: {
				className: '',
			},
			id: 'f-modal',
			onOpen() {
				const modalBody = document.querySelector(
					'#f-modal .liferay-modal-body'
				);

				modalBody.appendChild(modalContent);
			},
			size: configuration.modalSize,
		});
	});
}

function setupModalOnContentInit(button) {
	if (configuration.contentInitEvent) {
		document.addEventListener(configuration.contentInitEvent, () => {
			setupModal(button);
		});
	}
	else {
		setupModal(button);
	}
}

(async () => {
	window.addEventListener('load', () => {
		if (configuration.modalOverlayColor) {
			document.body.classList.add(
				'modal-overlay-' + configuration.modalOverlayColor
			);
		}

		if (document.querySelector('body.has-edit-mode-menu')) {
			return;
		}

		if (!triggerButton || !configuration.modalId) {
			return;
		}

		setupModalOnContentInit(triggerButton);
	});

	const objectId = getLastIdFromURL();

	if (!objectId || !triggerButton) {
		return;
	}

	try {
		const response = await Liferay.Util.fetch(
			`/o/c/publisherdetailses/${objectId}`
		);

		if (!response.ok) {
			return;
		}

		const publisherDetails = await response.json();

		if (String(publisherDetails[PROPERTY_TO_CHECK]) === 'true') {
			triggerButton.style.display = '';

			setupModalOnContentInit(triggerButton);
		}
	}
	catch (error) {
		console.error('Unable to check the contact form visibility', error);
	}
})();
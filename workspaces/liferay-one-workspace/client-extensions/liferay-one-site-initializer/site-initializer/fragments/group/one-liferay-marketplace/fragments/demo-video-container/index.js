/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

const productDemo = fragmentElement.querySelector(
	`#product-demo-${configuration.fragmentId}`
);
const source = fragmentElement.querySelector(
	`.product-demo-video-${configuration.fragmentId}`
);
const video = fragmentElement.querySelector('video');

function loadVideo() {
	const videoURL = productDemo.textContent.trim();

	if (!videoURL) {
		return false;
	}

	source.src = videoURL;

	video.load();

	return true;
}

if (productDemo && source && video && !loadVideo()) {
	const mutationObserver = new MutationObserver(() => {
		if (loadVideo()) {
			mutationObserver.disconnect();
		}
	});

	mutationObserver.observe(productDemo, {
		characterData: true,
		childList: true,
		subtree: true,
	});
}
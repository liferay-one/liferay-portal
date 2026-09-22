/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

function main() {
  const productDemo = fragmentElement.querySelector(`#product-demo-${configuration.fragmentId}`);
  const source = fragmentElement.querySelector(`.product-demo-video-${configuration.fragmentId}`);
  const video = fragmentElement.querySelector(`video`);

  if (!productDemo || !source || !productDemo.textContent.trim()) {
    return requestAnimationFrame(main);
  }

  source.src = productDemo.textContent.trim();
  video.load();
}

main();
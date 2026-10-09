/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

/**
 * How long to wait for a checkout to place an order and land on its
 * confirmation page, which creates the cart, checks it out, and reloads.
 */

export const CHECKOUT_TIMEOUT = 60000;

/**
 * How long to wait for the portal to render a step of a wizard or to answer a
 * write, longer than the default expect timeout because the custom element
 * loads its data after the page itself.
 */

export const PORTAL_TIMEOUT = 30000;

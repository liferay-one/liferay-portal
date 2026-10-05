/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';

import usePublishHeader from './usePublishHeader';

function addElement(className: string) {
	const element = document.createElement('div');

	element.className = className;

	document.body.appendChild(element);

	return element;
}

describe('[HOOK-PUBLISHERDASHBOARD-USEPUBLISHHEADER] usePublishHeader', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('hides the marketplace header and marks the publisher container on mount', () => {
		const marketplaceHeader = addElement('marketplace-header');
		const publisherContainer = addElement('publisher-dashboard-container');

		renderHook(() => usePublishHeader());

		expect(marketplaceHeader).toHaveClass('d-none');
		expect(publisherContainer).toHaveClass('marketplace-publisher-header');
	});

	it('removes both classes on unmount', () => {
		const marketplaceHeader = addElement('marketplace-header');
		const publisherContainer = addElement('publisher-dashboard-container');

		const {unmount} = renderHook(() => usePublishHeader());

		unmount();

		expect(marketplaceHeader).not.toHaveClass('d-none');
		expect(publisherContainer).not.toHaveClass(
			'marketplace-publisher-header'
		);
	});

	it('tolerates missing elements', () => {
		const {unmount} = renderHook(() => usePublishHeader());

		expect(() => unmount()).not.toThrow();
	});
});

/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import SEOStudioDetails from './SEOStudioDetails';

import type {PlacedOrder} from '~/types/orders';

const placedOrder: Pick<PlacedOrder, 'customFields'> = {
	customFields: {
		'order-metadata': JSON.stringify({
			salesforceProjectId: 'PRJCT-1',
			seoStudioForm: {
				administratorEmailAddress: 'ana.ribeiro@acme.com',
				seoStudioAccountName: 'Acme SEO',
			},
		}),
	},
};

describe('SEOStudioDetails', () => {
	it('renders the request from the placed order it receives', () => {
		render(<SEOStudioDetails placedOrder={placedOrder} />);

		expect(screen.getByText('Acme SEO')).toBeInTheDocument();
		expect(screen.getByText('ana.ribeiro@acme.com')).toBeInTheDocument();
	});

	it('links to AI Hub', () => {
		render(<SEOStudioDetails placedOrder={placedOrder} />);

		expect(
			screen.getByRole('link', {name: 'https://ai.hub.liferay.com'})
		).toHaveAttribute('href', 'https://ai.hub.liferay.com');
	});

	it('renders without a placed order', () => {
		render(<SEOStudioDetails />);

		expect(
			screen.getByRole('link', {name: 'https://ai.hub.liferay.com'})
		).toBeInTheDocument();
	});
});

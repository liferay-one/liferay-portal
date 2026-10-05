/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import getPostalAddressDescription from './getPostalAddressDescription';

const address = {
	city: 'Diamond Bar',
	countryISOCode: 'US',
	name: 'Headquarters',
	regionISOCode: 'CA',
	street1: '1400 Montefino Ave',
	zip: '91765',
};

describe('[MOD-PRODUCTPURCHASE-PAYMENTMETHOD-BILLINGADDRESS-GETPOSTALADDRESSDESCRIPTION] getPostalAddressDescription', () => {
	it('joins the address parts and uses the address name as the title', () => {
		expect(getPostalAddressDescription(address)).toEqual({
			description: '1400 Montefino Ave,  Diamond Bar, CA, US 91765 ',
			title: 'Headquarters',
		});
	});

	it('adds street2 followed by a comma when present', () => {
		expect(
			getPostalAddressDescription({...address, street2: 'Suite 200'})
				.description
		).toBe('1400 Montefino Ave, Suite 200, Diamond Bar, CA, US 91765 ');
	});
});

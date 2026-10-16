/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';
import {translate} from '~/i18n';

import {validateIPAddresses, validateMACAddresses} from './serverAddressUtils';

describe('[MOD-SERVERADDRESSUTILS] serverAddressUtils', () => {
	describe('validateIPAddresses', () => {
		it('accepts valid lines and ignores blank lines', () => {
			expect(validateIPAddresses('10.0.0.1\n\n  \n192.168.1.20\n')).toBe(
				true
			);
		});

		it('accepts an empty value', () => {
			expect(validateIPAddresses('')).toBe(true);
		});

		it('rejects an invalid line', () => {
			expect(validateIPAddresses('10.0.0.1\nnot an ip')).toBe(
				translate('enter-a-valid-ip-address-on-each-line')
			);
		});

		it('rejects duplicate lines', () => {
			expect(validateIPAddresses('10.0.0.1\n 10.0.0.1 ')).toBe(
				translate('remove-the-duplicate-ip-addresses')
			);
		});
	});

	describe('validateMACAddresses', () => {
		it('accepts valid lines and ignores blank lines', () => {
			expect(
				validateMACAddresses('00:1A:2B:3C:4D:5E\n\n00-1a-2b-3c-4d-5f')
			).toBe(true);
		});

		it('rejects an invalid line', () => {
			expect(validateMACAddresses('00:1A:2B:3C:4D')).toBe(
				translate('enter-a-valid-mac-address-on-each-line')
			);
		});

		it('rejects duplicate lines', () => {
			expect(
				validateMACAddresses('00:1A:2B:3C:4D:5E\n00:1A:2B:3C:4D:5E')
			).toBe(translate('remove-the-duplicate-mac-addresses'));
		});
	});
});

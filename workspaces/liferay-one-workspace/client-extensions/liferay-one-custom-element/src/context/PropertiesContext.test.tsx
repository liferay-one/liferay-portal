/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {renderHook} from '@testing-library/react';
import {ReactNode} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {Properties} from '~/utils/attributeUtils';

import {PropertiesProvider, useProperties} from './PropertiesContext';

describe('[CTX-PROPERTIESCONTEXT] PropertiesContext', () => {
	it('returns the value given to the provider', () => {
		const properties = {
			ssaAccountExternalReferenceCode: 'ACCNT-SSA',
		} as unknown as Properties;

		const {result} = renderHook(() => useProperties(), {
			wrapper: ({children}: {children: ReactNode}) => (
				<PropertiesProvider value={properties}>
					{children}
				</PropertiesProvider>
			),
		});

		expect(result.current).toBe(properties);
	});

	it('throws when used outside the provider', () => {
		const preventErrorReport = (event: ErrorEvent) =>
			event.preventDefault();

		window.addEventListener('error', preventErrorReport);

		vi.spyOn(console, 'error').mockImplementation(() => {});

		expect(() => renderHook(() => useProperties())).toThrow(
			'useProperties must be used within PropertiesProvider'
		);

		vi.restoreAllMocks();

		window.removeEventListener('error', preventErrorReport);
	});
});

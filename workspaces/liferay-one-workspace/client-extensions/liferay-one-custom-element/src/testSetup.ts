/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import '@testing-library/jest-dom/vitest';
import {cleanup} from '@testing-library/react';
import {afterEach, vi} from 'vitest';

import type {RenderHookOptions, RenderOptions} from '@testing-library/react';

const themeDisplayStub = new Proxy(
	{},
	{
		get: (_target, property) => {
			if (property === 'getBCP47LanguageId') {
				return () => 'en-US';
			}

			if (typeof property === 'string' && property.includes('Language')) {
				return () => 'en_US';
			}

			return () => '';
		},
	}
);

(window as unknown as {Liferay: unknown}).Liferay = {
	CommerceContext: {},
	ThemeDisplay: themeDisplayStub,
	Util: {
		fetch: () =>
			Promise.resolve({
				json: () => Promise.resolve({}),
			}),
		navigate: () => {},
		openModal: () => {},
		openToast: () => {},
	},
	authToken: '',
	detach: () => {},
	fire: () => null,
	on: () => {},
};

vi.mock('@testing-library/react', async (importOriginal) => {
	const testingLibrary =
		await importOriginal<typeof import('@testing-library/react')>();

	const {ClayIconSpriteContext} = await import('@clayui/icon');
	const {createElement} = await import('react');

	type Wrapper = React.JSXElementConstructor<{children: React.ReactNode}>;

	function withIconSpriteMap(wrapper?: Wrapper) {
		return function IconSpriteMapWrapper({
			children,
		}: {
			children: React.ReactNode;
		}) {
			return createElement(
				ClayIconSpriteContext.Provider,
				{value: '/clay/icons.svg'},
				wrapper ? createElement(wrapper, null, children) : children
			);
		};
	}

	return {
		...testingLibrary,
		render: (ui: React.ReactNode, options?: RenderOptions) =>
			testingLibrary.render(ui, {
				...options,
				wrapper: withIconSpriteMap(options?.wrapper),
			}),
		renderHook: <Result, Props>(
			callback: (props: Props) => Result,
			options?: RenderHookOptions<Props>
		) =>
			testingLibrary.renderHook(callback, {
				...options,
				wrapper: withIconSpriteMap(options?.wrapper),
			}),
	};
});

afterEach(() => {
	cleanup();
});

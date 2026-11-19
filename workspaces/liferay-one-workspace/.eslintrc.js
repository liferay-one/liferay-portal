/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

const path = require('path');

const FETCH_MESSAGE =
	'Call Liferay with the fetcher or fetchLiferay, and the Spring Boot service with OAuth2Client or fetchSpringBoot, so that the request keeps the impersonated user.';

const config = {
	env: {
		browser: true,
		es2021: true,
		node: true,
	},
	extends: ['plugin:@liferay/portal', 'plugin:local/recommended'],
	globals: {
		Liferay: true,
		configuration: true,
		fragmentElement: true,
		fragmentNamespace: true,
		layoutMode: true,
		themeDisplay: true,
	},
	ignorePatterns: ['!*', '**/build/**', 'tools/eslint-plugin-local/dist/**'],
	overrides: [
		{
			files: [
				'client-extensions/liferay-one-custom-element/@vite/**/*.ts',
			],
			rules: {
				'@liferay/no-absolute-import': 'off',
			},
		},
		{
			excludedFiles: [
				'client-extensions/liferay-one-custom-element/src/**/*.test.ts?(x)',
			],
			files: [
				'client-extensions/liferay-one-custom-element/src/**/*.ts?(x)',
			],
			rules: {
				'no-restricted-globals': [
					'error',
					'event',
					{
						message: FETCH_MESSAGE,
						name: 'fetch',
					},
				],
				'no-restricted-properties': [
					'error',
					{
						message: FETCH_MESSAGE,
						object: 'globalThis',
						property: 'fetch',
					},
					{
						message: FETCH_MESSAGE,
						object: 'self',
						property: 'fetch',
					},
					{
						message: FETCH_MESSAGE,
						object: 'window',
						property: 'fetch',
					},
				],
				'no-restricted-imports': [
					'error',
					{
						paths: [
							{
								message: FETCH_MESSAGE,
								name: '@liferay/oauth2-provider-web/client',
							},
						],
					},
				],
				'no-restricted-syntax': [
					'error',
					{
						message: FETCH_MESSAGE,
						selector:
							"MemberExpression[object.object.name='Liferay'][object.property.name='Util'][property.name='fetch']",
					},
				],
			},
		},
		{
			files: [
				'client-extensions/liferay-one-custom-element/src/services/spring-boot/OAuth2Client.ts',
			],
			rules: {
				'no-restricted-imports': 'off',
			},
		},
		{
			files: [
				'client-extensions/liferay-one-custom-element/src/pages/TicketAttachments/hooks/useGCSGetUploadOffset.ts',
				'client-extensions/liferay-one-custom-element/src/pages/TicketAttachments/hooks/useGCSUploadFile.ts',
				'client-extensions/liferay-one-custom-element/src/pages/TicketAttachments/hooks/useTicketAttachmentsDelete.ts',
				'client-extensions/liferay-one-custom-element/src/services/fetcher/fetcher.ts',
				'client-extensions/liferay-one-custom-element/src/services/spring-boot/Invitations.ts',
				'client-extensions/liferay-one-custom-element/src/utils/impersonationUtils.ts',
			],
			rules: {
				'no-restricted-globals': ['error', 'event'],
				'no-restricted-properties': 'off',
			},
		},
		{
			files: ['*.json'],
			parser: 'jsonc-eslint-parser',
			plugins: ['jsonc'],
			rules: {
				'@typescript-eslint/naming-convention': 'off',
				'@typescript-eslint/no-explicit-any': 'off',
				'jsonc/no-dupe-keys': 'error',
				'jsonc/sort-keys': 'error',
				'notice/notice': 'off',
			},
		},
	],
	parserOptions: {
		ecmaFeatures: {
			jsx: true,
		},
		ecmaVersion: 2023,
	},
	plugins: ['@liferay', 'local'],
	root: true,
	rules: {
		'@liferay/empty-line-between-elements': 'off',
		'@liferay/import-extensions': 'off',
		'@liferay/portal/deprecation': 'off',
		'@liferay/portal/no-document-cookie': 'off',
		'@liferay/portal/no-explicit-extend': 'off',
		'@liferay/portal/no-global-fetch': 'off',
		'@liferay/portal/no-global-storage': 'off',
		'@liferay/portal/no-loader-import-specifier': 'off',
		'@liferay/portal/no-localhost-reference': 'off',
		'@liferay/portal/no-react-dom-create-portal': 'off',
		'@liferay/portal/no-react-dom-render': 'off',
		'@liferay/portal/no-side-navigation': 'off',
		'@liferay/portal/unexecuted-ismounted': 'off',
		'@typescript-eslint/naming-convention': [
			'error',
			{
				filter: {
					match: false,
					regex: '^Window$',
				},
				format: ['PascalCase'],
				prefix: ['I'],
				selector: 'interface',
			},
		],
		'@typescript-eslint/no-explicit-any': 'error',
		'no-empty': ['error', {allowEmptyCatch: true}],
		'notice/notice': [
			'error',
			{
				nonMatchingTolerance: 0.7,
				onNonMatchingHeader: 'replace',
				templateFile: path.join(__dirname, 'copyright.js'),
			},
		],
	},
};

module.exports = config;

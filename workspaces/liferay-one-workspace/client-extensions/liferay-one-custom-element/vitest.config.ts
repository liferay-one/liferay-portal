/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vitest/config';

process.env.TZ = 'America/Los_Angeles';

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'@liferay/oauth2-provider-web/client': path.resolve(
				__dirname,
				'./dev/oauth2ProviderStub.ts'
			),
			'~': path.resolve(__dirname, './src/'),
		},
	},
	test: {
		coverage: {
			exclude: [
				'src/**/*.d.ts',
				'src/**/*.test.{ts,tsx}',
				'src/i18n/**',
				'src/main.tsx',
				'src/testSetup.ts',
			],
			include: ['src/**/*.{ts,tsx}'],
			provider: 'v8',
			reporter: ['text-summary', 'html', 'lcov'],
		},
		environment: 'jsdom',
		include: ['src/**/*.test.{ts,tsx}'],
		outputFile: {
			junit: 'TEST-frontend-js.xml',
		},
		reporters: ['default', 'junit'],
		setupFiles: ['./src/testSetup.ts'],
	},
});

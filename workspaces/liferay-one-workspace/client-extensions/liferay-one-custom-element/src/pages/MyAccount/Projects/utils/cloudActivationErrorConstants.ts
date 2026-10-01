/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Word} from '~/i18n';

export const ACTIVATION_CODE_ERROR_MESSAGE_KEYS: Record<number, Word> = {
	422: 'this-project-is-not-entitled-to-another-environment-of-this-type',
};

export const ACTIVATION_ERROR_MESSAGE_KEYS: Record<number, Word> = {
	400: 'the-activation-token-is-not-valid',
	404: 'the-activation-code-was-not-found',
	409: 'this-environment-has-already-been-activated',
};

export const ACTIVATION_FORM_ERROR_MESSAGE_KEYS: Record<number, Word> = {
	403: 'you-need-administrator-role-on-this-project-to-submit-this-form',
	422: 'this-project-does-not-have-an-active-subscription-for-this-product-contact-your-liferay-sales-representative',
};

export const BUNDLE_ERROR_MESSAGE_KEYS: Record<number, Word> = {
	404: 'the-cloud-native-environment-was-not-found',
	422: 'one-or-more-add-ons-are-not-available-for-the-selected-dxp-version',
};

/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {Liferay} from '~/services/liferay/liferay';

import en_US from './en_US';
import es_ES from './es_ES';
import ja_JP from './ja_JP';
import pt_BR from './pt_BR';

export const languages = {
	en_US,
	es_ES,
	ja_JP,
	pt_BR,
};

export type Word = keyof typeof en_US;

export function translate(
	word: Word,
	languageId = (typeof Liferay !== 'undefined' &&
		(Liferay.ThemeDisplay?.getLanguageId?.() ||
			Liferay.ThemeDisplay?.getDefaultLanguageId?.())) ||
		(typeof document !== 'undefined' && document.documentElement.lang) ||
		'en_US'
): string {
	const normalizedLanguageId =
		{
			en: 'en_US',
			es: 'es_ES',
			ja: 'ja_JP',
			pt: 'pt_BR',
		}[languageId] ||
		languageId?.replace('-', '_') ||
		'en_US';

	const languageProperties = (
		languages as unknown as Record<string, Partial<typeof en_US>>
	)[normalizedLanguageId];

	return languageProperties?.[word] || en_US[word] || word;
}

export function sub(
	word: Word,
	words: Word[] | Word | string | string[],
	languageId?: string
): string {
	if (!Array.isArray(words)) {
		words = [words];
	}

	let translatedWord = translate(word, languageId);

	words.forEach((value, index) => {
		const translatedKey = translate(value as Word, languageId);
		const key = `{${index}}`;
		translatedWord = translatedWord.replaceAll(key, translatedKey);
	});

	return translatedWord;
}

const i18n = {
	sub,
	translate,
};

export default i18n;

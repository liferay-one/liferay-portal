/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import SearchBuilder from './SearchBuilder';

describe('[CLIENT-FETCHER-SEARCHBUILDER] SearchBuilder', () => {
	it('builds the static operators', () => {
		expect(SearchBuilder.contains('name', 'abc')).toBe(
			"contains(name, 'abc')"
		);
		expect(SearchBuilder.eq('name', 'abc')).toBe("name eq 'abc'");
		expect(SearchBuilder.eq('active', true)).toBe('active eq true');
		expect(SearchBuilder.ge('count', 2)).toBe('count ge 2');
		expect(SearchBuilder.group('CLOSE')).toBe(')');
		expect(SearchBuilder.group('OPEN')).toBe('(');
		expect(SearchBuilder.gt('count', 2)).toBe('count gt 2');
		expect(SearchBuilder.in('id', [1, 'two'])).toBe("id in (1,'two')");
		expect(SearchBuilder.lambda('tags', 'a')).toBe(
			"(tags/any(x:(x eq 'a')))"
		);
		expect(SearchBuilder.lambdaContains('tags', 'a')).toBe(
			"(tags/any(x:contains(x, 'a')))"
		);
		expect(SearchBuilder.le('count', 2)).toBe('count le 2');
		expect(SearchBuilder.lt('count', 2)).toBe('count lt 2');
		expect(SearchBuilder.ne('name', 'abc')).toBe("name ne 'abc'");
		expect(SearchBuilder.startsWith('name', 'ab')).toBe(
			"name startsWith 'ab'"
		);
		expect(SearchBuilder.unquote("name eq 'abc'")).toBe('name eq abc');
	});

	it('returns an empty string for in without values', () => {
		expect(SearchBuilder.in('id', undefined as unknown as string[])).toBe(
			''
		);
	});

	it('chains and, or, group, and not into one query', () => {
		const query = new SearchBuilder()
			.not()
			.group('OPEN')
			.eq('a', '1')
			.and()
			.ne('b', '2')
			.or()
			.contains('c', '3')
			.group('CLOSE')
			.and()
			.gt('d', 4)
			.and()
			.lt('e', 5)
			.and()
			.in('f', [6])
			.and()
			.lambda('g', 'h')
			.and()
			.lambdaContains('i', 'j')
			.build();

		expect(query).toBe(
			"not ( a eq '1' and b ne '2' or contains(c, '3') ) and d gt 4 and e lt 5 and f in (6) and (g/any(x:(x eq 'h'))) and (i/any(x:contains(x, 'j')))"
		);
	});

	it('encodes the query when useURIEncode is set', () => {
		expect(
			new SearchBuilder({useURIEncode: true}).eq('a', 'b c').build()
		).toBe(encodeURIComponent("a eq 'b c'"));
	});

	it('groups numbers with or in inEqualNumbers and skips empty values', () => {
		expect(
			new SearchBuilder().inEqualNumbers('id', [1, 2, 3]).build()
		).toBe('( id eq 1 or id eq 2 or id eq 3 )');
		expect(new SearchBuilder().inEqualNumbers('id', []).build()).toBe('');
	});

	it('removes quote marks with the unquote option', () => {
		expect(
			new SearchBuilder()
				.eq('a', '1', {unquote: true})
				.and()
				.ne('b', '2', {unquote: true})
				.and()
				.lambda('c', '3', {unquote: true})
				.and()
				.lambdaContains('d', '4', {unquote: true})
				.build()
		).toBe(
			'a eq 1 and b ne 2 and (c/any(x:(x eq 3))) and (d/any(x:contains(x, 4)))'
		);
	});

	it('stops appending after build and keeps the lock on a clone', () => {
		const searchBuilder = new SearchBuilder().eq('a', '1');

		expect(searchBuilder.build()).toBe("a eq '1'");

		searchBuilder.and().eq('b', '2');

		expect(searchBuilder.build()).toBe("a eq '1'");

		const clone = searchBuilder.clone();

		clone.and().eq('c', '3');

		expect(clone.build()).toBe("a eq '1'");
	});

	it('trims a trailing and or or in build', () => {
		expect(new SearchBuilder().eq('a', '1').or().build()).toBe("a eq '1'");
		expect(new SearchBuilder().eq('a', '1').and().build().trim()).toBe(
			"a eq '1'"
		);
	});
});

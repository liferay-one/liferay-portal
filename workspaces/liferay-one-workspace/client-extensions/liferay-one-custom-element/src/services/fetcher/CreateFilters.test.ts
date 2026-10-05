/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {describe, expect, it} from 'vitest';

import CreateFilters from './CreateFilters';

import type {RendererFields} from '~/types/filters';

function createFilter(
	appliedFilter: Record<string, unknown>,
	fields: Partial<RendererFields>[] = [],
	defaultFilter?: string
) {
	const filter = CreateFilters.createFilter({
		appliedFilter,
		defaultFilter,
		filterSchema: {fields: fields as RendererFields[]},
	});

	return filter;
}

describe('[CLIENT-FETCHER-CREATEFILTERS] CreateFilters', () => {
	it('applies the lambda operator to a scalar and joins arrays with or', () => {
		expect(
			createFilter({categoryNames: 'App'}, [
				{name: 'categoryNames', operator: 'lambda'},
			])
		).toBe("(categoryNames/any(x:(x eq 'App')))");
		expect(
			createFilter({categoryNames: [{value: 'A'}, 'B']}, [
				{name: 'categoryNames', operator: 'lambda'},
			])
		).toBe(
			"((categoryNames/any(x:(x eq 'A'))) or (categoryNames/any(x:(x eq 'B'))))"
		);
	});

	it('applies the lambdaContains operator with arrays joined by or', () => {
		expect(
			createFilter({tags: ['a', 'b']}, [
				{name: 'tags', operator: 'lambdaContains'},
			])
		).toBe(
			"((tags/any(x:contains(x, 'a'))) or (tags/any(x:contains(x, 'b'))))"
		);
		expect(
			createFilter({tags: 'a'}, [
				{name: 'tags', operator: 'lambdaContains'},
			])
		).toBe("(tags/any(x:contains(x, 'a')))");
	});

	it('applies other custom operators to the key before the pipe without the dollar sign', () => {
		expect(
			createFilter({'$name|label': 'abc'}, [
				{name: '$name|label', operator: 'contains'},
			])
		).toBe("contains(name, 'abc')");
	});

	it('applies the ne optional operator with null handling', () => {
		expect(
			createFilter({hasKey: 'false'}, [
				{name: 'hasKey', operator: 'eq', optionalOperator: 'ne'},
			])
		).toBe('not (hasKey ne null)');
		expect(
			createFilter({hasKey: 'true'}, [
				{
					name: 'hasKey',
					operator: 'eq',
					optionalOperator: 'ne',
					removeQuoteMark: true,
				},
			])
		).toBe('hasKey ne null');
		expect(
			createFilter({hasKey: 'maybe'}, [
				{name: 'hasKey', operator: 'eq', optionalOperator: 'ne'},
			])
		).toBe("hasKey eq 'maybe'");
	});

	it('turns a date range into gt and lt with day boundaries', () => {
		expect(
			createFilter({dateCreated: ['2026-01-01 - 2026-01-31']}, [
				{name: 'dateCreated', type: 'date-range'},
			])
		).toBe(
			'dateCreated gt 2026-01-01T00:00:00Z and dateCreated lt 2026-01-31T23:59:59Z'
		);
	});

	it('turns arrays into in and scalars into eq, joined with and after the default filter', () => {
		expect(
			createFilter(
				{name: {label: 'Name', value: 'abc'}, type: ['a', 'b']},
				[],
				"status eq 'open'"
			)
		).toBe("status eq 'open' and name eq 'abc' and type in ('a','b')");
	});

	it('removes quote marks for number, removeQuoteMark, and false or No values', () => {
		expect(
			createFilter({count: '3', flag: 'No', id: '7'}, [
				{name: 'count', type: 'number'},
				{name: 'id', removeQuoteMark: true},
			])
		).toBe('count eq 3 and flag eq No and id eq 7');
	});

	it('skips falsy values', () => {
		expect(createFilter({a: '', b: 0, c: null, d: undefined})).toBe('');
	});

	it('formats values to a comma separated string', () => {
		expect(CreateFilters.formatValuesToString([1, 'a', true])).toBe(
			'1,a,true'
		);
		expect(
			CreateFilters.formatValuesToString(undefined as unknown as string[])
		).toBe('');
	});

	it('drops null, blank, and empty option entries in removeEmptyFilter', () => {
		expect(
			CreateFilters.removeEmptyFilter({
				blank: '  ',
				emptyOption: [{value: ''}] as unknown as string[],
				kept: 'x',
				keptArray: ['a'],
				missing: null as unknown as string,
				number: 0,
			})
		).toEqual({kept: 'x', keptArray: ['a'], number: 0});
	});
});

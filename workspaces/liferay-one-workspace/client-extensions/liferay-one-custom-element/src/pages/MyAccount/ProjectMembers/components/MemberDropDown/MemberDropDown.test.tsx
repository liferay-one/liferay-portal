/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import MemberDropDown from './MemberDropDown';

function option(userId: number) {
	return {
		email: `member${userId}@example.com`,
		name: `Member ${userId}`,
		userId,
	};
}

function renderDropDown(count: number) {
	const onChange = vi.fn();

	render(
		<MemberDropDown
			onChange={onChange}
			options={Array.from({length: count}, (_, index) => option(index))}
			selectedName=""
		/>
	);

	fireEvent.click(screen.getByRole('button', {name: /select a member/i}));

	return onChange;
}

function search(value: string) {
	fireEvent.change(screen.getByPlaceholderText('Search'), {
		target: {value},
	});
}

describe('[ROUTE-MY-ACCOUNT-PROJECT-MEMBERS] MemberDropDown', () => {
	it('shows the first 50 members and tells the user to narrow the results', () => {
		renderDropDown(60);

		expect(screen.getAllByText(/^Member \d+$/)).toHaveLength(50);
		expect(
			screen.getByText(
				'Showing the first 50 of 60 members. Type to narrow the results.'
			)
		).toBeTruthy();
	});

	it('filters the members by email address', () => {
		renderDropDown(60);

		search('MEMBER59@');

		expect(screen.getAllByText(/^Member \d+$/)).toHaveLength(1);
		expect(screen.getByText('member59@example.com')).toBeTruthy();
		expect(screen.queryByText(/Type to narrow the results/)).toBeNull();
	});

	it('shows no results found when nothing matches', () => {
		renderDropDown(3);

		search('zed');

		expect(screen.getByText('No Results Found')).toBeTruthy();
	});

	it('selects a member and clears the search', () => {
		const onChange = renderDropDown(3);

		search('member2');

		fireEvent.click(screen.getByText('Member 2'));

		expect(onChange).toHaveBeenCalledWith(option(2));

		fireEvent.click(screen.getByRole('button', {name: /select a member/i}));

		expect(
			(screen.getByPlaceholderText('Search') as HTMLInputElement).value
		).toBe('');
	});
});

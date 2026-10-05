/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {render} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {useMeasuredWidth} from './useMeasuredWidth';

let measuredWidth: number | undefined;

function MeasuredElement({
	attachRef = true,
	shouldMeasure,
}: {
	attachRef?: boolean;
	shouldMeasure: boolean;
}) {
	const {ref, width} = useMeasuredWidth<HTMLDivElement>(shouldMeasure);

	measuredWidth = width;

	return <div ref={attachRef ? ref : undefined} />;
}

describe('[HOOK-USEMEASUREDWIDTH] useMeasuredWidth', () => {
	beforeEach(() => {
		measuredWidth = undefined;

		vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(
			240
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('reads offsetWidth when shouldMeasure is true and the ref is attached', () => {
		render(<MeasuredElement shouldMeasure />);

		expect(measuredWidth).toBe(240);
	});

	it('leaves the width undefined when shouldMeasure is false', () => {
		render(<MeasuredElement shouldMeasure={false} />);

		expect(measuredWidth).toBeUndefined();
	});

	it('leaves the width undefined when the ref is not attached', () => {
		render(<MeasuredElement attachRef={false} shouldMeasure />);

		expect(measuredWidth).toBeUndefined();
	});

	it('measures once shouldMeasure turns true', () => {
		const {rerender} = render(<MeasuredElement shouldMeasure={false} />);

		expect(measuredWidth).toBeUndefined();

		rerender(<MeasuredElement shouldMeasure />);

		expect(measuredWidth).toBe(240);
	});
});

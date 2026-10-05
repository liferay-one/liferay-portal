/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import useMarketoForm from './useMarketoForm';

const SCRIPT_SRC = '//pages.liferay.com/js/forms2/js/forms2.min.js';

type FormCallback = (form: unknown) => void;

function createForm() {
	const buttonElement = document.createElement('button');
	const formElement = document.createElement('form');

	formElement.setAttribute('style', 'width: 10px');

	let successCallback: () => boolean = () => false;

	const html = vi.fn();

	return {
		buttonElement,
		form: {
			getFormElem: () => ({
				0: formElement,
				find: () => Object.assign([buttonElement], {html}),
			}),
			onSuccess: (callback: () => boolean) => {
				successCallback = callback;
			},
			submit: vi.fn(),
			vals: vi.fn(),
		},
		formElement,
		html,
		succeed: () => successCallback(),
	};
}

function installMktoForms2() {
	const loadFormCallbacks: FormCallback[] = [];

	const loadForm = vi.fn(
		(
			_baseURL: string,
			_munchkinId: string,
			_formId: string,
			callback: FormCallback
		) => {
			loadFormCallbacks.push(callback);
		}
	);

	window.MktoForms2 = {
		loadForm,
		whenReady: vi.fn(),
		whenRendered: vi.fn(),
	} as never;

	return {loadForm, loadFormCallbacks};
}

function renderStartedForm(onSubmit = vi.fn()) {
	const {loadFormCallbacks} = installMktoForms2();
	const marketoForm = createForm();

	const hook = renderHook(() =>
		useMarketoForm({formId: '1234', onSubmit, submitText: 'Submit'})
	);

	act(() => loadFormCallbacks[0](marketoForm.form));

	return {...hook, marketoForm, onSubmit};
}

describe('[HOOK-USEMARKETOFORM] useMarketoForm', () => {
	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		delete window.MktoForms2;

		document.head
			.querySelectorAll(`script[src="${SCRIPT_SRC}"]`)
			.forEach((script) => script.remove());

		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	it('loads the Marketo script once and reuses it', () => {
		renderHook(() => useMarketoForm({formId: '1', submitText: 'Submit'}));
		renderHook(() => useMarketoForm({formId: '2', submitText: 'Submit'}));

		const scripts = document.head.querySelectorAll(
			`script[src="${SCRIPT_SRC}"]`
		);

		expect(scripts).toHaveLength(1);
		expect((scripts[0] as HTMLScriptElement).defer).toBe(true);
	});

	it('loads the form once the script is ready', () => {
		renderHook(() =>
			useMarketoForm({formId: '1234', submitText: 'Submit'})
		);

		const {loadForm} = installMktoForms2();

		act(() => {
			document.head
				.querySelector(`script[src="${SCRIPT_SRC}"]`)
				?.dispatchEvent(new Event('load'));
		});

		expect(loadForm).toHaveBeenCalledTimes(1);
		expect(loadForm).toHaveBeenCalledWith(
			'//pages.liferay.com',
			'212-DQY-814',
			'1234',
			expect.any(Function)
		);
	});

	it('starts the form, strips its inline styles, and hands over the submit button', () => {
		const {loadFormCallbacks} = installMktoForms2();
		const footerElement = vi.fn();
		const marketoForm = createForm();

		const {result} = renderHook(() =>
			useMarketoForm({
				footerElement,
				formId: '1234',
				submitText: 'Send',
			})
		);

		expect(result.current.started).toBe(false);

		act(() => loadFormCallbacks[0](marketoForm.form));

		expect(result.current.started).toBe(true);
		expect(marketoForm.formElement).not.toHaveAttribute('style');
		expect(marketoForm.html).toHaveBeenCalledWith('Send');
		expect(footerElement).toHaveBeenCalledWith(marketoForm.buttonElement);
	});

	it('resolves triggerSubmit false when the form has not started', async () => {
		installMktoForms2();

		const {result} = renderHook(() =>
			useMarketoForm({formId: '1234', submitText: 'Submit'})
		);

		await expect(result.current.triggerSubmit({})).resolves.toBe(false);
	});

	it('resolves triggerSubmit true when Marketo confirms the submit', async () => {
		const {marketoForm, onSubmit, result} = renderStartedForm();

		const submitted = result.current.triggerSubmit({Email: 'a@b.com'});

		expect(marketoForm.form.vals).toHaveBeenCalledWith({Email: 'a@b.com'});
		expect(marketoForm.form.submit).toHaveBeenCalledTimes(1);

		expect(marketoForm.succeed()).toBe(false);

		await expect(submitted).resolves.toBe(true);
		expect(onSubmit).toHaveBeenCalledTimes(1);
	});

	it('resolves triggerSubmit false after the 8 second timeout', async () => {
		vi.useFakeTimers();

		const {result} = renderStartedForm();

		const submitted = result.current.triggerSubmit({});

		await vi.advanceTimersByTimeAsync(7999);

		await expect(
			Promise.race([submitted, Promise.resolve('pending')])
		).resolves.toBe('pending');

		await vi.advanceTimersByTimeAsync(1);

		await expect(submitted).resolves.toBe(false);
	});

	it('shares one pending submit between concurrent calls', async () => {
		const {marketoForm, result} = renderStartedForm();

		const first = result.current.triggerSubmit({});
		const second = result.current.triggerSubmit({});

		expect(second).toBe(first);
		expect(marketoForm.form.submit).toHaveBeenCalledTimes(1);

		marketoForm.succeed();

		await expect(first).resolves.toBe(true);
	});

	it('ignores a form that loads after unmount', () => {
		const {loadFormCallbacks} = installMktoForms2();
		const marketoForm = createForm();
		const onSubmit = vi.fn();

		const {unmount} = renderHook(() =>
			useMarketoForm({formId: '1234', onSubmit, submitText: 'Submit'})
		);

		unmount();

		loadFormCallbacks[0](marketoForm.form);

		expect(marketoForm.formElement).toHaveAttribute('style');
	});

	it('does not call onSubmit when Marketo confirms after unmount', async () => {
		const {marketoForm, onSubmit, result, unmount} = renderStartedForm();

		const submitted = result.current.triggerSubmit({});

		unmount();

		marketoForm.succeed();

		await expect(submitted).resolves.toBe(true);
		expect(onSubmit).not.toHaveBeenCalled();
	});
});

/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useEffect, useRef, useState} from 'react';
import {waitTimeout} from '~/utils/publishUtils';

type MktoForm = {
	getFormElem: () => {
		0: HTMLFormElement;
		find: (selector: string) => HTMLElement[] & {html: (v: string) => void};
	};
	onSuccess: (callback: () => boolean) => void;
	submit: () => void;
	vals: (values: unknown) => void;
};

type MktoForms2 = {
	loadForm: (
		baseURL: string,
		munchkinId: string,
		formId: string,
		callback: (form: MktoForm) => void
	) => void;
	whenReady: (fn: (form: MktoForm) => void) => void;
	whenRendered: (fn: (form: MktoForm) => void) => void;
};

declare global {
	interface Window {
		MktoForms2?: MktoForms2;
		mktoForms2BaseStyle?: HTMLLinkElement;
		mktoForms2ThemeStyle?: HTMLLinkElement;
	}
}

export type useMarketoFormProps = {
	footerElement?: (element: HTMLElement) => void;
	formId: string;
	onSubmit?: () => void;
	submitText: string;
};

const defaultMktoForms2 = window.MktoForms2;

const baseURL = '//pages.liferay.com';

const MARKETO_SUBMIT_TIMEOUT = 8000;

const MUNCHKIN_ID = '212-DQY-814';

const useMarketoForm = ({
	footerElement,
	formId,
	onSubmit,
	submitText,
}: useMarketoFormProps) => {
	const [form, setForm] = useState<MktoForm>();
	const [started, setStarted] = useState(false);
	const [formLoaded, setFormLoaded] = useState(false);
	const [MktoForms2, setMktoForms2] = useState(defaultMktoForms2);
	const submitResolveRef = useRef<(submitted: boolean) => void>();

	function triggerSubmit(values: unknown): Promise<boolean> {
		if (!form || !started) {
			console.error('Marketo form is not available');

			return Promise.resolve(false);
		}

		const submitted = new Promise<boolean>((resolve) => {
			submitResolveRef.current = resolve;
		});

		form.vals(values);

		form.submit();

		return Promise.race([
			submitted,
			waitTimeout(MARKETO_SUBMIT_TIMEOUT).then(() => {
				if (submitResolveRef.current) {
					submitResolveRef.current = undefined;

					console.error(
						'Marketo form submission was not confirmed',
						formId
					);
				}

				return false;
			}),
		]);
	}

	useEffect(() => {
		if (!MktoForms2) {
			const script = document.createElement('script');

			script.defer = true;
			script.onload = () => setMktoForms2(window.MktoForms2);
			script.src = `${baseURL}/js/forms2/js/forms2.min.js`;

			document.head.appendChild(script);

			return;
		}

		if (!formLoaded) {
			MktoForms2.loadForm(baseURL, MUNCHKIN_ID, formId, (form) => {
				setForm(form);

				const arrayify = getSelection.call.bind([].slice) as <T>(
					value: unknown
				) => T[];
				const formElement = form.getFormElem()[0];

				const styledElements = arrayify<HTMLElement>(
					formElement.querySelectorAll('[style]')
				).concat(formElement);

				formElement
					.querySelectorAll('style')
					.forEach((element: Element) => element.remove());

				styledElements.forEach((element: HTMLElement) =>
					element.removeAttribute('style')
				);

				const mktoForms2BaseStyle = window.mktoForms2BaseStyle;
				const mktoForms2ThemeStyle = window.mktoForms2ThemeStyle;
				const styleSheets = arrayify<StyleSheet>(document.styleSheets);

				styleSheets.forEach((stylesheet: StyleSheet) => {
					const ownerNode = stylesheet.ownerNode;

					if (
						ownerNode === mktoForms2BaseStyle ||
						ownerNode === mktoForms2ThemeStyle ||
						formElement.contains(ownerNode)
					) {
						stylesheet.disabled = true;
					}
				});

				if (footerElement) {
					const buttonElement = form
						.getFormElem()
						.find('button.mktoButton');

					buttonElement.html(submitText);

					footerElement(buttonElement[0]);
				}

				form.onSuccess(() => {
					submitResolveRef.current?.(true);

					submitResolveRef.current = undefined;

					onSubmit?.();

					return false;
				});

				setStarted(true);
			});

			setFormLoaded(true);
		}
	}, [MktoForms2, footerElement, formId, formLoaded, onSubmit, submitText]);

	return {
		MktoForms2,
		form,
		formLoaded,
		started,
		triggerSubmit,
	};
};

export default useMarketoForm;

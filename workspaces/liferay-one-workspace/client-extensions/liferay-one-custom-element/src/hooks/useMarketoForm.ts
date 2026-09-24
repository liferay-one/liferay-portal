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

export type UseMarketoFormProps = {
	footerElement?: (element: HTMLElement) => void;
	formId: string;
	onSubmit?: () => void;
	submitText: string;
};

const BASE_URL = '//pages.liferay.com';

const MARKETO_SUBMIT_TIMEOUT = 8000;

const MUNCHKIN_ID = '212-DQY-814';

const SCRIPT_SRC = `${BASE_URL}/js/forms2/js/forms2.min.js`;

const useMarketoForm = ({
	footerElement,
	formId,
	onSubmit,
	submitText,
}: UseMarketoFormProps) => {
	const [form, setForm] = useState<MktoForm>();
	const [started, setStarted] = useState(false);
	const [formLoaded, setFormLoaded] = useState(false);
	const [MktoForms2, setMktoForms2] = useState(() => window.MktoForms2);
	const footerElementRef = useRef(footerElement);
	const mountedRef = useRef(true);
	const onSubmitRef = useRef(onSubmit);
	const pendingSubmitRef = useRef<Promise<boolean>>();
	const submitResolveRef = useRef<(submitted: boolean) => void>();

	footerElementRef.current = footerElement;
	onSubmitRef.current = onSubmit;

	useEffect(() => {
		mountedRef.current = true;

		return () => {
			mountedRef.current = false;
		};
	}, []);

	function triggerSubmit(values: unknown): Promise<boolean> {
		if (!form || !started) {
			console.error('Marketo form is not available');

			return Promise.resolve(false);
		}

		if (pendingSubmitRef.current) {
			return pendingSubmitRef.current;
		}

		const submitted = new Promise<boolean>((resolve) => {
			submitResolveRef.current = resolve;
		});

		form.vals(values);

		form.submit();

		pendingSubmitRef.current = Promise.race([
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
		]).finally(() => {
			pendingSubmitRef.current = undefined;
		});

		return pendingSubmitRef.current;
	}

	useEffect(() => {
		if (!MktoForms2) {
			let script = document.querySelector<HTMLScriptElement>(
				`script[src="${SCRIPT_SRC}"]`
			);

			if (!script) {
				script = document.createElement('script');

				script.defer = true;
				script.src = SCRIPT_SRC;

				document.head.appendChild(script);
			}

			const handleLoad = () => setMktoForms2(window.MktoForms2);

			script.addEventListener('load', handleLoad);

			return () => script?.removeEventListener('load', handleLoad);
		}

		if (!formLoaded) {
			MktoForms2.loadForm(BASE_URL, MUNCHKIN_ID, formId, (form) => {
				if (!mountedRef.current) {
					return;
				}

				setForm(form);

				const formElement = form.getFormElem()[0];

				const styledElements = Array.from(
					formElement.querySelectorAll<HTMLElement>('[style]')
				).concat(formElement);

				formElement
					.querySelectorAll('style')
					.forEach((element: Element) => element.remove());

				styledElements.forEach((element: HTMLElement) =>
					element.removeAttribute('style')
				);

				const mktoForms2BaseStyle = window.mktoForms2BaseStyle;
				const mktoForms2ThemeStyle = window.mktoForms2ThemeStyle;
				const styleSheets = Array.from(document.styleSheets);

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

				if (footerElementRef.current) {
					const buttonElement = form
						.getFormElem()
						.find('button.mktoButton');

					buttonElement.html(submitText);

					footerElementRef.current(buttonElement[0]);
				}

				form.onSuccess(() => {
					submitResolveRef.current?.(true);

					submitResolveRef.current = undefined;

					if (mountedRef.current) {
						onSubmitRef.current?.();
					}

					return false;
				});

				setStarted(true);
			});

			setFormLoaded(true);
		}
	}, [MktoForms2, formId, formLoaded, submitText]);

	return {
		started,
		triggerSubmit,
	};
};

export default useMarketoForm;

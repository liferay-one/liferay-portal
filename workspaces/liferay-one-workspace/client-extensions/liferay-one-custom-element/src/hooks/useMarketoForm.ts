/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {useCallback, useEffect, useRef, useState} from 'react';
import {waitTimeout} from '~/utils/publishUtils';

type MarketoForm = {
	getFormElem: () => {
		0: HTMLFormElement;
		find: (selector: string) => HTMLElement[];
	};
	onSuccess: (callback: () => boolean) => void;
	submit: () => void;
	vals: (values: Record<string, unknown>) => void;
};

type MktoForms2 = {
	loadForm: (
		baseURL: string,
		munchkinId: string,
		formId: string,
		callback: (form: MarketoForm) => void
	) => void;
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
	submitText?: string;
};

const BASE_URL = '//pages.liferay.com';

const MUNCHKIN_ID = '212-DQY-814';

const SUBMIT_TIMEOUT = 8000;

function stripMarketoStyles(formElement: HTMLFormElement) {
	const styledElements = [
		...Array.from(formElement.querySelectorAll<HTMLElement>('[style]')),
		formElement,
	];

	formElement
		.querySelectorAll('style')
		.forEach((element) => element.remove());

	styledElements.forEach((element) => element.removeAttribute('style'));

	Array.from(document.styleSheets).forEach((styleSheet) => {
		const ownerNode = styleSheet.ownerNode as HTMLElement | null;

		if (
			ownerNode === window.mktoForms2BaseStyle ||
			ownerNode === window.mktoForms2ThemeStyle ||
			(ownerNode && formElement.contains(ownerNode))
		) {
			styleSheet.disabled = true;
		}
	});
}

const useMarketoForm = ({
	footerElement,
	formId,
	onSubmit,
	submitText,
}: UseMarketoFormProps) => {
	const [form, setForm] = useState<MarketoForm>();
	const [started, setStarted] = useState(false);

	const submitResolveRef = useRef<(submitted: boolean) => void>();

	const footerElementRef = useRef(footerElement);
	const onSubmitRef = useRef(onSubmit);
	const submitTextRef = useRef(submitText);

	footerElementRef.current = footerElement;
	onSubmitRef.current = onSubmit;
	submitTextRef.current = submitText;

	useEffect(() => {
		let cancelled = false;

		const loadForm = (mktoForms2: MktoForms2) => {
			mktoForms2.loadForm(BASE_URL, MUNCHKIN_ID, formId, (form) => {
				if (cancelled) {
					return;
				}

				const formElement = form.getFormElem()[0];

				stripMarketoStyles(formElement);

				if (footerElementRef.current) {
					const [buttonElement] = form
						.getFormElem()
						.find('button.mktoButton');

					if (buttonElement) {
						if (submitTextRef.current) {
							buttonElement.innerHTML = submitTextRef.current;
						}

						footerElementRef.current(buttonElement);
					}
				}

				form.onSuccess(() => {
					submitResolveRef.current?.(true);

					submitResolveRef.current = undefined;

					onSubmitRef.current?.();

					return false;
				});

				setForm(form);
				setStarted(true);
			});
		};

		if (window.MktoForms2) {
			loadForm(window.MktoForms2);

			return () => {
				cancelled = true;
			};
		}

		const script = document.createElement('script');

		script.defer = true;
		script.onload = () => {
			if (!cancelled && window.MktoForms2) {
				loadForm(window.MktoForms2);
			}
		};
		script.src = `${BASE_URL}/js/forms2/js/forms2.min.js`;

		document.head.appendChild(script);

		return () => {
			cancelled = true;
		};
	}, [formId]);

	const triggerSubmit = useCallback(
		(values: Record<string, unknown>): Promise<boolean> => {
			if (!form || !started) {
				console.error('Unable to submit an unavailable Marketo form');

				return Promise.resolve(false);
			}

			const submitted = new Promise<boolean>((resolve) => {
				submitResolveRef.current = resolve;
			});

			form.vals(values);

			form.submit();

			return Promise.race([
				submitted,
				waitTimeout(SUBMIT_TIMEOUT).then(() => {
					if (submitResolveRef.current) {
						submitResolveRef.current = undefined;

						console.error(
							'Unable to confirm the Marketo form submission for form ' +
								formId
						);
					}

					return false;
				}),
			]);
		},
		[form, formId, started]
	);

	return {form, started, triggerSubmit};
};

export default useMarketoForm;

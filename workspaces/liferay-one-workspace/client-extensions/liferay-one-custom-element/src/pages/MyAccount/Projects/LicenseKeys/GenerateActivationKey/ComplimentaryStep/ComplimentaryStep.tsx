/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {ClayCheckbox, ClaySelect} from '@clayui/form';
import {format, subDays} from 'date-fns';
import {useEffect, useMemo, useState} from 'react';
import {Controller, UseFormReturn} from 'react-hook-form';
import DatePicker from '~/components/DatePicker/DatePicker';
import {Input} from '~/components/Input/Input';
import useListTypeDefinition from '~/hooks/useListTypeDefinition';
import {translate} from '~/i18n';
import {parseUTCDateString, toUTCDateString} from '~/utils/dateUtils';

import WizardFooter from '../../../CloudAppInstall/WizardFooter/WizardFooter';
import SelectField from '../components/SelectField/SelectField';
import {GenerateActivationKeyForm} from '../types';
import {
	COMPLIMENTARY_PURPOSE_MAX_LENGTH,
	COMPLIMENTARY_PURPOSE_OTHER,
	getComplimentaryPurpose,
} from '../utils';

const NAVIGATION_YEARS_RANGE = 2;
const START_DATE_DAYS_LIMIT = 29;

type ComplimentaryStepProps = {
	form: UseFormReturn<GenerateActivationKeyForm>;
	onClickBack: () => void;
	onClickCancel: () => void;
	onClickContinue: () => void;
};

export default function ComplimentaryStep({
	form,
	onClickBack,
	onClickCancel,
	onClickContinue,
}: ComplimentaryStepProps) {
	const {control, register, setValue, watch} = form;

	const {data} = useListTypeDefinition('LT_PURPOSE_OF_COMPLIMENTARY_KEY');

	const [confirmationTerms, setConfirmationTerms] = useState(false);

	const listTypeEntries = useMemo(() => data?.listTypeEntries ?? [], [data]);

	const purpose = watch('purpose');
	const purposeDescription = watch('purposeDescription');
	const startDate = watch('startDate');

	const now = new Date();

	const parsedStartDate = parseUTCDateString(startDate);

	const validStartDate =
		parsedStartDate !== undefined &&
		toUTCDateString(parsedStartDate) === startDate;

	const dateLimitExceeded =
		validStartDate &&
		startDate < format(subDays(now, START_DATE_DAYS_LIMIT), 'yyyy-MM-dd');

	let startDateError: string | undefined;

	if (!validStartDate) {
		startDateError = translate('please-insert-a-valid-date');
	}
	else if (dateLimitExceeded) {
		startDateError = translate(
			'the-start-date-must-be-less-than-30-days-ago'
		);
	}

	const canContinue = Boolean(
		confirmationTerms &&
			getComplimentaryPurpose(purpose, purposeDescription) &&
			validStartDate &&
			!dateLimitExceeded
	);

	useEffect(() => {
		if (!purpose && listTypeEntries.length) {
			setValue('purpose', listTypeEntries[0].name);
		}
	}, [listTypeEntries, purpose, setValue]);

	return (
		<>
			<h2 className="h4">{translate('complimentary')}</h2>

			<p>
				{translate(
					'you-can-use-this-option-to-generate-complimentary-activation-keys-with-a-duration-of-30-days'
				)}
			</p>

			<Controller
				control={control}
				name="startDate"
				render={({field}) => (
					<DatePicker
						dateFormat="yyyy-MM-dd"
						error={startDateError}
						helper={translate(
							'choose-the-date-you-would-like-this-option-to-start'
						)}
						label={translate('start-date')}
						onBlur={field.onBlur}
						onChange={field.onChange}
						placeholder={translate('yyyy-mm-dd')}
						required
						value={field.value}
						withoutIndentation
						years={{
							end: now.getFullYear() + NAVIGATION_YEARS_RANGE,
							start:
								now.getFullYear() -
								(now.getMonth() === 0 ? 1 : 0),
						}}
					/>
				)}
			/>

			<div className="form-group">
				<label className="ml-0" htmlFor="generateKeyPurpose">
					{translate('purpose-of-complimentary-key')}
				</label>

				<SelectField id="generateKeyPurpose">
					<ClaySelect
						id="generateKeyPurpose"
						{...register('purpose')}
					>
						{listTypeEntries.map((listTypeEntry) => (
							<ClaySelect.Option
								key={listTypeEntry.key}
								label={listTypeEntry.name}
								value={listTypeEntry.name}
							/>
						))}

						<ClaySelect.Option
							label={translate('other-please-specify')}
							value={COMPLIMENTARY_PURPOSE_OTHER}
						/>
					</ClaySelect>
				</SelectField>
			</div>

			{purpose === COMPLIMENTARY_PURPOSE_OTHER && (
				<Input
					{...register('purposeDescription')}
					component="textarea"
					maxLength={COMPLIMENTARY_PURPOSE_MAX_LENGTH}
					placeholder={translate('enter-the-purpose')}
				/>
			)}

			<div className="form-group">
				<label className="ml-0">
					{translate('confirmation-terms')}
				</label>

				<ClayCheckbox
					checked={confirmationTerms}
					label={translate(
						'the-requested-activation-key-exceeds-the-purchased-subscriptions-for-this-liferay-project-in-case-of-unauthorized-use-liferay-can-request-financial-compensation-for-breach-of-use'
					)}
					onChange={() => setConfirmationTerms(!confirmationTerms)}
				/>
			</div>

			<WizardFooter
				backButtonProps={{onClick: onClickBack}}
				cancelButtonProps={{onClick: onClickCancel}}
				continueButtonProps={{
					children: translate('next'),
					disabled: !canContinue,
					onClick: onClickContinue,
				}}
			/>
		</>
	);
}

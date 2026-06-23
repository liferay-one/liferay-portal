/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayButton from '@clayui/button';
import ClayForm, {ClayInput, ClaySelect} from '@clayui/form';
import ClayTable from '@clayui/table';
import {useEffect, useState} from 'react';

import EmptyState from '../../../components/EmptyState';
import Page from '../../../components/Page';
import {translate} from '../../../i18n';
import {Liferay} from '../../../liferay/liferay';
import FetcherError from '../../../services/fetcher/FetcherError';
import useHasAdminPermissions from './hooks/useHasAdminPermissions';
import {
	Subscriber,
	dispatchMessage,
	getTopics,
} from './services/Pubsub';

export default function Pubsub() {
	const [attributes, setAttributes] = useState('');
	const [dispatching, setDispatching] = useState(false);
	const [payload, setPayload] = useState('');
	const [topic, setTopic] = useState('');
	const [topics, setTopics] = useState<Subscriber[]>([]);

	const {hasAdminPermissions, loading} = useHasAdminPermissions();

	useEffect(() => {
		if (!hasAdminPermissions) {
			return;
		}

		getTopics()
			.then((items) => {
				setTopics(items);

				if (items.length) {
					setTopic(items[0].topic);
				}
			})
			.catch(() => setTopics([]));
	}, [hasAdminPermissions]);

	const handleSubmit = async (event: {preventDefault: () => void}) => {
		event.preventDefault();

		setDispatching(true);

		try {
			await dispatchMessage({attributes, payload, topic});

			Liferay.Util.openToast({
				message: translate('success'),
				type: 'success',
			});
		}
		catch (error) {
			const info = (error as FetcherError)?.info;

			Liferay.Util.openToast({
				message:
					info?.detail ??
					info?.title ??
					translate('an-unexpected-error-occurred'),
				type: 'danger',
			});
		}
		finally {
			setDispatching(false);
		}
	};

	if (!loading && !hasAdminPermissions) {
		return (
			<Page title={translate('pubsub')}>
				<EmptyState
					description={translate(
						'you-do-not-have-access-to-pubsub'
					)}
					title={translate('access-required')}
					type="NO_ACCESS"
				/>
			</Page>
		);
	}

	return (
		<Page
			pageRendererProps={{isLoading: loading}}
			title={translate('pubsub')}
		>
			<form onSubmit={handleSubmit}>
				<ClayForm.Group>
					<label htmlFor="pubsubTopic">
						{translate('topic')}
					</label>

					<ClaySelect
						id="pubsubTopic"
						onChange={(event: {target: {value: string}}) =>
							setTopic(event.target.value)
						}
						required
						value={topic}
					>
						<ClaySelect.Option
							label={translate('select-a-topic')}
							value=""
						/>

						{topics.map((item) => (
							<ClaySelect.Option
								key={`${item.topic}:${item.name}`}
								label={item.topic}
								value={item.topic}
							/>
						))}
					</ClaySelect>
				</ClayForm.Group>

				<ClayForm.Group>
					<label htmlFor="pubsubPayload">
						{translate('payload')}
					</label>

					<ClayInput
						component="textarea"
						id="pubsubPayload"
						onChange={(event: {target: {value: string}}) =>
							setPayload(event.target.value)
						}
						required
						value={payload}
					/>
				</ClayForm.Group>

				<ClayForm.Group>
					<label htmlFor="pubsubAttributes">
						{translate('attributes')}
					</label>

					<ClayInput
						component="textarea"
						id="pubsubAttributes"
						onChange={(event: {target: {value: string}}) =>
							setAttributes(event.target.value)
						}
						value={attributes}
					/>
				</ClayForm.Group>

				<ClayButton disabled={dispatching} type="submit">
					{translate('submit')}
				</ClayButton>
			</form>

			{!!topics.length && (
				<div className="mt-4">
					<h4>{translate('topics')}</h4>

					<ClayTable>
						<ClayTable.Head>
							<ClayTable.Row>
								<ClayTable.Cell headingCell>
									{translate('topic')}
								</ClayTable.Cell>

								<ClayTable.Cell headingCell>
									{translate('name')}
								</ClayTable.Cell>
							</ClayTable.Row>
						</ClayTable.Head>

						<ClayTable.Body>
							{topics.map((item) => (
								<ClayTable.Row
									key={`${item.topic}:${item.name}`}
								>
									<ClayTable.Cell>
										{item.topic}
									</ClayTable.Cell>

									<ClayTable.Cell>
										{item.name}
									</ClayTable.Cell>
								</ClayTable.Row>
							))}
						</ClayTable.Body>
					</ClayTable>
				</div>
			)}
		</Page>
	);
}

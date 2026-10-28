/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayAlert from '@clayui/alert';
import ClayLabel from '@clayui/label';
import i18n from '~/i18n';
import InspectorSection from '~/pages/Admin/AccountInspector/AccountInspectorDetail/components/InspectorSection/InspectorSection';

import type {Word} from '~/i18n';
import type {AccountFindingSeverity} from '~/types/accountInspection';
import type {InspectorFinding} from '~/types/productInspection';

const MAX_LISTED_IDS = 20;

const SEVERITY_LABELS: Record<AccountFindingSeverity, Word> = {
	danger: 'error',
	info: 'info',
	warning: 'warning',
};

type InspectorFindingsProps<CollectionKey extends string> = {
	collectionLabels: Record<CollectionKey, Word>;
	emptyMessage: Word;
	findings: InspectorFinding<CollectionKey>[];
	onSelect: (
		collection: CollectionKey,
		finding: InspectorFinding<CollectionKey>
	) => void;
};

function formatIds(ids: (number | string)[]) {
	if (ids.length <= MAX_LISTED_IDS) {
		return ids.join(', ');
	}

	return i18n.sub('x-and-x-more', [
		ids.slice(0, MAX_LISTED_IDS).join(', '),
		String(ids.length - MAX_LISTED_IDS),
	]);
}

export default function InspectorFindings<CollectionKey extends string>({
	collectionLabels,
	emptyMessage,
	findings,
	onSelect,
}: InspectorFindingsProps<CollectionKey>) {
	return (
		<InspectorSection
			badges={<ClayLabel displayType="info">{findings.length}</ClayLabel>}
			defaultExpanded
			title={i18n.translate('findings')}
		>
			{!findings.length && (
				<ClayAlert className="mb-0" displayType="success">
					{i18n.translate(emptyMessage)}
				</ClayAlert>
			)}

			{findings.map((finding) => {
				const {collection, ids, message, severity} = finding;

				return (
					<div
						className="account-inspector-finding align-items-start border d-flex mb-2 p-3 rounded-lg"
						key={`${collection}-${message}`}
					>
						<ClayLabel className="mr-3" displayType={severity}>
							{i18n.translate(SEVERITY_LABELS[severity])}
						</ClayLabel>

						<div className="flex-grow-1">
							<div>
								<button
									className="btn btn-link btn-sm font-weight-semi-bold mr-2 p-0"
									onClick={() =>
										onSelect(collection, finding)
									}
									type="button"
								>
									{i18n.translate(
										collectionLabels[collection]
									)}
								</button>

								<span>{i18n.translate(message)}</span>
							</div>

							{Boolean(ids.length) && (
								<div className="small text-secondary">
									{i18n.sub('ids-x', formatIds(ids))}
								</div>
							)}
						</div>
					</div>
				);
			})}
		</InspectorSection>
	);
}

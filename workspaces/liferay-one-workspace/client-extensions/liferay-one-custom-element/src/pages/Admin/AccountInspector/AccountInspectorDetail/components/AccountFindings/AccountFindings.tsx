/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import ClayAlert from '@clayui/alert';
import ClayLabel from '@clayui/label';
import i18n from '~/i18n';

import {INSPECTED_COLLECTION_LABELS} from '../../utils/inspectedCollectionConstants';
import InspectorSection from '../InspectorSection/InspectorSection';

import type {Word} from '~/i18n';
import type {
	AccountFinding,
	AccountFindingSeverity,
	InspectedCollectionKey,
} from '~/types/accountInspection';

const MAX_LISTED_IDS = 20;

const SEVERITY_LABELS: Record<AccountFindingSeverity, Word> = {
	danger: 'error',
	info: 'info',
	warning: 'warning',
};

type AccountFindingsProps = {
	findings: AccountFinding[];
	onSelect: (collection: InspectedCollectionKey) => void;
};

export default function AccountFindings({
	findings,
	onSelect,
}: AccountFindingsProps) {
	return (
		<InspectorSection
			badges={<ClayLabel displayType="info">{findings.length}</ClayLabel>}
			defaultExpanded
			id="account-inspector-findings"
			title={i18n.translate('findings')}
		>
			{!findings.length && (
				<ClayAlert className="mb-0" displayType="success">
					{i18n.translate('no-problems-were-found-for-this-account')}
				</ClayAlert>
			)}

			{findings.map(({collection, ids, message, severity}) => (
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
								onClick={() => onSelect(collection)}
								type="button"
							>
								{i18n.translate(
									INSPECTED_COLLECTION_LABELS[collection]
								)}
							</button>

							<span>{i18n.translate(message)}</span>
						</div>

						{Boolean(ids.length) && (
							<div className="small text-secondary">
								{i18n.sub(
									'ids-x',
									ids.length > MAX_LISTED_IDS
										? i18n.sub('x-and-x-more', [
												ids
													.slice(0, MAX_LISTED_IDS)
													.join(', '),
												String(
													ids.length - MAX_LISTED_IDS
												),
											])
										: ids.join(', ')
								)}
							</div>
						)}
					</div>
				</div>
			))}
		</InspectorSection>
	);
}

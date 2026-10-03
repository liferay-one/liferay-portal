/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {SolutionInitialState} from '~/context/SolutionContextProvider';
import i18n from '~/i18n';
import zodSchema from '~/schemas/zodSchema';

import {PublishMode} from '../../NewAppFlow/constants';

import type {AppFlowItem} from '../../NewAppFlow/constants';

export const SOLUTIONS_EXIT_LINK = '/published-solutions';

export const BLOCK_TYPES = {
	TEXT: 'text-block',
	TEXT_IMAGES: 'text-images-block',
	TEXT_VIDEO: 'text-video-block',
} as const;

export const SOLUTION_FLOW_ITEMS: AppFlowItem<SolutionInitialState>[] = [
	{
		description: () =>
			'Review and accept the legal agreement between you and Liferay before proceeding. You are about to create a new solution submission.',
		label: i18n.translate('create'),
		modes: [PublishMode.CREATE],
		path: '',
		saveAsDraftRequired: false,
		title: () => 'Create new solution',
		visible: () => true,
	},
	{
		description: (isEditing = false) =>
			`${isEditing ? 'Edit' : 'Enter'} your solution details. This information will be used for submission, presentation, customer support, and search capabilities.`,
		label: i18n.translate('profile'),
		modes: [PublishMode.CREATE, PublishMode.EDIT],
		parseSchema: (context: SolutionInitialState) =>
			zodSchema.solutionPublishing.profile.safeParse(context.profile),
		path: 'profile',
		saveAsDraftRequired: true,
		title: (isEditing = false) =>
			`${isEditing ? 'Edit' : 'Define'} the solution profile`,
		visible: () => true,
	},
	{
		description: () =>
			i18n.translate(
				'design-the-storefront-for-your-solution-this-will-set-the-information-displayed-on-the-solutions-page-this-section-is-dedicated-to-creating-the-solutions-header'
			),
		label: i18n.translate('solution-header'),
		modes: [PublishMode.CREATE, PublishMode.EDIT],
		parseSchema: (context: SolutionInitialState) =>
			zodSchema.solutionPublishing.header.safeParse(context.header),
		path: 'header',
		saveAsDraftRequired: false,
		title: (isEditing = false) =>
			isEditing ? 'Edit' : i18n.translate('customize-solution-header'),
		visible: () => true,
	},
	{
		description: () =>
			i18n.translate(
				'design-the-storefront-for-your-solution-this-will-set-the-information-displayed-on-the-solutions-page-this-section-is-dedicated-to-creating-the-solutions-detail-content'
			),
		label: i18n.translate('solution-details'),
		modes: [PublishMode.CREATE, PublishMode.EDIT],
		parseSchema: (context: SolutionInitialState) =>
			zodSchema.solutionPublishing.details.safeParse(context.details),
		path: 'details',
		saveAsDraftRequired: false,
		title: (isEditing = false) =>
			isEditing
				? 'Edit'
				: i18n.translate('customize-storefront-solutions-details'),
		visible: () => true,
	},
	{
		description: () =>
			i18n.translate(
				'define-company-profile-information-for-your-solution-this-will-inform-users-about-this-versions-updates-on-the-storefront'
			),
		label: i18n.translate('company-profile'),
		modes: [PublishMode.CREATE, PublishMode.EDIT],
		parseSchema: (context: SolutionInitialState) =>
			zodSchema.solutionPublishing.company.safeParse(context.company),
		path: 'company',
		saveAsDraftRequired: false,
		title: (isEditing = false) =>
			isEditing
				? 'Edit'
				: i18n.translate('provide-company-profile-details'),
		visible: () => true,
	},
	{
		description: () =>
			i18n.translate(
				'define-contact-information-for-your-solution-this-will-inform-users-about-this-versions-updates-on-the-storefront'
			),
		label: i18n.translate('contact-us'),
		modes: [PublishMode.CREATE, PublishMode.EDIT],
		parseSchema: (context: SolutionInitialState) =>
			zodSchema.solutionPublishing.contactUs.safeParse(context.contactUs),
		path: 'contact',
		saveAsDraftRequired: false,
		title: (isEditing = false) =>
			isEditing ? 'Edit' : i18n.translate('provide-contact-us-details'),
		visible: () => true,
	},
	{
		description: () =>
			'Please, review before submitting. Once sent, you will not be able to edit any information until this submission is completely reviewed by Liferay.',
		label: i18n.translate('submit'),
		modes: [PublishMode.CREATE, PublishMode.EDIT],
		path: 'submit',
		saveAsDraftRequired: false,
		title: () => i18n.translate('review-and-submit-solution'),
		visible: () => true,
	},
];

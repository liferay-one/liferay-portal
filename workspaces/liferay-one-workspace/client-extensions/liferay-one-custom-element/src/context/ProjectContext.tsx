/**
 * SPDX-FileCopyrightText: (c) 2000 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

import {
	ReactNode,
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react';
import {useNavigate, useParams} from 'react-router';
import {useAccount} from '~/context/AccountContext';
import {
	useProjectProducts,
	useUnassignedCommerce,
} from '~/hooks/useProjectCommerce';
import {hasProject, useProjectOrders} from '~/hooks/useProjectOrders';
import i18n from '~/i18n';
import {
	LAST_PROJECT_STORAGE_KEY,
	ONE_TIME_PURCHASES,
	UserProject,
	resolveDefaultProject,
	useProjectsWithOrders,
} from '~/pages/MyAccount/Projects/projects';
import {
	toProductsByProductId,
	toProjectItemsByType,
} from '~/pages/MyAccount/Projects/utils/projectItemsUtils';

type ProjectContextValue = {
	loading: boolean;
	project?: UserProject;
	projectId: string;
	projects: UserProject[];
	rememberContractERC: (contractERC: string) => void;
	resolvingProjects: boolean;
	selectedContractERC?: string;
	setSelectedContractERC: (contractERC: string) => void;
};

const ProjectContext = createContext<ProjectContextValue>(
	{} as ProjectContextValue
);

export function ProjectProvider({children}: {children: ReactNode}) {
	const {accountERC, contractERC, projectERC} = useParams();
	const navigate = useNavigate();

	const {loading: accountLoading} = useAccount();

	const {loading: projectsLoading, projects: projectsWithOrders} =
		useProjectsWithOrders();

	const {hasUnassignedEntitlements, loading: unassignedLoading} =
		useUnassignedCommerce();

	const {loading: ordersLoading, placedOrders} = useProjectOrders();

	const {data: projectProducts, isLoading: projectProductsLoading} =
		useProjectProducts();

	const hasUnassignedItems = useMemo(() => {
		const itemsByProjectItemType = toProjectItemsByType(
			placedOrders.filter((order) => !hasProject(order)),
			toProductsByProductId(projectProducts?.items ?? [])
		);

		return Boolean(
			itemsByProjectItemType.application.size ||
				itemsByProjectItemType.product.size
		);
	}, [projectProducts, placedOrders]);

	const projects = useMemo<UserProject[]>(() => {
		if (
			projectsWithOrders.length &&
			!hasUnassignedItems &&
			!hasUnassignedEntitlements
		) {
			return projectsWithOrders;
		}

		return [
			...projectsWithOrders,
			{
				externalReferenceCode: ONE_TIME_PURCHASES,
				id: -1,
				name: i18n.translate('one-time-purchases'),
				unassigned: true,
			},
		];
	}, [hasUnassignedEntitlements, hasUnassignedItems, projectsWithOrders]);

	const loading =
		accountLoading ||
		projectProductsLoading ||
		ordersLoading ||
		projectsLoading;

	const resolvingProjects = loading || unassignedLoading;

	const projectId = projectERC ?? '';

	const project = useMemo(
		() => projects.find((item) => item.externalReferenceCode === projectId),
		[projectId, projects]
	);

	const [lastContract, setLastContract] = useState<{
		contractERC: string;
		projectId: string;
	}>();

	const rememberContractERC = useCallback(
		(validContractERC: string) =>
			setLastContract({contractERC: validContractERC, projectId}),
		[projectId]
	);

	const selectedContractERC =
		contractERC ??
		(lastContract?.projectId === projectId
			? lastContract.contractERC
			: undefined);

	const setSelectedContractERC = useCallback(
		(nextContractERC: string) =>
			navigate(
				`/${accountERC}/project/${projectId}/contract/${nextContractERC}/products`
			),
		[accountERC, navigate, projectId]
	);

	const accessible = projects.some(
		(project) => project.externalReferenceCode === projectId
	);

	useEffect(() => {
		if (accessible && !resolvingProjects) {
			localStorage.setItem(LAST_PROJECT_STORAGE_KEY, projectId);
		}
	}, [accessible, projectId, resolvingProjects]);

	useEffect(() => {
		if (resolvingProjects || !projects.length || accessible) {
			return;
		}

		const target = resolveDefaultProject(projects);

		if (!target) {
			return;
		}

		navigate(`/${accountERC}/project/${target.externalReferenceCode}`, {
			replace: true,
		});
	}, [accessible, accountERC, navigate, projects, resolvingProjects]);

	return (
		<ProjectContext.Provider
			value={{
				loading,
				project,
				projectId,
				projects,
				rememberContractERC,
				resolvingProjects,
				selectedContractERC,
				setSelectedContractERC,
			}}
		>
			{children}
		</ProjectContext.Provider>
	);
}

export function useProject() {
	return useContext(ProjectContext);
}

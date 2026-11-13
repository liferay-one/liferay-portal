/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.AccountRole;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.one.constants.ProductSpecificationConstants;
import com.liferay.one.constants.RoleConstants;
import com.liferay.one.model.Contract;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.ProjectMembership;
import com.liferay.one.util.CommerceProductUtil;
import com.liferay.petra.function.transform.TransformUtil;
import com.liferay.portal.kernel.util.StringUtil;
import com.liferay.portal.kernel.util.Validator;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * @author Ryan Schuhler
 */
@Component
public class ProjectContactRoleService {

	public List<String> getContactRoleExternalReferenceCodes(
			String projectExternalReferenceCode)
		throws Exception {

		List<Contract> contracts = _contractService.getProjectContracts(
			projectExternalReferenceCode);

		if (contracts.isEmpty()) {
			return new ArrayList<>();
		}

		List<String> statements = TransformUtil.transform(
			contracts,
			contract ->
				"r_contractToEntitlement_c_contractId eq '" + contract.getId() +
					"'");

		Set<Long> productIds = new LinkedHashSet<>();

		for (Entitlement entitlement :
				_entitlementService.getEntitlements(
					StringUtil.merge(statements, " or "))) {

			String skuExternalReferenceCode =
				entitlement.getSkuExternalReferenceCode();

			if (Validator.isNull(skuExternalReferenceCode)) {
				continue;
			}

			Long productId = _commerceSkuService.fetchProductId(
				skuExternalReferenceCode);

			if (productId == null) {
				continue;
			}

			productIds.add(productId);
		}

		Set<String> contactRoleExternalReferenceCodes = new LinkedHashSet<>();

		for (long productId : productIds) {
			Product product = _commerceProductService.fetchProduct(productId);

			String value = CommerceProductUtil.getSpecificationValue(
				product,
				ProductSpecificationConstants.KEY_PROJECT_CONTACTS_ROLE_ERCS);

			if (Validator.isNull(value)) {
				continue;
			}

			for (String contactRoleExternalReferenceCode :
					StringUtil.split(value)) {

				String trimmedContactRoleExternalReferenceCode =
					contactRoleExternalReferenceCode.trim();

				if (Validator.isNull(trimmedContactRoleExternalReferenceCode)) {
					continue;
				}

				contactRoleExternalReferenceCodes.add(
					trimmedContactRoleExternalReferenceCode);
			}
		}

		return new ArrayList<>(contactRoleExternalReferenceCodes);
	}

	public Map<String, Map<String, String>> getContactRoleNames(
			Collection<String> projectExternalReferenceCodes)
		throws Exception {

		Map<String, Map<String, String>> contactRoleNamesMap =
			new LinkedHashMap<>();

		if (projectExternalReferenceCodes.isEmpty()) {
			return contactRoleNamesMap;
		}

		Map<String, String> accountRoleNames = _getAccountRoleNames();

		Map<String, List<ProjectMembership>> projectMembershipsMap =
			new HashMap<>();

		for (ProjectMembership projectMembership :
				_projectMembershipService.getProjectMemberships(
					projectExternalReferenceCodes)) {

			List<ProjectMembership> projectMemberships =
				projectMembershipsMap.computeIfAbsent(
					projectMembership.getProjectExternalReferenceCode(),
					key -> new ArrayList<>());

			projectMemberships.add(projectMembership);
		}

		for (String projectExternalReferenceCode :
				projectExternalReferenceCodes) {

			contactRoleNamesMap.put(
				projectExternalReferenceCode,
				_getContactRoleNames(
					accountRoleNames, projectExternalReferenceCode,
					projectMembershipsMap.getOrDefault(
						projectExternalReferenceCode, new ArrayList<>())));
		}

		return contactRoleNamesMap;
	}

	private Map<String, String> _getAccountRoleNames() throws Exception {
		Map<String, String> accountRoleNames = new HashMap<>();

		for (AccountRole accountRole : _accountRoleService.getAccountRoles()) {
			if (Validator.isNull(accountRole.getExternalReferenceCode())) {
				continue;
			}

			accountRoleNames.put(
				accountRole.getExternalReferenceCode(), accountRole.getName());
		}

		return accountRoleNames;
	}

	private Map<String, String> _getContactRoleNames(
			Map<String, String> accountRoleNames,
			String projectExternalReferenceCode,
			List<ProjectMembership> projectMemberships)
		throws Exception {

		Map<String, String> contactRoleNames = new LinkedHashMap<>();

		Set<String> contactRoleExternalReferenceCodes = new LinkedHashSet<>(
			getContactRoleExternalReferenceCodes(projectExternalReferenceCode));

		Set<Long> projectMemberUserIds = new HashSet<>();

		for (ProjectMembership projectMembership : projectMemberships) {
			if (!RoleConstants.ercsSupportProject.contains(
					projectMembership.getRoleExternalReferenceCode())) {

				continue;
			}

			projectMemberUserIds.add(projectMembership.getUserId());
		}

		for (ProjectMembership projectMembership : projectMemberships) {
			String roleExternalReferenceCode =
				projectMembership.getRoleExternalReferenceCode();

			if (RoleConstants.ercsSupportProject.contains(
					roleExternalReferenceCode) ||
				!projectMemberUserIds.contains(projectMembership.getUserId())) {

				continue;
			}

			contactRoleExternalReferenceCodes.add(roleExternalReferenceCode);
		}

		for (String contactRoleExternalReferenceCode :
				contactRoleExternalReferenceCodes) {

			String name = accountRoleNames.get(
				contactRoleExternalReferenceCode);

			if (Validator.isNull(name)) {
				continue;
			}

			contactRoleNames.put(contactRoleExternalReferenceCode, name);
		}

		return contactRoleNames;
	}

	@Autowired
	private AccountRoleService _accountRoleService;

	@Autowired
	private CommerceProductService _commerceProductService;

	@Autowired
	private CommerceSkuService _commerceSkuService;

	@Autowired
	private ContractService _contractService;

	@Autowired
	private EntitlementService _entitlementService;

	@Autowired
	private ProjectMembershipService _projectMembershipService;

}
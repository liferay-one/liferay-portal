/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.one.constants.ProductSpecificationConstants;
import com.liferay.one.model.Contract;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.EntitlementDefinition;
import com.liferay.one.util.CommerceProductUtil;
import com.liferay.petra.function.transform.TransformUtil;
import com.liferay.portal.kernel.util.StringUtil;
import com.liferay.portal.kernel.util.Validator;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
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

			EntitlementDefinition entitlementDefinition =
				entitlement.getEntitlementDefinition();

			if (entitlementDefinition == null) {
				continue;
			}

			Long productId = _commerceSkuService.fetchProductId(
				entitlementDefinition.getSkuExternalReferenceCode());

			if (productId != null) {
				productIds.add(productId);
			}
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

				if (Validator.isNotNull(
						trimmedContactRoleExternalReferenceCode)) {

					contactRoleExternalReferenceCodes.add(
						trimmedContactRoleExternalReferenceCode);
				}
			}
		}

		return new ArrayList<>(contactRoleExternalReferenceCodes);
	}

	@Autowired
	private CommerceProductService _commerceProductService;

	@Autowired
	private CommerceSkuService _commerceSkuService;

	@Autowired
	private ContractService _contractService;

	@Autowired
	private EntitlementService _entitlementService;

}
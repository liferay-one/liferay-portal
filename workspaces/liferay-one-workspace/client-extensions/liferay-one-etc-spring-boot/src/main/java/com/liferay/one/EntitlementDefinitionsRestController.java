/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.one.service.CommerceProductService;
import com.liferay.one.service.EntitlementDefinitionService;
import com.liferay.portal.kernel.workflow.WorkflowConstants;

import java.util.Objects;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * @author Felipe Veloso
 */
@RequestMapping("/entitlement-definitions")
@RestController
public class EntitlementDefinitionsRestController
	extends OneBaseRestController {

	@PostMapping("/generate")
	public void postEntitlementDefinitionsGenerate(
			@RequestParam long cProductId)
		throws Exception {

		Product product = _commerceProductService.fetchProduct(cProductId);

		if ((product == null) ||
			!Objects.equals(
				product.getProductStatus(),
				WorkflowConstants.STATUS_APPROVED)) {

			return;
		}

		_entitlementDefinitionService.generateEntitlementDefinition(cProductId);
	}

	@Autowired
	private CommerceProductService _commerceProductService;

	@Autowired
	private EntitlementDefinitionService _entitlementDefinitionService;

}
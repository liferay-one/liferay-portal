/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.ProductSpecification;
import com.liferay.one.constants.ProductSpecificationConstants;
import com.liferay.one.model.Contract;
import com.liferay.one.model.Entitlement;

import java.util.List;
import java.util.Map;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[SVC-PROJECTCONTACTROLESERVICE] ProjectContactRoleService")
public class ProjectContactRoleServiceTest {

	@BeforeEach
	public void setUp() {
		_projectContactRoleService = new ProjectContactRoleService();

		ReflectionTestUtils.setField(
			_projectContactRoleService, "_commerceProductService",
			_commerceProductService);
		ReflectionTestUtils.setField(
			_projectContactRoleService, "_commerceSkuService",
			_commerceSkuService);
		ReflectionTestUtils.setField(
			_projectContactRoleService, "_contractService", _contractService);
		ReflectionTestUtils.setField(
			_projectContactRoleService, "_entitlementService",
			_entitlementService);
	}

	@Test
	public void testGetContactRoleExternalReferenceCodesReadsTheProductsOfTheProjectContracts()
		throws Exception {

		Mockito.when(
			_commerceProductService.fetchProduct(100L)
		).thenReturn(
			_createProduct("C_CRITICAL_INCIDENT_CONTACT, C_PAAS_USER")
		);

		Mockito.when(
			_commerceProductService.fetchProduct(200L)
		).thenReturn(
			_createProduct("C_CRITICAL_INCIDENT_CONTACT,C_DATA_BREACH_CONTACT")
		);

		Mockito.when(
			_commerceSkuService.fetchProductId("SKU-PAAS")
		).thenReturn(
			100L
		);

		Mockito.when(
			_commerceSkuService.fetchProductId("SKU-SAAS")
		).thenReturn(
			200L
		);

		Mockito.when(
			_entitlementService.getEntitlements(
				"r_contractToEntitlement_c_contractId eq '11' or " +
					"r_contractToEntitlement_c_contractId eq '12'")
		).thenReturn(
			List.of(
				_createEntitlement(1, "SKU-PAAS"),
				_createEntitlement(2, "SKU-SAAS"),
				_createEntitlement(3, "SKU-PAAS"), _createEntitlement(4, null))
		);

		Mockito.when(
			_contractService.getProjectContracts(
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			List.of(_createContract(11), _createContract(12))
		);

		Assertions.assertEquals(
			List.of(
				"C_CRITICAL_INCIDENT_CONTACT", "C_PAAS_USER",
				"C_DATA_BREACH_CONTACT"),
			_projectContactRoleService.getContactRoleExternalReferenceCodes(
				_PROJECT_EXTERNAL_REFERENCE_CODE));

		Mockito.verify(
			_commerceProductService, Mockito.times(1)
		).fetchProduct(
			100L
		);
	}

	@Test
	public void testGetContactRoleExternalReferenceCodesReturnsNothingForAProjectWithoutContracts()
		throws Exception {

		Assertions.assertEquals(
			List.of(),
			_projectContactRoleService.getContactRoleExternalReferenceCodes(
				_PROJECT_EXTERNAL_REFERENCE_CODE));

		Mockito.verifyNoInteractions(_entitlementService);
	}

	@Test
	public void testGetContactRoleExternalReferenceCodesSkipsProductsWithoutTheSpecification()
		throws Exception {

		Mockito.when(
			_commerceProductService.fetchProduct(100L)
		).thenReturn(
			_createProduct(null)
		);

		Mockito.when(
			_commerceSkuService.fetchProductId("SKU-PAAS")
		).thenReturn(
			100L
		);

		Mockito.when(
			_entitlementService.getEntitlements(ArgumentMatchers.anyString())
		).thenReturn(
			List.of(
				_createEntitlement(1, "SKU-PAAS"),
				_createEntitlement(2, "SKU-UNKNOWN"))
		);

		Mockito.when(
			_contractService.getProjectContracts(
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			List.of(_createContract(11))
		);

		Assertions.assertEquals(
			List.of(),
			_projectContactRoleService.getContactRoleExternalReferenceCodes(
				_PROJECT_EXTERNAL_REFERENCE_CODE));
	}

	private Contract _createContract(long id) {
		return new Contract(
			new JSONObject(
			).put(
				"id", id
			).put(
				"r_projectToContract_c_projectERC",
				_PROJECT_EXTERNAL_REFERENCE_CODE
			));
	}

	private Entitlement _createEntitlement(
		long id, String skuExternalReferenceCode) {

		JSONObject jsonObject = new JSONObject(
		).put(
			"id", id
		);

		if (skuExternalReferenceCode != null) {
			jsonObject.put(
				"entitlementDefinitionToEntitlement",
				new JSONObject(
				).put(
					"id", id
				).put(
					"skuExternalReferenceCode", skuExternalReferenceCode
				));
		}

		return new Entitlement(jsonObject);
	}

	private Product _createProduct(String contactRoleExternalReferenceCodes) {
		Product product = new Product();

		if (contactRoleExternalReferenceCodes == null) {
			return product;
		}

		ProductSpecification productSpecification = new ProductSpecification();

		productSpecification.setSpecificationKey(
			() -> ProductSpecificationConstants.KEY_PROJECT_CONTACTS_ROLE_ERCS);
		productSpecification.setValue(
			() -> Map.of("en_US", contactRoleExternalReferenceCodes));

		product.setProductSpecifications(
			() -> new ProductSpecification[] {productSpecification});

		return product;
	}

	private static final String _PROJECT_EXTERNAL_REFERENCE_CODE = "PRJCT-1";

	private final CommerceProductService _commerceProductService = Mockito.mock(
		CommerceProductService.class);
	private final CommerceSkuService _commerceSkuService = Mockito.mock(
		CommerceSkuService.class);
	private final ContractService _contractService = Mockito.mock(
		ContractService.class);
	private final EntitlementService _entitlementService = Mockito.mock(
		EntitlementService.class);
	private ProjectContactRoleService _projectContactRoleService;

}
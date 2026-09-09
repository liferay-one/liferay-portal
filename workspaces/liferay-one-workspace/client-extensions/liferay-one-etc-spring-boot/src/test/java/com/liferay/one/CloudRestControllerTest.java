/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.ProductSpecification;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.ProductVirtualSettingsFileEntry;
import com.liferay.one.constants.CommerceProductConstants;
import com.liferay.one.constants.EntitlementConstants;
import com.liferay.one.constants.EnvironmentConstants;
import com.liferay.one.exception.CloudNativeEntitlementException;
import com.liferay.one.exception.EnvironmentProfileEntitlementException;
import com.liferay.one.exception.ProjectNotFoundException;
import com.liferay.one.license.LicenseKeyExporter;
import com.liferay.one.license.LicenseKeyGenerator;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.Environment;
import com.liferay.one.model.Project;
import com.liferay.one.permission.EnvironmentActivationPermission;
import com.liferay.one.service.AccountService;
import com.liferay.one.service.CloudActivationRequestService;
import com.liferay.one.service.CommerceProductService;
import com.liferay.one.service.CommerceProductVirtualSettingsService;
import com.liferay.one.service.CommerceSkuService;
import com.liferay.one.service.EntitlementService;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.security.auth.PrincipalException;

import java.lang.reflect.UndeclaredThrowableException;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

/**
 * @author Amos Fong
 */
public class CloudRestControllerTest {

	@BeforeEach
	public void setUp() throws Exception {
		_cloudRestController = new CloudRestController();

		_accountService = Mockito.mock(AccountService.class);
		_cloudActivationRequestService = Mockito.mock(
			CloudActivationRequestService.class);
		_commerceProductService = Mockito.mock(CommerceProductService.class);
		_commerceProductVirtualSettingsService = Mockito.mock(
			CommerceProductVirtualSettingsService.class);
		_commerceSkuService = Mockito.mock(CommerceSkuService.class);
		_entitlementService = Mockito.mock(EntitlementService.class);
		_environmentActivationPermission = Mockito.mock(
			EnvironmentActivationPermission.class);
		_licenseKeyExporter = Mockito.mock(LicenseKeyExporter.class);
		_licenseKeyGenerator = Mockito.mock(LicenseKeyGenerator.class);

		Account account = new Account();

		account.setName("Acme");

		Mockito.when(
			_commerceSkuService.fetchProductId(_SKU_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			_C_PRODUCT_ID
		);

		Mockito.when(
			_accountService.fetchAccount(_ACCOUNT_ID)
		).thenReturn(
			account
		);

		Mockito.when(
			_licenseKeyExporter.aggregateXMLs(ArgumentMatchers.any())
		).thenReturn(
			"<licenses />"
		);

		Mockito.when(
			_environmentActivationPermission.check(
				null, _PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			_createProject()
		);

		ReflectionTestUtils.setField(
			_cloudRestController, "_accountService", _accountService);
		ReflectionTestUtils.setField(
			_cloudRestController, "_cloudActivationRequestService",
			_cloudActivationRequestService);
		ReflectionTestUtils.setField(
			_cloudRestController, "_commerceProductService",
			_commerceProductService);
		ReflectionTestUtils.setField(
			_cloudRestController, "_commerceProductVirtualSettingsService",
			_commerceProductVirtualSettingsService);
		ReflectionTestUtils.setField(
			_cloudRestController, "_commerceSkuService", _commerceSkuService);
		ReflectionTestUtils.setField(
			_cloudRestController, "_entitlementService", _entitlementService);
		ReflectionTestUtils.setField(
			_cloudRestController, "_environmentActivationPermission",
			_environmentActivationPermission);
		ReflectionTestUtils.setField(
			_cloudRestController, "_licenseKeyExporter", _licenseKeyExporter);
		ReflectionTestUtils.setField(
			_cloudRestController, "_licenseKeyGenerator", _licenseKeyGenerator);
	}

	@AfterEach
	public void tearDown() {
		RequestContextHolder.resetRequestAttributes();
	}

	@Test
	public void testFetchProductWithLegacyKoroneikiProductId()
		throws Exception {

		Product product = _createCloudEnabledProduct();

		Mockito.when(
			_commerceSkuService.fetchProductId(_LEGACY_KORONEIKI_PRODUCT_ID)
		).thenReturn(
			null
		);

		Mockito.when(
			_commerceProductService.fetchProduct(_LEGACY_KORONEIKI_PRODUCT_ID)
		).thenReturn(
			product
		);

		Assertions.assertSame(
			product, _fetchProduct(_LEGACY_KORONEIKI_PRODUCT_ID));
	}

	@Test
	public void testFetchProductWithMarketplaceSku() throws Exception {
		Product product = _createCloudEnabledProduct();

		Mockito.when(
			_commerceProductService.fetchProduct(_C_PRODUCT_ID)
		).thenReturn(
			product
		);

		Assertions.assertSame(
			product, _fetchProduct(_SKU_EXTERNAL_REFERENCE_CODE));

		Mockito.verify(
			_commerceProductService, Mockito.never()
		).fetchProduct(
			_SKU_EXTERNAL_REFERENCE_CODE
		);
	}

	@Test
	public void testFetchProductWithUnknownIdentifier() throws Exception {
		Mockito.when(
			_commerceSkuService.fetchProductId("UNKNOWN")
		).thenReturn(
			null
		);

		Mockito.when(
			_commerceProductService.fetchProduct("UNKNOWN")
		).thenReturn(
			null
		);

		Assertions.assertNull(_fetchProduct("UNKNOWN"));
	}

	@Test
	public void testGetManifestJSONObjectIdentifiesAddOnsByMarketplaceSku()
		throws Exception {

		RequestContextHolder.setRequestAttributes(
			new ServletRequestAttributes(new MockHttpServletRequest()));

		Mockito.when(
			_entitlementService.getActiveEntitlements(_ACCOUNT_ID)
		).thenReturn(
			List.of(
				_createEntitlement(
					EntitlementConstants.
						NAME_LIFERAY_CLOUD_NATIVE_STANDARD_OPERATIONS_BUNDLE,
					1),
				_createProductEntitlement(_SKU_EXTERNAL_REFERENCE_CODE))
		);

		Mockito.when(
			_commerceProductService.fetchProduct(_C_PRODUCT_ID)
		).thenReturn(
			_createCloudEnabledProduct()
		);

		Mockito.when(
			_commerceProductVirtualSettingsService.
				fetchProductVirtualSettingsFileEntry(
					Mockito.eq(_C_PRODUCT_ID), Mockito.anyString())
		).thenReturn(
			_createProductVirtualSettingsFileEntry()
		);

		JSONObject jsonObject = _getManifestJSONObject(
			_createEnvironment(EnvironmentConstants.TYPE_PRODUCTION));

		JSONArray jsonArray = jsonObject.getJSONArray("add-ons");

		Assertions.assertEquals(1, jsonArray.length());

		JSONObject addOnJSONObject = jsonArray.getJSONObject(0);

		Assertions.assertEquals(
			_SKU_EXTERNAL_REFERENCE_CODE,
			addOnJSONObject.getString("productId"));
		Assertions.assertTrue(
			addOnJSONObject.getString(
				"downloadURL"
			).endsWith(
				StringBundler.concat(
					"/cloud/products/", _SKU_EXTERNAL_REFERENCE_CODE,
					"/virtual-entry/", _VIRTUAL_ENTRY_ID, "/download")
			));
	}

	@Test
	public void testGetManifestJSONObjectIgnoresNonproductionSizing()
		throws Exception {

		Mockito.when(
			_entitlementService.getActiveEntitlements(_ACCOUNT_ID)
		).thenReturn(
			List.of(
				_createEntitlement(
					EntitlementConstants.
						NAME_LIFERAY_CLOUD_NATIVE_STANDARD_OPERATIONS_BUNDLE,
					1),
				_createEntitlement(
					EntitlementConstants.NAME_UP_TO_5_PRODUCTION_PODS, 5))
		);

		JSONObject jsonObject = _getManifestJSONObject(
			_createEnvironment(EnvironmentConstants.TYPE_NONPRODUCTION));

		Assertions.assertEquals(1, jsonObject.getInt("maxClusterNodes"));
	}

	@Test
	public void testGetManifestJSONObjectSetsProductionSizing()
		throws Exception {

		Mockito.when(
			_entitlementService.getActiveEntitlements(_ACCOUNT_ID)
		).thenReturn(
			List.of(
				_createEntitlement(
					EntitlementConstants.
						NAME_LIFERAY_CLOUD_NATIVE_STANDARD_OPERATIONS_BUNDLE,
					1),
				_createEntitlement(
					EntitlementConstants.NAME_UP_TO_3_PRODUCTION_PODS, 3),
				_createEntitlement(
					EntitlementConstants.NAME_UP_TO_7_PRODUCTION_PODS, 7))
		);

		JSONObject jsonObject = _getManifestJSONObject(
			_createEnvironment(EnvironmentConstants.TYPE_PRODUCTION));

		Assertions.assertEquals(7, jsonObject.getInt("maxClusterNodes"));
	}

	@Test
	public void testGetManifestJSONObjectWithoutCloudNativeEntitlement()
		throws Exception {

		Mockito.when(
			_entitlementService.getActiveEntitlements(_ACCOUNT_ID)
		).thenReturn(
			Collections.emptyList()
		);

		Assertions.assertThrows(
			CloudNativeEntitlementException.class,
			() -> _getManifestJSONObject(
				_createEnvironment(EnvironmentConstants.TYPE_PRODUCTION)));
	}

	@Test
	public void testGetProjectsEntitlementsDisasterRecoveryPropagatesPermissionDenied()
		throws Exception {

		Mockito.doThrow(
			new PrincipalException()
		).when(
			_environmentActivationPermission
		).check(
			null, _PROJECT_EXTERNAL_REFERENCE_CODE
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _cloudRestController.getProjectsEntitlementsDisasterRecovery(
				null, _PROJECT_EXTERNAL_REFERENCE_CODE));

		Mockito.verifyNoInteractions(_entitlementService);
	}

	@Test
	public void testGetProjectsEntitlementsDisasterRecoveryRejectsUnknownProject()
		throws Exception {

		Mockito.when(
			_environmentActivationPermission.check(
				null, _PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			null
		);

		Assertions.assertThrows(
			ProjectNotFoundException.class,
			() -> _cloudRestController.getProjectsEntitlementsDisasterRecovery(
				null, _PROJECT_EXTERNAL_REFERENCE_CODE));

		Mockito.verifyNoInteractions(_entitlementService);
	}

	@Test
	public void testGetProjectsEntitlementsDisasterRecoveryReturnsFalse()
		throws Exception {

		Mockito.when(
			_entitlementService.hasActiveEntitlement(
				_PROJECT_EXTERNAL_REFERENCE_CODE,
				EntitlementConstants.NAME_DISASTER_RECOVERY)
		).thenReturn(
			false
		);

		ResponseEntity<String> responseEntity =
			_cloudRestController.getProjectsEntitlementsDisasterRecovery(
				null, _PROJECT_EXTERNAL_REFERENCE_CODE);

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		Assertions.assertFalse(
			jsonObject.getBoolean("hasDisasterRecoveryEntitlement"));
	}

	@Test
	public void testGetProjectsEntitlementsDisasterRecoveryReturnsTrue()
		throws Exception {

		Mockito.when(
			_entitlementService.hasActiveEntitlement(
				_PROJECT_EXTERNAL_REFERENCE_CODE,
				EntitlementConstants.NAME_DISASTER_RECOVERY)
		).thenReturn(
			true
		);

		ResponseEntity<String> responseEntity =
			_cloudRestController.getProjectsEntitlementsDisasterRecovery(
				null, _PROJECT_EXTERNAL_REFERENCE_CODE);

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		Assertions.assertTrue(
			jsonObject.getBoolean("hasDisasterRecoveryEntitlement"));
	}

	@Test
	public void testPostEnvironmentsActivationRequestOmitsAmbiguousContract()
		throws Exception {

		Mockito.when(
			_entitlementService.getActiveEntitlements(
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			List.of(
				_createProductEntitlement(
					_SKU_EXTERNAL_REFERENCE_CODE, _CONTRACT_ID),
				_createProductEntitlement(
					_SKU_EXTERNAL_REFERENCE_CODE, _CONTRACT_ID + 1))
		);

		Mockito.when(
			_commerceProductService.fetchProduct(_C_PRODUCT_ID)
		).thenReturn(
			_createProduct("paas")
		);

		ResponseEntity<Void> responseEntity =
			_cloudRestController.postEnvironmentsActivationRequest(
				null, _createActivationRequestJSON("paas"));

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		Mockito.verify(
			_cloudActivationRequestService
		).addActivationRequest(
			Mockito.eq(_ACCOUNT_ID), Mockito.any(), Mockito.eq(0L),
			Mockito.eq("paas"), Mockito.any(),
			Mockito.eq(_PROJECT_EXTERNAL_REFERENCE_CODE)
		);
	}

	@Test
	public void testPostEnvironmentsActivationRequestPropagatesPermissionDenied()
		throws Exception {

		Mockito.doThrow(
			new PrincipalException()
		).when(
			_environmentActivationPermission
		).check(
			null, _PROJECT_EXTERNAL_REFERENCE_CODE
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _cloudRestController.postEnvironmentsActivationRequest(
				null, _createActivationRequestJSON("paas")));

		Mockito.verifyNoInteractions(_cloudActivationRequestService);
		Mockito.verifyNoInteractions(_entitlementService);
	}

	@Test
	public void testPostEnvironmentsActivationRequestRejectsBlankEnvironmentProfile()
		throws Exception {

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> _cloudRestController.postEnvironmentsActivationRequest(
					null, _createActivationRequestJSON("")));

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST, responseStatusException.getStatusCode());

		Mockito.verifyNoInteractions(_cloudActivationRequestService);
		Mockito.verifyNoInteractions(_entitlementService);
	}

	@Test
	public void testPostEnvironmentsActivationRequestRejectsUnentitledEnvironmentProfile()
		throws Exception {

		Mockito.when(
			_entitlementService.getActiveEntitlements(
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			List.of(_createProductEntitlement(_SKU_EXTERNAL_REFERENCE_CODE))
		);

		Mockito.when(
			_commerceProductService.fetchProduct(_C_PRODUCT_ID)
		).thenReturn(
			_createProduct("paas")
		);

		Assertions.assertThrows(
			EnvironmentProfileEntitlementException.class,
			() -> _cloudRestController.postEnvironmentsActivationRequest(
				null, _createActivationRequestJSON("analytics-cloud")));

		Mockito.verifyNoInteractions(_cloudActivationRequestService);
	}

	@Test
	public void testPostEnvironmentsActivationRequestRejectsUnknownEnvironmentProfile()
		throws Exception {

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> _cloudRestController.postEnvironmentsActivationRequest(
					null, _createActivationRequestJSON("cloud-native")));

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST, responseStatusException.getStatusCode());

		Mockito.verifyNoInteractions(_cloudActivationRequestService);
		Mockito.verifyNoInteractions(_entitlementService);
	}

	@Test
	public void testPostEnvironmentsActivationRequestRejectsUnknownProject()
		throws Exception {

		Mockito.when(
			_environmentActivationPermission.check(
				null, _PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			null
		);

		Assertions.assertThrows(
			ProjectNotFoundException.class,
			() -> _cloudRestController.postEnvironmentsActivationRequest(
				null, _createActivationRequestJSON("paas")));

		Mockito.verifyNoInteractions(_cloudActivationRequestService);
		Mockito.verifyNoInteractions(_entitlementService);
	}

	@Test
	public void testPostEnvironmentsActivationRequestRejectsUnspecifiedEnvironmentProfile()
		throws Exception {

		Mockito.when(
			_entitlementService.getActiveEntitlements(
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			List.of(_createProductEntitlement(_SKU_EXTERNAL_REFERENCE_CODE))
		);

		Mockito.when(
			_commerceProductService.fetchProduct(_C_PRODUCT_ID)
		).thenReturn(
			new Product()
		);

		Assertions.assertThrows(
			EnvironmentProfileEntitlementException.class,
			() -> _cloudRestController.postEnvironmentsActivationRequest(
				null, _createActivationRequestJSON("paas")));

		Mockito.verifyNoInteractions(_cloudActivationRequestService);
	}

	@Test
	public void testPostEnvironmentsActivationRequestSubmitsEntitledEnvironmentProfile()
		throws Exception {

		Mockito.when(
			_entitlementService.getActiveEntitlements(
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			List.of(_createProductEntitlement(_SKU_EXTERNAL_REFERENCE_CODE))
		);

		Mockito.when(
			_commerceProductService.fetchProduct(_C_PRODUCT_ID)
		).thenReturn(
			_createProduct("paas")
		);

		ResponseEntity<Void> responseEntity =
			_cloudRestController.postEnvironmentsActivationRequest(
				null, _createActivationRequestJSON("paas"));

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		Mockito.verify(
			_cloudActivationRequestService
		).addActivationRequest(
			Mockito.eq(_ACCOUNT_ID), Mockito.any(), Mockito.eq(_CONTRACT_ID),
			Mockito.eq("paas"), Mockito.any(),
			Mockito.eq(_PROJECT_EXTERNAL_REFERENCE_CODE)
		);
	}

	@Test
	public void testPostProductsVirtualEntryDownloadRejectsUnknownIdentifier()
		throws Exception {

		Mockito.when(
			_commerceSkuService.fetchProductId("UNKNOWN")
		).thenReturn(
			null
		);

		Mockito.when(
			_commerceProductService.fetchProduct("UNKNOWN")
		).thenReturn(
			null
		);

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> _cloudRestController.postProductsVirtualEntryDownload(
					"UNKNOWN", _VIRTUAL_ENTRY_ID, "{}"));

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND, responseStatusException.getStatusCode());

		Mockito.verifyNoInteractions(_commerceProductVirtualSettingsService);
	}

	private String _createActivationRequestJSON(String environmentProfile) {
		JSONObject jsonObject = new JSONObject(
		).put(
			"environmentProfile", environmentProfile
		).put(
			"projectExternalReferenceCode", _PROJECT_EXTERNAL_REFERENCE_CODE
		);

		return jsonObject.toString();
	}

	private Product _createCloudEnabledProduct() {
		Product product = new Product();

		ProductSpecification productSpecification = new ProductSpecification();

		productSpecification.setSpecificationKey(
			() -> CommerceProductConstants.SPECIFICATION_KEY_CLOUD_ENABLED);
		productSpecification.setValue(() -> Map.of("en_US", "true"));

		product.setExternalReferenceCode(() -> _LEGACY_KORONEIKI_PRODUCT_ID);
		product.setName(() -> Map.of("en_US", "Acme Add On"));
		product.setProductId(() -> _C_PRODUCT_ID);
		product.setProductSpecifications(
			() -> new ProductSpecification[] {productSpecification});

		return product;
	}

	private Entitlement _createEntitlement(String name, double quantity) {
		return new Entitlement(
			new JSONObject(
			).put(
				"endDate", "2030-01-01T00:00:00Z"
			).put(
				"id", 1L
			).put(
				"name", name
			).put(
				"quantity", quantity
			).put(
				"startDate", "2020-01-01T00:00:00Z"
			));
	}

	private Environment _createEnvironment(String type) {
		return new Environment(
			new JSONObject(
			).put(
				"externalReferenceCode", "CNE-1"
			).put(
				"id", _ENVIRONMENT_ID
			).put(
				"offering", EnvironmentConstants.OFFERING_CLOUD_NATIVE
			).put(
				"r_accountEntryToEnvironment_accountEntryId", _ACCOUNT_ID
			).put(
				"type", type
			));
	}

	private Product _createProduct(String environmentProfile) {
		Product product = new Product();

		ProductSpecification productSpecification = new ProductSpecification();

		productSpecification.setSpecificationKey(
			() ->
				CommerceProductConstants.
					SPECIFICATION_KEY_PROJECT_ENVIRONMENT_PROFILE);
		productSpecification.setValue(
			() -> Map.of("en_US", environmentProfile));

		product.setProductSpecifications(
			() -> new ProductSpecification[] {productSpecification});

		return product;
	}

	private Entitlement _createProductEntitlement(
		String skuExternalReferenceCode) {

		return _createProductEntitlement(
			skuExternalReferenceCode, _CONTRACT_ID);
	}

	private Entitlement _createProductEntitlement(
		String skuExternalReferenceCode, long contractId) {

		return new Entitlement(
			new JSONObject(
			).put(
				"entitlementDefinitionToEntitlement",
				new JSONObject(
				).put(
					"id", 1L
				).put(
					"skuExternalReferenceCode", skuExternalReferenceCode
				)
			).put(
				"id", 1L
			).put(
				"r_contractToEntitlement_c_contractId", contractId
			));
	}

	private ProductVirtualSettingsFileEntry
		_createProductVirtualSettingsFileEntry() {

		ProductVirtualSettingsFileEntry productVirtualSettingsFileEntry =
			new ProductVirtualSettingsFileEntry();

		productVirtualSettingsFileEntry.setId(() -> _VIRTUAL_ENTRY_ID);
		productVirtualSettingsFileEntry.setSrc(() -> "/documents/acme.lpkg");
		productVirtualSettingsFileEntry.setVersion(() -> "1.0.0");

		return productVirtualSettingsFileEntry;
	}

	private Project _createProject() {
		return new Project(
			new JSONObject(
			).put(
				"externalReferenceCode", _PROJECT_EXTERNAL_REFERENCE_CODE
			).put(
				"r_accountEntryToProject_accountEntryId", _ACCOUNT_ID
			));
	}

	private Product _fetchProduct(String productIdentifier) throws Exception {
		try {
			return ReflectionTestUtils.invokeMethod(
				_cloudRestController, "_fetchProduct", productIdentifier);
		}
		catch (UndeclaredThrowableException undeclaredThrowableException) {
			throw (Exception)
				undeclaredThrowableException.getUndeclaredThrowable();
		}
	}

	private JSONObject _getManifestJSONObject(Environment environment)
		throws Exception {

		try {
			return ReflectionTestUtils.invokeMethod(
				_cloudRestController, "_getManifestJSONObject", "DXP 2025.Q3.1",
				environment);
		}
		catch (UndeclaredThrowableException undeclaredThrowableException) {
			throw (Exception)
				undeclaredThrowableException.getUndeclaredThrowable();
		}
	}

	private static final long _ACCOUNT_ID = 1000L;

	private static final long _C_PRODUCT_ID = 3000L;

	private static final long _CONTRACT_ID = 4000L;

	private static final long _ENVIRONMENT_ID = 2000L;

	private static final String _LEGACY_KORONEIKI_PRODUCT_ID = "PROD-3000";

	private static final String _PROJECT_EXTERNAL_REFERENCE_CODE = "PRJCT-005";

	private static final String _SKU_EXTERNAL_REFERENCE_CODE = "SKU-3000";

	private static final long _VIRTUAL_ENTRY_ID = 5000L;

	private AccountService _accountService;
	private CloudActivationRequestService _cloudActivationRequestService;
	private CloudRestController _cloudRestController;
	private CommerceProductService _commerceProductService;
	private CommerceProductVirtualSettingsService
		_commerceProductVirtualSettingsService;
	private CommerceSkuService _commerceSkuService;
	private EntitlementService _entitlementService;
	private EnvironmentActivationPermission _environmentActivationPermission;
	private LicenseKeyExporter _licenseKeyExporter;
	private LicenseKeyGenerator _licenseKeyGenerator;

}
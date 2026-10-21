/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.ProductSpecification;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.OrderItem;
import com.liferay.one.constants.CommerceOrderConstants;
import com.liferay.one.constants.LicenseKeyGenerationConstants;
import com.liferay.one.constants.ProductSpecificationConstants;
import com.liferay.one.exception.LicenseKeyEntitlementException;
import com.liferay.one.model.ActivationKey;
import com.liferay.one.model.Entitlement;
import com.liferay.one.util.KeyedLock;
import com.liferay.petra.string.StringPool;

import java.lang.reflect.Method;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;
import org.mockito.invocation.Invocation;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
@DisplayName(
	"[SVC-APPLICENSEKEYGENERATIONSERVICE] AppLicenseKeyGenerationService"
)
public class AppLicenseKeyGenerationServiceTest {

	@BeforeEach
	public void setUp() throws Exception {
		_appLicenseKeyGenerationService = new AppLicenseKeyGenerationService();

		ReflectionTestUtils.setField(
			_appLicenseKeyGenerationService, "_activationKeyService",
			_activationKeyService);
		ReflectionTestUtils.setField(
			_appLicenseKeyGenerationService, "_commerceOrderItemService",
			_commerceOrderItemService);
		ReflectionTestUtils.setField(
			_appLicenseKeyGenerationService, "_commerceOrderService",
			_commerceOrderService);
		ReflectionTestUtils.setField(
			_appLicenseKeyGenerationService, "_entitlementService",
			_entitlementService);
		ReflectionTestUtils.setField(
			_appLicenseKeyGenerationService, "_keyedLock", new KeyedLock());
		ReflectionTestUtils.setField(
			_appLicenseKeyGenerationService, "_licenseKeyGenerateFormService",
			_licenseKeyGenerateFormService);
		ReflectionTestUtils.setField(
			_appLicenseKeyGenerationService, "_licenseKeyService",
			_licenseKeyService);

		Mockito.when(
			_account.getId()
		).thenReturn(
			_ACCOUNT_ID
		);

		Mockito.when(
			_account.getName()
		).thenReturn(
			"Acme"
		);

		Mockito.when(
			_activationKeyService.addActivationKey(
				Mockito.anyLong(), Mockito.anyBoolean(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any())
		).thenReturn(
			new ActivationKey(
				new JSONObject(
				).put(
					"externalReferenceCode", "ACTVK-9"
				).put(
					"id", _ACTIVATION_KEY_ID
				))
		);

		Mockito.when(
			_licenseKeyService.getActiveUnassignedLicenseKeyCounts(_ACCOUNT_ID)
		).thenReturn(
			_licenseKeyCounts
		);
	}

	@Test
	public void testGenerateActivationKey() throws Exception {
		_stubEntitlements(
			_toEntitlement(1L, null, 2.0, "SKU-APP", "2026-01-01T00:00:00Z"));
		_stubProduct("SKU-APP", _toApp("PRDCT-APP", "app-uuid-1", "2.1.0"));

		ActivationKey activationKey =
			_appLicenseKeyGenerationService.generateActivationKey(
				_account, _toGenerateRequest(1L, "production", 2),
				"owner@liferay.com");

		Assertions.assertEquals(
			_ACTIVATION_KEY_ID, activationKey.getActivationKeyId());

		Date startDate = Date.from(Instant.parse("2026-01-01T00:00:00Z"));

		Date expirationDate = Date.from(
			ZonedDateTime.ofInstant(
				startDate.toInstant(), ZoneOffset.UTC
			).plusYears(
				100
			).toInstant());

		Mockito.verify(
			_activationKeyService
		).addActivationKey(
			_ACCOUNT_ID, true, expirationDate, StringPool.BLANK, null,
			startDate, "production"
		);

		List<Object[]> addLicenseKeyArguments = _getAddLicenseKeyArguments();

		Assertions.assertEquals(2, addLicenseKeyArguments.size());

		Object[] arguments = addLicenseKeyArguments.get(0);

		Assertions.assertEquals(_ACCOUNT_ID, arguments[0]);
		Assertions.assertEquals("Acme", arguments[1]);
		Assertions.assertEquals(_ACTIVATION_KEY_ID, arguments[2]);
		Assertions.assertEquals(false, arguments[5]);
		Assertions.assertEquals("Staging", arguments[7]);
		Assertions.assertEquals(1L, arguments[10]);
		Assertions.assertEquals(expirationDate, arguments[11]);
		Assertions.assertEquals("host-0", arguments[12]);
		Assertions.assertNull(arguments[14]);
		Assertions.assertEquals(StringPool.BLANK, arguments[15]);
		Assertions.assertEquals("production", arguments[17]);
		Assertions.assertEquals(3, arguments[18]);
		Assertions.assertEquals("Staging", arguments[25]);
		Assertions.assertEquals("owner@liferay.com", arguments[27]);
		Assertions.assertEquals("app-uuid-1", arguments[28]);
		Assertions.assertEquals("Acme App", arguments[29]);
		Assertions.assertEquals("2.1.0", arguments[30]);
		Assertions.assertNull(arguments[31]);
		Assertions.assertEquals(startDate, arguments[34]);

		Assertions.assertEquals("host-1", addLicenseKeyArguments.get(1)[12]);
	}

	@Test
	public void testGenerateActivationKeyDeactivatesThePartialKeyOnFailure()
		throws Exception {

		_stubEntitlements(_toEntitlement(1L, null, 2.0, "SKU-APP", null));
		_stubProduct("SKU-APP", _toApp("PRDCT-APP", null, null));

		Mockito.when(
			_licenseKeyService.addLicenseKey(
				Mockito.anyLong(), Mockito.any(), Mockito.anyLong(),
				Mockito.anyBoolean(), Mockito.any(), Mockito.anyBoolean(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.anyLong(),
				Mockito.anyLong(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.anyInt(), Mockito.any(), Mockito.anyInt(),
				Mockito.anyLong(), Mockito.anyInt(), Mockito.anyInt(),
				Mockito.anyLong(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.any())
		).thenThrow(
			new IllegalStateException()
		);

		Assertions.assertThrows(
			IllegalStateException.class,
			() -> _appLicenseKeyGenerationService.generateActivationKey(
				_account, _toGenerateRequest(1L, "production", 1),
				"owner@liferay.com"));

		Mockito.verify(
			_activationKeyService
		).deactivatePartialActivationKey(
			Mockito.argThat(
				activationKey ->
					activationKey.getActivationKeyId() == _ACTIVATION_KEY_ID)
		);
	}

	@Test
	public void testGenerateActivationKeyFallsBackToTheProductExternalReferenceCode()
		throws Exception {

		_stubEntitlements(_toEntitlement(1L, null, 1.0, "SKU-APP", null));
		_stubProduct("SKU-APP", _toApp("PRDCT-APP", null, null));

		_appLicenseKeyGenerationService.generateActivationKey(
			_account, _toGenerateRequest(1L, "production", 1),
			"owner@liferay.com");

		Object[] arguments = _getAddLicenseKeyArguments().get(0);

		Assertions.assertEquals("PRDCT-APP", arguments[28]);
		Assertions.assertEquals("1", arguments[30]);
	}

	@Test
	public void testGenerateActivationKeyRejectsAnUncompletedOrder()
		throws Exception {

		_stubEntitlements(
			_toEntitlement(1L, 501L, null, null, 1.0, "SKU-APP", null));
		_stubOrder(501L, 601L, CommerceOrderConstants.ORDER_STATUS_PENDING);
		_stubProduct("SKU-APP", _toApp("PRDCT-APP", null, null));

		Assertions.assertThrows(
			LicenseKeyEntitlementException.class,
			() -> _appLicenseKeyGenerationService.generateActivationKey(
				_account, _toGenerateRequest(1L, "production", 1),
				"owner@liferay.com"));

		Mockito.verifyNoInteractions(_activationKeyService);
	}

	@Test
	public void testGenerateActivationKeyRejectsAnUnknownEntitlement()
		throws Exception {

		_stubEntitlements(_toEntitlement(1L, null, 1.0, "SKU-APP", null));
		_stubProduct("SKU-APP", _toApp("PRDCT-APP", null, null));

		Assertions.assertThrows(
			LicenseKeyEntitlementException.class,
			() -> _appLicenseKeyGenerationService.generateActivationKey(
				_account, _toGenerateRequest(2L, "production", 1),
				"owner@liferay.com"));

		Mockito.verifyNoInteractions(_activationKeyService);
	}

	@Test
	public void testGenerateActivationKeyRejectsAnotherKeyType()
		throws Exception {

		_stubEntitlements(_toEntitlement(1L, null, 1.0, "SKU-APP", null));
		_stubProduct("SKU-APP", _toApp("PRDCT-APP", null, null));

		Assertions.assertThrows(
			LicenseKeyEntitlementException.class,
			() -> _appLicenseKeyGenerationService.generateActivationKey(
				_account, _toGenerateRequest(1L, "developer", 1),
				"owner@liferay.com"));

		Mockito.verifyNoInteractions(_activationKeyService);
	}

	@Test
	public void testGenerateActivationKeyRejectsMoreServersThanAreLeft()
		throws Exception {

		_stubEntitlements(_toEntitlement(1L, null, 2.0, "SKU-APP", null));
		_stubProduct("SKU-APP", _toApp("PRDCT-APP", null, null));

		_licenseKeyCounts.put(1L, 1);

		Assertions.assertThrows(
			LicenseKeyEntitlementException.class,
			() -> _appLicenseKeyGenerationService.generateActivationKey(
				_account, _toGenerateRequest(1L, "production", 2),
				"owner@liferay.com"));

		Mockito.verifyNoInteractions(_activationKeyService);
	}

	@Test
	public void testGenerateActivationKeyRejectsRenewal() throws Exception {
		Assertions.assertThrows(
			LicenseKeyEntitlementException.class,
			() -> _appLicenseKeyGenerationService.generateActivationKey(
				_account,
				new LicenseKeyGenerationService.GenerateRequest(
					Collections.emptyList(), null, null, "Staging",
					"production", 0, null, null, "ACTVK-1",
					Arrays.asList(
						new LicenseKeyGenerationService.GenerateRequest.Server(
							"host", null, null)),
					null, 1L, null, false, null, null),
				"owner@liferay.com"));

		Mockito.verifyNoInteractions(_entitlementService);
	}

	@Test
	public void testGetGenerateFormGroupsTheEntitlementsOfOneApp()
		throws Exception {

		_stubEntitlements(
			_toEntitlement(1L, null, 1.0, "SKU-APP", null),
			_toEntitlement(2L, null, 3.0, "SKU-APP", null));
		_stubProduct("SKU-APP", _toApp("PRDCT-APP", null, null));

		JSONArray productsJSONArray =
			_appLicenseKeyGenerationService.getGenerateForm(
				_ACCOUNT_ID
			).getJSONArray(
				"products"
			);

		Assertions.assertEquals(1, productsJSONArray.length());

		JSONArray keyTypesJSONArray = productsJSONArray.getJSONObject(
			0
		).getJSONArray(
			"keyTypes"
		);

		Assertions.assertEquals(1, keyTypesJSONArray.length());

		JSONArray subscriptionsJSONArray = keyTypesJSONArray.getJSONObject(
			0
		).getJSONArray(
			"subscriptions"
		);

		Assertions.assertEquals(2, subscriptionsJSONArray.length());
		Assertions.assertEquals(
			3,
			subscriptionsJSONArray.getJSONObject(
				1
			).getInt(
				"totalCount"
			));
	}

	@Test
	public void testGetGenerateFormListsOnlyAppsOfCompletedOrders()
		throws Exception {

		_stubEntitlements(
			_toEntitlement(1L, 501L, null, null, 1.0, "SKU-APP-1", null),
			_toEntitlement(2L, 502L, null, null, 1.0, "SKU-APP-2", null),
			_toEntitlement(3L, 503L, null, null, 1.0, "SKU-APP-3", null),
			_toEntitlement(4L, null, 1.0, "SKU-APP-4", null));
		_stubOrder(501L, 601L, CommerceOrderConstants.ORDER_STATUS_COMPLETED);
		_stubOrder(502L, 602L, CommerceOrderConstants.ORDER_STATUS_PENDING);
		_stubProduct("SKU-APP-1", _toApp("PRDCT-APP-1", null, null));
		_stubProduct("SKU-APP-2", _toApp("PRDCT-APP-2", null, null));
		_stubProduct("SKU-APP-3", _toApp("PRDCT-APP-3", null, null));
		_stubProduct("SKU-APP-4", _toApp("PRDCT-APP-4", null, null));

		JSONArray productsJSONArray =
			_appLicenseKeyGenerationService.getGenerateForm(
				_ACCOUNT_ID
			).getJSONArray(
				"products"
			);

		List<String> externalReferenceCodes = new ArrayList<>();

		for (int i = 0; i < productsJSONArray.length(); i++) {
			JSONObject productJSONObject = productsJSONArray.getJSONObject(i);

			externalReferenceCodes.add(
				productJSONObject.getString("externalReferenceCode"));
		}

		Assertions.assertEquals(
			Arrays.asList("PRDCT-APP-1", "PRDCT-APP-4"),
			externalReferenceCodes);
	}

	@Test
	public void testGetGenerateFormListsOnlyLicensablePaidApps()
		throws Exception {

		_stubEntitlements(
			_toEntitlement(1L, null, 2.0, "SKU-APP", null),
			_toEntitlement(2L, null, 1.0, "SKU-FREE", null),
			_toEntitlement(3L, null, 1.0, "SKU-CLOUD", null),
			_toEntitlement(
				4L, LicenseKeyGenerationConstants.LICENSE_KEY_FAMILY_DXP, null,
				1.0, "SKU-DXP", null));
		_stubProduct("SKU-APP", _toApp("PRDCT-APP", null, null));
		_stubProduct(
			"SKU-CLOUD",
			_toProduct("PRDCT-CLOUD", "Paid", null, null, "cloud"));
		_stubProduct(
			"SKU-DXP",
			_toProduct(
				"marketplace-product-32654011", "Paid", null, null,
				ProductSpecificationConstants.TYPE_DXP));
		_stubProduct(
			"SKU-FREE",
			_toProduct(
				"PRDCT-FREE", "Free", null, null,
				ProductSpecificationConstants.TYPE_CLIENT_EXTENSION));

		_licenseKeyCounts.put(1L, 1);

		JSONObject jsonObject = _appLicenseKeyGenerationService.getGenerateForm(
			_ACCOUNT_ID);

		Assertions.assertEquals(
			0,
			jsonObject.getJSONArray(
				"bundleProducts"
			).length());

		JSONArray productsJSONArray = jsonObject.getJSONArray("products");

		Assertions.assertEquals(1, productsJSONArray.length());

		JSONObject productJSONObject = productsJSONArray.getJSONObject(0);

		Assertions.assertEquals(
			"PRDCT-APP", productJSONObject.getString("externalReferenceCode"));
		Assertions.assertEquals(
			"Acme App", productJSONObject.getString("name"));
		Assertions.assertEquals(
			"1",
			productJSONObject.getJSONArray(
				"versions"
			).getString(
				0
			));

		JSONObject keyTypeJSONObject = productJSONObject.getJSONArray(
			"keyTypes"
		).getJSONObject(
			0
		);

		Assertions.assertEquals(
			LicenseKeyGenerationConstants.KEY_TYPE_PRODUCTION,
			keyTypeJSONObject.getString("key"));

		JSONObject subscriptionJSONObject = keyTypeJSONObject.getJSONArray(
			"subscriptions"
		).getJSONObject(
			0
		);

		Assertions.assertEquals(
			1, subscriptionJSONObject.getInt("availableCount"));
		Assertions.assertEquals(2, subscriptionJSONObject.getInt("totalCount"));
	}

	@Test
	public void testGetGenerateFormUsesTheDefinitionKeyType() throws Exception {
		_stubEntitlements(
			_toEntitlement(1L, "developer", 1.0, "SKU-APP", null));
		_stubProduct("SKU-APP", _toApp("PRDCT-APP", null, null));

		JSONObject keyTypeJSONObject =
			_appLicenseKeyGenerationService.getGenerateForm(
				_ACCOUNT_ID
			).getJSONArray(
				"products"
			).getJSONObject(
				0
			).getJSONArray(
				"keyTypes"
			).getJSONObject(
				0
			);

		Assertions.assertEquals("developer", keyTypeJSONObject.get("key"));
	}

	@Test
	public void testGetSummaryIsGeneratableWhileAKeyIsLeft() throws Exception {
		_stubEntitlements(_toEntitlement(1L, null, 1.0, "SKU-APP", null));
		_stubProduct("SKU-APP", _toApp("PRDCT-APP", null, null));

		Assertions.assertTrue(
			_appLicenseKeyGenerationService.getSummary(
				_ACCOUNT_ID, true
			).getBoolean(
				"generatable"
			));

		_licenseKeyCounts.put(1L, 1);

		Assertions.assertFalse(
			_appLicenseKeyGenerationService.getSummary(
				_ACCOUNT_ID, true
			).getBoolean(
				"generatable"
			));
	}

	@Test
	public void testGetSummaryIsNotGeneratableBeforeTheOrderIsCompleted()
		throws Exception {

		_stubEntitlements(
			_toEntitlement(1L, 501L, null, null, 1.0, "SKU-APP", null));
		_stubOrder(501L, 601L, CommerceOrderConstants.ORDER_STATUS_PENDING);
		_stubProduct("SKU-APP", _toApp("PRDCT-APP", null, null));

		Assertions.assertFalse(
			_appLicenseKeyGenerationService.getSummary(
				_ACCOUNT_ID, true
			).getBoolean(
				"generatable"
			));
	}

	@Test
	public void testGetSummaryIsNotGeneratableWithoutSelfProvisioning()
		throws Exception {

		_stubEntitlements(_toEntitlement(1L, null, 1.0, "SKU-APP", null));
		_stubProduct("SKU-APP", _toApp("PRDCT-APP", null, null));

		Assertions.assertFalse(
			_appLicenseKeyGenerationService.getSummary(
				_ACCOUNT_ID, false
			).getBoolean(
				"generatable"
			));
	}

	@Test
	public void testGetSummaryReportsProvisionable() throws Exception {
		_stubEntitlements(_toEntitlement(1L, null, 1.0, "SKU-APP", null));
		_stubProduct("SKU-APP", _toApp("PRDCT-APP", null, null));

		Assertions.assertFalse(
			_appLicenseKeyGenerationService.getSummary(
				_ACCOUNT_ID, false
			).getBoolean(
				"provisionable"
			));
		Assertions.assertTrue(
			_appLicenseKeyGenerationService.getSummary(
				_ACCOUNT_ID, true
			).getBoolean(
				"provisionable"
			));
	}

	private void _addProductSpecification(
		String key, List<ProductSpecification> productSpecifications,
		String value) {

		if (value == null) {
			return;
		}

		ProductSpecification productSpecification = new ProductSpecification();

		productSpecification.setSpecificationKey(() -> key);
		productSpecification.setValue(() -> Map.of("en_US", value));

		productSpecifications.add(productSpecification);
	}

	private List<Object[]> _getAddLicenseKeyArguments() {
		List<Object[]> argumentsList = new ArrayList<>();

		for (Invocation invocation :
				Mockito.mockingDetails(
					_licenseKeyService
				).getInvocations()) {

			Method method = invocation.getMethod();

			if (!Objects.equals(method.getName(), "addLicenseKey")) {
				continue;
			}

			argumentsList.add(invocation.getArguments());
		}

		return argumentsList;
	}

	private void _stubEntitlements(Entitlement... entitlements)
		throws Exception {

		Mockito.when(
			_entitlementService.getActiveUnassignedEntitlements(_ACCOUNT_ID)
		).thenReturn(
			Arrays.asList(entitlements)
		);
	}

	private void _stubOrder(
			long commerceOrderItemId, long orderId, int orderStatus)
		throws Exception {

		OrderItem orderItem = new OrderItem();

		orderItem.setOrderId(orderId);

		Mockito.when(
			_commerceOrderItemService.fetchCommerceOrderItem(
				commerceOrderItemId)
		).thenReturn(
			orderItem
		);

		Order order = new Order();

		order.setOrderStatus(orderStatus);

		Mockito.when(
			_commerceOrderService.fetchCommerceOrder(orderId)
		).thenReturn(
			order
		);
	}

	private void _stubProduct(String skuExternalReferenceCode, Product product)
		throws Exception {

		Mockito.when(
			_licenseKeyGenerateFormService.fetchProduct(
				Mockito.argThat(
					entitlement ->
						(entitlement != null) &&
						skuExternalReferenceCode.equals(
							entitlement.getSkuExternalReferenceCode())))
		).thenReturn(
			product
		);
	}

	private Product _toApp(
		String externalReferenceCode, String appEntryUuid,
		String latestVersion) {

		return _toProduct(
			externalReferenceCode, "Paid", appEntryUuid, latestVersion,
			ProductSpecificationConstants.TYPE_DXP);
	}

	private Entitlement _toEntitlement(
		long entitlementId, String licenseKeyType, Double quantity,
		String skuExternalReferenceCode, String startDate) {

		return _toEntitlement(
			entitlementId, null, licenseKeyType, quantity,
			skuExternalReferenceCode, startDate);
	}

	private Entitlement _toEntitlement(
		long entitlementId, long commerceOrderItemId, String licenseKeyFamily,
		String licenseKeyType, Double quantity, String skuExternalReferenceCode,
		String startDate) {

		JSONObject jsonObject = new JSONObject(
		).put(
			"entitlementDefinitionToEntitlement",
			new JSONObject(
			).put(
				"id", 100 + entitlementId
			).put(
				"licenseKeyFamily", licenseKeyFamily
			).put(
				"licenseKeyType", licenseKeyType
			)
		).put(
			"id", entitlementId
		).put(
			"name", "Entitlement " + entitlementId
		).put(
			"quantity", quantity
		).put(
			"r_commerceOrderItemToEntitlement_commerceOrderItemId",
			commerceOrderItemId
		).put(
			"r_entitlementDefinitionToEntitlement_c_entitlementDefinitionId",
			100 + entitlementId
		).put(
			"skuExternalReferenceCode", skuExternalReferenceCode
		).put(
			"startDate", startDate
		);

		return new Entitlement(jsonObject);
	}

	private Entitlement _toEntitlement(
		long entitlementId, String licenseKeyFamily, String licenseKeyType,
		Double quantity, String skuExternalReferenceCode, String startDate) {

		return _toEntitlement(
			entitlementId, 0, licenseKeyFamily, licenseKeyType, quantity,
			skuExternalReferenceCode, startDate);
	}

	private LicenseKeyGenerationService.GenerateRequest _toGenerateRequest(
		long entitlementId, String keyType, int serverCount) {

		List<LicenseKeyGenerationService.GenerateRequest.Server> servers =
			new ArrayList<>();

		for (int i = 0; i < serverCount; i++) {
			servers.add(
				new LicenseKeyGenerationService.GenerateRequest.Server(
					"host-" + i, null, null));
		}

		return new LicenseKeyGenerationService.GenerateRequest(
			Collections.emptyList(), null, null, "Staging", keyType, 0, null,
			null, null, servers, null, entitlementId, null, false, null, null);
	}

	private Product _toProduct(
		String externalReferenceCode, String priceModel, String appEntryUuid,
		String latestVersion, String type) {

		List<ProductSpecification> productSpecifications = new ArrayList<>();

		_addProductSpecification(
			ProductSpecificationConstants.KEY_APP_ENTRY_UUID,
			productSpecifications, appEntryUuid);
		_addProductSpecification(
			ProductSpecificationConstants.KEY_LATEST_VERSION,
			productSpecifications, latestVersion);
		_addProductSpecification(
			ProductSpecificationConstants.KEY_PRICE_MODEL,
			productSpecifications, priceModel);
		_addProductSpecification(
			ProductSpecificationConstants.KEY_TYPE, productSpecifications,
			type);

		Product product = new Product();

		product.setExternalReferenceCode(externalReferenceCode);
		product.setName(() -> Map.of("en_US", "Acme App"));
		product.setProductSpecifications(
			() -> productSpecifications.toArray(new ProductSpecification[0]));

		return product;
	}

	private static final long _ACCOUNT_ID = 77L;

	private static final long _ACTIVATION_KEY_ID = 9L;

	private final Account _account = Mockito.mock(Account.class);
	private final ActivationKeyService _activationKeyService = Mockito.mock(
		ActivationKeyService.class);
	private AppLicenseKeyGenerationService _appLicenseKeyGenerationService;
	private final CommerceOrderItemService _commerceOrderItemService =
		Mockito.mock(CommerceOrderItemService.class);
	private final CommerceOrderService _commerceOrderService = Mockito.mock(
		CommerceOrderService.class);
	private final EntitlementService _entitlementService = Mockito.mock(
		EntitlementService.class);
	private final Map<Long, Integer> _licenseKeyCounts = new HashMap<>();
	private final LicenseKeyGenerateFormService _licenseKeyGenerateFormService =
		Mockito.mock(LicenseKeyGenerateFormService.class);
	private final LicenseKeyService _licenseKeyService = Mockito.mock(
		LicenseKeyService.class);

}
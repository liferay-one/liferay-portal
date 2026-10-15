/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.ProductSpecification;
import com.liferay.one.constants.LicenseKeyGenerationConstants;
import com.liferay.one.constants.ProductSpecificationConstants;
import com.liferay.one.exception.LicenseKeyEntitlementException;
import com.liferay.one.model.ActivationKey;
import com.liferay.one.model.LicenseKey;
import com.liferay.one.util.KeyedLock;

import java.lang.reflect.Method;

import java.time.Duration;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.mockito.invocation.Invocation;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ricardo Mariz
 */
@DisplayName(
	"[SVC-SELFSERVICETRIALLICENSEKEYSERVICE] SelfServiceTrialLicenseKeyService"
)
public class SelfServiceTrialLicenseKeyServiceTest {

	@BeforeEach
	public void setUp() throws Exception {
		_selfServiceTrialLicenseKeyService =
			new SelfServiceTrialLicenseKeyService();

		ReflectionTestUtils.setField(
			_selfServiceTrialLicenseKeyService, "_activationKeyService",
			_activationKeyService);
		ReflectionTestUtils.setField(
			_selfServiceTrialLicenseKeyService, "_commerceProductService",
			_commerceProductService);
		ReflectionTestUtils.setField(
			_selfServiceTrialLicenseKeyService, "_entitlementService",
			_entitlementService);
		ReflectionTestUtils.setField(
			_selfServiceTrialLicenseKeyService, "_keyedLock", new KeyedLock());
		ReflectionTestUtils.setField(
			_selfServiceTrialLicenseKeyService, "_licenseKeyService",
			_licenseKeyService);
		ReflectionTestUtils.setField(
			_selfServiceTrialLicenseKeyService, "_productVersionService",
			_productVersionService);

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
			_productVersionService.getFreeTierProductVersion()
		).thenReturn(
			"2026.q1"
		);
	}

	@Test
	public void testAddActivationKey() throws Exception {
		_stubProduct("cmp-trial");
		_stubDurationDays(30);

		ActivationKey activationKey =
			_selfServiceTrialLicenseKeyService.addActivationKey(
				_ACCOUNT_ID, "Acme", _C_PRODUCT_ID, "acme.com", "9001",
				"owner@acme.com");

		Assertions.assertEquals(
			_ACTIVATION_KEY_ID, activationKey.getActivationKeyId());

		ArgumentCaptor<Date> endDateCaptor = ArgumentCaptor.forClass(
			Date.class);
		ArgumentCaptor<Date> startDateCaptor = ArgumentCaptor.forClass(
			Date.class);

		Mockito.verify(
			_activationKeyService
		).addActivationKey(
			Mockito.eq(_ACCOUNT_ID), Mockito.eq(true), endDateCaptor.capture(),
			Mockito.eq("CMP"), Mockito.isNull(), startDateCaptor.capture(),
			Mockito.eq("trial")
		);

		Date endDate = endDateCaptor.getValue();
		Date startDate = startDateCaptor.getValue();

		Assertions.assertEquals(
			Duration.ofDays(30),
			Duration.between(startDate.toInstant(), endDate.toInstant()));

		List<Object[]> addLicenseKeyArguments = _getAddLicenseKeyArguments();

		Assertions.assertEquals(2, addLicenseKeyArguments.size());

		Object[] dxpArguments = addLicenseKeyArguments.get(0);

		Assertions.assertEquals(_ACCOUNT_ID, dxpArguments[0]);
		Assertions.assertEquals("Acme", dxpArguments[1]);
		Assertions.assertEquals(_ACTIVATION_KEY_ID, dxpArguments[2]);
		Assertions.assertEquals(
			"PRDCT-CONTENT-MARKETING-TRIAL", dxpArguments[5]);
		Assertions.assertEquals("acme.com", dxpArguments[9]);
		Assertions.assertEquals(endDate, dxpArguments[12]);
		Assertions.assertEquals("DXP", dxpArguments[16]);
		Assertions.assertEquals("developer", dxpArguments[18]);
		Assertions.assertEquals(
			LicenseKeyGenerationConstants.DEVELOPER_MAX_HTTP_SESSIONS,
			dxpArguments[23]);
		Assertions.assertEquals("Liferay DXP Trial", dxpArguments[26]);
		Assertions.assertEquals("9001", dxpArguments[27]);
		Assertions.assertEquals("owner@acme.com", dxpArguments[28]);
		Assertions.assertEquals("Liferay DXP", dxpArguments[30]);
		Assertions.assertEquals("2026.q1", dxpArguments[31]);
		Assertions.assertEquals(startDate, dxpArguments[35]);

		Object[] addOnArguments = addLicenseKeyArguments.get(1);

		Assertions.assertEquals(endDate, addOnArguments[12]);
		Assertions.assertEquals("CMP", addOnArguments[16]);
		Assertions.assertEquals("developer", addOnArguments[18]);
		Assertions.assertEquals(
			LicenseKeyGenerationConstants.DEVELOPER_MAX_HTTP_SESSIONS,
			addOnArguments[23]);
		Assertions.assertEquals(
			"Content Marketing Platform Trial", addOnArguments[26]);
		Assertions.assertEquals(
			"Content Marketing Platform", addOnArguments[30]);
		Assertions.assertEquals(startDate, addOnArguments[35]);
	}

	@Test
	public void testAddActivationKeyDeactivatesThePartialKeyOnFailure()
		throws Exception {

		_stubProduct("dsr-trial");
		_stubDurationDays(30);

		Mockito.when(
			_licenseKeyService.addLicenseKey(
				Mockito.anyLong(), Mockito.any(), Mockito.anyLong(),
				Mockito.anyBoolean(), Mockito.any(), Mockito.any(),
				Mockito.anyBoolean(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.anyLong(), Mockito.anyLong(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.anyInt(),
				Mockito.any(), Mockito.anyInt(), Mockito.anyLong(),
				Mockito.anyInt(), Mockito.anyInt(), Mockito.anyLong(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any())
		).thenThrow(
			new IllegalStateException()
		);

		Assertions.assertThrows(
			IllegalStateException.class,
			() -> _selfServiceTrialLicenseKeyService.addActivationKey(
				_ACCOUNT_ID, "Acme", _C_PRODUCT_ID, "acme.com", "9001",
				"owner@acme.com"));

		Mockito.verify(
			_activationKeyService
		).deactivatePartialActivationKey(
			Mockito.argThat(
				activationKey ->
					activationKey.getActivationKeyId() == _ACTIVATION_KEY_ID)
		);
	}

	@Test
	public void testAddActivationKeyIsCustomerDuration() throws Exception {
		_stubProduct("dsr-trial");
		_stubDurationDays(90);

		_selfServiceTrialLicenseKeyService.addActivationKey(
			_ACCOUNT_ID, "Acme", _C_PRODUCT_ID, "acme.com", "9001",
			"owner@acme.com");

		Object[] addOnArguments = _getAddLicenseKeyArguments().get(1);

		Date expirationDate = (Date)addOnArguments[12];
		Date startDate = (Date)addOnArguments[35];

		Assertions.assertEquals(
			Duration.ofDays(90),
			Duration.between(
				startDate.toInstant(), expirationDate.toInstant()));

		Assertions.assertEquals("DSR", addOnArguments[16]);
		Assertions.assertEquals("Digital Sales Room", addOnArguments[30]);
	}

	@Test
	public void testAddActivationKeyRejectsProductThatIsNotATrial()
		throws Exception {

		_stubProduct("cmp");

		Assertions.assertThrows(
			LicenseKeyEntitlementException.class,
			() -> _selfServiceTrialLicenseKeyService.addActivationKey(
				_ACCOUNT_ID, "Acme", _C_PRODUCT_ID, "acme.com", "9001",
				"owner@acme.com"));

		Mockito.verifyNoInteractions(_activationKeyService);
	}

	@Test
	public void testHasValidActivationKeyIsFalseForAnotherFamily()
		throws Exception {

		_stubProduct("cmp-trial");
		_stubLicenseKeys(
			_toLicenseKey(
				true, "2099-01-01T00:00:00Z", "DSR",
				"Digital Sales Room Trial"));

		Assertions.assertFalse(
			_selfServiceTrialLicenseKeyService.hasValidActivationKey(
				_C_PRODUCT_ID, "acme.com", "owner@acme.com"));
	}

	@Test
	public void testHasValidActivationKeyIsFalseForDeveloperKeyThatIsNotATrial()
		throws Exception {

		_stubProduct("cmp-trial");
		_stubLicenseKeys(
			_toLicenseKey(
				true, "2099-01-01T00:00:00Z", "CMP",
				"Content Marketing Platform"));

		Assertions.assertFalse(
			_selfServiceTrialLicenseKeyService.hasValidActivationKey(
				_C_PRODUCT_ID, "acme.com", "owner@acme.com"));
	}

	@Test
	public void testHasValidActivationKeyIsFalseForExpiredKey()
		throws Exception {

		_stubProduct("cmp-trial");
		_stubLicenseKeys(
			_toLicenseKey(
				true, "2020-01-01T00:00:00Z", "CMP",
				"Content Marketing Platform Trial"));

		Assertions.assertFalse(
			_selfServiceTrialLicenseKeyService.hasValidActivationKey(
				_C_PRODUCT_ID, "acme.com", "owner@acme.com"));
	}

	@Test
	public void testHasValidActivationKeyIsFalseForInactiveKey()
		throws Exception {

		_stubProduct("cmp-trial");
		_stubLicenseKeys(
			_toLicenseKey(
				false, "2099-01-01T00:00:00Z", "CMP",
				"Content Marketing Platform Trial"));

		Assertions.assertFalse(
			_selfServiceTrialLicenseKeyService.hasValidActivationKey(
				_C_PRODUCT_ID, "acme.com", "owner@acme.com"));
	}

	@Test
	public void testHasValidActivationKeyIsFalseForProductThatIsNotATrial()
		throws Exception {

		_stubProduct("dxp");

		Assertions.assertFalse(
			_selfServiceTrialLicenseKeyService.hasValidActivationKey(
				_C_PRODUCT_ID, "acme.com", "owner@acme.com"));

		Mockito.verifyNoInteractions(_licenseKeyService);
	}

	@Test
	public void testHasValidActivationKeyIsTrueForUnexpiredKey()
		throws Exception {

		_stubProduct("cmp-trial");
		_stubLicenseKeys(
			_toLicenseKey(
				true, "2099-01-01T00:00:00Z", "CMP",
				"Content Marketing Platform Trial"));

		Assertions.assertTrue(
			_selfServiceTrialLicenseKeyService.hasValidActivationKey(
				_C_PRODUCT_ID, "acme.com", "owner@acme.com"));
	}

	private List<Object[]> _getAddLicenseKeyArguments() {
		List<Object[]> argumentsList = new ArrayList<>();

		for (Invocation invocation :
				Mockito.mockingDetails(
					_licenseKeyService
				).getInvocations()) {

			Method method = invocation.getMethod();

			if (Objects.equals(method.getName(), "addLicenseKey")) {
				argumentsList.add(invocation.getArguments());
			}
		}

		return argumentsList;
	}

	private void _stubDurationDays(int durationDays) throws Exception {
		Mockito.when(
			_entitlementService.getSelfServiceTrialDurationDays(_ACCOUNT_ID)
		).thenReturn(
			durationDays
		);
	}

	private void _stubLicenseKeys(LicenseKey... licenseKeys) throws Exception {
		Mockito.when(
			_licenseKeyService.getLicenseKeys(
				"acme.com", "developer", "owner@acme.com")
		).thenReturn(
			List.of(licenseKeys)
		);
	}

	private void _stubProduct(String solutionType) throws Exception {
		ProductSpecification productSpecification = new ProductSpecification();

		productSpecification.setSpecificationKey(
			() -> ProductSpecificationConstants.KEY_SOLUTION_TYPE);
		productSpecification.setValue(() -> Map.of("en_US", solutionType));

		Product product = new Product();

		product.setExternalReferenceCode("PRDCT-CONTENT-MARKETING-TRIAL");
		product.setProductSpecifications(
			() -> new ProductSpecification[] {productSpecification});

		Mockito.when(
			_commerceProductService.getProduct(_C_PRODUCT_ID)
		).thenReturn(
			product
		);
	}

	private LicenseKey _toLicenseKey(
		boolean active, String customExpirationDate, String licenseKeyFamily,
		String licenseName) {

		return new LicenseKey(
			new JSONObject(
			).put(
				"active", active
			).put(
				"customExpirationDate", customExpirationDate
			).put(
				"id", 1
			).put(
				"licenseKeyFamily", licenseKeyFamily
			).put(
				"licenseName", licenseName
			).put(
				"licenseType", "developer"
			));
	}

	private static final long _ACCOUNT_ID = 40001;

	private static final long _ACTIVATION_KEY_ID = 501;

	private static final long _C_PRODUCT_ID = 7001;

	private final ActivationKeyService _activationKeyService = Mockito.mock(
		ActivationKeyService.class);
	private final CommerceProductService _commerceProductService = Mockito.mock(
		CommerceProductService.class);
	private final EntitlementService _entitlementService = Mockito.mock(
		EntitlementService.class);
	private final LicenseKeyService _licenseKeyService = Mockito.mock(
		LicenseKeyService.class);
	private final ProductVersionService _productVersionService = Mockito.mock(
		ProductVersionService.class);
	private SelfServiceTrialLicenseKeyService
		_selfServiceTrialLicenseKeyService;

}
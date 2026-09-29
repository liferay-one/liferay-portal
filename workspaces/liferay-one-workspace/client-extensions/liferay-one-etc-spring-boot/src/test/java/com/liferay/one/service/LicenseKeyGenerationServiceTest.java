/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.one.constants.LicenseKeyGenerationConstants;
import com.liferay.one.exception.LicenseKeyEntitlementException;
import com.liferay.one.license.LicenseEntry;
import com.liferay.one.license.LicenseKeyExporter;
import com.liferay.one.license.LicenseKeyGenerator;
import com.liferay.one.model.ActivationKey;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.LicenseKey;
import com.liferay.one.model.Project;
import com.liferay.one.util.KeyedLock;
import com.liferay.portal.kernel.util.HashMapBuilder;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.TimeUnit;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Pedro Oliveira
 */
public class LicenseKeyGenerationServiceTest {

	@BeforeEach
	public void setUp() throws Exception {
		_activationKeyService = Mockito.mock(ActivationKeyService.class);
		_entitlementService = Mockito.mock(EntitlementService.class);
		_licenseKeyExporter = Mockito.mock(LicenseKeyExporter.class);
		_licenseKeyGenerateFormService = Mockito.mock(
			LicenseKeyGenerateFormService.class);
		_licenseKeyGenerationService = new LicenseKeyGenerationService();
		_licenseKeyGenerator = Mockito.mock(LicenseKeyGenerator.class);
		_licenseKeyService = Mockito.mock(LicenseKeyService.class);

		ReflectionTestUtils.setField(
			_licenseKeyGenerationService, "_activationKeyService",
			_activationKeyService);
		ReflectionTestUtils.setField(
			_licenseKeyGenerationService, "_entitlementService",
			_entitlementService);
		ReflectionTestUtils.setField(
			_licenseKeyGenerationService, "_keyedLock", new KeyedLock());
		ReflectionTestUtils.setField(
			_licenseKeyGenerationService, "_licenseKeyExporter",
			_licenseKeyExporter);
		ReflectionTestUtils.setField(
			_licenseKeyGenerationService, "_licenseKeyGenerateFormService",
			_licenseKeyGenerateFormService);
		ReflectionTestUtils.setField(
			_licenseKeyGenerationService, "_licenseKeyGenerator",
			_licenseKeyGenerator);
		ReflectionTestUtils.setField(
			_licenseKeyGenerationService, "_licenseKeyService",
			_licenseKeyService);

		Mockito.when(
			_licenseKeyService.getActiveLicenseKeyCounts(
				Mockito.anyCollection(), Mockito.anyString())
		).thenReturn(
			new HashMap<>()
		);
	}

	@Test
	public void testGenerateActivationKey() throws Exception {
		_stubEntitlements(_toEntitlement(1L, 5.0), _toEntitlement(2L, 5.0));

		_stubLicensedProducts();

		ActivationKey activationKey = _stubActivationKey();

		Mockito.when(
			_licenseKeyService.addLicenseKey(
				Mockito.anyLong(), Mockito.any(), Mockito.anyLong(),
				Mockito.anyBoolean(), Mockito.any(), Mockito.any(),
				Mockito.anyBoolean(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.anyLong(), Mockito.anyLong(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.anyInt(), Mockito.any(),
				Mockito.anyInt(), Mockito.anyLong(), Mockito.anyInt(),
				Mockito.anyInt(), Mockito.anyLong(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.any())
		).thenReturn(
			Mockito.mock(LicenseKey.class)
		);

		Assertions.assertSame(
			activationKey,
			_licenseKeyGenerationService.generateActivationKey(
				_toGenerateRequest(Arrays.asList(1L, 2L), 1L, 3)));

		// Two entitlements across three servers yield six license keys, all
		// glued together by a single activation key.

		Mockito.verify(
			_licenseKeyService, Mockito.times(6)
		).addLicenseKey(
			Mockito.anyLong(), Mockito.any(), Mockito.eq(7L),
			Mockito.anyBoolean(), Mockito.any(), Mockito.any(),
			Mockito.anyBoolean(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.anyLong(), Mockito.anyLong(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.anyInt(), Mockito.any(), Mockito.anyInt(),
			Mockito.anyLong(), Mockito.anyInt(), Mockito.anyInt(),
			Mockito.anyLong(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any()
		);

		for (long entitlementId : new long[] {1L, 2L}) {
			Mockito.verify(
				_licenseKeyService, Mockito.times(3)
			).addLicenseKey(
				Mockito.anyLong(), Mockito.any(), Mockito.anyLong(),
				Mockito.anyBoolean(), Mockito.any(), Mockito.any(),
				Mockito.anyBoolean(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.anyLong(), Mockito.eq(entitlementId),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.anyInt(), Mockito.any(),
				Mockito.anyInt(), Mockito.anyLong(), Mockito.anyInt(),
				Mockito.anyInt(), Mockito.anyLong(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.any()
			);
		}
	}

	@Test
	public void testGenerateActivationKeyWithoutActivationsLeft()
		throws Exception {

		_stubEntitlements(_toEntitlement(1L, 1.0));

		Map<Long, Integer> licenseKeyCounts = HashMapBuilder.put(
			1L, 1
		).build();

		Mockito.when(
			_licenseKeyService.getActiveLicenseKeyCounts(
				Mockito.anyCollection(), Mockito.anyString())
		).thenReturn(
			licenseKeyCounts
		);

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateActivationKey(
					_toGenerateRequest(Collections.singletonList(1L), 1L)));

		Assertions.assertTrue(
			licenseKeyEntitlementException.getMessage(
			).contains(
				"has 0 activations left, but 1 were requested"
			));
	}

	@Test
	public void testGenerateActivationKeyWithoutMaxQuantity() throws Exception {
		_stubEntitlements(_toEntitlement(1L, null));

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateActivationKey(
					_toGenerateRequest(Collections.singletonList(1L), 1L)));

		Assertions.assertTrue(
			licenseKeyEntitlementException.getMessage(
			).contains(
				"has 0 activations left"
			));
	}

	@Test
	public void testGenerateActivationKeyWithoutProduct() throws Exception {
		_stubEntitlements(_toEntitlement(1L, 1.0));

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateActivationKey(
					_toGenerateRequest(Collections.singletonList(1L), 1L)));

		Assertions.assertTrue(
			licenseKeyEntitlementException.getMessage(
			).contains(
				"No product backs entitlement 1"
			));
	}

	@Test
	public void testGenerateActivationKeyWithUnentitledBundleProduct()
		throws Exception {

		_stubEntitlements(_toEntitlement(1L, 1.0));

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateActivationKey(
					_toGenerateRequest(Arrays.asList(1L, 2L), 1L)));

		Assertions.assertTrue(
			licenseKeyEntitlementException.getMessage(
			).contains(
				"not entitled to entitlement 2"
			));
	}

	@Test
	public void testGenerateActivationKeyWithUnentitledSubscription() {
		_stubEntitlements(_toEntitlement(1L, 1.0));

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateActivationKey(
					_toGenerateRequest(Collections.singletonList(1L), 99L)));

		Assertions.assertTrue(
			licenseKeyEntitlementException.getMessage(
			).contains(
				"not entitled to the selected subscription"
			));
	}

	@Test
	public void testGenerateDeveloperLicenseXMLBelowMinimumVersion() {
		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateDeveloperLicenseXML(
					"developer", "DXP", _toProject(), "7.3"));

		Assertions.assertTrue(
			licenseKeyEntitlementException.getMessage(
			).contains(
				"minimum version is 7.4"
			));
	}

	@Test
	public void testGenerateDeveloperLicenseXMLWithoutEntitledProduct() {
		_stubEntitlements();

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateDeveloperLicenseXML(
					"developer", "DXP", _toProject(), "7.4"));

		Assertions.assertTrue(
			licenseKeyEntitlementException.getMessage(
			).contains(
				"not entitled to DXP"
			));
	}

	@Test
	public void testGenerateDeveloperLicenseXMLTakesItsTermFromTheDefinition()
		throws Exception {

		_stubEntitlements(_toEntitlement(1L, 1.0, "PRDCT-DXP", 90));

		_stubLicensedProducts();

		_licenseKeyGenerationService.generateDeveloperLicenseXML(
			"developer", "DXP", _toProject(), "7.4");

		ArgumentCaptor<Date> startDateArgumentCaptor = ArgumentCaptor.forClass(
			Date.class);
		ArgumentCaptor<Date> expirationDateArgumentCaptor =
			ArgumentCaptor.forClass(Date.class);

		Mockito.verify(
			_licenseKeyGenerator
		).generateKey(
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.anyInt(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.anyInt(), Mockito.anyInt(), Mockito.anyInt(),
			Mockito.anyLong(), Mockito.anyLong(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any(), startDateArgumentCaptor.capture(),
			expirationDateArgumentCaptor.capture()
		);

		Date startDate = startDateArgumentCaptor.getValue();
		Date expirationDate = expirationDateArgumentCaptor.getValue();

		Assertions.assertEquals(
			90,
			TimeUnit.MILLISECONDS.toDays(
				expirationDate.getTime() - startDate.getTime()));
	}

	@Test
	public void testGenerateActivationKeyBundlesAnAddOnWithoutALicenseEntry()
		throws Exception {

		// An add-on names no license entry family the license table carries,
		// so the key it rides is the leading product's. Failing it here would
		// leave every bundle the form offers impossible to generate.

		Entitlement leadingEntitlement = _toEntitlement(1L, 5.0, "PRDCT-DXP");
		Entitlement addOnEntitlement = _toEntitlement(2L, 5.0, "PRDCT-DSR");

		_stubEntitlements(leadingEntitlement, addOnEntitlement);

		_stubBundledProducts(addOnEntitlement, leadingEntitlement);

		_stubActivationKey();

		_stubAddLicenseKey();

		_licenseKeyGenerationService.generateActivationKey(
			_toGenerateRequest(Arrays.asList(1L, 2L), 1L));

		ArgumentCaptor<String> licenseEntryNameArgumentCaptor =
			ArgumentCaptor.forClass(String.class);
		ArgumentCaptor<String> productNameArgumentCaptor =
			ArgumentCaptor.forClass(String.class);

		Mockito.verify(
			_licenseKeyGenerator, Mockito.times(2)
		).generateKey(
			Mockito.any(), licenseEntryNameArgumentCaptor.capture(),
			Mockito.any(), Mockito.anyInt(),
			productNameArgumentCaptor.capture(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.anyInt(), Mockito.anyInt(), Mockito.anyInt(),
			Mockito.anyLong(), Mockito.anyLong(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any()
		);

		Assertions.assertEquals(
			Arrays.asList("DXP Backup", "DXP Backup"),
			licenseEntryNameArgumentCaptor.getAllValues());

		Assertions.assertEquals(
			Arrays.asList("DXP", "Digital Sales Room"),
			productNameArgumentCaptor.getAllValues());
	}

	@Test
	public void testGenerateActivationKeyChargesTheSelectedKeyType()
		throws Exception {

		// The bundle names the entitlement backing the product, but the caller
		// was gated on the entitlement for the key type they picked. Both sit
		// over the same SKU, and only the second one may be spent.

		_stubEntitlements(
			_toEntitlement(1L, 5.0, "PRDCT-DXP"),
			_toEntitlement(2L, 5.0, "PRDCT-DXP"),
			_toEntitlement(3L, 5.0, "PRDCT-ADDON"));

		_stubLicensedProducts();

		_stubActivationKey();

		_stubAddLicenseKey();

		_licenseKeyGenerationService.generateActivationKey(
			_toGenerateRequest(Arrays.asList(1L, 3L), 2L));

		ArgumentCaptor<Long> entitlementIdArgumentCaptor =
			ArgumentCaptor.forClass(Long.class);

		Mockito.verify(
			_licenseKeyService, Mockito.times(2)
		).addLicenseKey(
			Mockito.anyLong(), Mockito.any(), Mockito.anyLong(),
			Mockito.anyBoolean(), Mockito.any(), Mockito.any(),
			Mockito.anyBoolean(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.anyLong(), entitlementIdArgumentCaptor.capture(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.anyInt(), Mockito.any(),
			Mockito.anyInt(), Mockito.anyLong(), Mockito.anyInt(),
			Mockito.anyInt(), Mockito.anyLong(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any()
		);

		Assertions.assertEquals(
			Arrays.asList(2L, 3L), entitlementIdArgumentCaptor.getAllValues());
	}

	@Test
	public void testGenerateActivationKeyFlagsComplimentaryLicenseKeys()
		throws Exception {

		// A complimentary license key must be stored as complimentary, or the
		// quota it was never meant to spend counts it forever.

		_stubEntitlements(_toEntitlement(1L, 1.0));

		_stubLicensedProducts();

		_stubActivationKey();

		_stubAddLicenseKey();

		_licenseKeyGenerationService.generateActivationKey(
			new LicenseKeyGenerationService.GenerateRequest(
				Collections.emptyList(), "us-east-1", "Description",
				"Environment", "complimentary", _toProject(), null,
				_toServers(1), 1L, "DXP 7.4", "Workspace One",
				"owner@example.com"));

		Mockito.verify(
			_licenseKeyService, Mockito.times(1)
		).addLicenseKey(
			Mockito.anyLong(), Mockito.any(), Mockito.anyLong(),
			Mockito.anyBoolean(), Mockito.any(), Mockito.any(),
			Mockito.eq(true), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.anyLong(), Mockito.anyLong(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.anyInt(), Mockito.any(), Mockito.anyInt(),
			Mockito.anyLong(), Mockito.anyInt(), Mockito.anyInt(),
			Mockito.anyLong(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any()
		);
	}

	@Test
	public void testGenerateActivationKeyRenewalDiscountsAndRetires()
		throws Exception {

		// The renewed key hands back its activations, so the quota check must
		// discount them and the key itself must be retired afterwards.

		_stubEntitlements(_toEntitlement(1L, 1.0));

		_stubLicensedProducts();

		_stubActivationKey();

		_stubAddLicenseKey();

		ActivationKey renewedActivationKey = new ActivationKey(
			new JSONObject(
			).put(
				"id", 99L
			).put(
				"r_projectToActivationKey_c_projectERC", "PROJ-1"
			));

		Mockito.when(
			_activationKeyService.fetchActivationKey("ACTVK-9")
		).thenReturn(
			renewedActivationKey
		);

		_licenseKeyGenerationService.generateActivationKey(
			new LicenseKeyGenerationService.GenerateRequest(
				Collections.singletonList(1L), "us-east-1", "Description",
				"Environment", "DXP Backup", _toProject(), "ACTVK-9",
				_toServers(1), 1L, "DXP 7.4", "Workspace One",
				"owner@example.com"));

		Mockito.verify(
			_licenseKeyService, Mockito.times(1)
		).getActiveLicenseKeyCounts(
			Collections.singletonList(99L), "PROJ-1"
		);

		Mockito.verify(
			_activationKeyService, Mockito.times(1)
		).updateActivationKeyActive(
			99L, false
		);
	}

	@Test
	public void testGenerateActivationKeyRenewalRejectsAnotherProject()
		throws Exception {

		_stubEntitlements(_toEntitlement(1L, 1.0));

		Mockito.when(
			_activationKeyService.fetchActivationKey("ACTVK-9")
		).thenReturn(
			new ActivationKey(
				new JSONObject(
				).put(
					"id", 99L
				).put(
					"r_projectToActivationKey_c_projectERC", "PROJ-2"
				))
		);

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateActivationKey(
					new LicenseKeyGenerationService.GenerateRequest(
						Collections.singletonList(1L), "us-east-1",
						"Description", "Environment", "DXP Backup",
						_toProject(), "ACTVK-9", _toServers(1), 1L, "DXP 7.4",
						"Workspace One", "owner@example.com")));

		Assertions.assertTrue(
			licenseKeyEntitlementException.getMessage(
			).contains(
				"belongs to another project"
			));
	}

	@Test
	public void testGenerateActivationKeyComplimentaryBundlesNothingElse()
		throws Exception {

		_stubEntitlements(_toEntitlement(1L, 1.0), _toEntitlement(2L, 5.0));

		_stubLicensedProducts();

		_stubActivationKey();

		// The add-on entitlement is offered but must not reach the bundle.

		_licenseKeyGenerationService.generateActivationKey(
			new LicenseKeyGenerationService.GenerateRequest(
				Arrays.asList(1L, 2L), "us-east-1", "Description",
				"Environment", "complimentary", _toProject(), null,
				_toServers(1), 1L, "DXP 7.4", "Workspace One",
				"owner@example.com"));

		Mockito.verify(
			_licenseKeyService, Mockito.times(1)
		).addLicenseKey(
			Mockito.anyLong(), Mockito.any(), Mockito.anyLong(),
			Mockito.anyBoolean(), Mockito.any(), Mockito.any(),
			Mockito.anyBoolean(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.anyLong(), Mockito.eq(1L), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.anyInt(), Mockito.any(), Mockito.anyInt(),
			Mockito.anyLong(), Mockito.anyInt(), Mockito.anyInt(),
			Mockito.anyLong(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any()
		);
	}

	@Test
	public void testGenerateActivationKeyComplimentaryIsFlaggedAndTimeBoxed()
		throws Exception {

		_stubEntitlements(_toEntitlement(1L, 1.0));

		_stubLicensedProducts();

		_stubActivationKey();

		long before = System.currentTimeMillis();

		_licenseKeyGenerationService.generateActivationKey(
			new LicenseKeyGenerationService.GenerateRequest(
				Collections.singletonList(1L), "us-east-1", "Description",
				"Environment", "complimentary", _toProject(), null,
				_toServers(1), 1L, "DXP 7.4", "Workspace One",
				"owner@example.com"));

		ArgumentCaptor<Date> expirationDateArgumentCaptor =
			ArgumentCaptor.forClass(Date.class);
		ArgumentCaptor<Date> startDateArgumentCaptor = ArgumentCaptor.forClass(
			Date.class);

		Mockito.verify(
			_activationKeyService
		).addActivationKey(
			Mockito.anyLong(), Mockito.eq(true),
			expirationDateArgumentCaptor.capture(), Mockito.any(),
			startDateArgumentCaptor.capture(), Mockito.eq("complimentary")
		);

		Date expirationDate = expirationDateArgumentCaptor.getValue();

		Date startDate = startDateArgumentCaptor.getValue();

		// The term runs from now, not from the entitlement, and lasts exactly
		// the complimentary duration.

		Assertions.assertTrue(startDate.getTime() >= (before - 1000));

		Assertions.assertEquals(
			TimeUnit.DAYS.toMillis(
				LicenseKeyGenerationConstants.COMPLIMENTARY_DURATION_DAYS),
			expirationDate.getTime() - startDate.getTime());
	}

	@Test
	public void testGenerateActivationKeyComplimentaryWithoutActivationsLeft()
		throws Exception {

		_stubEntitlements(_toEntitlement(1L, 1.0));

		_stubLicensedProducts();

		Mockito.when(
			_licenseKeyService.getActiveLicenseKeyCounts(
				Mockito.anyCollection(), Mockito.anyString())
		).thenReturn(
			HashMapBuilder.put(
				1L, 1
			).build()
		);

		// A second complimentary key is refused until the entitlement is
		// topped back up.

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateActivationKey(
					new LicenseKeyGenerationService.GenerateRequest(
						Collections.singletonList(1L), "us-east-1",
						"Description", "Environment", "complimentary",
						_toProject(), null, _toServers(1), 1L, "DXP 7.4",
						"Workspace One", "owner@example.com")));

		Assertions.assertTrue(
			licenseKeyEntitlementException.getMessage(
			).contains(
				"0 activations left"
			));
	}

	@Test
	public void testGenerateActivationKeyDeactivatesThePartialActivationKey()
		throws Exception {

		_stubEntitlements(_toEntitlement(1L, 5.0));

		_stubLicensedProducts();

		ActivationKey activationKey = _stubActivationKey();

		Mockito.when(
			_licenseKeyService.addLicenseKey(
				Mockito.anyLong(), Mockito.any(), Mockito.anyLong(),
				Mockito.anyBoolean(), Mockito.any(), Mockito.any(),
				Mockito.anyBoolean(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.anyLong(), Mockito.anyLong(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.anyInt(), Mockito.any(),
				Mockito.anyInt(), Mockito.anyLong(), Mockito.anyInt(),
				Mockito.anyInt(), Mockito.anyLong(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.any())
		).thenThrow(
			new RuntimeException("The license key could not be added")
		);

		Assertions.assertThrows(
			RuntimeException.class,
			() -> _licenseKeyGenerationService.generateActivationKey(
				_toGenerateRequest(Collections.singletonList(1L), 1L)));

		// A half built activation key would keep consuming activations its
		// license keys never earned.

		Mockito.verify(
			_activationKeyService
		).updateActivationKeyActive(
			activationKey.getActivationKeyId(), false
		);
	}

	@Test
	public void testGenerateDeveloperLicenseXMLWithoutLicenseGeneration()
		throws Exception {

		_stubEntitlements(_toEntitlement(1L, 5.0));

		_stubLicensedProducts();

		Mockito.when(
			_licenseKeyGenerateFormService.grantsLicense(Mockito.any())
		).thenReturn(
			false
		);

		// The project holds the product, but not the entitlement that grants
		// license generation for it.

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateDeveloperLicenseXML(
					"developer", "DXP", _toProject(), "7.4"));

		Assertions.assertTrue(
			licenseKeyEntitlementException.getMessage(
			).contains(
				"not entitled to DXP"
			));
	}

	private ActivationKey _stubActivationKey() throws Exception {
		ActivationKey activationKey = new ActivationKey(
			new JSONObject(
			).put(
				"id", 7L
			));

		Mockito.when(
			_activationKeyService.addActivationKey(
				Mockito.anyLong(), Mockito.anyBoolean(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.any())
		).thenReturn(
			activationKey
		);

		return activationKey;
	}

	private void _stubAddLicenseKey() throws Exception {
		Mockito.when(
			_licenseKeyService.addLicenseKey(
				Mockito.anyLong(), Mockito.any(), Mockito.anyLong(),
				Mockito.anyBoolean(), Mockito.any(), Mockito.any(),
				Mockito.anyBoolean(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.anyLong(), Mockito.anyLong(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.anyInt(), Mockito.any(),
				Mockito.anyInt(), Mockito.anyLong(), Mockito.anyInt(),
				Mockito.anyInt(), Mockito.anyLong(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.any())
		).thenReturn(
			Mockito.mock(LicenseKey.class)
		);
	}

	private void _stubBundledProducts(
			Entitlement addOnEntitlement, Entitlement leadingEntitlement)
		throws Exception {

		Map<Long, Product> products = HashMapBuilder.put(
			addOnEntitlement.getEntitlementId(),
			_toProduct("Digital Sales Room", "PRDCT-DSR")
		).put(
			leadingEntitlement.getEntitlementId(),
			_toProduct("DXP", "PRDCT-DXP")
		).build();

		Mockito.when(
			_licenseKeyGenerateFormService.fetchProduct(Mockito.any())
		).thenAnswer(
			invocation -> {
				Entitlement entitlement = invocation.getArgument(0);

				return products.get(entitlement.getEntitlementId());
			}
		);

		Mockito.when(
			_licenseKeyGenerateFormService.getLicenseEntryFamily(Mockito.any())
		).thenAnswer(
			invocation -> {
				Product product = invocation.getArgument(0);

				if (Objects.equals(
						product.getExternalReferenceCode(), "PRDCT-DSR")) {

					return "DSR";
				}

				return "DXP";
			}
		);

		Mockito.when(
			_licenseKeyGenerateFormService.grantsLicense(Mockito.any())
		).thenReturn(
			true
		);

		Mockito.when(
			_licenseKeyGenerateFormService.fetchLicenseEntry(
				Mockito.any(), Mockito.any(), Mockito.any())
		).thenAnswer(
			invocation -> {
				if (!Objects.equals(invocation.getArgument(1), "DXP")) {
					return null;
				}

				return new LicenseEntry(
					"portal", "DXP Backup", "production", "7.4", "7.4");
			}
		);
	}

	private void _stubEntitlements(Entitlement... entitlements) {
		try {
			Mockito.when(
				_entitlementService.getActiveEntitlements(Mockito.anyString())
			).thenReturn(
				Arrays.asList(entitlements)
			);
		}
		catch (Exception exception) {
			throw new RuntimeException(exception);
		}
	}

	private void _stubLicensedProducts() throws Exception {
		Product product = new Product();

		product.setExternalReferenceCode("PRDCT-DXP");
		product.setName(
			HashMapBuilder.put(
				"en_US", "DXP"
			).build());

		Mockito.when(
			_licenseKeyGenerateFormService.fetchProduct(Mockito.any())
		).thenReturn(
			product
		);

		Mockito.when(
			_licenseKeyGenerateFormService.getLicenseEntryFamily(Mockito.any())
		).thenReturn(
			"dxp"
		);

		Mockito.when(
			_licenseKeyGenerateFormService.grantsLicense(Mockito.any())
		).thenReturn(
			true
		);

		Mockito.when(
			_licenseKeyGenerateFormService.fetchLicenseEntry(
				Mockito.any(), Mockito.any(), Mockito.any())
		).thenReturn(
			new LicenseEntry("portal", "DXP Backup", "production", "7.4", "7.4")
		);
	}

	private Entitlement _toEntitlement(long entitlementId, Double maxQuantity) {
		JSONObject jsonObject = new JSONObject(
		).put(
			"id", entitlementId
		).put(
			"name", "Entitlement " + entitlementId
		);

		if (maxQuantity != null) {
			jsonObject.put("maxQuantity", maxQuantity);
		}

		return new Entitlement(jsonObject);
	}

	private Entitlement _toEntitlement(
		long entitlementId, Double maxQuantity,
		String skuExternalReferenceCode) {

		return _toEntitlement(
			entitlementId, maxQuantity, skuExternalReferenceCode, 0);
	}

	private Entitlement _toEntitlement(
		long entitlementId, Double maxQuantity, String skuExternalReferenceCode,
		int licenseKeyDurationDays) {

		JSONObject jsonObject = new JSONObject(
		).put(
			"entitlementDefinitionToEntitlement",
			new JSONObject(
			).put(
				"id", entitlementId
			).put(
				"licenseKeyDurationDays", licenseKeyDurationDays
			).put(
				"skuExternalReferenceCode", skuExternalReferenceCode
			)
		).put(
			"id", entitlementId
		).put(
			"name", "Entitlement " + entitlementId
		);

		if (maxQuantity != null) {
			jsonObject.put("maxQuantity", maxQuantity);
		}

		return new Entitlement(jsonObject);
	}

	private Product _toProduct(String name, String externalReferenceCode) {
		Product product = new Product();

		product.setExternalReferenceCode(externalReferenceCode);
		product.setName(
			HashMapBuilder.put(
				"en_US", name
			).build());

		return product;
	}

	private LicenseKeyGenerationService.GenerateRequest _toGenerateRequest(
		List<Long> bundleEntitlementIds, long subscriptionEntitlementId) {

		return _toGenerateRequest(
			bundleEntitlementIds, subscriptionEntitlementId, 1);
	}

	private LicenseKeyGenerationService.GenerateRequest _toGenerateRequest(
		List<Long> bundleEntitlementIds, long subscriptionEntitlementId,
		int serverCount) {

		return new LicenseKeyGenerationService.GenerateRequest(
			bundleEntitlementIds, "us-east-1", "Description", "Environment",
			"DXP Backup", _toProject(), null, _toServers(serverCount),
			subscriptionEntitlementId, "DXP 7.4", "Workspace One",
			"owner@example.com");
	}

	private Project _toProject() {
		return new Project(
			new JSONObject(
			).put(
				"externalReferenceCode", "PROJ-1"
			).put(
				"name", "Project One"
			));
	}

	private List<LicenseKeyGenerationService.GenerateRequest.Server> _toServers(
		int serverCount) {

		List<LicenseKeyGenerationService.GenerateRequest.Server> servers =
			new ArrayList<>();

		for (int i = 0; i < serverCount; i++) {
			servers.add(
				new LicenseKeyGenerationService.GenerateRequest.Server(
					"host" + i + ".example.com", "", ""));
		}

		return servers;
	}

	private ActivationKeyService _activationKeyService;
	private EntitlementService _entitlementService;
	private LicenseKeyExporter _licenseKeyExporter;
	private LicenseKeyGenerateFormService _licenseKeyGenerateFormService;
	private LicenseKeyGenerationService _licenseKeyGenerationService;
	private LicenseKeyGenerator _licenseKeyGenerator;
	private LicenseKeyService _licenseKeyService;

}
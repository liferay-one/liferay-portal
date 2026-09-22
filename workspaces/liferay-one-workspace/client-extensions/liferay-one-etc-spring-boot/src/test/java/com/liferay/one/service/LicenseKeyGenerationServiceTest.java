/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.one.exception.LicenseKeyEntitlementException;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.Project;
import com.liferay.one.util.KeyedLock;
import com.liferay.portal.kernel.util.HashMapBuilder;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Pedro Oliveira
 */
public class LicenseKeyGenerationServiceTest {

	@BeforeEach
	public void setUp() throws Exception {
		_commerceSkuService = Mockito.mock(CommerceSkuService.class);
		_entitlementService = Mockito.mock(EntitlementService.class);
		_licenseKeyGenerateFormService = Mockito.mock(
			LicenseKeyGenerateFormService.class);
		_licenseKeyGenerationService = new LicenseKeyGenerationService();
		_licenseKeyService = Mockito.mock(LicenseKeyService.class);

		ReflectionTestUtils.setField(
			_licenseKeyGenerationService, "_commerceSkuService",
			_commerceSkuService);
		ReflectionTestUtils.setField(
			_licenseKeyGenerationService, "_entitlementService",
			_entitlementService);
		ReflectionTestUtils.setField(
			_licenseKeyGenerationService, "_keyedLock", new KeyedLock());
		ReflectionTestUtils.setField(
			_licenseKeyGenerationService, "_licenseKeyGenerateFormService",
			_licenseKeyGenerateFormService);
		ReflectionTestUtils.setField(
			_licenseKeyGenerationService, "_licenseKeyService",
			_licenseKeyService);

		Mockito.when(
			_licenseKeyService.getActiveLicenseKeyCounts(
				Mockito.anyString(), Mockito.any())
		).thenReturn(
			new HashMap<>()
		);
	}

	@Test
	public void testGenerateDeveloperLicenseXMLBelowMinimumVersion() {
		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateDeveloperLicenseXML(
					_toProject(), "DXP", "7.3"));

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
					_toProject(), "DXP", "7.4"));

		Assertions.assertTrue(
			licenseKeyEntitlementException.getMessage(
			).contains(
				"not entitled to DXP"
			));
	}

	@Test
	public void testGenerateLicenseKeysWithoutActivationsLeft()
		throws Exception {

		_stubEntitlements(_toEntitlement(1L, 1.0));

		Map<Long, Integer> licenseKeyCounts = HashMapBuilder.put(
			1L, 1
		).build();

		Mockito.when(
			_licenseKeyService.getActiveLicenseKeyCounts(
				Mockito.anyString(), Mockito.any())
		).thenReturn(
			licenseKeyCounts
		);

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateLicenseKeys(
					_toGenerateRequest(Collections.singletonList(1L), 1L)));

		Assertions.assertTrue(
			licenseKeyEntitlementException.getMessage(
			).contains(
				"has 0 activations left, but 1 were requested"
			));
	}

	@Test
	public void testGenerateLicenseKeysWithoutMaxQuantity() throws Exception {
		_stubEntitlements(_toEntitlement(1L, null));

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateLicenseKeys(
					_toGenerateRequest(Collections.singletonList(1L), 1L)));

		Assertions.assertTrue(
			licenseKeyEntitlementException.getMessage(
			).contains(
				"has 0 activations left"
			));
	}

	@Test
	public void testGenerateLicenseKeysWithoutProduct() throws Exception {
		_stubEntitlements(_toEntitlement(1L, 1.0));

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateLicenseKeys(
					_toGenerateRequest(Collections.singletonList(1L), 1L)));

		Assertions.assertTrue(
			licenseKeyEntitlementException.getMessage(
			).contains(
				"No product backs entitlement 1"
			));
	}

	@Test
	public void testGenerateLicenseKeysWithUnentitledBundleProduct()
		throws Exception {

		_stubEntitlements(_toEntitlement(1L, 1.0));

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateLicenseKeys(
					_toGenerateRequest(Arrays.asList(1L, 2L), 1L)));

		Assertions.assertTrue(
			licenseKeyEntitlementException.getMessage(
			).contains(
				"not entitled to entitlement 2"
			));
	}

	@Test
	public void testGenerateLicenseKeysWithUnentitledSubscription() {
		_stubEntitlements(_toEntitlement(1L, 1.0));

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateLicenseKeys(
					_toGenerateRequest(Collections.singletonList(1L), 99L)));

		Assertions.assertTrue(
			licenseKeyEntitlementException.getMessage(
			).contains(
				"not entitled to the selected subscription"
			));
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

	private LicenseKeyGenerationService.GenerateRequest _toGenerateRequest(
		List<Long> bundleEntitlementIds, long subscriptionEntitlementId) {

		return new LicenseKeyGenerationService.GenerateRequest(
			bundleEntitlementIds, "us-east-1", "Description", "Environment",
			"DXP Backup", _toProject(), Collections.emptyList(),
			Collections.singletonList(
				new LicenseKeyGenerationService.GenerateRequest.Server(
					"host.example.com", "", "")),
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

	private CommerceSkuService _commerceSkuService;
	private EntitlementService _entitlementService;
	private LicenseKeyGenerateFormService _licenseKeyGenerateFormService;
	private LicenseKeyGenerationService _licenseKeyGenerationService;
	private LicenseKeyService _licenseKeyService;

}
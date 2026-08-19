/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.one.constants.EntitlementConstants;
import com.liferay.one.constants.EnvironmentConstants;
import com.liferay.one.exception.CloudNativeEntitlementException;
import com.liferay.one.license.LicenseKeyExporter;
import com.liferay.one.license.LicenseKeyGenerator;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.Environment;

import java.util.Collections;
import java.util.List;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Amos Fong
 */
public class CloudNativeManifestServiceTest {

	@BeforeEach
	public void setUp() throws Exception {
		_cloudNativeManifestService = new CloudNativeManifestService();

		_accountService = Mockito.mock(AccountService.class);
		_commerceProductService = Mockito.mock(CommerceProductService.class);
		_commerceProductVirtualSettingsService = Mockito.mock(
			CommerceProductVirtualSettingsService.class);
		_entitlementService = Mockito.mock(EntitlementService.class);
		_licenseKeyExporter = Mockito.mock(LicenseKeyExporter.class);
		_licenseKeyGenerator = Mockito.mock(LicenseKeyGenerator.class);

		Account account = new Account();

		account.setName("Acme");

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

		ReflectionTestUtils.setField(
			_cloudNativeManifestService, "_accountService", _accountService);
		ReflectionTestUtils.setField(
			_cloudNativeManifestService, "_commerceProductService",
			_commerceProductService);
		ReflectionTestUtils.setField(
			_cloudNativeManifestService,
			"_commerceProductVirtualSettingsService",
			_commerceProductVirtualSettingsService);
		ReflectionTestUtils.setField(
			_cloudNativeManifestService, "_entitlementService",
			_entitlementService);
		ReflectionTestUtils.setField(
			_cloudNativeManifestService, "_licenseKeyExporter",
			_licenseKeyExporter);
		ReflectionTestUtils.setField(
			_cloudNativeManifestService, "_licenseKeyGenerator",
			_licenseKeyGenerator);
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

		JSONObject jsonObject =
			_cloudNativeManifestService.getManifestJSONObject(
				"DXP 2025.Q3.1",
				_createEnvironment(
					EnvironmentConstants.ENVIRONMENT_TYPE_NONPRODUCTION));

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

		JSONObject jsonObject =
			_cloudNativeManifestService.getManifestJSONObject(
				"DXP 2025.Q3.1",
				_createEnvironment(
					EnvironmentConstants.ENVIRONMENT_TYPE_PRODUCTION));

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
			() -> _cloudNativeManifestService.getManifestJSONObject(
				"DXP 2025.Q3.1",
				_createEnvironment(
					EnvironmentConstants.ENVIRONMENT_TYPE_PRODUCTION)));
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

	private Environment _createEnvironment(String environmentType) {
		return new Environment(
			new JSONObject(
			).put(
				"environmentType", environmentType
			).put(
				"externalReferenceCode", "CNE-1"
			).put(
				"id", _ENVIRONMENT_ID
			).put(
				"r_accountEntryToEnvironment_accountEntryId", _ACCOUNT_ID
			).put(
				"type", EnvironmentConstants.TYPE_CNE
			));
	}

	private static final long _ACCOUNT_ID = 1000L;

	private static final long _ENVIRONMENT_ID = 2000L;

	private AccountService _accountService;
	private CloudNativeManifestService _cloudNativeManifestService;
	private CommerceProductService _commerceProductService;
	private CommerceProductVirtualSettingsService
		_commerceProductVirtualSettingsService;
	private EntitlementService _entitlementService;
	private LicenseKeyExporter _licenseKeyExporter;
	private LicenseKeyGenerator _licenseKeyGenerator;

}
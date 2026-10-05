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
import com.liferay.one.exception.ActivationCodeAlreadyUsedException;
import com.liferay.one.exception.CloudNativeEntitlementException;
import com.liferay.one.exception.EnvironmentAlreadyActivatedException;
import com.liferay.one.exception.EnvironmentProfileEntitlementException;
import com.liferay.one.exception.EnvironmentTypeEntitlementException;
import com.liferay.one.exception.NoSuchActivationCodeException;
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
import com.liferay.one.service.ContractService;
import com.liferay.one.service.EntitlementService;
import com.liferay.one.service.EnvironmentQuotaService;
import com.liferay.one.service.EnvironmentService;
import com.liferay.one.util.CloudNativeSignatureValidator;
import com.liferay.portal.kernel.security.auth.PrincipalException;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;

import java.lang.reflect.UndeclaredThrowableException;

import java.net.http.HttpHeaders;
import java.net.http.HttpResponse;

import java.security.KeyPair;
import java.security.KeyPairGenerator;

import java.text.ParseException;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

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
		_contractService = Mockito.mock(ContractService.class);
		_entitlementService = Mockito.mock(EntitlementService.class);
		_environmentActivationPermission = Mockito.mock(
			EnvironmentActivationPermission.class);
		_environmentService = Mockito.mock(EnvironmentService.class);

		_environmentQuotaService = new EnvironmentQuotaService();

		ReflectionTestUtils.setField(
			_environmentQuotaService, "_entitlementService",
			_entitlementService);
		ReflectionTestUtils.setField(
			_environmentQuotaService, "_environmentService",
			_environmentService);

		_licenseKeyExporter = Mockito.mock(LicenseKeyExporter.class);
		_cloudNativeSignatureValidator = Mockito.mock(
			CloudNativeSignatureValidator.class);
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
			_cloudRestController, "_cloudNativeSignatureValidator",
			_cloudNativeSignatureValidator);
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
			_cloudRestController, "_contractService", _contractService);
		ReflectionTestUtils.setField(
			_cloudRestController, "_entitlementService", _entitlementService);
		ReflectionTestUtils.setField(
			_cloudRestController, "_environmentActivationPermission",
			_environmentActivationPermission);
		ReflectionTestUtils.setField(
			_cloudRestController, "_environmentQuotaService",
			_environmentQuotaService);
		ReflectionTestUtils.setField(
			_cloudRestController, "_environmentService", _environmentService);
		ReflectionTestUtils.setField(
			_cloudRestController, "_licenseKeyExporter", _licenseKeyExporter);
		ReflectionTestUtils.setField(
			_cloudRestController, "_licenseKeyGenerator", _licenseKeyGenerator);
	}

	@Test
	public void testGetEnvironmentsEntitlementsDeduplicatesProducts()
		throws Exception {

		_mockCloudEnabledProduct();

		Mockito.when(
			_environmentService.fetchEnvironmentByExternalReferenceCode(
				_ENVIRONMENT_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			_createEnvironment(EnvironmentConstants.TYPE_PRODUCTION)
		);

		Mockito.when(
			_entitlementService.getActiveEntitlements(_ACCOUNT_ID)
		).thenReturn(
			List.of(
				_createProductEntitlement(
					_CONTRACT_ID, 1L, _SKU_EXTERNAL_REFERENCE_CODE, null),
				_createProductEntitlement(
					_CONTRACT_ID, 2L, _SKU_EXTERNAL_REFERENCE_CODE, null))
		);

		ResponseEntity<String> responseEntity =
			_cloudRestController.getEnvironmentsEntitlements(
				null, _ENVIRONMENT_EXTERNAL_REFERENCE_CODE);

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		JSONArray jsonArray = jsonObject.getJSONArray("subscriptions");

		Assertions.assertEquals(1, jsonArray.length());
	}

	@Test
	public void testGetEnvironmentsEntitlementsPrefersActiveEntitlement()
		throws Exception {

		_mockCloudEnabledProduct();

		Mockito.when(
			_environmentService.fetchEnvironmentByExternalReferenceCode(
				_ENVIRONMENT_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			_createEnvironment(EnvironmentConstants.TYPE_PRODUCTION)
		);

		Mockito.when(
			_entitlementService.getActiveEntitlements(_ACCOUNT_ID)
		).thenReturn(
			List.of(
				_createProductEntitlement(
					_CONTRACT_ID, 1L, _SKU_EXTERNAL_REFERENCE_CODE,
					EntitlementConstants.TERMINATION_STATUS_TERMINATED),
				_createProductEntitlement(
					_CONTRACT_ID, 2L, _SKU_EXTERNAL_REFERENCE_CODE, null))
		);

		ResponseEntity<String> responseEntity =
			_cloudRestController.getEnvironmentsEntitlements(
				null, _ENVIRONMENT_EXTERNAL_REFERENCE_CODE);

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		JSONArray jsonArray = jsonObject.getJSONArray("subscriptions");

		Assertions.assertEquals(1, jsonArray.length());

		JSONObject subscriptionJSONObject = jsonArray.getJSONObject(0);

		Assertions.assertEquals(
			2L, subscriptionJSONObject.getLong("entitlementId"));
	}

	@Test
	public void testGetEnvironmentsEntitlementsRejectsUnauthorizedProject()
		throws Exception {

		Mockito.when(
			_environmentService.fetchEnvironmentByExternalReferenceCode(
				_ENVIRONMENT_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			_createEnvironment(EnvironmentConstants.TYPE_PRODUCTION)
		);

		Mockito.when(
			_environmentActivationPermission.check(
				null, _PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenThrow(
			new PrincipalException()
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _cloudRestController.getEnvironmentsEntitlements(
				null, _ENVIRONMENT_EXTERNAL_REFERENCE_CODE));

		Mockito.verify(
			_entitlementService, Mockito.never()
		).getActiveEntitlements(
			Mockito.anyLong()
		);
	}

	@Test
	public void testGetEnvironmentsEntitlementsReturnsNotFound()
		throws Exception {

		Mockito.when(
			_environmentService.fetchEnvironmentByExternalReferenceCode(
				_ENVIRONMENT_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			null
		);

		ResponseEntity<String> responseEntity =
			_cloudRestController.getEnvironmentsEntitlements(
				null, _ENVIRONMENT_EXTERNAL_REFERENCE_CODE);

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND, responseEntity.getStatusCode());
	}

	@Test
	public void testGetEnvironmentsEntitlementsReturnsSubscriptions()
		throws Exception {

		_mockCloudEnabledProduct();

		Mockito.when(
			_environmentService.fetchEnvironmentByExternalReferenceCode(
				_ENVIRONMENT_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			_createEnvironment(EnvironmentConstants.TYPE_PRODUCTION)
		);

		Mockito.when(
			_entitlementService.getActiveEntitlements(_ACCOUNT_ID)
		).thenReturn(
			List.of(
				_createProductEntitlement(
					_CONTRACT_ID, 7L, _SKU_EXTERNAL_REFERENCE_CODE, null))
		);

		ResponseEntity<String> responseEntity =
			_cloudRestController.getEnvironmentsEntitlements(
				null, _ENVIRONMENT_EXTERNAL_REFERENCE_CODE);

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		JSONArray jsonArray = jsonObject.getJSONArray("subscriptions");

		Assertions.assertEquals(1, jsonArray.length());

		JSONObject subscriptionJSONObject = jsonArray.getJSONObject(0);

		Assertions.assertEquals(
			7L, subscriptionJSONObject.getLong("entitlementId"));
		Assertions.assertEquals(
			_PRODUCT_EXTERNAL_REFERENCE_CODE,
			subscriptionJSONObject.getString("productExternalReferenceCode"));
	}

	@Test
	public void testGetManifestJSONObjectAcceptsMigratedEntitlementName()
		throws Exception {

		Mockito.when(
			_entitlementService.getActiveEntitlements(_ACCOUNT_ID)
		).thenReturn(
			List.of(
				_createEntitlement(EntitlementConstants.NAME_CLOUD_NATIVE, 1))
		);

		JSONObject jsonObject = _getManifestJSONObject(
			_createEnvironment(EnvironmentConstants.TYPE_PRODUCTION));

		Assertions.assertTrue(jsonObject.has("licenseXML"));
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
	public void testGetManifestJSONObjectReportsAddOnTerminationStatus()
		throws Exception {

		_mockCloudEnabledProduct();

		Mockito.when(
			_entitlementService.getActiveEntitlements(_ACCOUNT_ID)
		).thenReturn(
			List.of(
				_createEntitlement(EntitlementConstants.NAME_CLOUD_NATIVE, 1),
				_createProductEntitlement(
					_CONTRACT_ID, 5L, _SKU_EXTERNAL_REFERENCE_CODE,
					EntitlementConstants.TERMINATION_STATUS_TERMINATED))
		);

		Mockito.when(
			_commerceProductVirtualSettingsService.
				fetchProductVirtualSettingsFileEntry(
					Mockito.anyLong(), Mockito.anyString())
		).thenReturn(
			new ProductVirtualSettingsFileEntry()
		);

		RequestContextHolder.setRequestAttributes(
			new ServletRequestAttributes(new MockHttpServletRequest()));

		JSONObject jsonObject = null;

		try {
			jsonObject = _getManifestJSONObject(
				_createEnvironment(EnvironmentConstants.TYPE_PRODUCTION));
		}
		finally {
			RequestContextHolder.resetRequestAttributes();
		}

		JSONArray jsonArray = jsonObject.getJSONArray("add-ons");

		Assertions.assertEquals(1, jsonArray.length());

		JSONObject addOnJSONObject = jsonArray.getJSONObject(0);

		Assertions.assertEquals(
			EntitlementConstants.TERMINATION_STATUS_TERMINATED,
			addOnJSONObject.getString("terminationStatus"));

		Assertions.assertEquals(
			EntitlementConstants.TERMINATION_STATUS_ACTIVE,
			jsonObject.getString("dxpTerminationStatus"));
	}

	@Test
	public void testGetManifestJSONObjectReportsDXPTerminationStatus()
		throws Exception {

		Mockito.when(
			_entitlementService.getActiveEntitlements(_ACCOUNT_ID)
		).thenReturn(
			List.of(
				_createEntitlement(
					EntitlementConstants.NAME_CLOUD_NATIVE, 1,
					EntitlementConstants.TERMINATION_STATUS_TERMINATED))
		);

		JSONObject jsonObject = _getManifestJSONObject(
			_createEnvironment(EnvironmentConstants.TYPE_PRODUCTION));

		Assertions.assertEquals(
			EntitlementConstants.TERMINATION_STATUS_TERMINATED,
			jsonObject.getString("dxpTerminationStatus"));
	}

	@Test
	public void testGetManifestJSONObjectReportsDXPTerminationStatusActive()
		throws Exception {

		Mockito.when(
			_entitlementService.getActiveEntitlements(_ACCOUNT_ID)
		).thenReturn(
			List.of(
				_createEntitlement(EntitlementConstants.NAME_CLOUD_NATIVE, 1))
		);

		JSONObject jsonObject = _getManifestJSONObject(
			_createEnvironment(EnvironmentConstants.TYPE_PRODUCTION));

		Assertions.assertEquals(
			EntitlementConstants.TERMINATION_STATUS_ACTIVE,
			jsonObject.getString("dxpTerminationStatus"));
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
	public void testGetProjectsEnvironmentsActivationCodesCountsOnlyActiveEnvironments()
		throws Exception {

		Mockito.when(
			_entitlementService.getActiveEntitlements(
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			List.of(
				_createEnvironmentEntitlement(
					null, 2.0,
					EntitlementConstants.NAME_PRODUCTION_ENVIRONMENTS))
		);

		Mockito.when(
			_environmentService.getCloudNativeEnvironments(
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			List.of(
				_createCloudNativeEnvironment(
					EnvironmentConstants.ACTIVATION_STATUS_ACTIVE, "CNE-1",
					EnvironmentConstants.TYPE_PRODUCTION),
				_createCloudNativeEnvironment(
					EnvironmentConstants.ACTIVATION_STATUS_PENDING, "",
					EnvironmentConstants.TYPE_PRODUCTION))
		);

		JSONObject jsonObject = _getEnvironmentTypeJSONObject(
			EnvironmentConstants.TYPE_PRODUCTION);

		Assertions.assertEquals(1, jsonObject.getInt("availableCount"));
		Assertions.assertEquals(2, jsonObject.getInt("totalCount"));
		Assertions.assertEquals(1, jsonObject.getInt("usedCount"));
		Assertions.assertFalse(jsonObject.getBoolean("unlimited"));

		JSONArray jsonArray = jsonObject.getJSONArray("activationCodes");

		Assertions.assertEquals(2, jsonArray.length());

		JSONObject activationCodeJSONObject = jsonArray.getJSONObject(1);

		Assertions.assertEquals(
			_ACTIVATION_CODE,
			activationCodeJSONObject.getString("activationCode"));
		Assertions.assertEquals(
			EnvironmentConstants.ACTIVATION_STATUS_PENDING,
			activationCodeJSONObject.getString("activationStatus"));
		Assertions.assertEquals(
			"", activationCodeJSONObject.getString("environmentId"));
	}

	@Test
	public void testGetProjectsEnvironmentsActivationCodesReportsMaxClusterNodes()
		throws Exception {

		Mockito.when(
			_entitlementService.getActiveEntitlements(
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			List.of(
				_createEntitlement(
					EntitlementConstants.NAME_UP_TO_3_PRODUCTION_PODS, 3),
				_createEnvironmentEntitlement(
					null, 1.0,
					EntitlementConstants.NAME_PRODUCTION_ENVIRONMENTS),
				_createEnvironmentEntitlement(
					null, 1.0,
					EntitlementConstants.NAME_NONPRODUCTION_ENVIRONMENTS))
		);

		Mockito.when(
			_environmentService.getCloudNativeEnvironments(
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			Collections.emptyList()
		);

		JSONObject productionJSONObject = _getEnvironmentTypeJSONObject(
			EnvironmentConstants.TYPE_PRODUCTION);

		Assertions.assertEquals(
			3, productionJSONObject.getInt("maxClusterNodes"));

		// Only a production sized environment reads the pod entitlement.

		JSONObject nonproductionJSONObject = _getEnvironmentTypeJSONObject(
			EnvironmentConstants.TYPE_NONPRODUCTION);

		Assertions.assertEquals(
			1, nonproductionJSONObject.getInt("maxClusterNodes"));
	}

	@Test
	public void testGetProjectsEnvironmentsActivationCodesReportsUnlimitedNonproduction()
		throws Exception {

		Mockito.when(
			_entitlementService.getActiveEntitlements(
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			List.of(
				_createEnvironmentEntitlement(
					EntitlementConstants.GRANT_TYPE_UNLIMITED, null,
					EntitlementConstants.NAME_NONPRODUCTION_ENVIRONMENTS))
		);

		Mockito.when(
			_environmentService.getCloudNativeEnvironments(
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			Collections.emptyList()
		);

		ResponseEntity<String> responseEntity =
			_cloudRestController.getProjectsEnvironmentsActivationCodes(
				null, _PROJECT_EXTERNAL_REFERENCE_CODE);

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		JSONArray jsonArray = jsonObject.getJSONArray("environmentTypes");

		Assertions.assertEquals(3, jsonArray.length());

		JSONObject productionJSONObject = _getEnvironmentTypeJSONObject(
			EnvironmentConstants.TYPE_PRODUCTION);

		Assertions.assertFalse(productionJSONObject.getBoolean("unlimited"));

		JSONObject nonproductionJSONObject = _getEnvironmentTypeJSONObject(
			EnvironmentConstants.TYPE_NONPRODUCTION);

		Assertions.assertEquals(
			EnvironmentConstants.TYPE_NONPRODUCTION,
			nonproductionJSONObject.getString("type"));
		Assertions.assertTrue(nonproductionJSONObject.getBoolean("unlimited"));
		Assertions.assertEquals(0, nonproductionJSONObject.getInt("usedCount"));
	}

	@Test
	public void testGetProjectsEnvironmentsOfflineReturnsEmptyList()
		throws Exception {

		Mockito.when(
			_environmentService.getOfflineCloudNativeEnvironments(
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			Collections.emptyList()
		);

		ResponseEntity<String> responseEntity =
			_cloudRestController.getProjectsEnvironmentsOffline(
				null, _PROJECT_EXTERNAL_REFERENCE_CODE);

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		JSONArray jsonArray = jsonObject.getJSONArray("environments");

		Assertions.assertEquals(0, jsonArray.length());
	}

	@Test
	public void testGetProjectsEnvironmentsOfflineReturnsStoredBundle()
		throws Exception {

		Mockito.when(
			_environmentActivationPermission.check(
				null, _PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			_createProject()
		);

		Mockito.when(
			_environmentService.getOfflineCloudNativeEnvironments(
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			List.of(
				new Environment(
					new JSONObject(
					).put(
						"bundledEntitlementIds", "[7,9]"
					).put(
						"externalReferenceCode",
						_ENVIRONMENT_EXTERNAL_REFERENCE_CODE
					).put(
						"id", _ENVIRONMENT_ID
					).put(
						"name", "Sandbox"
					).put(
						"requestedVersion", "DXP 2025.Q3.1"
					).put(
						"type", EnvironmentConstants.TYPE_NONPRODUCTION
					)))
		);

		ResponseEntity<String> responseEntity =
			_cloudRestController.getProjectsEnvironmentsOffline(
				null, _PROJECT_EXTERNAL_REFERENCE_CODE);

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		JSONArray jsonArray = jsonObject.getJSONArray("environments");

		Assertions.assertEquals(1, jsonArray.length());

		JSONObject environmentJSONObject = jsonArray.getJSONObject(0);

		Assertions.assertEquals(
			"DXP 2025.Q3.1",
			environmentJSONObject.getString("requestedVersion"));
		Assertions.assertEquals(
			"Sandbox", environmentJSONObject.getString("environmentName"));

		JSONArray bundledEntitlementIdsJSONArray =
			environmentJSONObject.getJSONArray("bundledEntitlementIds");

		Assertions.assertEquals(2, bundledEntitlementIdsJSONArray.length());
		Assertions.assertEquals(7L, bundledEntitlementIdsJSONArray.getLong(0));
	}

	@Test
	public void testPostEnvironmentsActivation() throws Exception {
		Mockito.when(
			_environmentService.fetchEnvironment(Mockito.anyString())
		).thenReturn(
			_createCloudNativeEnvironment(
				EnvironmentConstants.ACTIVATION_STATUS_PENDING, "CNE-PENDING",
				EnvironmentConstants.TYPE_PRODUCTION)
		);

		ResponseEntity<Void> responseEntity =
			_cloudRestController.postEnvironmentsActivation(
				_ENVIRONMENT_EXTERNAL_REFERENCE_CODE, _createActivationToken());

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		Mockito.verify(
			_cloudNativeSignatureValidator
		).validateSignature(
			Mockito.any(SignedJWT.class)
		);

		ArgumentCaptor<String> argumentCaptor = ArgumentCaptor.forClass(
			String.class);

		Mockito.verify(
			_environmentService
		).fetchEnvironment(
			argumentCaptor.capture()
		);

		String filterString = argumentCaptor.getValue();

		Assertions.assertTrue(filterString.contains(_ACTIVATION_CODE));
		Assertions.assertTrue(
			filterString.contains(EnvironmentConstants.OFFERING_CLOUD_NATIVE));

		Mockito.verify(
			_environmentService
		).updateEnvironmentActivation(
			EnvironmentConstants.ACTIVATION_MODE_ONLINE,
			_ENVIRONMENT_EXTERNAL_REFERENCE_CODE, _ENVIRONMENT_ID, "Production",
			"public-key"
		);
	}

	@Test
	public void testPostEnvironmentsActivationRejectsActivatedEnvironment()
		throws Exception {

		Mockito.when(
			_environmentService.fetchEnvironmentByExternalReferenceCode(
				_ENVIRONMENT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			_createEnvironment(EnvironmentConstants.TYPE_PRODUCTION)
		);

		Assertions.assertThrows(
			EnvironmentAlreadyActivatedException.class,
			() -> _cloudRestController.postEnvironmentsActivation(
				_ENVIRONMENT_EXTERNAL_REFERENCE_CODE,
				_createActivationToken()));

		_assertEnvironmentNotActivated();
	}

	@Test
	public void testPostEnvironmentsActivationRejectsInvalidSignature()
		throws Exception {

		Mockito.doThrow(
			new PrincipalException()
		).when(
			_cloudNativeSignatureValidator
		).validateSignature(
			Mockito.any(SignedJWT.class)
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _cloudRestController.postEnvironmentsActivation(
				_ENVIRONMENT_EXTERNAL_REFERENCE_CODE,
				_createActivationToken()));

		Mockito.verifyNoInteractions(_environmentService);
	}

	@Test
	public void testPostEnvironmentsActivationRejectsMalformedToken()
		throws Exception {

		Assertions.assertThrows(
			ParseException.class,
			() -> _cloudRestController.postEnvironmentsActivation(
				_ENVIRONMENT_EXTERNAL_REFERENCE_CODE, "not-a-token"));

		Mockito.verifyNoInteractions(
			_cloudNativeSignatureValidator, _environmentService);
	}

	@Test
	public void testPostEnvironmentsActivationRejectsUnknownActivationCode()
		throws Exception {

		Assertions.assertThrows(
			NoSuchActivationCodeException.class,
			() -> _cloudRestController.postEnvironmentsActivation(
				_ENVIRONMENT_EXTERNAL_REFERENCE_CODE,
				_createActivationToken()));

		_assertEnvironmentNotActivated();
	}

	@Test
	public void testPostEnvironmentsActivationRejectsUsedActivationCode()
		throws Exception {

		Mockito.when(
			_environmentService.fetchEnvironment(Mockito.anyString())
		).thenReturn(
			_createCloudNativeEnvironment(
				EnvironmentConstants.ACTIVATION_STATUS_ACTIVE, "CNE-ACTIVE",
				EnvironmentConstants.TYPE_PRODUCTION)
		);

		Assertions.assertThrows(
			ActivationCodeAlreadyUsedException.class,
			() -> _cloudRestController.postEnvironmentsActivation(
				_ENVIRONMENT_EXTERNAL_REFERENCE_CODE,
				_createActivationToken()));

		_assertEnvironmentNotActivated();
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
	public void testPostEnvironmentsManifestRejectsInvalidSignature()
		throws Exception {

		_mockManifestEnvironment();

		Mockito.doThrow(
			new PrincipalException()
		).when(
			_cloudNativeSignatureValidator
		).validateSignature(
			Mockito.any(), Mockito.any(SignedJWT.class)
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _cloudRestController.postEnvironmentsManifest(
				_ENVIRONMENT_EXTERNAL_REFERENCE_CODE,
				_createManifestBody("DXP 2025.Q3.1")));

		Mockito.verifyNoInteractions(_entitlementService);
	}

	@Test
	public void testPostEnvironmentsManifestRejectsPayloadWithoutDXPVersion()
		throws Exception {

		_mockManifestEnvironment();

		ResponseEntity<String> responseEntity =
			_cloudRestController.postEnvironmentsManifest(
				_ENVIRONMENT_EXTERNAL_REFERENCE_CODE,
				_createManifestBody(null));

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST, responseEntity.getStatusCode());

		Mockito.verifyNoInteractions(_entitlementService);
	}

	@Test
	public void testPostEnvironmentsManifestRejectsUnknownEnvironment()
		throws Exception {

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> _cloudRestController.postEnvironmentsManifest(
					_ENVIRONMENT_EXTERNAL_REFERENCE_CODE,
					_createManifestBody("DXP 2025.Q3.1")));

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND, responseStatusException.getStatusCode());

		Mockito.verifyNoInteractions(
			_cloudNativeSignatureValidator, _entitlementService);
	}

	@Test
	public void testPostEnvironmentsManifestReturnsManifest() throws Exception {
		Environment environment = _mockManifestEnvironment();

		ResponseEntity<String> responseEntity =
			_cloudRestController.postEnvironmentsManifest(
				_ENVIRONMENT_EXTERNAL_REFERENCE_CODE,
				_createManifestBody("DXP 2025.Q3.1"));

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		Assertions.assertTrue(jsonObject.has("licenseXML"));
		Assertions.assertEquals(
			EntitlementConstants.TERMINATION_STATUS_ACTIVE,
			jsonObject.getString("dxpTerminationStatus"));

		Mockito.verify(
			_cloudNativeSignatureValidator
		).validateSignature(
			Mockito.eq(environment.getPublicKey()), Mockito.any(SignedJWT.class)
		);
	}

	@Test
	public void testPostEnvironmentsOfflineActivationBundleStoresBundle()
		throws Exception {

		_mockCloudEnabledProduct();

		Mockito.when(
			_environmentService.fetchEnvironmentByExternalReferenceCode(
				_ENVIRONMENT_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			_createEnvironment(EnvironmentConstants.TYPE_PRODUCTION)
		);

		Mockito.when(
			_entitlementService.getActiveEntitlements(_ACCOUNT_ID)
		).thenReturn(
			List.of(
				_createEntitlement(EntitlementConstants.NAME_CLOUD_NATIVE, 1),
				_createProductEntitlement(
					_CONTRACT_ID, 11L, _SKU_EXTERNAL_REFERENCE_CODE, null))
		);

		JSONObject jsonObject = new JSONObject(
		).put(
			"dxpVersion", "DXP 2025.Q3.1"
		);

		ResponseEntity<StreamingResponseBody> responseEntity =
			_cloudRestController.postEnvironmentsOfflineActivationBundle(
				null, _ENVIRONMENT_EXTERNAL_REFERENCE_CODE,
				jsonObject.toString());

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		// An empty request means every entitled subscription, so what is stored
		// has to be the resolved set rather than the empty one that arrived.

		Mockito.verify(
			_environmentService
		).updateEnvironmentOfflineBundle(
			Mockito.eq(Set.of(11L)), Mockito.eq(_ENVIRONMENT_ID),
			Mockito.eq("DXP 2025.Q3.1")
		);
	}

	@Test
	public void testPostEnvironmentsOfflineActivationBundleStoresRequestedBundle()
		throws Exception {

		_mockCloudEnabledProduct();

		Mockito.when(
			_environmentService.fetchEnvironmentByExternalReferenceCode(
				_ENVIRONMENT_EXTERNAL_REFERENCE_CODE, null)
		).thenReturn(
			_createEnvironment(EnvironmentConstants.TYPE_PRODUCTION)
		);

		Mockito.when(
			_entitlementService.getActiveEntitlements(_ACCOUNT_ID)
		).thenReturn(
			List.of(
				_createEntitlement(EntitlementConstants.NAME_CLOUD_NATIVE, 1),
				_createProductEntitlement(
					_CONTRACT_ID, 11L, _SKU_EXTERNAL_REFERENCE_CODE, null))
		);

		JSONObject jsonObject = new JSONObject(
		).put(
			"dxpVersion", "DXP 2025.Q3.1"
		).put(
			"entitlementIds", new JSONArray(List.of(99L))
		);

		_cloudRestController.postEnvironmentsOfflineActivationBundle(
			null, _ENVIRONMENT_EXTERNAL_REFERENCE_CODE, jsonObject.toString());

		// Entitlement IDs that resolve to nothing mean an empty package, not
		// every subscription the account holds.

		Mockito.verify(
			_environmentService
		).updateEnvironmentOfflineBundle(
			Mockito.eq(Set.of()), Mockito.eq(_ENVIRONMENT_ID),
			Mockito.eq("DXP 2025.Q3.1")
		);
	}

	@Test
	public void testPostEnvironmentsOfflineActivationReturnsEnvironmentId()
		throws Exception {

		String environmentId = "CNE-TOKEN";

		Mockito.when(
			_environmentService.fetchEnvironmentByExternalReferenceCode(
				environmentId)
		).thenReturn(
			null
		);

		Mockito.when(
			_environmentService.fetchEnvironment(Mockito.anyString())
		).thenReturn(
			_createEnvironment(EnvironmentConstants.TYPE_PRODUCTION)
		);

		JSONObject jsonObject = new JSONObject(
		).put(
			"activationCode", _ACTIVATION_CODE
		).put(
			"token", _createOfflineActivationToken(environmentId)
		);

		ResponseEntity<String> responseEntity =
			_cloudRestController.postEnvironmentsOfflineActivation(
				jsonObject.toString());

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		JSONObject responseJSONObject = new JSONObject(
			responseEntity.getBody());

		Assertions.assertEquals(
			environmentId, responseJSONObject.getString("environmentId"));

		Mockito.verify(
			_environmentService
		).updateEnvironmentActivation(
			EnvironmentConstants.ACTIVATION_MODE_OFFLINE, environmentId,
			_ENVIRONMENT_ID, "Production", "public-key"
		);
	}

	@Test
	public void testPostProductsVirtualEntryDownload() throws Exception {
		_mockVirtualEntryDownload();

		HttpResponse<InputStream> httpResponse = Mockito.mock(
			HttpResponse.class);

		Mockito.when(
			httpResponse.body()
		).thenReturn(
			new ByteArrayInputStream(new byte[] {1, 2, 3})
		);

		Mockito.when(
			httpResponse.headers()
		).thenReturn(
			HttpHeaders.of(
				Map.of("Content-Type", List.of("application/zip")),
				(name, value) -> true)
		);

		Mockito.when(
			_commerceProductVirtualSettingsService.getAssetHttpResponse(
				_VIRTUAL_ENTRY_SRC)
		).thenReturn(
			httpResponse
		);

		ResponseEntity<StreamingResponseBody> responseEntity =
			_postProductsVirtualEntryDownload(_VIRTUAL_ENTRY_ID);

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());
		Assertions.assertEquals(
			"addon-1.0.lpkg",
			responseEntity.getHeaders(
			).getContentDisposition(
			).getFilename());
		Assertions.assertEquals(
			"application/zip",
			String.valueOf(
				responseEntity.getHeaders(
				).getContentType()));

		ByteArrayOutputStream byteArrayOutputStream =
			new ByteArrayOutputStream();

		StreamingResponseBody streamingResponseBody = responseEntity.getBody();

		streamingResponseBody.writeTo(byteArrayOutputStream);

		Assertions.assertArrayEquals(
			new byte[] {1, 2, 3}, byteArrayOutputStream.toByteArray());
	}

	@Test
	public void testPostProductsVirtualEntryDownloadRejectsInvalidSignature()
		throws Exception {

		_mockVirtualEntryDownload();

		Mockito.doThrow(
			new PrincipalException()
		).when(
			_cloudNativeSignatureValidator
		).validateSignature(
			Mockito.any(), Mockito.any(SignedJWT.class)
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> _postProductsVirtualEntryDownload(_VIRTUAL_ENTRY_ID));

		_assertVirtualEntryNotServed();
	}

	@Test
	public void testPostProductsVirtualEntryDownloadRejectsUnentitledEnvironment()
		throws Exception {

		_mockVirtualEntryDownload();

		Mockito.when(
			_entitlementService.getActiveEntitlements(_ACCOUNT_ID)
		).thenReturn(
			Collections.emptyList()
		);

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> _postProductsVirtualEntryDownload(_VIRTUAL_ENTRY_ID));

		Assertions.assertEquals(
			HttpStatus.FORBIDDEN, responseStatusException.getStatusCode());

		_assertVirtualEntryNotServed();
	}

	@Test
	public void testPostProductsVirtualEntryDownloadRejectsUnknownEnvironment()
		throws Exception {

		_mockVirtualEntryDownload();

		Mockito.when(
			_environmentService.fetchEnvironmentByExternalReferenceCode(
				_ENVIRONMENT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			null
		);

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> _postProductsVirtualEntryDownload(_VIRTUAL_ENTRY_ID));

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND, responseStatusException.getStatusCode());

		_assertVirtualEntryNotServed();
	}

	@Test
	public void testPostProductsVirtualEntryDownloadRejectsUnknownProduct()
		throws Exception {

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> _postProductsVirtualEntryDownload(_VIRTUAL_ENTRY_ID));

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND, responseStatusException.getStatusCode());

		Mockito.verifyNoInteractions(
			_cloudNativeSignatureValidator, _environmentService);

		_assertVirtualEntryNotServed();
	}

	@Test
	public void testPostProductsVirtualEntryDownloadRejectsUnknownVirtualEntry()
		throws Exception {

		_mockVirtualEntryDownload();

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> _postProductsVirtualEntryDownload(9999L));

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND, responseStatusException.getStatusCode());

		_assertVirtualEntryNotServed();
	}

	@Test
	public void testPostProjectsEnvironmentsActivationCodesGeneratesActivationCode()
		throws Exception {

		Mockito.when(
			_entitlementService.getActiveEntitlements(
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			List.of(
				_createEnvironmentEntitlement(
					null, 1.0, EntitlementConstants.NAME_UAT_ENVIRONMENTS))
		);

		Mockito.when(
			_environmentService.getCloudNativeEnvironments(
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			Collections.emptyList()
		);

		Mockito.when(
			_environmentService.fetchOrAddCloudNativeEnvironment(
				_ACCOUNT_ID, null, _PROJECT_EXTERNAL_REFERENCE_CODE,
				EnvironmentConstants.TYPE_UAT)
		).thenReturn(
			_createCloudNativeEnvironment(
				EnvironmentConstants.ACTIVATION_STATUS_PENDING, "",
				EnvironmentConstants.TYPE_UAT)
		);

		ResponseEntity<String> responseEntity =
			_cloudRestController.postProjectsEnvironmentsActivationCodes(
				null, _PROJECT_EXTERNAL_REFERENCE_CODE,
				_createActivationCodeJSON(EnvironmentConstants.TYPE_UAT));

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		Assertions.assertEquals(
			_ACTIVATION_CODE, jsonObject.getString("activationCode"));
		Assertions.assertEquals(
			EnvironmentConstants.TYPE_UAT, jsonObject.getString("type"));
	}

	@Test
	public void testPostProjectsEnvironmentsActivationCodesRejectsUnentitledType()
		throws Exception {

		Mockito.when(
			_entitlementService.getActiveEntitlements(
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			Collections.emptyList()
		);

		Mockito.when(
			_environmentService.getCloudNativeEnvironments(
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			Collections.emptyList()
		);

		Assertions.assertThrows(
			EnvironmentTypeEntitlementException.class,
			() -> _cloudRestController.postProjectsEnvironmentsActivationCodes(
				null, _PROJECT_EXTERNAL_REFERENCE_CODE,
				_createActivationCodeJSON(
					EnvironmentConstants.TYPE_PRODUCTION)));

		Mockito.verify(
			_environmentService, Mockito.never()
		).fetchOrAddCloudNativeEnvironment(
			Mockito.anyLong(), Mockito.any(), Mockito.any(), Mockito.any()
		);
	}

	@Test
	public void testPostProjectsEnvironmentsActivationCodesReturnsExistingActivationCode()
		throws Exception {

		Mockito.when(
			_entitlementService.getActiveEntitlements(
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			List.of(
				_createEnvironmentEntitlement(
					null, 2.0,
					EntitlementConstants.NAME_PRODUCTION_ENVIRONMENTS))
		);

		Mockito.when(
			_environmentService.getCloudNativeEnvironments(
				_PROJECT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			List.of(
				_createCloudNativeEnvironment(
					EnvironmentConstants.ACTIVATION_STATUS_PENDING, "",
					EnvironmentConstants.TYPE_PRODUCTION))
		);

		ResponseEntity<String> responseEntity =
			_cloudRestController.postProjectsEnvironmentsActivationCodes(
				null, _PROJECT_EXTERNAL_REFERENCE_CODE,
				_createActivationCodeJSON(
					EnvironmentConstants.TYPE_PRODUCTION));

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		Assertions.assertEquals(
			_ACTIVATION_CODE, jsonObject.getString("activationCode"));
		Assertions.assertEquals(
			EnvironmentConstants.ACTIVATION_STATUS_PENDING,
			jsonObject.getString("activationStatus"));

		Mockito.verify(
			_environmentService, Mockito.never()
		).fetchOrAddCloudNativeEnvironment(
			Mockito.anyLong(), Mockito.any(), Mockito.any(), Mockito.any()
		);
	}

	private void _assertEnvironmentNotActivated() throws Exception {
		Mockito.verify(
			_environmentService, Mockito.never()
		).updateEnvironmentActivation(
			Mockito.any(), Mockito.any(), Mockito.anyLong(), Mockito.any(),
			Mockito.any()
		);
	}

	private void _assertVirtualEntryNotServed() throws Exception {
		Mockito.verify(
			_commerceProductVirtualSettingsService, Mockito.never()
		).getAssetHttpResponse(
			Mockito.anyString()
		);
	}

	private String _createActivationCodeJSON(String type) {
		JSONObject jsonObject = new JSONObject(
		).put(
			"type", type
		);

		return jsonObject.toString();
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

	private String _createActivationToken() throws Exception {
		return _createSignedJWT(
			new JWTClaimsSet.Builder(
			).claim(
				"activationCode", _ACTIVATION_CODE
			).claim(
				"environmentName", "Production"
			).claim(
				"publicKey", "public-key"
			).build());
	}

	private Product _createCloudEnabledProduct(String externalReferenceCode) {
		Product product = new Product();

		ProductSpecification productSpecification = new ProductSpecification();

		productSpecification.setSpecificationKey(
			() -> CommerceProductConstants.SPECIFICATION_KEY_CLOUD_ENABLED);
		productSpecification.setValue(() -> Map.of("en_US", "true"));

		product.setExternalReferenceCode(externalReferenceCode);
		product.setName(() -> Map.of("en_US", "Add On"));
		product.setProductId(_C_PRODUCT_ID);
		product.setProductSpecifications(
			() -> new ProductSpecification[] {productSpecification});

		return product;
	}

	private Environment _createCloudNativeEnvironment(
		String activationStatus, String externalReferenceCode, String type) {

		return new Environment(
			new JSONObject(
			).put(
				"activationCode", _ACTIVATION_CODE
			).put(
				"activationStatus", activationStatus
			).put(
				"externalReferenceCode", externalReferenceCode
			).put(
				"id", _ENVIRONMENT_ID
			).put(
				"name", "Acme Environment"
			).put(
				"offering", EnvironmentConstants.OFFERING_CLOUD_NATIVE
			).put(
				"r_accountEntryToEnvironment_accountEntryId", _ACCOUNT_ID
			).put(
				"r_projectToEnvironment_c_projectERC",
				_PROJECT_EXTERNAL_REFERENCE_CODE
			).put(
				"type", type
			));
	}

	private Entitlement _createEntitlement(String name, double quantity) {
		return _createEntitlement(name, quantity, null);
	}

	private Entitlement _createEntitlement(
		String name, double quantity, String terminationStatus) {

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
			).put(
				"terminationStatus", terminationStatus
			));
	}

	private Environment _createEnvironment(String type) {
		return new Environment(
			new JSONObject(
			).put(
				"externalReferenceCode", _ENVIRONMENT_EXTERNAL_REFERENCE_CODE
			).put(
				"id", _ENVIRONMENT_ID
			).put(
				"offering", EnvironmentConstants.OFFERING_CLOUD_NATIVE
			).put(
				"r_accountEntryToEnvironment_accountEntryId", _ACCOUNT_ID
			).put(
				"r_projectToEnvironment_c_projectERC",
				_PROJECT_EXTERNAL_REFERENCE_CODE
			).put(
				"type", type
			));
	}

	private Entitlement _createEnvironmentEntitlement(
		String grantType, Double maxQuantity, String name) {

		JSONObject jsonObject = new JSONObject(
		).put(
			"grantType", grantType
		).put(
			"id", 1L
		).put(
			"name", name
		);

		if (maxQuantity != null) {
			jsonObject.put("maxQuantity", maxQuantity);
		}

		return new Entitlement(jsonObject);
	}

	private String _createManifestBody(String dxpVersion) throws Exception {
		JWTClaimsSet.Builder builder = new JWTClaimsSet.Builder();

		if (dxpVersion != null) {
			builder.claim("dxpVersion", dxpVersion);
		}

		return _createSignedJWT(builder.build());
	}

	private String _createOfflineActivationToken(String environmentId)
		throws Exception {

		return _createSignedJWT(
			new JWTClaimsSet.Builder(
			).claim(
				"environmentID", environmentId
			).claim(
				"environmentName", "Production"
			).claim(
				"publicKey", "public-key"
			).build());
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
		long contractId, long entitlementId, String skuExternalReferenceCode,
		String terminationStatus) {

		return new Entitlement(
			new JSONObject(
			).put(
				"entitlementDefinitionToEntitlement",
				new JSONObject(
				).put(
					"id", entitlementId
				).put(
					"skuExternalReferenceCode", skuExternalReferenceCode
				)
			).put(
				"id", entitlementId
			).put(
				"r_contractToEntitlement_c_contractId", contractId
			).put(
				"terminationStatus", terminationStatus
			));
	}

	private Entitlement _createProductEntitlement(
		String skuExternalReferenceCode) {

		return _createProductEntitlement(
			skuExternalReferenceCode, _CONTRACT_ID);
	}

	private Entitlement _createProductEntitlement(
		String skuExternalReferenceCode, long contractId) {

		return _createProductEntitlement(
			contractId, 1L, skuExternalReferenceCode, null);
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

	private String _createSignedJWT(JWTClaimsSet jwtClaimsSet)
		throws Exception {

		KeyPairGenerator keyPairGenerator = KeyPairGenerator.getInstance("RSA");

		keyPairGenerator.initialize(2048);

		KeyPair keyPair = keyPairGenerator.generateKeyPair();

		SignedJWT signedJWT = new SignedJWT(
			new JWSHeader(JWSAlgorithm.RS256), jwtClaimsSet);

		signedJWT.sign(new RSASSASigner(keyPair.getPrivate()));

		return signedJWT.serialize();
	}

	private JSONObject _getEnvironmentTypeJSONObject(String type)
		throws Exception {

		ResponseEntity<String> responseEntity =
			_cloudRestController.getProjectsEnvironmentsActivationCodes(
				null, _PROJECT_EXTERNAL_REFERENCE_CODE);

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		JSONArray jsonArray = jsonObject.getJSONArray("environmentTypes");

		for (int i = 0; i < jsonArray.length(); i++) {
			JSONObject environmentTypeJSONObject = jsonArray.getJSONObject(i);

			if (type.equals(environmentTypeJSONObject.getString("type"))) {
				return environmentTypeJSONObject;
			}
		}

		throw new IllegalStateException(
			"No environment type was returned for " + type);
	}

	private JSONObject _getManifestJSONObject(Environment environment)
		throws Exception {

		try {
			return ReflectionTestUtils.invokeMethod(
				_cloudRestController, "_getManifestJSONObject", "DXP 2025.Q3.1",
				Collections.emptySet(), environment);
		}
		catch (UndeclaredThrowableException undeclaredThrowableException) {
			throw (Exception)
				undeclaredThrowableException.getUndeclaredThrowable();
		}
	}

	private void _mockCloudEnabledProduct() throws Exception {
		Mockito.when(
			_commerceProductService.fetchProduct(_C_PRODUCT_ID)
		).thenReturn(
			_createCloudEnabledProduct(_PRODUCT_EXTERNAL_REFERENCE_CODE)
		);
	}

	private Environment _mockManifestEnvironment() throws Exception {
		Environment environment = _createEnvironment(
			EnvironmentConstants.TYPE_PRODUCTION);

		Mockito.when(
			_environmentService.fetchEnvironmentByExternalReferenceCode(
				_ENVIRONMENT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			environment
		);

		Mockito.when(
			_entitlementService.getActiveEntitlements(_ACCOUNT_ID)
		).thenReturn(
			List.of(
				_createEntitlement(EntitlementConstants.NAME_CLOUD_NATIVE, 1))
		);

		return environment;
	}

	private void _mockVirtualEntryDownload() throws Exception {
		_mockCloudEnabledProduct();

		Mockito.when(
			_commerceProductService.fetchProduct(
				_PRODUCT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			_createCloudEnabledProduct(_PRODUCT_EXTERNAL_REFERENCE_CODE)
		);

		ProductVirtualSettingsFileEntry productVirtualSettingsFileEntry =
			new ProductVirtualSettingsFileEntry();

		productVirtualSettingsFileEntry.setId(_VIRTUAL_ENTRY_ID);
		productVirtualSettingsFileEntry.setSrc(_VIRTUAL_ENTRY_SRC);

		Mockito.when(
			_commerceProductVirtualSettingsService.
				fetchProductVirtualSettingsFileEntry(
					Mockito.anyLong(), Mockito.anyString())
		).thenReturn(
			productVirtualSettingsFileEntry
		);

		Mockito.when(
			_commerceProductVirtualSettingsService.
				fetchProductVirtualSettingsFileEntry(
					_C_PRODUCT_ID, _VIRTUAL_ENTRY_ID)
		).thenReturn(
			productVirtualSettingsFileEntry
		);

		Mockito.when(
			_entitlementService.getActiveEntitlements(_ACCOUNT_ID)
		).thenReturn(
			List.of(_createProductEntitlement(_SKU_EXTERNAL_REFERENCE_CODE))
		);

		Mockito.when(
			_environmentService.fetchEnvironmentByExternalReferenceCode(
				_ENVIRONMENT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			_createEnvironment(EnvironmentConstants.TYPE_PRODUCTION)
		);
	}

	private ResponseEntity<StreamingResponseBody>
			_postProductsVirtualEntryDownload(long virtualEntryId)
		throws Exception {

		RequestContextHolder.setRequestAttributes(
			new ServletRequestAttributes(new MockHttpServletRequest()));

		try {
			return _cloudRestController.postProductsVirtualEntryDownload(
				_PRODUCT_EXTERNAL_REFERENCE_CODE, virtualEntryId,
				_createOfflineActivationToken(
					_ENVIRONMENT_EXTERNAL_REFERENCE_CODE));
		}
		finally {
			RequestContextHolder.resetRequestAttributes();
		}
	}

	private static final long _ACCOUNT_ID = 1000L;

	private static final String _ACTIVATION_CODE = "e9e3f0ef8e4d4a2e";

	private static final long _C_PRODUCT_ID = 3000L;

	private static final long _CONTRACT_ID = 4000L;

	private static final String _ENVIRONMENT_EXTERNAL_REFERENCE_CODE = "CNE-1";

	private static final long _ENVIRONMENT_ID = 2000L;

	private static final String _PRODUCT_EXTERNAL_REFERENCE_CODE =
		"PRDCT-ADDON";

	private static final String _PROJECT_EXTERNAL_REFERENCE_CODE = "PRJCT-005";

	private static final String _SKU_EXTERNAL_REFERENCE_CODE = "SKU-3000";

	private static final long _VIRTUAL_ENTRY_ID = 6000L;

	private static final String _VIRTUAL_ENTRY_SRC =
		"https://cdn.example.com/add-ons/addon-1.0.lpkg?signature=1";

	private AccountService _accountService;
	private CloudActivationRequestService _cloudActivationRequestService;
	private CloudNativeSignatureValidator _cloudNativeSignatureValidator;
	private CloudRestController _cloudRestController;
	private CommerceProductService _commerceProductService;
	private CommerceProductVirtualSettingsService
		_commerceProductVirtualSettingsService;
	private CommerceSkuService _commerceSkuService;
	private ContractService _contractService;
	private EntitlementService _entitlementService;
	private EnvironmentActivationPermission _environmentActivationPermission;
	private EnvironmentQuotaService _environmentQuotaService;
	private EnvironmentService _environmentService;
	private LicenseKeyExporter _licenseKeyExporter;
	private LicenseKeyGenerator _licenseKeyGenerator;

}
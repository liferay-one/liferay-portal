/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.exception.LicenseKeyEntitlementException;
import com.liferay.one.license.LicenseKeyExporter;
import com.liferay.one.model.ActivationKey;
import com.liferay.one.model.LicenseKey;
import com.liferay.one.model.Project;
import com.liferay.one.permission.EnvironmentActivationPermission;
import com.liferay.one.permission.LicenseKeyPermission;
import com.liferay.one.service.ActivationKeyService;
import com.liferay.one.service.LicenseKeyGenerateFormService;
import com.liferay.one.service.LicenseKeyGenerationService;
import com.liferay.one.service.LicenseKeyService;
import com.liferay.one.service.SubscriptionEntryService;
import com.liferay.one.service.UserAccountService;
import com.liferay.portal.kernel.security.auth.PrincipalException;

import java.util.Arrays;
import java.util.Collections;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Pedro Oliveira
 */
public class ActivationKeysRestControllerTest {

	@Test
	public void testGetActivationKeysDownloadAggregatesTheLicenseKeys()
		throws Exception {

		ActivationKeysRestController activationKeysRestController =
			_createController();

		_stubActivationKey(7L);

		LicenseKey activeLicenseKey = Mockito.mock(LicenseKey.class);

		Mockito.when(
			activeLicenseKey.isActive()
		).thenReturn(
			true
		);

		LicenseKey inactiveLicenseKey = Mockito.mock(LicenseKey.class);

		Mockito.when(
			_licenseKeyService.getLicenseKeysByActivationKeyId(7L)
		).thenReturn(
			Arrays.asList(activeLicenseKey, inactiveLicenseKey)
		);

		Mockito.when(
			_licenseKeyExporter.toXML(
				Collections.singletonList(activeLicenseKey))
		).thenReturn(
			"<licenses />"
		);

		ResponseEntity<String> responseEntity =
			activationKeysRestController.getActivationKeysDownload(null, 7L);

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());
		Assertions.assertEquals("<licenses />", responseEntity.getBody());
	}

	@Test
	public void testGetActivationKeysDownloadThrowsNotFoundWhenAllInactive()
		throws Exception {

		ActivationKeysRestController activationKeysRestController =
			_createController();

		_stubActivationKey(7L);

		Mockito.when(
			_licenseKeyService.getLicenseKeysByActivationKeyId(7L)
		).thenReturn(
			Collections.singletonList(Mockito.mock(LicenseKey.class))
		);

		Assertions.assertThrows(
			Exception.class,
			() -> activationKeysRestController.getActivationKeysDownload(
				null, 7L));
	}

	@Test
	public void testGetActivationKeysGenerateForm() throws Exception {
		ActivationKeysRestController activationKeysRestController =
			_createController();

		Mockito.when(
			_licenseKeyGenerateFormService.getGenerateForm(_PROJECT_ERC, null)
		).thenReturn(
			new JSONObject(
			).put(
				"products", new JSONArray()
			)
		);

		ResponseEntity<String> responseEntity =
			activationKeysRestController.getActivationKeysGenerateForm(
				null, _PROJECT_ERC, null);

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		Assertions.assertEquals(
			0,
			jsonObject.getJSONArray(
				"products"
			).length());
	}

	@Test
	public void testGetActivationKeysGenerateFormChecksPermission()
		throws Exception {

		ActivationKeysRestController activationKeysRestController =
			_createController();

		Mockito.when(
			_environmentActivationPermission.checkLicenseKeyActivation(
				null, _PROJECT_ERC)
		).thenThrow(
			new PrincipalException()
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> activationKeysRestController.getActivationKeysGenerateForm(
				null, _PROJECT_ERC, null));

		Mockito.verifyNoInteractions(_licenseKeyGenerateFormService);
	}

	@Test
	public void testPostActivationKeysGenerate() throws Exception {
		ActivationKeysRestController activationKeysRestController =
			_createController();

		Mockito.when(
			_environmentActivationPermission.checkLicenseKeyActivation(
				null, _PROJECT_ERC)
		).thenReturn(
			Mockito.mock(Project.class)
		);

		ActivationKey activationKey = new ActivationKey(
			new JSONObject(
			).put(
				"externalReferenceCode", "ACTVK-1"
			).put(
				"id", 7L
			));

		Mockito.when(
			_licenseKeyGenerationService.generateActivationKey(Mockito.any())
		).thenReturn(
			activationKey
		);

		ResponseEntity<String> responseEntity =
			activationKeysRestController.postActivationKeysGenerate(
				null, _toGenerateJSON());

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		Assertions.assertEquals(7L, jsonObject.getLong("activationKeyId"));
		Assertions.assertEquals(
			"ACTVK-1", jsonObject.getString("externalReferenceCode"));
	}

	@Test
	public void testPostActivationKeysGenerateChecksPermission()
		throws Exception {

		ActivationKeysRestController activationKeysRestController =
			_createController();

		Mockito.when(
			_environmentActivationPermission.checkLicenseKeyActivation(
				null, _PROJECT_ERC)
		).thenThrow(
			new PrincipalException()
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> activationKeysRestController.postActivationKeysGenerate(
				null, _toGenerateJSON()));

		Mockito.verifyNoInteractions(_licenseKeyGenerationService);
	}

	@Test
	public void testPatchActivationKeysActiveRejectsComplimentary()
		throws Exception {

		ActivationKeysRestController activationKeysRestController =
			_createController();

		ActivationKey activationKey = Mockito.mock(ActivationKey.class);

		Mockito.when(
			activationKey.getProjectExternalReferenceCode()
		).thenReturn(
			_PROJECT_ERC
		);

		Mockito.when(
			activationKey.isComplimentary()
		).thenReturn(
			true
		);

		Mockito.when(
			_activationKeyService.getActivationKey(null, 77L)
		).thenReturn(
			activationKey
		);

		// Deactivating would hand the activation back to the quota and let a
		// second complimentary key be generated.

		Assertions.assertThrows(
			LicenseKeyEntitlementException.class,
			() -> activationKeysRestController.patchActivationKeysActive(
				null, 77L, "{\"active\": false}"));

		Mockito.verify(
			_activationKeyService, Mockito.never()
		).updateActivationKeyActive(
			Mockito.anyLong(), Mockito.anyBoolean()
		);
	}

	@Test
	public void testGetActivationKeysGenerateFormChecksRenewedActivationKeyOwner()
		throws Exception {

		ActivationKeysRestController activationKeysRestController =
			_createController();

		Project project = Mockito.mock(Project.class);

		Mockito.when(
			project.getExternalReferenceCode()
		).thenReturn(
			_PROJECT_ERC
		);

		Mockito.when(
			_environmentActivationPermission.checkLicenseKeyActivation(
				null, _PROJECT_ERC)
		).thenReturn(
			project
		);

		ActivationKey activationKey = Mockito.mock(ActivationKey.class);

		Mockito.when(
			activationKey.getProjectExternalReferenceCode()
		).thenReturn(
			"PRJCT-OTHER"
		);

		Mockito.when(
			_activationKeyService.fetchActivationKey("ACTVK-OTHER")
		).thenReturn(
			activationKey
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> activationKeysRestController.getActivationKeysGenerateForm(
				null, _PROJECT_ERC, "ACTVK-OTHER"));

		Mockito.verifyNoInteractions(_licenseKeyGenerateFormService);
	}

	@Test
	public void testPostActivationKeysGeneratePassesEveryServer()
		throws Exception {

		ActivationKeysRestController activationKeysRestController =
			_createController();

		Mockito.when(
			_environmentActivationPermission.checkLicenseKeyActivation(
				null, _PROJECT_ERC)
		).thenReturn(
			Mockito.mock(Project.class)
		);

		Mockito.when(
			_licenseKeyGenerationService.generateActivationKey(Mockito.any())
		).thenReturn(
			Mockito.mock(ActivationKey.class)
		);

		activationKeysRestController.postActivationKeysGenerate(
			null, _toGenerateJSON());

		ArgumentCaptor<LicenseKeyGenerationService.GenerateRequest>
			argumentCaptor = ArgumentCaptor.forClass(
				LicenseKeyGenerationService.GenerateRequest.class);

		Mockito.verify(
			_licenseKeyGenerationService
		).generateActivationKey(
			argumentCaptor.capture()
		);

		LicenseKeyGenerationService.GenerateRequest generateRequest =
			argumentCaptor.getValue();

		Assertions.assertEquals(
			Arrays.asList(101L, 102L),
			generateRequest.getBundleEntitlementIds());
		Assertions.assertEquals(
			"Desjardins Insurance", generateRequest.getEnvironmentName());
		Assertions.assertEquals("DXP Backup", generateRequest.getKeyType());
		Assertions.assertEquals(
			2,
			generateRequest.getServers(
			).size());
		Assertions.assertEquals(
			101L, generateRequest.getSubscriptionEntitlementId());
		Assertions.assertEquals("7.4", generateRequest.getVersion());
	}

	private ActivationKeysRestController _createController() throws Exception {
		ActivationKeysRestController activationKeysRestController =
			new ActivationKeysRestController();

		UserAccount userAccount = Mockito.mock(UserAccount.class);

		Mockito.when(
			userAccount.getId()
		).thenReturn(
			_USER_ID
		);

		UserAccountService userAccountService = Mockito.mock(
			UserAccountService.class);

		Mockito.when(
			userAccountService.getMyUserAccount(Mockito.any())
		).thenReturn(
			userAccount
		);

		ReflectionTestUtils.setField(
			activationKeysRestController, "_activationKeyService",
			_activationKeyService);

		ReflectionTestUtils.setField(
			activationKeysRestController, "_environmentActivationPermission",
			_environmentActivationPermission);

		ReflectionTestUtils.setField(
			activationKeysRestController, "_licenseKeyExporter",
			_licenseKeyExporter);

		ReflectionTestUtils.setField(
			activationKeysRestController, "_licenseKeyGenerateFormService",
			_licenseKeyGenerateFormService);

		ReflectionTestUtils.setField(
			activationKeysRestController, "_licenseKeyGenerationService",
			_licenseKeyGenerationService);

		ReflectionTestUtils.setField(
			activationKeysRestController, "_licenseKeyPermission",
			_licenseKeyPermission);

		ReflectionTestUtils.setField(
			activationKeysRestController, "_licenseKeyService",
			_licenseKeyService);

		ReflectionTestUtils.setField(
			activationKeysRestController, "_subscriptionEntryService",
			_subscriptionEntryService);

		ReflectionTestUtils.setField(
			activationKeysRestController, "_userAccountService",
			userAccountService);

		return activationKeysRestController;
	}

	private ActivationKey _stubActivationKey(long activationKeyId)
		throws Exception {

		ActivationKey activationKey = Mockito.mock(ActivationKey.class);

		Mockito.when(
			activationKey.getAccountEntryId()
		).thenReturn(
			_ACCOUNT_ID
		);

		Mockito.when(
			_activationKeyService.getActivationKey(null, activationKeyId)
		).thenReturn(
			activationKey
		);

		return activationKey;
	}

	private String _toGenerateJSON() {
		return new JSONObject(
		).put(
			"bundleEntitlementIds", new JSONArray(Arrays.asList(101L, 102L))
		).put(
			"environmentName", "Desjardins Insurance"
		).put(
			"keyType", "DXP Backup"
		).put(
			"projectExternalReferenceCode", _PROJECT_ERC
		).put(
			"servers",
			new JSONArray(
			).put(
				new JSONObject(
				).put(
					"hostName", "plrlws389.dev.desjardins.com"
				).put(
					"ipAddresses", "10.2.16.123"
				)
			).put(
				new JSONObject(
				).put(
					"hostName", "plrlws390.dev.desjardins.com"
				).put(
					"ipAddresses", "10.2.16.124"
				)
			)
		).put(
			"subscriptionEntitlementId", 101L
		).put(
			"version", "7.4"
		).toString();
	}

	private static final long _ACCOUNT_ID = 555L;

	private static final String _PROJECT_ERC = "PROJ-1";

	private static final long _USER_ID = 123L;

	private final ActivationKeyService _activationKeyService = Mockito.mock(
		ActivationKeyService.class);
	private final EnvironmentActivationPermission
		_environmentActivationPermission = Mockito.mock(
			EnvironmentActivationPermission.class);
	private final LicenseKeyExporter _licenseKeyExporter = Mockito.mock(
		LicenseKeyExporter.class);
	private final LicenseKeyGenerateFormService _licenseKeyGenerateFormService =
		Mockito.mock(LicenseKeyGenerateFormService.class);
	private final LicenseKeyGenerationService _licenseKeyGenerationService =
		Mockito.mock(LicenseKeyGenerationService.class);
	private final LicenseKeyPermission _licenseKeyPermission = Mockito.mock(
		LicenseKeyPermission.class);
	private final LicenseKeyService _licenseKeyService = Mockito.mock(
		LicenseKeyService.class);
	private final SubscriptionEntryService _subscriptionEntryService =
		Mockito.mock(SubscriptionEntryService.class);

}
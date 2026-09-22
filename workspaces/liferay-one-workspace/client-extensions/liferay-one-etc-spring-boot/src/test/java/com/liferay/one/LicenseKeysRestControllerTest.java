/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Account;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.one.constants.ClassNameConstants;
import com.liferay.one.constants.CommerceOrderConstants;
import com.liferay.one.exception.ProjectNotFoundException;
import com.liferay.one.license.LicenseKeyCSVExporter;
import com.liferay.one.license.LicenseKeyExporter;
import com.liferay.one.model.LicenseKey;
import com.liferay.one.model.Project;
import com.liferay.one.model.SubscriptionEntry;
import com.liferay.one.permission.AdminPermission;
import com.liferay.one.permission.EnvironmentActivationPermission;
import com.liferay.one.permission.LicenseKeyPermission;
import com.liferay.one.service.CommerceOrderService;
import com.liferay.one.service.LicenseKeyGenerateFormService;
import com.liferay.one.service.LicenseKeyGenerationService;
import com.liferay.one.service.LicenseKeyService;
import com.liferay.one.service.SubscriptionEntryService;
import com.liferay.one.service.UserAccountService;
import com.liferay.portal.kernel.security.auth.PrincipalException;
import com.liferay.portal.kernel.security.permission.ActionKeys;

import java.util.Arrays;
import java.util.Collections;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

/**
 * @author Amos Fong
 */
public class LicenseKeysRestControllerTest {

	@Test
	public void testDeleteSubscriptions() throws Exception {
		LicenseKeysRestController licenseKeysRestController =
			_createController();

		licenseKeysRestController.deleteSubscriptions(
			null, new long[] {1L, 2L});

		Mockito.verify(
			_subscriptionEntryService
		).deleteSubscriptionEntry(
			null, ClassNameConstants.LICENSE_KEY, 1L, _USER_ID
		);

		Mockito.verify(
			_subscriptionEntryService
		).deleteSubscriptionEntry(
			null, ClassNameConstants.LICENSE_KEY, 2L, _USER_ID
		);
	}

	@Test
	public void testGetLicenseKey() throws Exception {
		LicenseKeysRestController licenseKeysRestController =
			_createController();

		LicenseKey licenseKey = Mockito.mock(LicenseKey.class);

		Mockito.when(
			licenseKey.getAccountEntryId()
		).thenReturn(
			_ACCOUNT_ID
		);

		Mockito.when(
			_licenseKeyService.getLicenseKey(Mockito.any(), Mockito.anyLong())
		).thenReturn(
			licenseKey
		);

		Assertions.assertSame(
			licenseKey, licenseKeysRestController.getLicenseKey(null, 1L));

		Mockito.verify(
			_licenseKeyPermission
		).check(
			_ACCOUNT_ID, ActionKeys.VIEW, null
		);
	}

	@Test
	public void testGetLicenseKeysDeveloperDownload() throws Exception {
		LicenseKeysRestController licenseKeysRestController =
			_createController();

		Project project = Mockito.mock(Project.class);

		Mockito.when(
			_environmentActivationPermission.check(null, _PROJECT_ERC)
		).thenReturn(
			project
		);

		Mockito.when(
			_licenseKeyGenerationService.generateDeveloperLicenseXML(
				project, "DXP", "7.4")
		).thenReturn(
			"<license />"
		);

		Mockito.when(
			_licenseKeyExporter.getFileName("DXP", "7.4", "developer")
		).thenReturn(
			"activation-key-dxp-7.4-developer.xml"
		);

		ResponseEntity<String> responseEntity =
			licenseKeysRestController.getLicenseKeysDeveloperDownload(
				null, "DXP", _PROJECT_ERC, "7.4");

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());
		Assertions.assertEquals("<license />", responseEntity.getBody());

		HttpHeaders httpHeaders = responseEntity.getHeaders();

		Assertions.assertEquals(
			"attachment; filename=\"activation-key-dxp-7.4-developer.xml\"",
			httpHeaders.getFirst(HttpHeaders.CONTENT_DISPOSITION));
	}

	@Test
	public void testGetLicenseKeysDeveloperDownloadThrowsWhenNoProject()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		Mockito.when(
			_environmentActivationPermission.check(null, _PROJECT_ERC)
		).thenReturn(
			null
		);

		Assertions.assertThrows(
			ProjectNotFoundException.class,
			() -> licenseKeysRestController.getLicenseKeysDeveloperDownload(
				null, "DXP", _PROJECT_ERC, "7.4"));
	}

	@Test
	public void testGetLicenseKeysDownload() throws Exception {
		LicenseKeysRestController licenseKeysRestController =
			_createController();

		LicenseKey licenseKey = Mockito.mock(LicenseKey.class);

		Mockito.when(
			licenseKey.getAccountEntryId()
		).thenReturn(
			_ACCOUNT_ID
		);

		Mockito.when(
			licenseKey.getLicenseVersion()
		).thenReturn(
			3
		);

		Mockito.when(
			_licenseKeyService.getLicenseKey(Mockito.any(), Mockito.anyLong())
		).thenReturn(
			licenseKey
		);

		Mockito.when(
			_licenseKeyExporter.getFileName(licenseKey)
		).thenReturn(
			"activation-key.xml"
		);

		Mockito.when(
			_licenseKeyExporter.toXML(licenseKey)
		).thenReturn(
			"<license/>"
		);

		ResponseEntity<String> responseEntity =
			licenseKeysRestController.getLicenseKeysDownload(null, 1L);

		Assertions.assertEquals("<license/>", responseEntity.getBody());

		HttpHeaders httpHeaders = responseEntity.getHeaders();

		Assertions.assertEquals(
			"attachment; filename=\"activation-key.xml\"",
			httpHeaders.getFirst(HttpHeaders.CONTENT_DISPOSITION));
		Assertions.assertEquals(
			MediaType.TEXT_XML, httpHeaders.getContentType());

		Mockito.verify(
			_licenseKeyPermission
		).check(
			_ACCOUNT_ID, ActionKeys.VIEW, null
		);
	}

	@Test
	public void testGetLicenseKeysDownloadAggregatesActiveKeys()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		LicenseKey licenseKey = Mockito.mock(LicenseKey.class);

		Mockito.when(
			licenseKey.getAccountEntryId()
		).thenReturn(
			_ACCOUNT_ID
		);

		Mockito.when(
			licenseKey.isActive()
		).thenReturn(
			true
		);

		Mockito.when(
			_licenseKeyService.getLicenseKeysByIds(
				Mockito.any(), Mockito.any(long[].class))
		).thenReturn(
			Arrays.asList(licenseKey, licenseKey)
		);

		Mockito.when(
			_licenseKeyExporter.getFileName(Mockito.anyList())
		).thenReturn(
			"activation-keys.xml"
		);

		Mockito.when(
			_licenseKeyExporter.toXML(Mockito.anyList())
		).thenReturn(
			"<licenses/>"
		);

		ResponseEntity<String> responseEntity =
			licenseKeysRestController.getLicenseKeysDownload(
				null, new long[] {1L, 2L});

		Assertions.assertEquals("<licenses/>", responseEntity.getBody());

		HttpHeaders httpHeaders = responseEntity.getHeaders();

		Assertions.assertEquals(
			"attachment; filename=\"activation-keys.xml\"",
			httpHeaders.getFirst(HttpHeaders.CONTENT_DISPOSITION));
		Assertions.assertEquals(
			MediaType.TEXT_XML, httpHeaders.getContentType());
	}

	@Test
	public void testGetLicenseKeysDownloadThrowsForbiddenWhenAccountNotViewable()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		LicenseKey licenseKey = Mockito.mock(LicenseKey.class);

		Mockito.when(
			licenseKey.getAccountEntryId()
		).thenReturn(
			_ACCOUNT_ID
		);

		Mockito.when(
			_licenseKeyService.getLicenseKey(Mockito.any(), Mockito.anyLong())
		).thenReturn(
			licenseKey
		);

		Mockito.doThrow(
			new PrincipalException()
		).when(
			_licenseKeyPermission
		).check(
			_ACCOUNT_ID, ActionKeys.VIEW, null
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> licenseKeysRestController.getLicenseKeysDownload(null, 1L));

		Mockito.verify(
			_licenseKeyExporter, Mockito.never()
		).toXML(
			Mockito.any(LicenseKey.class)
		);
	}

	@Test
	public void testGetLicenseKeysDownloadThrowsNotFoundForOldVersion()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		LicenseKey licenseKey = Mockito.mock(LicenseKey.class);

		Mockito.when(
			licenseKey.getAccountEntryId()
		).thenReturn(
			_ACCOUNT_ID
		);

		Mockito.when(
			licenseKey.getLicenseVersion()
		).thenReturn(
			1
		);

		Mockito.when(
			_licenseKeyService.getLicenseKey(Mockito.any(), Mockito.anyLong())
		).thenReturn(
			licenseKey
		);

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> licenseKeysRestController.getLicenseKeysDownload(
					null, 1L));

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND, responseStatusException.getStatusCode());
	}

	@Test
	public void testGetLicenseKeysDownloadWhenLicenseKeyIdsExceedsTheMaximum()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> licenseKeysRestController.getLicenseKeysDownload(
					null, new long[101]));

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST, responseStatusException.getStatusCode());

		Mockito.verifyNoInteractions(_licenseKeyService);
	}

	@Test
	public void testGetLicenseKeysDownloadWhenLicenseKeyIdsIsEmpty()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> licenseKeysRestController.getLicenseKeysDownload(
					null, new long[0]));

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND, responseStatusException.getStatusCode());

		Mockito.verifyNoInteractions(_licenseKeyService);
	}

	@Test
	public void testGetLicenseKeysDownloadZip() throws Exception {
		LicenseKeysRestController licenseKeysRestController =
			_createController();

		LicenseKey licenseKey = Mockito.mock(LicenseKey.class);

		Mockito.when(
			licenseKey.getAccountEntryId()
		).thenReturn(
			_ACCOUNT_ID
		);

		Mockito.when(
			licenseKey.isActive()
		).thenReturn(
			true
		);

		Mockito.when(
			_licenseKeyService.getLicenseKeysByIds(
				Mockito.any(), Mockito.any(long[].class))
		).thenReturn(
			Collections.singletonList(licenseKey)
		);

		byte[] zip = {1, 2, 3};

		Mockito.when(
			_licenseKeyExporter.toZip(Mockito.anyList())
		).thenReturn(
			zip
		);

		ResponseEntity<byte[]> responseEntity =
			licenseKeysRestController.getLicenseKeysDownloadZip(
				null, new long[] {1L});

		Assertions.assertSame(zip, responseEntity.getBody());

		HttpHeaders httpHeaders = responseEntity.getHeaders();

		Assertions.assertEquals(
			"attachment; filename=\"activation-keys.zip\"",
			httpHeaders.getFirst(HttpHeaders.CONTENT_DISPOSITION));
	}

	@Test
	public void testGetLicenseKeysDownloadZipWhenLicenseKeyIdsExceedsTheMaximum()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> licenseKeysRestController.getLicenseKeysDownloadZip(
					null, new long[101]));

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST, responseStatusException.getStatusCode());

		Mockito.verifyNoInteractions(_licenseKeyService);
	}

	@Test
	public void testGetLicenseKeysDownloadZipWhenLicenseKeyIdsIsEmpty()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> licenseKeysRestController.getLicenseKeysDownloadZip(
					null, new long[0]));

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND, responseStatusException.getStatusCode());

		Mockito.verifyNoInteractions(_licenseKeyService);
	}

	@Test
	public void testGetLicenseKeysExport() throws Exception {
		LicenseKeysRestController licenseKeysRestController =
			_createController();

		LicenseKey licenseKey = Mockito.mock(LicenseKey.class);

		Mockito.when(
			licenseKey.getAccountEntryId()
		).thenReturn(
			_ACCOUNT_ID
		);

		Mockito.when(
			_licenseKeyService.getLicenseKeysByIds(
				Mockito.any(), Mockito.any(long[].class))
		).thenReturn(
			Collections.singletonList(licenseKey)
		);

		Mockito.when(
			_licenseKeyCSVExporter.getFileName()
		).thenReturn(
			"activation-key-details.csv"
		);

		Mockito.when(
			_licenseKeyCSVExporter.toCSV(Mockito.anyList())
		).thenReturn(
			"csv"
		);

		ResponseEntity<String> responseEntity =
			licenseKeysRestController.getLicenseKeysExport(
				null, new long[] {1L});

		Assertions.assertEquals("csv", responseEntity.getBody());

		HttpHeaders httpHeaders = responseEntity.getHeaders();

		Assertions.assertEquals(
			"attachment; filename=\"activation-key-details.csv\"",
			httpHeaders.getFirst(HttpHeaders.CONTENT_DISPOSITION));

		Mockito.verify(
			_licenseKeyPermission
		).check(
			Mockito.any(), Mockito.eq(_ACCOUNT_ID), Mockito.eq(ActionKeys.VIEW)
		);
	}

	@Test
	public void testGetLicenseKeysExportWhenLicenseKeyIdsExceedsTheMaximum()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> licenseKeysRestController.getLicenseKeysExport(
					null, new long[101]));

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST, responseStatusException.getStatusCode());

		Mockito.verifyNoInteractions(_licenseKeyCSVExporter);
	}

	@Test
	public void testGetLicenseKeysExportWhenLicenseKeyIdsIsEmpty()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> licenseKeysRestController.getLicenseKeysExport(
					null, new long[0]));

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND, responseStatusException.getStatusCode());

		Mockito.verifyNoInteractions(_licenseKeyCSVExporter);
	}

	@Test
	public void testGetLicenseKeysExportWhenLicenseKeyIdsRepeat()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		LicenseKey licenseKey = Mockito.mock(LicenseKey.class);

		Mockito.when(
			licenseKey.getAccountEntryId()
		).thenReturn(
			_ACCOUNT_ID
		);

		Mockito.when(
			_licenseKeyService.getLicenseKeysByIds(
				Mockito.any(), Mockito.any(long[].class))
		).thenReturn(
			Collections.singletonList(licenseKey)
		);

		Mockito.when(
			_licenseKeyCSVExporter.toCSV(Mockito.anyList())
		).thenReturn(
			"csv"
		);

		ResponseEntity<String> responseEntity =
			licenseKeysRestController.getLicenseKeysExport(
				null, new long[] {1L, 1L});

		Assertions.assertEquals("csv", responseEntity.getBody());
	}

	@Test
	public void testGetLicenseKeysGenerateForm() throws Exception {
		LicenseKeysRestController licenseKeysRestController =
			_createController();

		Mockito.when(
			_licenseKeyGenerateFormService.getGenerateForm(_PROJECT_ERC)
		).thenReturn(
			new JSONObject(
			).put(
				"products", new JSONArray()
			)
		);

		ResponseEntity<String> responseEntity =
			licenseKeysRestController.getLicenseKeysGenerateForm(
				null, _PROJECT_ERC);

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		Assertions.assertEquals(
			0,
			jsonObject.getJSONArray(
				"products"
			).length());
	}

	@Test
	public void testGetLicenseKeysGenerateFormChecksPermission()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		Mockito.when(
			_environmentActivationPermission.check(null, _PROJECT_ERC)
		).thenThrow(
			new PrincipalException()
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> licenseKeysRestController.getLicenseKeysGenerateForm(
				null, _PROJECT_ERC));

		Mockito.verifyNoInteractions(_licenseKeyGenerateFormService);
	}

	@Test
	public void testGetSubscriptionsReturnsFalseWhenNotSubscribed()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		Mockito.when(
			_subscriptionEntryService.fetchSubscriptionEntry(
				null, ClassNameConstants.LICENSE_KEY, 5L, _USER_ID)
		).thenReturn(
			null
		);

		Assertions.assertFalse(
			licenseKeysRestController.getSubscriptions(null, 5L));
	}

	@Test
	public void testGetSubscriptionsReturnsTrueWhenSubscribed()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		Mockito.when(
			_subscriptionEntryService.fetchSubscriptionEntry(
				null, ClassNameConstants.LICENSE_KEY, 5L, _USER_ID)
		).thenReturn(
			Mockito.mock(SubscriptionEntry.class)
		);

		Assertions.assertTrue(
			licenseKeysRestController.getSubscriptions(null, 5L));
	}

	@Test
	public void testPostLicenseKeysGenerate() throws Exception {
		LicenseKeysRestController licenseKeysRestController =
			_createController();

		Project project = Mockito.mock(Project.class);

		Mockito.when(
			_environmentActivationPermission.check(null, _PROJECT_ERC)
		).thenReturn(
			project
		);

		Mockito.when(
			_licenseKeyGenerationService.generateLicenseKeys(Mockito.any())
		).thenReturn(
			Arrays.asList(11L, 12L)
		);

		ResponseEntity<String> responseEntity =
			licenseKeysRestController.postLicenseKeysGenerate(
				null, _toGenerateJSON());

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());

		JSONObject jsonObject = new JSONObject(responseEntity.getBody());

		JSONArray jsonArray = jsonObject.getJSONArray("licenseKeyIds");

		Assertions.assertEquals(2, jsonArray.length());
		Assertions.assertEquals(11L, jsonArray.getLong(0));
		Assertions.assertEquals(12L, jsonArray.getLong(1));
	}

	@Test
	public void testPostLicenseKeysGenerateChecksPermission() throws Exception {
		LicenseKeysRestController licenseKeysRestController =
			_createController();

		Mockito.when(
			_environmentActivationPermission.check(null, _PROJECT_ERC)
		).thenThrow(
			new PrincipalException()
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> licenseKeysRestController.postLicenseKeysGenerate(
				null, _toGenerateJSON()));

		Mockito.verifyNoInteractions(_licenseKeyGenerationService);
	}

	@Test
	public void testPostLicenseKeysGenerateChecksRenewedLicenseKeyOwner()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		Project project = Mockito.mock(Project.class);

		Mockito.when(
			project.getExternalReferenceCode()
		).thenReturn(
			_PROJECT_ERC
		);

		Mockito.when(
			_environmentActivationPermission.check(null, _PROJECT_ERC)
		).thenReturn(
			project
		);

		LicenseKey licenseKey = Mockito.mock(LicenseKey.class);

		Mockito.when(
			licenseKey.getProjectExternalReferenceCode()
		).thenReturn(
			"PRJCT-OTHER"
		);

		Mockito.when(
			_licenseKeyService.getLicenseKey(null, 77L)
		).thenReturn(
			licenseKey
		);

		JSONObject jsonObject = new JSONObject(_toGenerateJSON());

		jsonObject.put(
			"renewedLicenseKeyIds", new JSONArray(Arrays.asList(77L)));

		Assertions.assertThrows(
			PrincipalException.class,
			() -> licenseKeysRestController.postLicenseKeysGenerate(
				null, jsonObject.toString()));

		Mockito.verifyNoInteractions(_licenseKeyGenerationService);
	}

	@Test
	public void testPostLicenseKeysGeneratePassesEveryServer()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		Mockito.when(
			_environmentActivationPermission.check(null, _PROJECT_ERC)
		).thenReturn(
			Mockito.mock(Project.class)
		);

		Mockito.when(
			_licenseKeyGenerationService.generateLicenseKeys(Mockito.any())
		).thenReturn(
			Collections.singletonList(11L)
		);

		licenseKeysRestController.postLicenseKeysGenerate(
			null, _toGenerateJSON());

		ArgumentCaptor<LicenseKeyGenerationService.GenerateRequest>
			argumentCaptor = ArgumentCaptor.forClass(
				LicenseKeyGenerationService.GenerateRequest.class);

		Mockito.verify(
			_licenseKeyGenerationService
		).generateLicenseKeys(
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

	@Test
	public void testPostLicenseKeysTypeFree() throws Exception {
		LicenseKeysRestController licenseKeysRestController =
			_createController();

		Mockito.when(
			_licenseKeyService.hasValidLicenseKeyTypeFree(
				"example.com", "owner@example.com")
		).thenReturn(
			false
		);

		Account account = Mockito.mock(Account.class);

		Mockito.when(
			account.getId()
		).thenReturn(
			_ACCOUNT_ID
		);

		Order order = Mockito.mock(Order.class);

		Mockito.when(
			order.getAccount()
		).thenReturn(
			account
		);

		Mockito.when(
			order.getId()
		).thenReturn(
			999L
		);

		Mockito.when(
			order.getOrderStatus()
		).thenReturn(
			CommerceOrderConstants.ORDER_STATUS_OPEN
		);

		Mockito.when(
			_commerceOrderService.getCommerceOrder(999L)
		).thenReturn(
			order
		);

		LicenseKey licenseKey = Mockito.mock(LicenseKey.class);

		Mockito.when(
			_licenseKeyService.addLicenseKeyTypeFree(
				_ACCOUNT_ID, "example.com", "999", "owner@example.com")
		).thenReturn(
			licenseKey
		);

		Assertions.assertSame(
			licenseKey,
			licenseKeysRestController.postLicenseKeysTypeFree(
				"{\"domains\": \"example.com\", \"orderId\": \"999\", " +
					"\"owner\": \"owner@example.com\"}"));

		Mockito.verify(
			_commerceOrderService
		).completeOrder(
			999L, CommerceOrderConstants.ORDER_PAYMENT_STATUS_NOT_REQUIRED
		);
	}

	@Test
	public void testPostLicenseKeysTypeFreeDomainsCheckThrowsConflictWhenDomainExists()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		Mockito.when(
			_licenseKeyService.hasValidLicenseKeyTypeFree(
				"example.com", "owner@example.com")
		).thenReturn(
			true
		);

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() ->
					licenseKeysRestController.
						postLicenseKeysTypeFreeDomainsCheck(
							"{\"domains\": \"example.com\", \"owner\": " +
								"\"owner@example.com\"}"));

		Assertions.assertEquals(
			HttpStatus.CONFLICT, responseStatusException.getStatusCode());
	}

	@Test
	public void testPutSubscriptions() throws Exception {
		LicenseKeysRestController licenseKeysRestController =
			_createController();

		LicenseKey licenseKey = Mockito.mock(LicenseKey.class);

		Mockito.when(
			licenseKey.getAccountEntryId()
		).thenReturn(
			_ACCOUNT_ID
		);

		Mockito.when(
			_licenseKeyService.getLicenseKey(Mockito.any(), Mockito.anyLong())
		).thenReturn(
			licenseKey
		);

		licenseKeysRestController.putSubscriptions(null, new long[] {1L, 2L});

		Mockito.verify(
			_licenseKeyService
		).getLicenseKey(
			null, 1L
		);

		Mockito.verify(
			_licenseKeyService
		).getLicenseKey(
			null, 2L
		);

		Mockito.verify(
			_licenseKeyPermission, Mockito.times(2)
		).check(
			Mockito.any(UserAccount.class), Mockito.eq(_ACCOUNT_ID),
			Mockito.eq(ActionKeys.VIEW)
		);

		Mockito.verify(
			_subscriptionEntryService
		).addSubscriptionEntry(
			null, ClassNameConstants.LICENSE_KEY, 1L, _USER_ID
		);

		Mockito.verify(
			_subscriptionEntryService
		).addSubscriptionEntry(
			null, ClassNameConstants.LICENSE_KEY, 2L, _USER_ID
		);
	}

	@Test
	public void testPutSubscriptionsThrowsForbiddenWhenAccountNotViewable()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		LicenseKey licenseKey = Mockito.mock(LicenseKey.class);

		Mockito.when(
			licenseKey.getAccountEntryId()
		).thenReturn(
			_ACCOUNT_ID
		);

		Mockito.when(
			_licenseKeyService.getLicenseKey(Mockito.any(), Mockito.anyLong())
		).thenReturn(
			licenseKey
		);

		Mockito.doThrow(
			new PrincipalException()
		).when(
			_licenseKeyPermission
		).check(
			Mockito.any(UserAccount.class), Mockito.eq(_ACCOUNT_ID),
			Mockito.eq(ActionKeys.VIEW)
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> licenseKeysRestController.putSubscriptions(
				null, new long[] {1L}));

		Mockito.verify(
			_subscriptionEntryService, Mockito.never()
		).addSubscriptionEntry(
			Mockito.any(), Mockito.anyString(), Mockito.anyLong(),
			Mockito.anyLong()
		);
	}

	private LicenseKeysRestController _createController() throws Exception {
		LicenseKeysRestController licenseKeysRestController =
			new LicenseKeysRestController();

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
			licenseKeysRestController, "_adminPermission", _adminPermission);

		ReflectionTestUtils.setField(
			licenseKeysRestController, "_commerceOrderService",
			_commerceOrderService);

		ReflectionTestUtils.setField(
			licenseKeysRestController, "_environmentActivationPermission",
			_environmentActivationPermission);

		ReflectionTestUtils.setField(
			licenseKeysRestController, "_licenseKeyCSVExporter",
			_licenseKeyCSVExporter);

		ReflectionTestUtils.setField(
			licenseKeysRestController, "_licenseKeyExporter",
			_licenseKeyExporter);

		ReflectionTestUtils.setField(
			licenseKeysRestController, "_licenseKeyGenerateFormService",
			_licenseKeyGenerateFormService);

		ReflectionTestUtils.setField(
			licenseKeysRestController, "_licenseKeyGenerationService",
			_licenseKeyGenerationService);

		ReflectionTestUtils.setField(
			licenseKeysRestController, "_licenseKeyPermission",
			_licenseKeyPermission);

		ReflectionTestUtils.setField(
			licenseKeysRestController, "_licenseKeyService",
			_licenseKeyService);

		ReflectionTestUtils.setField(
			licenseKeysRestController, "_subscriptionEntryService",
			_subscriptionEntryService);

		ReflectionTestUtils.setField(
			licenseKeysRestController, "_userAccountService",
			userAccountService);

		return licenseKeysRestController;
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

	private final AdminPermission _adminPermission = Mockito.mock(
		AdminPermission.class);
	private final CommerceOrderService _commerceOrderService = Mockito.mock(
		CommerceOrderService.class);
	private final EnvironmentActivationPermission
		_environmentActivationPermission = Mockito.mock(
			EnvironmentActivationPermission.class);
	private final LicenseKeyCSVExporter _licenseKeyCSVExporter = Mockito.mock(
		LicenseKeyCSVExporter.class);
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
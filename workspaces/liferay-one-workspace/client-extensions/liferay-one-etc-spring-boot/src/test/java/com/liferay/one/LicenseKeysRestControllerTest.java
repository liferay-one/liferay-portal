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
import com.liferay.one.constants.EntitlementConstants;
import com.liferay.one.exception.LicenseKeyDateException;
import com.liferay.one.exception.LicenseKeyProductPurchaseKeyException;
import com.liferay.one.license.LicenseKeyCSVExporter;
import com.liferay.one.license.LicenseKeyEntitlementValidator;
import com.liferay.one.license.LicenseKeyExporter;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.EntitlementDefinition;
import com.liferay.one.model.LicenseKey;
import com.liferay.one.model.SubscriptionEntry;
import com.liferay.one.permission.AdminPermission;
import com.liferay.one.permission.LicenseKeyPermission;
import com.liferay.one.service.AccountService;
import com.liferay.one.service.CommerceOrderService;
import com.liferay.one.service.EntitlementService;
import com.liferay.one.service.LicenseKeyService;
import com.liferay.one.service.SubscriptionEntryService;
import com.liferay.one.service.UserAccountService;
import com.liferay.one.util.KeyedLock;
import com.liferay.portal.kernel.security.auth.PrincipalException;
import com.liferay.portal.kernel.security.permission.ActionKeys;

import java.time.Instant;

import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.List;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

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
	public void testPostLicenseKeysExtend() throws Exception {
		LicenseKeysRestController licenseKeysRestController =
			_createController();

		LicenseKey licenseKey = _createLicenseKey(1L, _ENTITLEMENT_ID);

		Mockito.when(
			_licenseKeyService.getLicenseKeysByIds(
				Mockito.any(), Mockito.any(long[].class))
		).thenReturn(
			Collections.singletonList(licenseKey)
		);

		Entitlement entitlement = _createEntitlement();

		Mockito.when(
			_entitlementService.getEntitlement(_ENTITLEMENT_ID)
		).thenReturn(
			entitlement
		);

		LicenseKey extendedLicenseKey = Mockito.mock(LicenseKey.class);

		Mockito.when(
			_licenseKeyService.extendLicenseKey(
				Mockito.any(), Mockito.anyLong(), Mockito.any())
		).thenReturn(
			extendedLicenseKey
		);

		Assertions.assertEquals(
			Collections.singletonList(extendedLicenseKey),
			licenseKeysRestController.postLicenseKeysExtend(
				null, _createExtensionBodyJSON(1L)));

		Mockito.verify(
			_licenseKeyPermission
		).check(
			Mockito.any(UserAccount.class), Mockito.eq(_ACCOUNT_ID),
			Mockito.eq(ActionKeys.UPDATE)
		);

		Mockito.verify(
			_licenseKeyService
		).extendLicenseKey(
			Date.from(Instant.parse(_EXPIRATION_DATE)), 1L,
			Date.from(Instant.parse(_START_DATE))
		);
	}

	@Test
	public void testPostLicenseKeysExtendThrowsForbiddenWhenSelfProvisioningIsDisabled()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		LicenseKey licenseKey = _createLicenseKey(1L, _ENTITLEMENT_ID);

		Mockito.when(
			_licenseKeyService.getLicenseKeysByIds(
				Mockito.any(), Mockito.any(long[].class))
		).thenReturn(
			Collections.singletonList(licenseKey)
		);

		Entitlement entitlement = _createEntitlement();

		Mockito.when(
			_entitlementService.getEntitlement(_ENTITLEMENT_ID)
		).thenReturn(
			entitlement
		);

		Mockito.doThrow(
			PrincipalException.class
		).when(
			_licenseKeyPermission
		).checkSelfProvisioning(
			Mockito.eq(_ACCOUNT_ID), Mockito.any()
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> licenseKeysRestController.postLicenseKeysExtend(
				null, _createExtensionBodyJSON(1L)));

		Mockito.verify(
			_licenseKeyService, Mockito.never()
		).extendLicenseKey(
			Mockito.any(), Mockito.anyLong(), Mockito.any()
		);
	}

	@Test
	public void testPostLicenseKeysExtendWhenBodyIsEmpty() throws Exception {
		LicenseKeysRestController licenseKeysRestController =
			_createController();

		Assertions.assertThrows(
			ResponseStatusException.class,
			() -> licenseKeysRestController.postLicenseKeysExtend(null, "[]"));

		Mockito.verifyNoInteractions(_licenseKeyService);
	}

	@Test
	public void testPostLicenseKeysExtendWhenEntitlementIsExhausted()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		LicenseKey licenseKey = _createLicenseKey(1L, _ENTITLEMENT_ID);

		Mockito.when(
			_licenseKeyService.getLicenseKeysByIds(
				Mockito.any(), Mockito.any(long[].class))
		).thenReturn(
			Collections.singletonList(licenseKey)
		);

		Entitlement entitlement = _createEntitlement();

		Mockito.when(
			entitlement.getGrantType()
		).thenReturn(
			"metered"
		);

		Mockito.when(
			entitlement.getQuantity()
		).thenReturn(
			1.0
		);

		Mockito.when(
			_entitlementService.getEntitlement(_ENTITLEMENT_ID)
		).thenReturn(
			entitlement
		);

		Mockito.when(
			_licenseKeyService.getLicenseKeys(true, false, _ENTITLEMENT_ID)
		).thenReturn(
			Collections.singletonList(licenseKey)
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> licenseKeysRestController.postLicenseKeysExtend(
				null, _createExtensionBodyJSON(1L)));

		Mockito.verify(
			_licenseKeyService, Mockito.never()
		).extendLicenseKey(
			Mockito.any(), Mockito.anyLong(), Mockito.any()
		);
	}

	@Test
	public void testPostLicenseKeysExtendWhenEntitlementIsMissing()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		LicenseKey licenseKey = _createLicenseKey(1L, 0L);

		Mockito.when(
			_licenseKeyService.getLicenseKeysByIds(
				Mockito.any(), Mockito.any(long[].class))
		).thenReturn(
			Collections.singletonList(licenseKey)
		);

		Assertions.assertThrows(
			LicenseKeyProductPurchaseKeyException.class,
			() -> licenseKeysRestController.postLicenseKeysExtend(
				null, _createExtensionBodyJSON(1L)));
	}

	@Test
	public void testPostLicenseKeysExtendWhenExpirationDateExceedsEntitlement()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		LicenseKey licenseKey = _createLicenseKey(1L, _ENTITLEMENT_ID);

		Mockito.when(
			_licenseKeyService.getLicenseKeysByIds(
				Mockito.any(), Mockito.any(long[].class))
		).thenReturn(
			Collections.singletonList(licenseKey)
		);

		Entitlement entitlement = _createEntitlement(
			Instant.parse(_START_DATE));

		Mockito.when(
			_entitlementService.getEntitlement(_ENTITLEMENT_ID)
		).thenReturn(
			entitlement
		);

		Assertions.assertThrows(
			LicenseKeyDateException.class,
			() -> licenseKeysRestController.postLicenseKeysExtend(
				null, _createExtensionBodyJSON(1L)));

		Mockito.verify(
			_licenseKeyService, Mockito.never()
		).extendLicenseKey(
			Mockito.any(), Mockito.anyLong(), Mockito.any()
		);
	}

	@Test
	public void testPostLicenseKeysExtendWhenExpirationDatePrecedesStartDate()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		LicenseKey licenseKey = _createLicenseKey(1L, _ENTITLEMENT_ID);

		Mockito.when(
			_licenseKeyService.getLicenseKeysByIds(
				Mockito.any(), Mockito.any(long[].class))
		).thenReturn(
			Collections.singletonList(licenseKey)
		);

		Entitlement entitlement = _createEntitlement();

		Mockito.when(
			_entitlementService.getEntitlement(_ENTITLEMENT_ID)
		).thenReturn(
			entitlement
		);

		Assertions.assertThrows(
			LicenseKeyDateException.class,
			() -> licenseKeysRestController.postLicenseKeysExtend(
				null,
				new JSONArray(
				).put(
					new JSONObject(
					).put(
						"expirationDate", _START_DATE
					).put(
						"licenseKeyId", 1L
					).put(
						"startDate", _EXPIRATION_DATE
					)
				).toString()));
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
	public void testPutLicenseKeysActivate() throws Exception {
		LicenseKeysRestController licenseKeysRestController =
			_createController();

		LicenseKey licenseKey = _createLicenseKey(1L, _ENTITLEMENT_ID);

		Mockito.when(
			_licenseKeyService.getLicenseKeysByIds(
				Mockito.any(), Mockito.any(long[].class))
		).thenReturn(
			Collections.singletonList(licenseKey)
		);

		Entitlement entitlement = _createEntitlement();

		Mockito.when(
			_entitlementService.getEntitlement(_ENTITLEMENT_ID)
		).thenReturn(
			entitlement
		);

		licenseKeysRestController.putLicenseKeysActivate(null, new long[] {1L});

		Mockito.verify(
			_licenseKeyPermission
		).check(
			Mockito.any(UserAccount.class), Mockito.eq(_ACCOUNT_ID),
			Mockito.eq(ActionKeys.UPDATE)
		);

		Mockito.verify(
			_licenseKeyService
		).updateLicenseKeyActive(
			true, 1L
		);
	}

	@Test
	public void testPutLicenseKeysActivateRejectsMultipleAccounts()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		LicenseKey licenseKey1 = _createLicenseKey(1L, _ENTITLEMENT_ID);

		LicenseKey licenseKey2 = _createLicenseKey(2L, _ENTITLEMENT_ID);

		Mockito.when(
			licenseKey2.getAccountEntryId()
		).thenReturn(
			_ACCOUNT_ID + 1
		);

		Mockito.when(
			_licenseKeyService.getLicenseKeysByIds(
				Mockito.any(), Mockito.any(long[].class))
		).thenReturn(
			List.of(licenseKey1, licenseKey2)
		);

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> licenseKeysRestController.putLicenseKeysActivate(
					null, new long[] {1L, 2L}));

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST, responseStatusException.getStatusCode());

		Mockito.verify(
			_licenseKeyService, Mockito.never()
		).updateLicenseKeyActive(
			Mockito.anyBoolean(), Mockito.anyLong()
		);
	}

	@Test
	public void testPutLicenseKeysActivateSkipsQuotaForComplimentary()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		LicenseKey licenseKey = _createLicenseKey(1L, _ENTITLEMENT_ID);

		Mockito.when(
			licenseKey.isComplimentary()
		).thenReturn(
			true
		);

		Mockito.when(
			_licenseKeyService.getLicenseKeysByIds(
				Mockito.any(), Mockito.any(long[].class))
		).thenReturn(
			Collections.singletonList(licenseKey)
		);

		licenseKeysRestController.putLicenseKeysActivate(null, new long[] {1L});

		Mockito.verify(
			_licenseKeyService
		).updateLicenseKeyActive(
			true, 1L
		);

		Mockito.verifyNoInteractions(_entitlementService);
	}

	@Test
	public void testPutLicenseKeysActivateThrowsForbiddenWhenAccountNotManageable()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		LicenseKey licenseKey = _createLicenseKey(1L, _ENTITLEMENT_ID);

		Mockito.when(
			_licenseKeyService.getLicenseKeysByIds(
				Mockito.any(), Mockito.any(long[].class))
		).thenReturn(
			Collections.singletonList(licenseKey)
		);

		Mockito.doThrow(
			PrincipalException.class
		).when(
			_licenseKeyPermission
		).check(
			Mockito.any(UserAccount.class), Mockito.eq(_ACCOUNT_ID),
			Mockito.eq(ActionKeys.UPDATE)
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> licenseKeysRestController.putLicenseKeysActivate(
				null, new long[] {1L}));

		Mockito.verify(
			_licenseKeyService, Mockito.never()
		).updateLicenseKeyActive(
			Mockito.anyBoolean(), Mockito.anyLong()
		);
	}

	@Test
	public void testPutLicenseKeysActivateWhenEntitlementIsExhausted()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		LicenseKey licenseKey = _createLicenseKey(1L, _ENTITLEMENT_ID);

		Mockito.when(
			_licenseKeyService.getLicenseKeysByIds(
				Mockito.any(), Mockito.any(long[].class))
		).thenReturn(
			Collections.singletonList(licenseKey)
		);

		Entitlement entitlement = _createEntitlement();

		Mockito.when(
			entitlement.getGrantType()
		).thenReturn(
			"metered"
		);

		Mockito.when(
			entitlement.getQuantity()
		).thenReturn(
			1.0
		);

		Mockito.when(
			_entitlementService.getEntitlement(_ENTITLEMENT_ID)
		).thenReturn(
			entitlement
		);

		LicenseKey activeLicenseKey = Mockito.mock(LicenseKey.class);

		Mockito.when(
			activeLicenseKey.getMaxClusterNodes()
		).thenReturn(
			1
		);

		Mockito.when(
			_licenseKeyService.getLicenseKeys(true, false, _ENTITLEMENT_ID)
		).thenReturn(
			Collections.singletonList(activeLicenseKey)
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> licenseKeysRestController.putLicenseKeysActivate(
				null, new long[] {1L}));

		Mockito.verify(
			_licenseKeyService, Mockito.never()
		).updateLicenseKeyActive(
			Mockito.anyBoolean(), Mockito.anyLong()
		);
	}

	@Test
	public void testPutLicenseKeysActivateWhenLicenseKeyIdsIsEmpty()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		Assertions.assertThrows(
			ResponseStatusException.class,
			() -> licenseKeysRestController.putLicenseKeysActivate(
				null, new long[0]));

		Mockito.verifyNoInteractions(_licenseKeyService);
	}

	@Test
	public void testPutLicenseKeysDeactivate() throws Exception {
		LicenseKeysRestController licenseKeysRestController =
			_createController();

		LicenseKey licenseKey1 = _createLicenseKey(1L, _ENTITLEMENT_ID);

		LicenseKey licenseKey2 = _createLicenseKey(2L, _ENTITLEMENT_ID);

		Mockito.when(
			_licenseKeyService.getLicenseKeysByIds(
				Mockito.any(), Mockito.any(long[].class))
		).thenReturn(
			List.of(licenseKey1, licenseKey2)
		);

		licenseKeysRestController.putLicenseKeysDeactivate(
			null, new long[] {1L, 2L});

		Mockito.verify(
			_licenseKeyPermission
		).check(
			Mockito.any(UserAccount.class), Mockito.eq(_ACCOUNT_ID),
			Mockito.eq(ActionKeys.UPDATE)
		);

		Mockito.verify(
			_licenseKeyService
		).updateLicenseKeyActive(
			false, 1L
		);

		Mockito.verify(
			_licenseKeyService
		).updateLicenseKeyActive(
			false, 2L
		);
	}

	@Test
	public void testPutLicenseKeysDeactivateSkipsSelfProvisioning()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		LicenseKey licenseKey = _createLicenseKey(1L, _ENTITLEMENT_ID);

		Mockito.when(
			_licenseKeyService.getLicenseKeysByIds(
				Mockito.any(), Mockito.any(long[].class))
		).thenReturn(
			Collections.singletonList(licenseKey)
		);

		licenseKeysRestController.putLicenseKeysDeactivate(
			null, new long[] {1L});

		Mockito.verify(
			_licenseKeyPermission, Mockito.never()
		).checkSelfProvisioning(
			Mockito.anyLong(), Mockito.any()
		);

		Mockito.verify(
			_licenseKeyService
		).updateLicenseKeyActive(
			false, 1L
		);
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
			licenseKeysRestController, "_accountService", _accountService);

		ReflectionTestUtils.setField(
			licenseKeysRestController, "_entitlementService",
			_entitlementService);

		ReflectionTestUtils.setField(
			licenseKeysRestController, "_keyedLock", new KeyedLock());

		ReflectionTestUtils.setField(
			licenseKeysRestController, "_licenseKeyCSVExporter",
			_licenseKeyCSVExporter);

		LicenseKeyEntitlementValidator licenseKeyEntitlementValidator =
			new LicenseKeyEntitlementValidator();

		ReflectionTestUtils.setField(
			licenseKeyEntitlementValidator, "_licenseKeyService",
			_licenseKeyService);

		ReflectionTestUtils.setField(
			licenseKeysRestController, "_licenseKeyEntitlementValidator",
			licenseKeyEntitlementValidator);

		ReflectionTestUtils.setField(
			licenseKeysRestController, "_licenseKeyExporter",
			_licenseKeyExporter);

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

	private Entitlement _createEntitlement() {
		return _createEntitlement(null);
	}

	private Entitlement _createEntitlement(Instant endDateInstant) {
		EntitlementDefinition entitlementDefinition = Mockito.mock(
			EntitlementDefinition.class);

		Mockito.when(
			entitlementDefinition.getExternalReferenceCode()
		).thenReturn(
			EntitlementConstants.EXTERNAL_REFERENCE_CODE_DXP
		);

		Entitlement entitlement = Mockito.mock(Entitlement.class);

		Mockito.when(
			entitlement.getEntitlementDefinition()
		).thenReturn(
			entitlementDefinition
		);

		Mockito.when(
			entitlement.getEntitlementId()
		).thenReturn(
			_ENTITLEMENT_ID
		);

		Mockito.when(
			entitlement.getEndDateInstant()
		).thenReturn(
			endDateInstant
		);

		Mockito.when(
			entitlement.getGrantType()
		).thenReturn(
			EntitlementConstants.GRANT_TYPE_UNLIMITED
		);

		return entitlement;
	}

	private String _createExtensionBodyJSON(long licenseKeyId) {
		return new JSONArray(
		).put(
			new JSONObject(
			).put(
				"expirationDate", _EXPIRATION_DATE
			).put(
				"licenseKeyId", licenseKeyId
			).put(
				"startDate", _START_DATE
			)
		).toString();
	}

	private LicenseKey _createLicenseKey(
		long licenseKeyId, long entitlementId) {

		LicenseKey licenseKey = Mockito.mock(LicenseKey.class);

		Mockito.when(
			licenseKey.getAccountEntryId()
		).thenReturn(
			_ACCOUNT_ID
		);

		Mockito.when(
			licenseKey.getEntitlementId()
		).thenReturn(
			entitlementId
		);

		Mockito.when(
			licenseKey.getLicenseKeyId()
		).thenReturn(
			licenseKeyId
		);

		return licenseKey;
	}

	private static final long _ACCOUNT_ID = 555L;

	private static final long _ENTITLEMENT_ID = 7L;

	private static final String _EXPIRATION_DATE = "2027-01-01T00:00:00Z";

	private static final String _START_DATE = "2026-01-01T00:00:00Z";

	private static final long _USER_ID = 123L;

	private final AccountService _accountService = Mockito.mock(
		AccountService.class);
	private final AdminPermission _adminPermission = Mockito.mock(
		AdminPermission.class);
	private final CommerceOrderService _commerceOrderService = Mockito.mock(
		CommerceOrderService.class);
	private final EntitlementService _entitlementService = Mockito.mock(
		EntitlementService.class);
	private final LicenseKeyCSVExporter _licenseKeyCSVExporter = Mockito.mock(
		LicenseKeyCSVExporter.class);
	private final LicenseKeyExporter _licenseKeyExporter = Mockito.mock(
		LicenseKeyExporter.class);
	private final LicenseKeyPermission _licenseKeyPermission = Mockito.mock(
		LicenseKeyPermission.class);
	private final LicenseKeyService _licenseKeyService = Mockito.mock(
		LicenseKeyService.class);
	private final SubscriptionEntryService _subscriptionEntryService =
		Mockito.mock(SubscriptionEntryService.class);

}
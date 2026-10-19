/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Account;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.OrderItem;
import com.liferay.one.constants.ClassNameConstants;
import com.liferay.one.constants.CommerceOrderConstants;
import com.liferay.one.exception.LicenseKeyEntitlementException;
import com.liferay.one.exception.LicenseKeyValidationException;
import com.liferay.one.exception.NoSuchLicenseKeyException;
import com.liferay.one.exception.ProjectNotFoundException;
import com.liferay.one.license.LicenseKeyExporter;
import com.liferay.one.model.LicenseKey;
import com.liferay.one.model.Project;
import com.liferay.one.model.SubscriptionEntry;
import com.liferay.one.permission.CommerceOrderPermission;
import com.liferay.one.permission.EnvironmentActivationPermission;
import com.liferay.one.permission.LicenseKeyPermission;
import com.liferay.one.permission.ProjectPermission;
import com.liferay.one.service.CommerceOrderService;
import com.liferay.one.service.LicenseKeyGenerationService;
import com.liferay.one.service.LicenseKeyService;
import com.liferay.one.service.ProjectService;
import com.liferay.one.service.SubscriptionEntryService;
import com.liferay.one.service.UserAccountService;
import com.liferay.portal.kernel.security.auth.PrincipalException;
import com.liferay.portal.kernel.security.permission.ActionKeys;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
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
	public void testGetLicenseKeysDeveloperDownload() throws Exception {
		LicenseKeysRestController licenseKeysRestController =
			_createController();

		Project project = Mockito.mock(Project.class);

		Mockito.when(
			_projectService.fetchProject(_PROJECT_ERC)
		).thenReturn(
			project
		);

		Mockito.when(
			_licenseKeyGenerationService.generateDeveloperLicenseXML(
				Arrays.asList(2L, 3L), "developer", "DXP", project, "7.4")
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
				null, Arrays.asList(2L, 3L), "developer", "DXP", _PROJECT_ERC,
				"7.4");

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());
		Assertions.assertEquals("<license />", responseEntity.getBody());

		HttpHeaders httpHeaders = responseEntity.getHeaders();

		Assertions.assertEquals(
			"attachment; filename=\"activation-key-dxp-7.4-developer.xml\"",
			httpHeaders.getFirst(HttpHeaders.CONTENT_DISPOSITION));
	}

	@Test
	public void testGetLicenseKeysDeveloperDownloadChecksProjectViewPermission()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		Mockito.doThrow(
			new PrincipalException()
		).when(
			_projectPermission
		).check(
			ActionKeys.VIEW, null, _PROJECT_ERC
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> licenseKeysRestController.getLicenseKeysDeveloperDownload(
				null, null, "developer", "DXP", _PROJECT_ERC, "7.4"));

		Mockito.verifyNoInteractions(_licenseKeyGenerationService);
	}

	@Test
	public void testGetLicenseKeysDeveloperDownloadSkipsSelfProvisioning()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		Project project = Mockito.mock(Project.class);

		Mockito.when(
			project.getAccountId()
		).thenReturn(
			_ACCOUNT_ID
		);

		Mockito.when(
			_projectService.fetchProject(_PROJECT_ERC)
		).thenReturn(
			project
		);

		Mockito.doThrow(
			new PrincipalException()
		).when(
			_environmentActivationPermission
		).checkSelfProvisioning(
			_ACCOUNT_ID, null
		);

		Mockito.when(
			_licenseKeyGenerationService.generateDeveloperLicenseXML(
				Collections.emptyList(), "developer", "DXP", project, "7.4")
		).thenReturn(
			"<license />"
		);

		ResponseEntity<String> responseEntity =
			licenseKeysRestController.getLicenseKeysDeveloperDownload(
				null, null, "developer", "DXP", _PROJECT_ERC, "7.4");

		Assertions.assertEquals("<license />", responseEntity.getBody());
	}

	@Test
	public void testGetLicenseKeysDeveloperDownloadThrowsWhenNoProject()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		Assertions.assertThrows(
			ProjectNotFoundException.class,
			() -> licenseKeysRestController.getLicenseKeysDeveloperDownload(
				null, null, "developer", "DXP", _PROJECT_ERC, "7.4"));
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
	public void testGetLicenseKeysDownloadChecksViewOnEveryLicenseKey()
		throws Exception {

		// REST-GET-LICENSE-KEYS-DOWNLOAD streams several keys at once, so a
		// single key on an account the caller cannot view rejects the batch.

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		List<LicenseKey> licenseKeys = Arrays.asList(
			_createLicenseKeyOnAccount(_ACCOUNT_ID, 1L),
			_createLicenseKeyOnAccount(_OTHER_ACCOUNT_ID, 2L));

		Mockito.when(
			_licenseKeyService.getLicenseKeysByIds(
				Mockito.any(), Mockito.any(long[].class))
		).thenReturn(
			licenseKeys
		);

		Mockito.doThrow(
			new PrincipalException()
		).when(
			_licenseKeyPermission
		).check(
			Mockito.any(UserAccount.class), Mockito.eq(_OTHER_ACCOUNT_ID),
			Mockito.eq(ActionKeys.VIEW)
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> licenseKeysRestController.getLicenseKeysDownload(
				null, new long[] {1L, 2L}));

		Mockito.verify(
			_licenseKeyPermission
		).check(
			Mockito.any(UserAccount.class), Mockito.eq(_ACCOUNT_ID),
			Mockito.eq(ActionKeys.VIEW)
		);

		Mockito.verify(
			_licenseKeyExporter, Mockito.never()
		).toXML(
			Mockito.anyList()
		);
	}

	@Test
	public void testGetLicenseKeysDownloadPropagatesUnknownLicenseKey()
		throws Exception {

		// REST-GET-LICENSE-KEYS-LICENSEKEYID-DOWNLOAD lets an unknown ID
		// surface as an error before any permission check or export runs.

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		Mockito.when(
			_licenseKeyService.getLicenseKey(Mockito.any(), Mockito.anyLong())
		).thenThrow(
			new NoSuchLicenseKeyException()
		);

		Assertions.assertThrows(
			NoSuchLicenseKeyException.class,
			() -> licenseKeysRestController.getLicenseKeysDownload(null, 1L));

		Mockito.verifyNoInteractions(
			_licenseKeyExporter, _licenseKeyPermission);
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
	public void testGetLicenseKeysDownloadThrowsNotFoundWhenNoLicenseKeyIsActive()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		LicenseKey licenseKey = _createLicenseKey(1L);

		Mockito.when(
			licenseKey.isActive()
		).thenReturn(
			false
		);

		Mockito.when(
			_licenseKeyService.getLicenseKeysByIds(
				Mockito.any(), Mockito.any(long[].class))
		).thenReturn(
			Collections.singletonList(licenseKey)
		);

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> licenseKeysRestController.getLicenseKeysDownload(
					null, new long[] {1L}));

		Assertions.assertEquals(
			HttpStatus.NOT_FOUND, responseStatusException.getStatusCode());

		Mockito.verify(
			_licenseKeyPermission
		).check(
			Mockito.any(UserAccount.class), Mockito.eq(_ACCOUNT_ID),
			Mockito.eq(ActionKeys.VIEW)
		);

		Mockito.verifyNoInteractions(_licenseKeyExporter);
	}

	@Test
	public void testGetLicenseKeysDownloadThrowsWhenLicenseKeyIsMissing()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		LicenseKey licenseKey = _createLicenseKey(1L);

		Mockito.when(
			_licenseKeyService.getLicenseKeysByIds(
				Mockito.any(), Mockito.any(long[].class))
		).thenReturn(
			Collections.singletonList(licenseKey)
		);

		Assertions.assertThrows(
			NoSuchLicenseKeyException.class,
			() -> licenseKeysRestController.getLicenseKeysDownload(
				null, new long[] {1L, 2L}));

		Mockito.verifyNoInteractions(
			_licenseKeyExporter, _licenseKeyPermission);
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
	public void testGetSubscriptionsReturnsFalseWhenNotSubscribed()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		LicenseKey licenseKey = _createLicenseKey(5L);

		Mockito.when(
			_licenseKeyService.getLicenseKey(Mockito.any(), Mockito.anyLong())
		).thenReturn(
			licenseKey
		);

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

		LicenseKey licenseKey = _createLicenseKey(5L);

		Mockito.when(
			_licenseKeyService.getLicenseKey(Mockito.any(), Mockito.anyLong())
		).thenReturn(
			licenseKey
		);

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
	public void testPatchLicenseKeysActiveChecksAccountPermissionWithoutProject()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		_mockGetLicenseKey(_createLicenseKey(1L));

		licenseKeysRestController.patchLicenseKeysActive(
			null, 1L, "{\"active\": false}");

		Mockito.verify(
			_licenseKeyPermission
		).check(
			_ACCOUNT_ID, ActionKeys.UPDATE, null
		);

		Mockito.verify(
			_licenseKeyService
		).updateLicenseKeyActive(
			false, 1L
		);

		Mockito.verify(
			_environmentActivationPermission
		).checkSelfProvisioning(
			_ACCOUNT_ID, null
		);

		Mockito.verifyNoMoreInteractions(_environmentActivationPermission);
	}

	@Test
	public void testPatchLicenseKeysActiveChecksEnvironmentActivationForProject()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		LicenseKey licenseKey = _createLicenseKey(1L);

		Mockito.when(
			licenseKey.getProjectExternalReferenceCode()
		).thenReturn(
			_PROJECT_ERC
		);

		_mockGetLicenseKey(licenseKey);

		licenseKeysRestController.patchLicenseKeysActive(
			null, 1L, "{\"active\": true}");

		Mockito.verify(
			_environmentActivationPermission
		).checkLicenseKeyActivation(
			null, _PROJECT_ERC
		);

		Mockito.verify(
			_licenseKeyPermission, Mockito.never()
		).check(
			Mockito.anyLong(), Mockito.anyString(), Mockito.any()
		);

		Mockito.verify(
			_licenseKeyService
		).updateLicenseKeyActive(
			true, 1L
		);
	}

	@Test
	public void testPatchLicenseKeysActiveChecksSelfProvisioning()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		_mockGetLicenseKey(_createLicenseKey(1L));

		Mockito.doThrow(
			new PrincipalException()
		).when(
			_environmentActivationPermission
		).checkSelfProvisioning(
			_ACCOUNT_ID, null
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> licenseKeysRestController.patchLicenseKeysActive(
				null, 1L, "{\"active\": false}"));

		Mockito.verify(
			_licenseKeyService, Mockito.never()
		).updateLicenseKeyActive(
			Mockito.anyBoolean(), Mockito.anyLong()
		);
	}

	@Test
	public void testPatchLicenseKeysActiveRejectsLicenseKeyUnderActivationKey()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		LicenseKey licenseKey = _createLicenseKey(1L);

		Mockito.when(
			licenseKey.getActivationKeyId()
		).thenReturn(
			9L
		);

		_mockGetLicenseKey(licenseKey);

		Assertions.assertThrows(
			LicenseKeyEntitlementException.class,
			() -> licenseKeysRestController.patchLicenseKeysActive(
				null, 1L, "{\"active\": true}"));

		_verifyNeverUpdatedLicenseKeyActive();

		Mockito.verifyNoInteractions(
			_environmentActivationPermission, _licenseKeyPermission);
	}

	@Test
	public void testPatchLicenseKeysActiveRejectsMissingActiveFlag()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		_mockGetLicenseKey(_createLicenseKey(1L));

		Assertions.assertThrows(
			LicenseKeyValidationException.class,
			() -> licenseKeysRestController.patchLicenseKeysActive(
				null, 1L, "{\"active\": \"false\"}"));

		_verifyNeverUpdatedLicenseKeyActive();
	}

	@Test
	public void testPatchLicenseKeysActiveThrowsForbiddenWithoutPermission()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		_mockGetLicenseKey(_createLicenseKey(1L));

		Mockito.doThrow(
			new PrincipalException()
		).when(
			_licenseKeyPermission
		).check(
			_ACCOUNT_ID, ActionKeys.UPDATE, null
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> licenseKeysRestController.patchLicenseKeysActive(
				null, 1L, "{\"active\": true}"));

		_verifyNeverUpdatedLicenseKeyActive();
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

		OrderItem orderItem = Mockito.mock(OrderItem.class);

		Mockito.when(
			orderItem.getProductId()
		).thenReturn(
			_C_PRODUCT_ID
		);

		Mockito.when(
			order.getOrderItems()
		).thenReturn(
			new OrderItem[] {orderItem}
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
				_jwt,
				"{\"domains\": \"example.com\", \"orderId\": \"999\", " +
					"\"owner\": \"owner@example.com\"}"));

		Mockito.verify(
			_commerceOrderService
		).completeOrder(
			999L, CommerceOrderConstants.ORDER_PAYMENT_STATUS_NOT_REQUIRED
		);
	}

	@Test
	public void testPostLicenseKeysTypeFreeDomainsCheckPassesWhenDomainIsFree()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		licenseKeysRestController.postLicenseKeysTypeFreeDomainsCheck(
			"{\"domains\": \"example.com\", \"owner\": \"owner@example.com\"}");

		Mockito.verify(
			_licenseKeyService
		).hasValidLicenseKeyTypeFree(
			"example.com", "owner@example.com"
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
	public void testPostLicenseKeysTypeFreeRejectsCallerWithoutOrderPermission()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		Mockito.doThrow(
			new PrincipalException()
		).when(
			_commerceOrderPermission
		).check(
			999L, _jwt
		);

		Assertions.assertThrows(
			PrincipalException.class,
			() -> licenseKeysRestController.postLicenseKeysTypeFree(
				_jwt,
				"{\"domains\": \"example.com\", \"orderId\": \"999\", " +
					"\"owner\": \"owner@example.com\"}"));

		Mockito.verifyNoInteractions(_licenseKeyService);
	}

	@Test
	public void testPostLicenseKeysTypeFreeRejectsOrderWithoutItems()
		throws Exception {

		LicenseKeysRestController licenseKeysRestController =
			_createController();

		Order order = Mockito.mock(Order.class);

		Mockito.when(
			order.getOrderItems()
		).thenReturn(
			new OrderItem[0]
		);

		Mockito.when(
			_commerceOrderService.getCommerceOrder(999L)
		).thenReturn(
			order
		);

		ResponseStatusException responseStatusException =
			Assertions.assertThrows(
				ResponseStatusException.class,
				() -> licenseKeysRestController.postLicenseKeysTypeFree(
					_jwt,
					"{\"domains\": \"example.com\", \"orderId\": \"999\", " +
						"\"owner\": \"owner@example.com\"}"));

		Assertions.assertEquals(
			HttpStatus.BAD_REQUEST, responseStatusException.getStatusCode());

		Mockito.verify(
			_licenseKeyService, Mockito.never()
		).addLicenseKeyTypeFree(
			Mockito.anyLong(), Mockito.anyString(), Mockito.anyString(),
			Mockito.anyString()
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
			licenseKeysRestController, "_commerceOrderPermission",
			_commerceOrderPermission);
		ReflectionTestUtils.setField(
			licenseKeysRestController, "_commerceOrderService",
			_commerceOrderService);

		ReflectionTestUtils.setField(
			licenseKeysRestController, "_environmentActivationPermission",
			_environmentActivationPermission);

		ReflectionTestUtils.setField(
			licenseKeysRestController, "_licenseKeyExporter",
			_licenseKeyExporter);

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
			licenseKeysRestController, "_projectPermission",
			_projectPermission);

		ReflectionTestUtils.setField(
			licenseKeysRestController, "_projectService", _projectService);

		ReflectionTestUtils.setField(
			licenseKeysRestController, "_subscriptionEntryService",
			_subscriptionEntryService);

		ReflectionTestUtils.setField(
			licenseKeysRestController, "_userAccountService",
			userAccountService);

		return licenseKeysRestController;
	}

	private LicenseKey _createLicenseKey(long licenseKeyId) {
		return _createLicenseKeyOnAccount(_ACCOUNT_ID, licenseKeyId);
	}

	private LicenseKey _createLicenseKeyOnAccount(
		long accountEntryId, long licenseKeyId) {

		LicenseKey licenseKey = Mockito.mock(LicenseKey.class);

		Mockito.when(
			licenseKey.getAccountEntryId()
		).thenReturn(
			accountEntryId
		);

		Mockito.when(
			licenseKey.getLicenseKeyId()
		).thenReturn(
			licenseKeyId
		);

		Mockito.when(
			licenseKey.isActive()
		).thenReturn(
			true
		);

		return licenseKey;
	}

	private void _mockGetLicenseKey(LicenseKey licenseKey) throws Exception {
		Mockito.when(
			_licenseKeyService.getLicenseKey(null, licenseKey.getLicenseKeyId())
		).thenReturn(
			licenseKey
		);
	}

	private void _verifyNeverUpdatedLicenseKeyActive() throws Exception {
		Mockito.verify(
			_licenseKeyService, Mockito.never()
		).updateLicenseKeyActive(
			Mockito.anyBoolean(), Mockito.anyLong()
		);
	}

	private static final long _ACCOUNT_ID = 555L;

	private static final long _C_PRODUCT_ID = 35729766L;

	private static final long _OTHER_ACCOUNT_ID = 556L;

	private static final String _PROJECT_ERC = "PROJ-1";

	private static final long _USER_ID = 123L;

	private final CommerceOrderPermission _commerceOrderPermission =
		Mockito.mock(CommerceOrderPermission.class);
	private final CommerceOrderService _commerceOrderService = Mockito.mock(
		CommerceOrderService.class);
	private final EnvironmentActivationPermission
		_environmentActivationPermission = Mockito.mock(
			EnvironmentActivationPermission.class);
	private final Jwt _jwt = Mockito.mock(Jwt.class);
	private final LicenseKeyExporter _licenseKeyExporter = Mockito.mock(
		LicenseKeyExporter.class);
	private final LicenseKeyGenerationService _licenseKeyGenerationService =
		Mockito.mock(LicenseKeyGenerationService.class);
	private final LicenseKeyPermission _licenseKeyPermission = Mockito.mock(
		LicenseKeyPermission.class);
	private final LicenseKeyService _licenseKeyService = Mockito.mock(
		LicenseKeyService.class);
	private final ProjectPermission _projectPermission = Mockito.mock(
		ProjectPermission.class);
	private final ProjectService _projectService = Mockito.mock(
		ProjectService.class);
	private final SubscriptionEntryService _subscriptionEntryService =
		Mockito.mock(SubscriptionEntryService.class);

}
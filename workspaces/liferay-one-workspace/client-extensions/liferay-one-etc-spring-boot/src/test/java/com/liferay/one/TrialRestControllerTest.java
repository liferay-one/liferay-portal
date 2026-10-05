/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.client.extension.util.spring.boot3.client.LiferayOAuth2AccessTokenManager;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.headless.portal.instances.client.dto.v1_0.PortalInstance;
import com.liferay.headless.portal.instances.client.pagination.Page;
import com.liferay.headless.portal.instances.client.problem.Problem;
import com.liferay.headless.portal.instances.client.resource.v1_0.PortalInstanceResource;
import com.liferay.one.constants.CommerceOrderConstants;
import com.liferay.one.service.CommerceOrderService;
import com.liferay.one.service.ConsoleService;
import com.liferay.one.service.NotificationQueueEntryService;
import com.liferay.one.service.NotificationTemplateService;
import com.liferay.one.service.UserAccountService;
import com.liferay.portal.kernel.util.HashMapBuilder;

import java.net.URI;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.json.JSONObject;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.MockedStatic;
import org.mockito.Mockito;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
public class TrialRestControllerTest {

	@BeforeEach
	public void setUp() throws Exception {
		PortalInstanceResource.Builder builder = Mockito.mock(
			PortalInstanceResource.Builder.class, Mockito.RETURNS_SELF);

		Mockito.when(
			builder.build()
		).thenReturn(
			_portalInstanceResource
		);

		_portalInstanceResourceMockedStatic.when(
			PortalInstanceResource::builder
		).thenReturn(
			builder
		);

		Mockito.when(
			_portalInstanceResource.postPortalInstance(
				Mockito.any(PortalInstance.class))
		).thenAnswer(
			invocation -> invocation.getArgument(0)
		);

		_mockPortalInstancesPage(0, Collections.emptyList());

		_trialRestController = new TrialRestController() {

			@Override
			protected String get(String authorization, URI uri) {
				return _trialExtensionRequestJSONObject.toString();
			}

		};

		ReflectionTestUtils.setField(
			_trialRestController, "_commerceOrderService",
			_commerceOrderService);
		ReflectionTestUtils.setField(
			_trialRestController, "_consoleService", _consoleService);
		ReflectionTestUtils.setField(
			_trialRestController, "_consoleTrialCluster", "trial-cluster");
		ReflectionTestUtils.setField(
			_trialRestController, "_consoleTrialProjectPrefix", "trial");
		ReflectionTestUtils.setField(
			_trialRestController, "_consoleTrialProjectUid", "trial-uid");
		ReflectionTestUtils.setField(
			_trialRestController, "_consoleSSACluster", "ssa-cluster");
		ReflectionTestUtils.setField(
			_trialRestController, "_consoleSSAProjectPrefix", "ssa");
		ReflectionTestUtils.setField(
			_trialRestController, "_consoleSSAProjectUid", "ssa-uid");
		ReflectionTestUtils.setField(
			_trialRestController, "_externalSSAHomePageURL",
			"http://localhost:8080");
		ReflectionTestUtils.setField(
			_trialRestController, "_externalTrialHomePageURL",
			"http://localhost:8080");
		ReflectionTestUtils.setField(
			_trialRestController, "_liferayOAuth2AccessTokenManager",
			_liferayOAuth2AccessTokenManager);
		ReflectionTestUtils.setField(
			_trialRestController, "_notificationQueueEntryService",
			_notificationQueueEntryService);
		ReflectionTestUtils.setField(
			_trialRestController, "_notificationTemplateService",
			_notificationTemplateService);
		ReflectionTestUtils.setField(
			_trialRestController, "_trialDXPDomain", _TRIAL_DXP_DOMAIN);
		ReflectionTestUtils.setField(
			_trialRestController, "_trialMaxInstances", _TRIAL_MAX_INSTANCES);
		ReflectionTestUtils.setField(
			_trialRestController, "_trialSSADXPDomain", _TRIAL_SSA_DXP_DOMAIN);
		ReflectionTestUtils.setField(
			_trialRestController, "_userAccountService", _userAccountService);

		Mockito.when(
			_liferayOAuth2AccessTokenManager.getAuthorization(
				Mockito.anyString())
		).thenReturn(
			"Bearer token"
		);

		Mockito.when(
			_notificationTemplateService.getAndProcessTemplateJSONObject(
				Mockito.anyString(), Mockito.anyString(), Mockito.anyMap())
		).thenReturn(
			new JSONObject(
			).put(
				"body", "Body"
			).put(
				"subject", "Subject"
			)
		);

		UserAccount userAccount = new UserAccount();

		userAccount.setFamilyName("Doe");
		userAccount.setGivenName("Jane");

		Mockito.when(
			_userAccountService.getUserAccountByEmailAddress(_EMAIL_ADDRESS)
		).thenReturn(
			userAccount
		);
	}

	@AfterEach
	public void tearDown() {
		_portalInstanceResourceMockedStatic.close();
	}

	@Test
	public void testDeleteTrialDeletesConsoleProjectAndPortalInstance()
		throws Exception {

		_mockOrder(
			HashMapBuilder.put(
				"trial-virtual-host", _VIRTUAL_HOST
			).build(),
			CommerceOrderConstants.ORDER_STATUS_IN_PROGRESS, "SOLUTIONS7");

		_mockPortalInstancesPage(
			2,
			List.of(
				_createPortalInstance("other." + _TRIAL_DXP_DOMAIN),
				_createPortalInstance(_VIRTUAL_HOST)));

		_trialRestController.deleteTrial(_ORDER_ID);

		Mockito.verify(
			_consoleService
		).deleteProject(
			"trial-ext" + _ORDER_ID
		);

		Mockito.verify(
			_portalInstanceResource
		).deletePortalInstance(
			_VIRTUAL_HOST
		);

		Mockito.verify(
			_portalInstanceResource, Mockito.never()
		).deletePortalInstance(
			"other." + _TRIAL_DXP_DOMAIN
		);
	}

	@Test
	public void testDeleteTrialSkipsPortalInstanceWithoutVirtualHost()
		throws Exception {

		_mockOrder(
			CommerceOrderConstants.ORDER_STATUS_IN_PROGRESS, "SOLUTIONS7");

		_trialRestController.deleteTrial(_ORDER_ID);

		Mockito.verify(
			_consoleService
		).deleteProject(
			"trial-ext" + _ORDER_ID
		);

		Mockito.verifyNoInteractions(_portalInstanceResource);
	}

	@Test
	public void testDeleteTrialThrowsWhenOrderDoesNotExist() throws Exception {
		Assertions.assertThrows(
			IllegalArgumentException.class,
			() -> _trialRestController.deleteTrial(_ORDER_ID));

		Mockito.verifyNoInteractions(_consoleService, _portalInstanceResource);
	}

	@Test
	public void testGetAvailabilityRejectsUnsupportedOrderType() {
		Assertions.assertThrows(
			IllegalArgumentException.class,
			() -> _trialRestController.getAvailability("DXP"));
	}

	@Test
	public void testGetAvailabilityReportsInstanceCounts() throws Exception {
		_mockPortalInstancesPage(2, Collections.emptyList());

		JSONObject jsonObject = new JSONObject(
			_trialRestController.getAvailability("SOLUTIONS7"));

		Assertions.assertTrue(jsonObject.getBoolean("active"));
		Assertions.assertEquals(3, jsonObject.getLong("available"));
		Assertions.assertEquals(_TRIAL_MAX_INSTANCES, jsonObject.getInt("max"));

		_mockPortalInstancesPage(_TRIAL_MAX_INSTANCES, Collections.emptyList());

		jsonObject = new JSONObject(
			_trialRestController.getAvailability("SSA_SAAS"));

		Assertions.assertFalse(jsonObject.getBoolean("active"));
		Assertions.assertEquals(0, jsonObject.getLong("available"));
	}

	@Test
	public void testGetDomainAvailabilityReturnsConflictWhenDomainIsTaken()
		throws Exception {

		_mockPortalInstancesPage(
			1, List.of(_createPortalInstance("acme." + _TRIAL_SSA_DXP_DOMAIN)));

		ResponseEntity<Void> responseEntity =
			_trialRestController.getDomainAvailability("acme", "SSA_SAAS");

		Assertions.assertEquals(
			HttpStatus.CONFLICT, responseEntity.getStatusCode());
	}

	@Test
	public void testGetDomainAvailabilityReturnsOKWhenDomainIsFree()
		throws Exception {

		_mockPortalInstancesPage(
			1,
			List.of(_createPortalInstance("other." + _TRIAL_SSA_DXP_DOMAIN)));

		ResponseEntity<Void> responseEntity =
			_trialRestController.getDomainAvailability("acme", "SSA_SAAS");

		Assertions.assertEquals(HttpStatus.OK, responseEntity.getStatusCode());
	}

	@Test
	public void testPostExpireCompletesOrderThenTearsDownTrial()
		throws Exception {

		_mockOrder(
			HashMapBuilder.put(
				"trial-virtual-host", _VIRTUAL_HOST
			).build(),
			CommerceOrderConstants.ORDER_STATUS_IN_PROGRESS, "SOLUTIONS7");

		_mockPortalInstancesPage(
			1, List.of(_createPortalInstance(_VIRTUAL_HOST)));

		_trialRestController.postExpire(_ORDER_ID);

		InOrder inOrder = Mockito.inOrder(
			_commerceOrderService, _consoleService, _portalInstanceResource);

		inOrder.verify(
			_commerceOrderService
		).completeOrder(
			_ORDER_ID, CommerceOrderConstants.ORDER_PAYMENT_STATUS_NOT_REQUIRED
		);

		inOrder.verify(
			_consoleService
		).deleteProject(
			"trial-ext" + _ORDER_ID
		);

		inOrder.verify(
			_portalInstanceResource
		).deletePortalInstance(
			_VIRTUAL_HOST
		);
	}

	@Test
	public void testPostExpireThrowsWhenOrderDoesNotExist() throws Exception {
		Assertions.assertThrows(
			IllegalArgumentException.class,
			() -> _trialRestController.postExpire(_ORDER_ID));

		Mockito.verifyNoInteractions(_consoleService);
	}

	@Test
	public void testPostExtendExtendsTrialEndDateForApprovedRequest()
		throws Exception {

		for (String dueStatus : new String[] {"approved", "autoApproved"}) {
			Mockito.reset(_commerceOrderService);

			_mockOrder(
				HashMapBuilder.put(
					"trial-end-date", "2026-01-01T00:00:00Z"
				).build(),
				CommerceOrderConstants.ORDER_STATUS_IN_PROGRESS, "SOLUTIONS7");

			_trialExtensionRequestJSONObject = _createTrialExtensionRequest(
				dueStatus);

			_trialRestController.postExtend(_TRIAL_EXTENSION_REQUEST_ID);

			ArgumentCaptor<Map<String, ?>> argumentCaptor =
				_mapArgumentCaptor();

			Mockito.verify(
				_commerceOrderService
			).updateOrder(
				argumentCaptor.capture(), Mockito.eq(_ORDER_ID),
				Mockito.eq(CommerceOrderConstants.ORDER_STATUS_IN_PROGRESS)
			);

			Map<String, ?> customFields = argumentCaptor.getValue();

			Assertions.assertEquals(
				"2026-01-08T00:00:00Z", customFields.get("trial-end-date"));
		}
	}

	@Test
	public void testPostExtendSkipsRequestThatIsNotApproved() throws Exception {
		_trialExtensionRequestJSONObject = _createTrialExtensionRequest(
			"denied");

		_trialRestController.postExtend(_TRIAL_EXTENSION_REQUEST_ID);

		Mockito.verifyNoInteractions(_commerceOrderService);
	}

	@Test
	public void testPostExtendThrowsWhenTrialEndDateIsMissing()
		throws Exception {

		_mockOrder(
			CommerceOrderConstants.ORDER_STATUS_IN_PROGRESS, "SOLUTIONS7");

		_trialExtensionRequestJSONObject = _createTrialExtensionRequest(
			"approved");

		Assertions.assertThrows(
			IllegalStateException.class,
			() -> _trialRestController.postExtend(_TRIAL_EXTENSION_REQUEST_ID));

		Mockito.verify(
			_commerceOrderService, Mockito.never()
		).updateOrder(
			Mockito.any(), Mockito.anyLong(), Mockito.anyInt()
		);
	}

	@Test
	public void testPostProvisioningOrder() throws Exception {
		_mockOrder(CommerceOrderConstants.ORDER_STATUS_OPEN, "SOLUTIONS7");

		_trialRestController.postProvisioningOrder(_ORDER_ID);

		InOrder inOrder = Mockito.inOrder(
			_commerceOrderService, _consoleService);

		inOrder.verify(
			_commerceOrderService
		).updateOrder(
			null, _ORDER_ID, CommerceOrderConstants.ORDER_STATUS_PENDING
		);

		inOrder.verify(
			_commerceOrderService
		).updateOrder(
			null, _ORDER_ID, CommerceOrderConstants.ORDER_STATUS_PROCESSING
		);

		inOrder.verify(
			_consoleService
		).setUpProject(
			"trial-cluster", true, "trial-uid", _VIRTUAL_HOST, new String[0],
			_ORDER_ID, "trial-ext" + _ORDER_ID
		);

		ArgumentCaptor<Map<String, ?>> argumentCaptor = _mapArgumentCaptor();

		inOrder.verify(
			_commerceOrderService
		).updateOrder(
			argumentCaptor.capture(), Mockito.eq(_ORDER_ID),
			Mockito.eq(CommerceOrderConstants.ORDER_STATUS_IN_PROGRESS)
		);

		Map<String, ?> customFields = argumentCaptor.getValue();

		Assertions.assertNotNull(customFields.get("trial-end-date"));
		Assertions.assertNotNull(customFields.get("trial-start-date"));
		Assertions.assertEquals(
			_VIRTUAL_HOST, customFields.get("trial-virtual-host"));

		ArgumentCaptor<PortalInstance> portalInstanceArgumentCaptor =
			ArgumentCaptor.forClass(PortalInstance.class);

		Mockito.verify(
			_portalInstanceResource
		).postPortalInstance(
			portalInstanceArgumentCaptor.capture()
		);

		PortalInstance portalInstance = portalInstanceArgumentCaptor.getValue();

		Assertions.assertEquals(
			_EMAIL_ADDRESS,
			portalInstance.getAdmin(
			).getEmailAddress());
		Assertions.assertEquals(_VIRTUAL_HOST, portalInstance.getVirtualHost());

		Mockito.verify(
			_notificationQueueEntryService, Mockito.times(2)
		).addNotificationQueueEntry(
			Mockito.anyString(), Mockito.anyString(),
			Mockito.eq(_EMAIL_ADDRESS), Mockito.eq("Subject"),
			Mockito.eq("Body")
		);
	}

	@Test
	public void testPostProvisioningOrderCancelsOrderWhenPortalInstanceCreationFails()
		throws Exception {

		_mockOrder(CommerceOrderConstants.ORDER_STATUS_OPEN, "SOLUTIONS7");

		Problem problem = new Problem();

		problem.setStatus("INTERNAL_SERVER_ERROR");

		Mockito.when(
			_portalInstanceResource.postPortalInstance(
				Mockito.any(PortalInstance.class))
		).thenThrow(
			new Problem.ProblemException(problem)
		);

		Assertions.assertThrows(
			Problem.ProblemException.class,
			() -> _trialRestController.postProvisioningOrder(_ORDER_ID));

		Mockito.verify(
			_commerceOrderService
		).updateOrder(
			null, _ORDER_ID, CommerceOrderConstants.ORDER_STATUS_CANCELLED
		);

		Mockito.verify(
			_commerceOrderService, Mockito.never()
		).updateOrder(
			Mockito.anyMap(), Mockito.anyLong(),
			Mockito.eq(CommerceOrderConstants.ORDER_STATUS_IN_PROGRESS)
		);

		Mockito.verifyNoInteractions(_consoleService);
	}

	@Test
	public void testPostProvisioningOrderHoldsOrderAtMaxCapacity()
		throws Exception {

		_mockOrder(CommerceOrderConstants.ORDER_STATUS_OPEN, "SOLUTIONS7");

		_mockPortalInstancesPage(_TRIAL_MAX_INSTANCES, Collections.emptyList());

		_trialRestController.postProvisioningOrder(_ORDER_ID);

		Mockito.verify(
			_commerceOrderService
		).updateOrder(
			null, _ORDER_ID, CommerceOrderConstants.ORDER_STATUS_ON_HOLD
		);

		Mockito.verify(
			_commerceOrderService, Mockito.never()
		).updateOrder(
			null, _ORDER_ID, CommerceOrderConstants.ORDER_STATUS_PROCESSING
		);

		Mockito.verify(
			_portalInstanceResource, Mockito.never()
		).postPortalInstance(
			Mockito.any()
		);

		Mockito.verifyNoInteractions(
			_consoleService, _notificationQueueEntryService);
	}

	@Test
	public void testPostProvisioningOrderRejectsUnsupportedOrderType()
		throws Exception {

		_mockOrder(CommerceOrderConstants.ORDER_STATUS_OPEN, "DXP");

		Assertions.assertThrows(
			IllegalArgumentException.class,
			() -> _trialRestController.postProvisioningOrder(_ORDER_ID));

		Mockito.verify(
			_commerceOrderService, Mockito.never()
		).updateOrder(
			Mockito.any(), Mockito.anyLong(), Mockito.anyInt()
		);

		Mockito.verifyNoInteractions(_portalInstanceResource);
	}

	@Test
	public void testPostProvisioningOrderResumesOnHoldOrderWithoutPending()
		throws Exception {

		_mockOrder(CommerceOrderConstants.ORDER_STATUS_ON_HOLD, "SOLUTIONS7");

		_trialRestController.postProvisioningOrder(_ORDER_ID);

		Mockito.verify(
			_commerceOrderService, Mockito.never()
		).updateOrder(
			null, _ORDER_ID, CommerceOrderConstants.ORDER_STATUS_PENDING
		);

		Mockito.verify(
			_commerceOrderService
		).updateOrder(
			null, _ORDER_ID, CommerceOrderConstants.ORDER_STATUS_PROCESSING
		);
	}

	@Test
	public void testPostProvisioningOrderRollsBackWhenProjectSetUpFails()
		throws Exception {

		_mockOrder(CommerceOrderConstants.ORDER_STATUS_OPEN, "SOLUTIONS7");

		Mockito.doThrow(
			new IllegalStateException("Console is unavailable")
		).when(
			_consoleService
		).setUpProject(
			Mockito.anyString(), Mockito.anyBoolean(), Mockito.anyString(),
			Mockito.anyString(), Mockito.any(), Mockito.anyLong(),
			Mockito.anyString()
		);

		PortalInstance portalInstance = new PortalInstance();

		portalInstance.setPortalInstanceId(_VIRTUAL_HOST);
		portalInstance.setVirtualHost(_VIRTUAL_HOST);

		_mockPortalInstancesPage(1, List.of(portalInstance));

		_trialRestController.postProvisioningOrder(_ORDER_ID);

		Mockito.verify(
			_consoleService
		).deleteProject(
			"trial-ext" + _ORDER_ID
		);

		Mockito.verify(
			_portalInstanceResource
		).deletePortalInstance(
			_VIRTUAL_HOST
		);

		ArgumentCaptor<Map<String, ?>> argumentCaptor = _mapArgumentCaptor();

		Mockito.verify(
			_commerceOrderService
		).updateOrder(
			argumentCaptor.capture(), Mockito.eq(_ORDER_ID),
			Mockito.eq(CommerceOrderConstants.ORDER_STATUS_CANCELLED)
		);

		Map<String, ?> customFields = argumentCaptor.getValue();

		Assertions.assertEquals(
			"Console is unavailable", customFields.get("trial-error"));
		Assertions.assertEquals(
			_VIRTUAL_HOST, customFields.get("trial-virtual-host"));

		Mockito.verify(
			_commerceOrderService, Mockito.never()
		).updateOrder(
			Mockito.anyMap(), Mockito.anyLong(),
			Mockito.eq(CommerceOrderConstants.ORDER_STATUS_IN_PROGRESS)
		);
	}

	@Test
	public void testPostProvisioningOrderThrowsWhenOrderDoesNotExist()
		throws Exception {

		Assertions.assertThrows(
			IllegalArgumentException.class,
			() -> _trialRestController.postProvisioningOrder(_ORDER_ID));

		Mockito.verify(
			_commerceOrderService, Mockito.never()
		).updateOrder(
			Mockito.any(), Mockito.anyLong(), Mockito.anyInt()
		);
	}

	private PortalInstance _createPortalInstance(String virtualHost) {
		PortalInstance portalInstance = new PortalInstance();

		portalInstance.setPortalInstanceId(virtualHost);
		portalInstance.setVirtualHost(virtualHost);

		return portalInstance;
	}

	private JSONObject _createTrialExtensionRequest(String dueStatus) {
		return new JSONObject(
		).put(
			"dueStatus",
			new JSONObject(
			).put(
				"key", dueStatus
			)
		).put(
			"duration", 7
		).put(
			"r_orderToTrialExtensionRequest_commerceOrderId", _ORDER_ID
		);
	}

	@SuppressWarnings("unchecked")
	private ArgumentCaptor<Map<String, ?>> _mapArgumentCaptor() {
		return ArgumentCaptor.forClass(
			(Class<Map<String, ?>>)(Class<?>)Map.class);
	}

	private void _mockOrder(
			int orderStatus, String orderTypeExternalReferenceCode)
		throws Exception {

		_mockOrder(
			new HashMap<>(), orderStatus, orderTypeExternalReferenceCode);
	}

	private void _mockOrder(
			Map<String, String> customFields, int orderStatus,
			String orderTypeExternalReferenceCode)
		throws Exception {

		Order order = new Order();

		order.setCreatorEmailAddress(_EMAIL_ADDRESS);
		order.setCustomFields(customFields);

		order.setId(_ORDER_ID);
		order.setOrderStatus(orderStatus);
		order.setOrderTypeExternalReferenceCode(orderTypeExternalReferenceCode);

		Mockito.when(
			_commerceOrderService.fetchCommerceOrder(_ORDER_ID)
		).thenReturn(
			order
		);
	}

	private void _mockPortalInstancesPage(
			long totalCount, List<PortalInstance> portalInstances)
		throws Exception {

		Page<PortalInstance> page = new Page<>();

		page.setItems(portalInstances);
		page.setTotalCount(totalCount);

		Mockito.when(
			_portalInstanceResource.getPortalInstancesPage(true)
		).thenReturn(
			page
		);
	}

	private static final String _EMAIL_ADDRESS = "jane.doe@example.com";

	private static final long _ORDER_ID = 1000L;

	private static final String _TRIAL_DXP_DOMAIN = "trial.liferay.example";

	private static final long _TRIAL_EXTENSION_REQUEST_ID = 4000L;

	private static final int _TRIAL_MAX_INSTANCES = 5;

	private static final String _TRIAL_SSA_DXP_DOMAIN = "ssa.liferay.example";

	private static final String _VIRTUAL_HOST =
		_ORDER_ID + "." + _TRIAL_DXP_DOMAIN;

	private final CommerceOrderService _commerceOrderService = Mockito.mock(
		CommerceOrderService.class);
	private final ConsoleService _consoleService = Mockito.mock(
		ConsoleService.class);
	private final LiferayOAuth2AccessTokenManager
		_liferayOAuth2AccessTokenManager = Mockito.mock(
			LiferayOAuth2AccessTokenManager.class);
	private final NotificationQueueEntryService _notificationQueueEntryService =
		Mockito.mock(NotificationQueueEntryService.class);
	private final NotificationTemplateService _notificationTemplateService =
		Mockito.mock(NotificationTemplateService.class);
	private final PortalInstanceResource _portalInstanceResource = Mockito.mock(
		PortalInstanceResource.class);
	private final MockedStatic<PortalInstanceResource>
		_portalInstanceResourceMockedStatic = Mockito.mockStatic(
			PortalInstanceResource.class);
	private JSONObject _trialExtensionRequestJSONObject;
	private TrialRestController _trialRestController;
	private final UserAccountService _userAccountService = Mockito.mock(
		UserAccountService.class);

}
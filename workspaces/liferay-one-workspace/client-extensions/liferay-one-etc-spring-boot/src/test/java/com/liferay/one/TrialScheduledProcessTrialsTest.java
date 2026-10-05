/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.one.constants.CommerceOrderConstants;
import com.liferay.one.service.CommerceOrderService;
import com.liferay.one.service.NotificationQueueEntryService;
import com.liferay.one.service.NotificationTemplateService;
import com.liferay.one.service.UserAccountService;
import com.liferay.portal.kernel.util.HashMapBuilder;

import java.time.ZonedDateTime;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
@DisplayName(
	"[CRON-SCHEDULEDPROCESSTRIALS] TrialRestController#scheduledProcessTrials"
)
public class TrialScheduledProcessTrialsTest {

	@BeforeEach
	public void setUp() throws Exception {
		_commerceOrderService = Mockito.mock(CommerceOrderService.class);
		_notificationQueueEntryService = Mockito.mock(
			NotificationQueueEntryService.class);
		_notificationTemplateService = Mockito.mock(
			NotificationTemplateService.class);
		_userAccountService = Mockito.mock(UserAccountService.class);

		_trialRestController = Mockito.spy(new TrialRestController());

		ReflectionTestUtils.setField(
			_trialRestController, "_commerceOrderService",
			_commerceOrderService);
		ReflectionTestUtils.setField(
			_trialRestController, "_notificationQueueEntryService",
			_notificationQueueEntryService);
		ReflectionTestUtils.setField(
			_trialRestController, "_notificationTemplateService",
			_notificationTemplateService);
		ReflectionTestUtils.setField(
			_trialRestController, "_userAccountService", _userAccountService);

		Mockito.when(
			_notificationTemplateService.getAndProcessTemplateJSONObject(
				ArgumentMatchers.anyString(), ArgumentMatchers.anyString(),
				ArgumentMatchers.anyMap())
		).thenReturn(
			new JSONObject(
			).put(
				"body", "Body"
			).put(
				"subject", "Subject"
			)
		);

		UserAccount userAccount = new UserAccount();

		userAccount.setGivenName("Jane");

		Mockito.when(
			_userAccountService.getUserAccountByEmailAddress(
				_CREATOR_EMAIL_ADDRESS)
		).thenReturn(
			userAccount
		);

		Mockito.doNothing(
		).when(
			_trialRestController
		).postExpire(
			ArgumentMatchers.anyLong()
		);

		Mockito.doNothing(
		).when(
			_trialRestController
		).postProvisioningOrder(
			ArgumentMatchers.anyLong()
		);

		_mockAvailability(true, 1);
		_mockInProgressOrders();
		_mockOnHoldOrders();
	}

	@Test
	public void testScheduledProcessTrialsContinuesAfterInProgressPhaseFailure()
		throws Exception {

		Mockito.when(
			_commerceOrderService.getOrders(
				ArgumentMatchers.contains(_IN_PROGRESS_FILTER))
		).thenThrow(
			new RuntimeException("Unable to get orders")
		);

		_mockOnHoldOrders(_createOrder(1L, null));

		_trialRestController.scheduledProcessTrials();

		Mockito.verify(
			_trialRestController
		).postProvisioningOrder(
			1L
		);
	}

	@Test
	public void testScheduledProcessTrialsContinuesAfterOnHoldOrderFailure()
		throws Exception {

		_mockOnHoldOrders(_createOrder(1L, null), _createOrder(2L, null));

		Mockito.doThrow(
			new RuntimeException("Unable to provision")
		).when(
			_trialRestController
		).postProvisioningOrder(
			1L
		);

		_trialRestController.scheduledProcessTrials();

		Mockito.verify(
			_trialRestController
		).postProvisioningOrder(
			2L
		);
	}

	@Test
	public void testScheduledProcessTrialsContinuesAfterOnHoldPhaseFailure()
		throws Exception {

		_mockInProgressOrders(
			_createOrder(
				1L,
				HashMapBuilder.put(
					"trial-end-date",
					_toString(
						ZonedDateTime.now(
						).minusDays(
							1
						))
				).build()));

		Mockito.when(
			_commerceOrderService.getOrders(
				ArgumentMatchers.contains(_ON_HOLD_FILTER))
		).thenThrow(
			new RuntimeException("Unable to get orders")
		);

		_trialRestController.scheduledProcessTrials();

		Mockito.verify(
			_trialRestController
		).postExpire(
			1L
		);
	}

	@Test
	public void testScheduledProcessTrialsDoesNotNotifyTwiceOnRerun()
		throws Exception {

		Order order = _createOrder(
			1L,
			HashMapBuilder.put(
				"trial-end-date",
				_toString(
					ZonedDateTime.now(
					).plusHours(
						12
					))
			).build());

		Mockito.when(
			_commerceOrderService.getOrders(
				ArgumentMatchers.contains(_IN_PROGRESS_FILTER))
		).thenAnswer(
			invocation -> List.of(_copyOrder(order))
		);

		Mockito.when(
			_commerceOrderService.fetchCommerceOrder(1L)
		).thenAnswer(
			invocation -> _copyOrder(order)
		);

		Mockito.doAnswer(
			invocation -> {
				order.setCustomFields(new HashMap<>(invocation.getArgument(0)));

				return null;
			}
		).when(
			_commerceOrderService
		).updateOrder(
			ArgumentMatchers.anyMap(), ArgumentMatchers.eq(1L),
			ArgumentMatchers.anyInt()
		);

		_trialRestController.scheduledProcessTrials();
		_trialRestController.scheduledProcessTrials();

		_verifyNotification(1);

		Mockito.verify(
			_commerceOrderService
		).fetchCommerceOrder(
			1L
		);
	}

	@Test
	public void testScheduledProcessTrialsExpiresEndedTrials()
		throws Exception {

		_mockInProgressOrders(
			_createOrder(
				1L,
				HashMapBuilder.put(
					"trial-end-date",
					_toString(
						ZonedDateTime.now(
						).minusDays(
							1
						))
				).build()),
			_createOrder(
				2L,
				HashMapBuilder.put(
					"trial-end-date",
					_toString(
						ZonedDateTime.now(
						).plusDays(
							10
						))
				).build()));

		_trialRestController.scheduledProcessTrials();

		Mockito.verify(
			_trialRestController
		).postExpire(
			1L
		);

		Mockito.verify(
			_trialRestController, Mockito.never()
		).postExpire(
			2L
		);

		Mockito.verify(
			_commerceOrderService, Mockito.never()
		).fetchCommerceOrder(
			ArgumentMatchers.anyLong()
		);
	}

	@Test
	public void testScheduledProcessTrialsNotifiesTrialsEndingWithinOneDay()
		throws Exception {

		Order order = _createOrder(
			1L,
			HashMapBuilder.put(
				"trial-end-date",
				_toString(
					ZonedDateTime.now(
					).plusHours(
						12
					))
			).build());

		_mockInProgressOrders(
			order,
			_createOrder(
				2L,
				HashMapBuilder.put(
					"trial-end-date",
					_toString(
						ZonedDateTime.now(
						).plusHours(
							12
						))
				).put(
					"trial-notify-end-date",
					_toString(
						ZonedDateTime.now(
						).minusHours(
							1
						))
				).build()));

		Mockito.when(
			_commerceOrderService.fetchCommerceOrder(1L)
		).thenReturn(
			_copyOrder(order)
		);

		_trialRestController.scheduledProcessTrials();

		ArgumentCaptor<Map<String, String>> argumentCaptor =
			ArgumentCaptor.forClass(Map.class);

		Mockito.verify(
			_notificationTemplateService
		).getAndProcessTemplateJSONObject(
			ArgumentMatchers.eq("TRIAL-EXPIRING-ORDER"),
			ArgumentMatchers.eq("en_US"), argumentCaptor.capture()
		);

		Map<String, String> placeholders = argumentCaptor.getValue();

		Assertions.assertEquals(
			"Jane", placeholders.get("TRIAL_CREATOR_FIRST_NAME"));

		_verifyNotification(1);

		ArgumentCaptor<Map<String, ?>> customFieldsArgumentCaptor =
			ArgumentCaptor.forClass(Map.class);

		Mockito.verify(
			_commerceOrderService
		).updateOrder(
			customFieldsArgumentCaptor.capture(), ArgumentMatchers.eq(1L),
			ArgumentMatchers.eq(CommerceOrderConstants.ORDER_STATUS_IN_PROGRESS)
		);

		Map<String, ?> customFields = customFieldsArgumentCaptor.getValue();

		Assertions.assertTrue(
			customFields.containsKey("trial-notify-end-date"));

		Mockito.verify(
			_commerceOrderService, Mockito.never()
		).fetchCommerceOrder(
			2L
		);

		Mockito.verify(
			_commerceOrderService, Mockito.never()
		).updateOrder(
			ArgumentMatchers.anyMap(), ArgumentMatchers.eq(2L),
			ArgumentMatchers.anyInt()
		);

		Mockito.verify(
			_trialRestController, Mockito.never()
		).postExpire(
			ArgumentMatchers.anyLong()
		);
	}

	@Test
	public void testScheduledProcessTrialsProvisionsOnHoldTrialsWhileSeatsAreFree()
		throws Exception {

		_mockOnHoldOrders(_createOrder(1L, null), _createOrder(2L, null));

		_trialRestController.scheduledProcessTrials();

		Mockito.verify(
			_trialRestController
		).postProvisioningOrder(
			1L
		);

		Mockito.verify(
			_trialRestController, Mockito.never()
		).postProvisioningOrder(
			2L
		);
	}

	@Test
	public void testScheduledProcessTrialsSkipsInProgressTrialsWithoutEndDate()
		throws Exception {

		_mockInProgressOrders(
			_createOrder(1L, null),
			_createOrder(
				2L,
				HashMapBuilder.put(
					"trial-end-date", ""
				).build()));

		_trialRestController.scheduledProcessTrials();

		Mockito.verify(
			_trialRestController, Mockito.never()
		).postExpire(
			ArgumentMatchers.anyLong()
		);

		Mockito.verify(
			_commerceOrderService, Mockito.never()
		).fetchCommerceOrder(
			ArgumentMatchers.anyLong()
		);
	}

	@Test
	public void testScheduledProcessTrialsSkipsOnHoldTrialsWithoutSeats()
		throws Exception {

		_mockAvailability(false, 0);
		_mockOnHoldOrders(_createOrder(1L, null));

		_trialRestController.scheduledProcessTrials();

		_mockAvailability(true, 0);

		_trialRestController.scheduledProcessTrials();

		Mockito.verify(
			_trialRestController, Mockito.never()
		).postProvisioningOrder(
			ArgumentMatchers.anyLong()
		);
	}

	private Order _copyOrder(Order order) {
		return _createOrder(
			order.getId(), (Map<String, String>)order.getCustomFields());
	}

	private Order _createOrder(long orderId, Map<String, String> customFields) {
		Order order = new Order();

		order.setCreatorEmailAddress(_CREATOR_EMAIL_ADDRESS);
		order.setCustomFields(
			(customFields == null) ? null : new HashMap<>(customFields));
		order.setId(orderId);
		order.setOrderStatus(CommerceOrderConstants.ORDER_STATUS_IN_PROGRESS);

		return order;
	}

	private void _mockAvailability(boolean active, long available)
		throws Exception {

		Mockito.doReturn(
			new JSONObject(
			).put(
				"active", active
			).put(
				"available", available
			).toString()
		).when(
			_trialRestController
		).getAvailability(
			"SOLUTIONS7"
		);
	}

	private void _mockInProgressOrders(Order... orders) throws Exception {
		Mockito.when(
			_commerceOrderService.getOrders(
				ArgumentMatchers.contains(_IN_PROGRESS_FILTER))
		).thenReturn(
			List.of(orders)
		);
	}

	private void _mockOnHoldOrders(Order... orders) throws Exception {
		Mockito.when(
			_commerceOrderService.getOrders(
				ArgumentMatchers.contains(_ON_HOLD_FILTER))
		).thenReturn(
			List.of(orders)
		);
	}

	private String _toString(ZonedDateTime zonedDateTime) {
		return zonedDateTime.toString();
	}

	private void _verifyNotification(int times) throws Exception {
		Mockito.verify(
			_notificationQueueEntryService, Mockito.times(times)
		).addNotificationQueueEntry(
			"customer-service@liferay.com", "Liferay Support",
			_CREATOR_EMAIL_ADDRESS, "Subject", "Body"
		);
	}

	private static final String _CREATOR_EMAIL_ADDRESS = "trial@liferay.com";

	private static final String _IN_PROGRESS_FILTER =
		"orderTypeExternalReferenceCode in ('SSA_SAAS', 'SOLUTIONS7')";

	private static final String _ON_HOLD_FILTER =
		"orderTypeExternalReferenceCode eq 'SOLUTIONS7'";

	private CommerceOrderService _commerceOrderService;
	private NotificationQueueEntryService _notificationQueueEntryService;
	private NotificationTemplateService _notificationTemplateService;
	private TrialRestController _trialRestController;
	private UserAccountService _userAccountService;

}
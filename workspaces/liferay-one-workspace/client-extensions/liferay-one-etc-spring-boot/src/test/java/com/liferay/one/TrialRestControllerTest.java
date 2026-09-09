/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one;

import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.one.constants.CommerceOrderConstants;
import com.liferay.one.constants.TrialConstants;
import com.liferay.one.service.CommerceOrderService;

import java.time.Duration;
import java.time.ZonedDateTime;

import java.util.Map;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
public class TrialRestControllerTest {

	@BeforeEach
	public void setUp() throws Exception {
		_trialRestController = new TrialRestController();

		_commerceOrderService = Mockito.mock(CommerceOrderService.class);

		ReflectionTestUtils.setField(
			_trialRestController, "_commerceOrderService",
			_commerceOrderService);
	}

	@Test
	public void testPostSelfServiceTrialsOrderHonorsTheOrderDuration()
		throws Exception {

		_mockOrder(
			Map.of("trial-settings", "{\"duration\": 30}"),
			TrialConstants.ORDER_TYPE_EXTERNAL_REFERENCE_CODE_DSR_TRIAL);

		_trialRestController.postSelfServiceTrialsOrder(_ORDER_ID);

		Assertions.assertEquals(30, _getTrialDurationDays());
	}

	@Test
	public void testPostSelfServiceTrialsOrderLastsNinetyDays()
		throws Exception {

		for (String orderTypeExternalReferenceCode :
				new String[] {
					TrialConstants.ORDER_TYPE_EXTERNAL_REFERENCE_CODE_CMP_TRIAL,
					TrialConstants.ORDER_TYPE_EXTERNAL_REFERENCE_CODE_DSR_TRIAL
				}) {

			_mockOrder(null, orderTypeExternalReferenceCode);

			_trialRestController.postSelfServiceTrialsOrder(_ORDER_ID);

			Assertions.assertEquals(90, _getTrialDurationDays());
		}
	}

	@Test
	public void testPostSelfServiceTrialsOrderStartsTheOrder()
		throws Exception {

		_mockOrder(
			null, TrialConstants.ORDER_TYPE_EXTERNAL_REFERENCE_CODE_CMP_TRIAL);

		_trialRestController.postSelfServiceTrialsOrder(_ORDER_ID);

		Mockito.verify(
			_commerceOrderService
		).updateOrder(
			ArgumentMatchers.anyMap(), ArgumentMatchers.eq(_ORDER_ID),
			ArgumentMatchers.eq(CommerceOrderConstants.ORDER_STATUS_IN_PROGRESS)
		);
	}

	@Test
	public void testPostSelfServiceTrialsOrderWithMissingOrder() {
		Assertions.assertThrows(
			IllegalArgumentException.class,
			() -> _trialRestController.postSelfServiceTrialsOrder(_ORDER_ID));
	}

	@Test
	public void testPostSelfServiceTrialsOrderWithUnsupportedOrderType()
		throws Exception {

		_mockOrder(null, "SOLUTIONS7");

		Assertions.assertThrows(
			IllegalArgumentException.class,
			() -> _trialRestController.postSelfServiceTrialsOrder(_ORDER_ID));

		Mockito.verify(
			_commerceOrderService, Mockito.never()
		).updateOrder(
			ArgumentMatchers.anyMap(), ArgumentMatchers.anyLong(),
			ArgumentMatchers.anyInt()
		);
	}

	private long _getTrialDurationDays() throws Exception {
		ArgumentCaptor<Map<String, String>> argumentCaptor =
			ArgumentCaptor.forClass(Map.class);

		Mockito.verify(
			_commerceOrderService, Mockito.atLeastOnce()
		).updateOrder(
			argumentCaptor.capture(), ArgumentMatchers.eq(_ORDER_ID),
			ArgumentMatchers.anyInt()
		);

		Map<String, String> customFields = argumentCaptor.getValue();

		Duration duration = Duration.between(
			ZonedDateTime.parse(customFields.get("trial-start-date")),
			ZonedDateTime.parse(customFields.get("trial-end-date")));

		return duration.toDays();
	}

	private void _mockOrder(
			Map<String, String> customFields,
			String orderTypeExternalReferenceCode)
		throws Exception {

		Order order = new Order();

		order.setCustomFields(customFields);
		order.setOrderTypeExternalReferenceCode(orderTypeExternalReferenceCode);

		Mockito.when(
			_commerceOrderService.fetchCommerceOrder(_ORDER_ID)
		).thenReturn(
			order
		);
	}

	private static final long _ORDER_ID = 4321L;

	private CommerceOrderService _commerceOrderService;
	private TrialRestController _trialRestController;

}
/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.custom.field.CustomField;
import com.liferay.headless.admin.user.client.custom.field.CustomValue;
import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.one.license.LicenseKeyType;
import com.liferay.one.license.LicenseKeyTypeService;
import com.liferay.one.model.Entitlement;
import com.liferay.portal.kernel.util.HashMapBuilder;

import java.util.Collections;
import java.util.Map;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Pedro Oliveira
 */
public class LicenseKeyGenerateFormServiceTest {

	@Test
	public void testGetKeyTypesKeepsASpentKeyType() {
		LicenseKeyTypeService licenseKeyTypeService = Mockito.mock(
			LicenseKeyTypeService.class);

		Mockito.when(
			licenseKeyTypeService.getLicenseKeyTypes("PRDCT-DXP")
		).thenReturn(
			Collections.singletonList(LicenseKeyType.PRODUCTION)
		);

		LicenseKeyGenerateFormService licenseKeyGenerateFormService =
			new LicenseKeyGenerateFormService();

		ReflectionTestUtils.setField(
			licenseKeyGenerateFormService, "_licenseKeyTypeService",
			licenseKeyTypeService);

		Entitlement entitlement = _toEntitlement(5.0);

		Map<String, Map<String, Entitlement>> licenseKeyTypeEntitlements =
			HashMapBuilder.<String, Map<String, Entitlement>>put(
				"DXP",
				(Map<String, Entitlement>)HashMapBuilder.put(
					"production", entitlement
				).build()
			).build();

		JSONArray jsonArray = ReflectionTestUtils.invokeMethod(
			licenseKeyGenerateFormService, "_getKeyTypesJSONArray", false, true,
			"PRDCT-DXP", false, false, "DXP",
			HashMapBuilder.put(
				entitlement.getEntitlementId(), 5
			).build(),
			licenseKeyTypeEntitlements, Collections.emptyList());

		Assertions.assertEquals(1, jsonArray.length());

		JSONObject jsonObject = jsonArray.getJSONObject(0);

		Assertions.assertEquals("production", jsonObject.getString("key"));

		JSONArray subscriptionsJSONArray = jsonObject.getJSONArray(
			"subscriptions");

		JSONObject subscriptionJSONObject =
			subscriptionsJSONArray.getJSONObject(0);

		Assertions.assertEquals(
			0, subscriptionJSONObject.getInt("availableCount"));
		Assertions.assertEquals(5, subscriptionJSONObject.getInt("totalCount"));
	}

	@Test
	public void testGetKeyTypesOffersComplimentaryWhenTheProjectHasNone() {
		JSONArray jsonArray = _getComplimentaryKeyTypesJSONArray(true, false);

		Assertions.assertEquals(1, jsonArray.length());

		JSONObject subscriptionJSONObject = jsonArray.getJSONObject(
			0
		).getJSONArray(
			"subscriptions"
		).getJSONObject(
			0
		);

		Assertions.assertEquals(
			1, subscriptionJSONObject.getInt("availableCount"));
		Assertions.assertEquals(1, subscriptionJSONObject.getInt("totalCount"));
	}

	@Test
	public void testGetKeyTypesSkipsComplimentaryWhenNotAllowed() {
		JSONArray jsonArray = _getComplimentaryKeyTypesJSONArray(false, false);

		Assertions.assertEquals(0, jsonArray.length());
	}

	@Test
	public void testGetKeyTypesSpendsComplimentaryWhileTheProjectHasOne() {
		JSONArray jsonArray = _getComplimentaryKeyTypesJSONArray(true, true);

		Assertions.assertEquals(1, jsonArray.length());

		JSONObject jsonObject = jsonArray.getJSONObject(0);

		Assertions.assertEquals("complimentary", jsonObject.getString("key"));

		JSONObject subscriptionJSONObject = jsonObject.getJSONArray(
			"subscriptions"
		).getJSONObject(
			0
		);

		Assertions.assertEquals(
			0, subscriptionJSONObject.getInt("availableCount"));
		Assertions.assertEquals(1, subscriptionJSONObject.getInt("totalCount"));
	}

	@Test
	public void testGetTotalCountRoundsDown() {
		Assertions.assertEquals(
			3,
			LicenseKeyGenerateFormService.getTotalCount(_toEntitlement(3.7)));
	}

	@Test
	public void testGetTotalCountWithoutMaxQuantity() {
		Assertions.assertEquals(
			0,
			LicenseKeyGenerateFormService.getTotalCount(_toEntitlement(null)));
	}

	@Test
	public void testIsAllowComplimentary() throws Exception {
		AccountService accountService = Mockito.mock(AccountService.class);

		Account allowedAccount = new Account();

		allowedAccount.setCustomFields(
			() -> new CustomField[] {
				_toCustomField("allowComplimentary", true)
			});

		Mockito.when(
			accountService.getAccount(1L)
		).thenReturn(
			allowedAccount
		);

		Mockito.when(
			accountService.getAccount(2L)
		).thenReturn(
			new Account()
		);

		LicenseKeyGenerateFormService licenseKeyGenerateFormService =
			new LicenseKeyGenerateFormService();

		ReflectionTestUtils.setField(
			licenseKeyGenerateFormService, "_accountService", accountService);

		Assertions.assertTrue(
			licenseKeyGenerateFormService.isAllowComplimentary(1L));
		Assertions.assertFalse(
			licenseKeyGenerateFormService.isAllowComplimentary(2L));
	}

	@Test
	public void testToComparableVersionWithBlankProductVersion() {
		Assertions.assertEquals(
			"", LicenseKeyGenerateFormService.toComparableVersion(null));
		Assertions.assertEquals(
			"", LicenseKeyGenerateFormService.toComparableVersion(""));
	}

	@Test
	public void testToComparableVersionWithLongTermSupport() {
		Assertions.assertEquals(
			"2026.Q1",
			LicenseKeyGenerateFormService.toComparableVersion(
				"DXP 2026.Q1 LTS"));
	}

	@Test
	public void testToComparableVersionWithoutFamily() {
		Assertions.assertEquals(
			"7.4", LicenseKeyGenerateFormService.toComparableVersion("7.4"));
	}

	@Test
	public void testToComparableVersionWithoutNumber() {
		Assertions.assertEquals(
			"DXP Latest",
			LicenseKeyGenerateFormService.toComparableVersion("DXP Latest"));
	}

	@Test
	public void testToComparableVersionWithProductFamily() {
		Assertions.assertEquals(
			"7.4",
			LicenseKeyGenerateFormService.toComparableVersion("DXP 7.4"));
	}

	private JSONArray _getComplimentaryKeyTypesJSONArray(
		boolean allowComplimentary, boolean hasComplimentaryActivationKey) {

		LicenseKeyTypeService licenseKeyTypeService = Mockito.mock(
			LicenseKeyTypeService.class);

		Mockito.when(
			licenseKeyTypeService.getLicenseKeyTypes("PRDCT-DXP")
		).thenReturn(
			Collections.singletonList(LicenseKeyType.COMPLIMENTARY)
		);

		LicenseKeyGenerateFormService licenseKeyGenerateFormService =
			new LicenseKeyGenerateFormService();

		ReflectionTestUtils.setField(
			licenseKeyGenerateFormService, "_licenseKeyTypeService",
			licenseKeyTypeService);

		return ReflectionTestUtils.invokeMethod(
			licenseKeyGenerateFormService, "_getKeyTypesJSONArray", false,
			allowComplimentary, "PRDCT-DXP", hasComplimentaryActivationKey,
			false, "DXP", Collections.emptyMap(),
			HashMapBuilder.<String, Map<String, Entitlement>>put(
				"DXP",
				(Map<String, Entitlement>)HashMapBuilder.put(
					"complimentary", _toEntitlement(1.0)
				).build()
			).build(),
			Collections.emptyList());
	}

	private CustomField _toCustomField(String name, Object data) {
		CustomField customField = new CustomField();

		customField.setName(() -> name);

		CustomValue customValue = new CustomValue();

		customValue.setData(() -> data);

		customField.setCustomValue(() -> customValue);

		return customField;
	}

	private Entitlement _toEntitlement(Double maxQuantity) {
		JSONObject jsonObject = new JSONObject(
		).put(
			"id", 1L
		);

		if (maxQuantity != null) {
			jsonObject.put("maxQuantity", maxQuantity);
		}

		return new Entitlement(jsonObject);
	}

}
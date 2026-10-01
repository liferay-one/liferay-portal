/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

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
	public void testGetCloudNativeKeyTypesKeepsOnlyCloudNative() {

		// The activation key list stamps a Cloud Native environment row with
		// the dates of the key type matching its environment type, so the
		// summary carries one entry per Cloud Native key type and nothing from
		// any other product.

		JSONArray jsonArray = ReflectionTestUtils.invokeMethod(
			new LicenseKeyGenerateFormService(),
			"_getCloudNativeKeyTypesJSONArray",
			_toGenerateFormJSONObject(
				_toProductJSONObject(
					"PRDCT-CLOUD-NATIVE",
					_toKeyTypeJSONObject(
						"production", 1, "2026-12-31T00:00:00Z",
						"2026-01-01T00:00:00Z"),
					_toKeyTypeJSONObject(
						"uat", 1, "2026-06-30T00:00:00Z",
						"2026-02-01T00:00:00Z")),
				_toProductJSONObject(
					"PRDCT-DXP",
					_toKeyTypeJSONObject(
						"production", 1, "2027-12-31T00:00:00Z",
						"2027-01-01T00:00:00Z"))));

		Assertions.assertEquals(2, jsonArray.length());

		JSONObject jsonObject = jsonArray.getJSONObject(0);

		Assertions.assertEquals("production", jsonObject.getString("key"));
		Assertions.assertEquals(
			"2026-01-01T00:00:00Z", jsonObject.getString("startDate"));
		Assertions.assertEquals(
			"2026-12-31T00:00:00Z", jsonObject.getString("endDate"));

		Assertions.assertEquals(
			"uat",
			jsonArray.getJSONObject(
				1
			).getString(
				"key"
			));
	}

	@Test
	public void testIsGeneratableWithAnAvailableSubscription() {
		Assertions.assertTrue(
			_isGeneratable(
				_toProductJSONObject(
					"PRDCT-DXP",
					_toKeyTypeJSONObject("production", 0, null, null),
					_toKeyTypeJSONObject("developer", 2, null, null))));
	}

	@Test
	public void testIsGeneratableWithEverySubscriptionSpent() {

		// A spent key type stays in the form so the wizard can grey it out,
		// which is exactly why the list cannot take a non empty form as a sign
		// that anything is left to generate.

		Assertions.assertFalse(
			_isGeneratable(
				_toProductJSONObject(
					"PRDCT-DXP",
					_toKeyTypeJSONObject("production", 0, null, null))));
	}

	@Test
	public void testIsGeneratableWithoutProducts() {
		Assertions.assertFalse(_isGeneratable());
	}

	@Test
	public void testGetSummaryCarriesOnlyWhatTheListReads() throws Exception {
		LicenseKeyGenerateFormService licenseKeyGenerateFormService =
			Mockito.spy(new LicenseKeyGenerateFormService());

		Mockito.doReturn(
			_toGenerateFormJSONObject(
				_toProductJSONObject(
					"PRDCT-CLOUD-NATIVE",
					_toKeyTypeJSONObject(
						"production", 3, "2026-12-31T00:00:00Z",
						"2026-01-01T00:00:00Z")),
				_toProductJSONObject(
					"PRDCT-DXP",
					_toKeyTypeJSONObject("production", 0, null, null)))
		).when(
			licenseKeyGenerateFormService
		).getGenerateForm(
			false, "PRJCT-1", null
		);

		JSONObject jsonObject = licenseKeyGenerateFormService.getSummary(
			false, "PRJCT-1");

		Assertions.assertTrue(jsonObject.getBoolean("generatable"));

		JSONArray jsonArray = jsonObject.getJSONArray("cloudNativeKeyTypes");

		Assertions.assertEquals(1, jsonArray.length());
		Assertions.assertEquals(
			"production",
			jsonArray.getJSONObject(
				0
			).getString(
				"key"
			));

		Assertions.assertFalse(jsonObject.has("products"));
		Assertions.assertFalse(jsonObject.has("bundleProducts"));
	}

	@Test
	public void testGetKeyTypesKeepsASpentKeyType() {

		// A key type with nothing left stays in the form, carrying its count,
		// so the wizard can grey it out. Dropping it makes a product the
		// customer owns look as though it was never bought.

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
			licenseKeyGenerateFormService, "_getKeyTypesJSONArray", false,
			"PRDCT-DXP", false, "DXP",
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

	private boolean _isGeneratable(JSONObject... productJSONObjects) {
		Boolean generatable = ReflectionTestUtils.invokeMethod(
			new LicenseKeyGenerateFormService(), "_isGeneratable",
			_toGenerateFormJSONObject(productJSONObjects));

		return Boolean.TRUE.equals(generatable);
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

	private JSONObject _toGenerateFormJSONObject(
		JSONObject... productJSONObjects) {

		JSONArray productsJSONArray = new JSONArray();

		for (JSONObject productJSONObject : productJSONObjects) {
			productsJSONArray.put(productJSONObject);
		}

		return new JSONObject(
		).put(
			"products", productsJSONArray
		);
	}

	private JSONObject _toKeyTypeJSONObject(
		String key, int availableCount, String endDate, String startDate) {

		return new JSONObject(
		).put(
			"key", key
		).put(
			"subscriptions",
			new JSONArray(
			).put(
				new JSONObject(
				).put(
					"availableCount", availableCount
				).put(
					"endDate", endDate
				).put(
					"startDate", startDate
				)
			)
		);
	}

	private JSONObject _toProductJSONObject(
		String externalReferenceCode, JSONObject... keyTypeJSONObjects) {

		JSONArray keyTypesJSONArray = new JSONArray();

		for (JSONObject keyTypeJSONObject : keyTypeJSONObjects) {
			keyTypesJSONArray.put(keyTypeJSONObject);
		}

		return new JSONObject(
		).put(
			"externalReferenceCode", externalReferenceCode
		).put(
			"keyTypes", keyTypesJSONArray
		);
	}

}
/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.one.exception.NoSuchLicenseKeyException;
import com.liferay.one.license.LicenseEntryService;
import com.liferay.one.license.LicenseKeyGenerator;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.LicenseKey;
import com.liferay.portal.ee.license.shared.LicenseConstants;

import java.net.URI;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Allen Ziegenfus
 */
@DisplayName("[SVC-LICENSEKEYSERVICE] LicenseKeyService")
public class LicenseKeyServiceTest {

	@BeforeEach
	public void setUp() throws Exception {
		_licenseKeyService = Mockito.spy(new LicenseKeyService());

		_filterCaptor = ArgumentCaptor.forClass(String.class);

		Mockito.doReturn(
			Collections.<LicenseKey>emptyList()
		).when(
			_licenseKeyService
		).getAllItems(
			Mockito.eq("/o/c/licensekeys"), _filterCaptor.capture(),
			Mockito.any()
		);

		_fieldsCaptor = ArgumentCaptor.forClass(String.class);

		_projectedFilterCaptor = ArgumentCaptor.forClass(String.class);

		Mockito.doReturn(
			Collections.<LicenseKey>emptyList()
		).when(
			_licenseKeyService
		).getAllProjectedItems(
			Mockito.eq("/o/c/licensekeys"), _fieldsCaptor.capture(),
			_projectedFilterCaptor.capture(), Mockito.any()
		);
	}

	@Test
	public void testAddLicenseKeyTypeFreeKeepsLocalhostOnce() throws Exception {
		List<String> bodies = new ArrayList<>();

		LicenseKeyService licenseKeyService = _toFreeTierLicenseKeyService(
			bodies, Mockito.mock(LicenseKeyGenerator.class));

		_addLicenseKeyTypeFree("localhost", licenseKeyService);

		JSONObject jsonObject = new JSONObject(bodies.get(0));

		Assertions.assertEquals("localhost", jsonObject.getString("domains"));
	}

	@Test
	public void testAddLicenseKeyTypeFreeLinksTheAccountAndTheOrder()
		throws Exception {

		List<String> bodies = new ArrayList<>();

		LicenseKeyService licenseKeyService = _toFreeTierLicenseKeyService(
			bodies, Mockito.mock(LicenseKeyGenerator.class));

		_addLicenseKeyTypeFree("example.com", licenseKeyService);

		JSONObject jsonObject = new JSONObject(bodies.get(0));

		Assertions.assertFalse(
			jsonObject.has("r_commerceProductToLicenseKey_CProductERC"));
		Assertions.assertFalse(
			jsonObject.has("r_commerceProductToLicenseKey_CProductId"));
		Assertions.assertEquals(
			555L,
			jsonObject.getLong("r_accountEntryToLicenseKey_accountEntryId"));
		Assertions.assertEquals("999", jsonObject.getString("orderId"));
	}

	@Test
	public void testAddLicenseKeyTypeFreeMatchesTheLegacyKey()
		throws Exception {

		List<String> bodies = new ArrayList<>();

		LicenseKeyGenerator licenseKeyGenerator = Mockito.mock(
			LicenseKeyGenerator.class);

		LicenseKeyService licenseKeyService = _toFreeTierLicenseKeyService(
			bodies, licenseKeyGenerator);

		_addLicenseKeyTypeFree(" example.com , other.com", licenseKeyService);

		Mockito.verify(
			licenseKeyGenerator
		).generateKey(
			Mockito.eq("Liferay Free Activation Key"),
			Mockito.eq("DXP Production"), Mockito.eq("free"), Mockito.eq(6),
			Mockito.eq("DXP Production"),
			Mockito.eq(LicenseConstants.PRODUCT_ID_PORTAL),
			Mockito.eq("2026.Q3"), Mockito.eq("owner@example.com"),
			Mockito.eq(3), Mockito.eq(0), Mockito.eq(0), Mockito.eq(0L),
			Mockito.eq(0L), Mockito.eq("Sizing 4"),
			Mockito.eq("Liferay Free Activation Key"),
			Mockito.eq("example.com,localhost"), Mockito.eq(""), Mockito.eq(""),
			Mockito.eq(""), Mockito.eq(""), Mockito.any(), Mockito.any()
		);

		JSONObject jsonObject = new JSONObject(bodies.get(0));

		Assertions.assertEquals(
			"Liferay Free Activation Key", jsonObject.getString("accountName"));
		Assertions.assertFalse(jsonObject.getBoolean("complimentary"));
		Assertions.assertEquals(
			"Liferay Free Activation Key", jsonObject.getString("description"));
		Assertions.assertEquals(
			"example.com,localhost", jsonObject.getString("domains"));
		Assertions.assertEquals(
			"DXP Production", jsonObject.getString("licenseName"));
		Assertions.assertEquals("free", jsonObject.getString("licenseType"));
		Assertions.assertEquals(6, jsonObject.getInt("licenseVersion"));
		Assertions.assertEquals(3, jsonObject.getInt("maxClusterNodes"));
		Assertions.assertEquals(
			"Liferay Free Activation Key", jsonObject.getString("name"));
		Assertions.assertEquals(
			"DXP Production", jsonObject.getString("productName"));
		Assertions.assertEquals(
			"2026.Q3", jsonObject.getString("productVersion"));
		Assertions.assertEquals("Sizing 4", jsonObject.getString("sizing"));
		Assertions.assertEquals(
			365,
			ChronoUnit.DAYS.between(
				Instant.parse(jsonObject.getString("startDate")),
				Instant.parse(jsonObject.getString("customExpirationDate"))));
	}

	@Test
	public void testAddLicenseKeyTypeFreeStoresTheActivationKey()
		throws Exception {

		List<String> bodies = new ArrayList<>();

		LicenseKeyService licenseKeyService = _toFreeTierLicenseKeyService(
			bodies, Mockito.mock(LicenseKeyGenerator.class));

		licenseKeyService.addLicenseKeyTypeFree(
			555L, 7L, "example.com", 11L, 12L,
			Date.from(Instant.parse("2027-01-01T00:00:00Z")), "Environment",
			null, "owner@example.com", "2026.Q2", "PRJCT-1",
			Date.from(Instant.parse("2026-01-01T00:00:00Z")));

		JSONObject jsonObject = new JSONObject(bodies.get(0));

		Assertions.assertEquals(
			"Liferay Free Activation Key", jsonObject.getString("accountName"));
		Assertions.assertEquals(
			"Liferay Free Activation Key", jsonObject.getString("description"));
		Assertions.assertEquals(
			"example.com,localhost", jsonObject.getString("domains"));
		Assertions.assertEquals(
			11L, jsonObject.getLong("entitlementDefinitionId"));
		Assertions.assertEquals(12L, jsonObject.getLong("entitlementId"));
		Assertions.assertEquals("Environment", jsonObject.getString("name"));
		Assertions.assertEquals(
			"2026.Q2", jsonObject.getString("productVersion"));
		Assertions.assertEquals(
			7L,
			jsonObject.getLong(
				"r_activationKeyToLicenseKey_c_activationKeyId"));
		Assertions.assertEquals(
			"PRJCT-1",
			jsonObject.getString("r_projectToLicenseKey_c_projectERC"));
	}

	@Test
	public void testFetchLicenseKeyTypeFreeFilter() throws Exception {
		Assertions.assertNull(
			_licenseKeyService.fetchLicenseKeyTypeFree(
				"example.com, other.com", "owner@example.com"));

		Assertions.assertEquals(
			"(domains eq 'example.com,localhost') and (licenseType eq " +
				"'free') and (owner eq 'owner@example.com')",
			_filterCaptor.getValue());
	}

	@Test
	public void testFetchLicenseKeyTypeFreePrefersTheActiveKey()
		throws Exception {

		LicenseKey activeLicenseKey = _freeLicenseKey(true, 2L);

		Mockito.doReturn(
			List.of(_freeLicenseKey(false, 1L), activeLicenseKey)
		).when(
			_licenseKeyService
		).getAllItems(
			Mockito.eq("/o/c/licensekeys"), Mockito.anyString(), Mockito.any()
		);

		Assertions.assertSame(
			activeLicenseKey,
			_licenseKeyService.fetchLicenseKeyTypeFree(
				"example.com", "owner@example.com"));
	}

	@Test
	public void testFetchLicenseKeyTypeFreeReturnsAnInactiveKeyThatExpiresSoon()
		throws Exception {

		LicenseKey licenseKey = _freeLicenseKey(false, 1L);

		Mockito.doReturn(
			List.of(licenseKey)
		).when(
			_licenseKeyService
		).getAllItems(
			Mockito.eq("/o/c/licensekeys"), Mockito.anyString(), Mockito.any()
		);

		Assertions.assertSame(
			licenseKey,
			_licenseKeyService.fetchLicenseKeyTypeFree(
				"example.com", "owner@example.com"));
	}

	@Test
	public void testGetActiveLicenseKeyCounts() throws Exception {
		Mockito.doReturn(
			Arrays.asList(
				_createLicenseKey(1L, true, false, 10L, 1L),
				_createLicenseKey(2L, true, false, 10L, 2L),
				_createLicenseKey(3L, true, false, 20L, 3L))
		).when(
			_licenseKeyService
		).getAllProjectedItems(
			Mockito.eq("/o/c/licensekeys"), Mockito.any(), Mockito.any(),
			Mockito.any()
		);

		Map<Long, Integer> counts =
			_licenseKeyService.getActiveLicenseKeyCounts("PRJCT-1");

		Assertions.assertEquals(2, counts.get(10L));
		Assertions.assertEquals(1, counts.get(20L));
	}

	@Test
	public void testGetActiveLicenseKeyCountsCountsComplimentaryKeys()
		throws Exception {

		// A complimentary key spends the single activation its entitlement
		// grants, so it has to be counted like any other.

		Mockito.doReturn(
			Arrays.asList(
				_createLicenseKey(1L, true, true, 10L, 1L),
				_createLicenseKey(2L, true, false, 10L, 2L))
		).when(
			_licenseKeyService
		).getAllProjectedItems(
			Mockito.eq("/o/c/licensekeys"), Mockito.any(), Mockito.any(),
			Mockito.any()
		);

		Map<Long, Integer> counts =
			_licenseKeyService.getActiveLicenseKeyCounts("PRJCT-1");

		Assertions.assertEquals(2, counts.get(10L));
	}

	@Test
	public void testGetActiveLicenseKeyCountsCountsPermanentKeyAgainstItsActiveEntitlement()
		throws Exception {

		_whenGetAllProjectedItems(
			_createPermanentLicenseKey(1L, true, 5L, 10L, 1L));

		Map<Long, Integer> counts =
			_licenseKeyService.getActiveLicenseKeyCounts(
				Arrays.asList(
					_createEntitlement(5L, "2026-12-31", 10L, 2D),
					_createEntitlement(5L, "2027-12-31", 20L, 2D)),
				Collections.emptyList(), "PRJCT-1");

		Assertions.assertEquals(1, counts.get(10L));
		Assertions.assertNull(counts.get(20L));
	}

	@Test
	public void testGetActiveLicenseKeyCountsCountsPermanentKeyAgainstItsDefinition()
		throws Exception {

		_whenGetAllProjectedItems(
			_createLicenseKey(1L, true, false, 10L, 1L),
			_createPermanentLicenseKey(2L, true, 5L, 0L, 2L));

		Map<Long, Integer> counts =
			_licenseKeyService.getActiveLicenseKeyCounts(
				Arrays.asList(_createEntitlement(5L, "2027-12-31", 10L, 3D)),
				Collections.emptyList(), "PRJCT-1");

		Assertions.assertEquals(2, counts.get(10L));
	}

	@Test
	public void testGetActiveLicenseKeyCountsCountsPermanentKeyOfAnEndedEntitlementAgainstItsDefinition()
		throws Exception {

		_whenGetAllProjectedItems(
			_createPermanentLicenseKey(1L, true, 5L, 7L, 1L));

		Map<Long, Integer> counts =
			_licenseKeyService.getActiveLicenseKeyCounts(
				Arrays.asList(_createEntitlement(5L, "2027-12-31", 20L, 2D)),
				Collections.emptyList(), "PRJCT-1");

		Assertions.assertNull(counts.get(7L));
		Assertions.assertEquals(1, counts.get(20L));
	}

	@Test
	public void testGetActiveLicenseKeyCountsCountsPermanentKeysAgainstTheLatestEndingEntitlementFirst()
		throws Exception {

		_whenGetAllProjectedItems(
			_createPermanentLicenseKey(1L, true, 5L, 0L, 1L),
			_createPermanentLicenseKey(2L, true, 5L, 0L, 2L),
			_createPermanentLicenseKey(3L, true, 5L, 0L, 3L));

		Map<Long, Integer> counts =
			_licenseKeyService.getActiveLicenseKeyCounts(
				Arrays.asList(
					_createEntitlement(5L, "2026-12-31", 10L, 2D),
					_createEntitlement(5L, "2027-12-31", 20L, 2D)),
				Collections.emptyList(), "PRJCT-1");

		Assertions.assertEquals(1, counts.get(10L));
		Assertions.assertEquals(2, counts.get(20L));
	}

	@Test
	public void testGetActiveLicenseKeyCountsCountsPermanentKeysBeyondTheActivationsOnTheLatestEndingEntitlement()
		throws Exception {

		// More permanent keys than activations leave nothing to generate, so
		// the surplus lands on one entitlement rather than being dropped.

		_whenGetAllProjectedItems(
			_createPermanentLicenseKey(1L, true, 5L, 0L, 1L),
			_createPermanentLicenseKey(2L, true, 5L, 0L, 2L),
			_createPermanentLicenseKey(3L, true, 5L, 0L, 3L));

		Map<Long, Integer> counts =
			_licenseKeyService.getActiveLicenseKeyCounts(
				Arrays.asList(
					_createEntitlement(5L, "2026-12-31", 10L, 1D),
					_createEntitlement(5L, "2027-12-31", 20L, 1D)),
				Collections.emptyList(), "PRJCT-1");

		Assertions.assertEquals(1, counts.get(10L));
		Assertions.assertEquals(2, counts.get(20L));
	}

	@Test
	public void testGetActiveLicenseKeyCountsCountsTheNodesOfAVirtualClusterKey()
		throws Exception {

		Mockito.doReturn(
			Arrays.asList(
				new LicenseKey(
					new JSONObject(
					).put(
						"active", true
					).put(
						"customExpirationDate", "2027-01-01T00:00:00Z"
					).put(
						"entitlementId", 10L
					).put(
						"id", 1L
					).put(
						"licenseType", "virtual-cluster"
					).put(
						"maxClusterNodes", 3
					).put(
						"r_activationKeyToLicenseKey_c_activationKeyId", 1L
					).put(
						"startDate", "2026-01-01T00:00:00Z"
					)),
				_createLicenseKey(2L, true, false, 10L, 2L))
		).when(
			_licenseKeyService
		).getAllProjectedItems(
			Mockito.eq("/o/c/licensekeys"), Mockito.any(), Mockito.any(),
			Mockito.any()
		);

		Map<Long, Integer> counts =
			_licenseKeyService.getActiveLicenseKeyCounts("PRJCT-1");

		Assertions.assertEquals(4, counts.get(10L));
	}

	@Test
	public void testGetActiveLicenseKeyCountsProjectsOnlyTalliedFields()
		throws Exception {

		// The tally reads four fields off a license key. Projecting them keeps
		// a project holding thousands of keys from serializing every field and
		// action envelope on each one.

		_licenseKeyService.getActiveLicenseKeyCounts("PRJCT-1");

		Assertions.assertEquals(
			"active,customExpirationDate,entitlementDefinitionId," +
				"entitlementId,id,licenseType,maxClusterNodes," +
					"r_activationKeyToLicenseKey_c_activationKeyId,startDate",
			_fieldsCaptor.getValue());
		Assertions.assertEquals(
			"(active eq true) and (r_projectToLicenseKey_c_projectERC eq " +
				"'PRJCT-1')",
			_projectedFilterCaptor.getValue());
	}

	@Test
	public void testGetActiveLicenseKeyCountsSkipsDeactivatedComplimentaryKeys()
		throws Exception {

		// Deactivating is what hands the grant back, so another can be
		// generated. An expired key is still active and still counts.

		Mockito.doReturn(
			Arrays.asList(_createLicenseKey(1L, false, true, 10L, 1L))
		).when(
			_licenseKeyService
		).getAllProjectedItems(
			Mockito.eq("/o/c/licensekeys"), Mockito.any(), Mockito.any(),
			Mockito.any()
		);

		Map<Long, Integer> counts =
			_licenseKeyService.getActiveLicenseKeyCounts("PRJCT-1");

		Assertions.assertNull(counts.get(10L));
	}

	@Test
	public void testGetActiveLicenseKeyCountsSkipsInactiveAndRenewedPermanentKeys()
		throws Exception {

		_whenGetAllProjectedItems(
			_createPermanentLicenseKey(1L, false, 5L, 0L, 1L),
			_createPermanentLicenseKey(2L, true, 5L, 0L, 2L));

		Map<Long, Integer> counts =
			_licenseKeyService.getActiveLicenseKeyCounts(
				Arrays.asList(_createEntitlement(5L, "2027-12-31", 10L, 3D)),
				Collections.singletonList(2L), "PRJCT-1");

		Assertions.assertNull(counts.get(10L));
	}

	@Test
	public void testGetActiveLicenseKeyCountsSkipsInactiveKeys()
		throws Exception {

		Mockito.doReturn(
			Arrays.asList(
				_createLicenseKey(1L, false, false, 10L, 1L),
				_createLicenseKey(2L, true, false, 10L, 2L))
		).when(
			_licenseKeyService
		).getAllProjectedItems(
			Mockito.eq("/o/c/licensekeys"), Mockito.any(), Mockito.any(),
			Mockito.any()
		);

		Map<Long, Integer> counts =
			_licenseKeyService.getActiveLicenseKeyCounts("PRJCT-1");

		Assertions.assertEquals(1, counts.get(10L));
	}

	@Test
	public void testGetActiveLicenseKeyCountsSkipsPermanentKeysOfADefinitionWithoutAnEntitlement()
		throws Exception {

		_whenGetAllProjectedItems(
			_createPermanentLicenseKey(1L, true, 6L, 0L, 1L));

		Map<Long, Integer> counts =
			_licenseKeyService.getActiveLicenseKeyCounts(
				Arrays.asList(_createEntitlement(5L, "2027-12-31", 10L, 3D)),
				Collections.emptyList(), "PRJCT-1");

		Assertions.assertTrue(counts.isEmpty());
	}

	@Test
	public void testGetActiveLicenseKeyCountsSkipsTermKeysWithoutAnEntitlement()
		throws Exception {

		_whenGetAllProjectedItems(
			new LicenseKey(
				new JSONObject(
				).put(
					"active", true
				).put(
					"customExpirationDate", "2027-01-01T00:00:00Z"
				).put(
					"entitlementDefinitionId", 5L
				).put(
					"id", 1L
				).put(
					"startDate", "2026-01-01T00:00:00Z"
				)));

		Map<Long, Integer> counts =
			_licenseKeyService.getActiveLicenseKeyCounts(
				Arrays.asList(_createEntitlement(5L, "2027-12-31", 10L, 3D)),
				Collections.emptyList(), "PRJCT-1");

		Assertions.assertTrue(counts.isEmpty());
	}

	@Test
	public void testGetActiveLicenseKeyCountsWithoutEntitlementsSkipsPermanentKeys()
		throws Exception {

		_whenGetAllProjectedItems(
			_createPermanentLicenseKey(1L, true, 5L, 0L, 1L));

		Assertions.assertTrue(
			_licenseKeyService.getActiveLicenseKeyCounts(
				"PRJCT-1"
			).isEmpty());
	}

	@Test
	public void testGetActiveUnassignedLicenseKeyCountsFiltersByAccountWithoutProject()
		throws Exception {

		Mockito.doReturn(
			Arrays.asList(
				_createLicenseKey(1L, true, false, 10L, 1L),
				_createLicenseKey(2L, true, false, 10L, 2L))
		).when(
			_licenseKeyService
		).getAllProjectedItems(
			Mockito.eq("/o/c/licensekeys"), Mockito.any(),
			_projectedFilterCaptor.capture(), Mockito.any()
		);

		Map<Long, Integer> counts =
			_licenseKeyService.getActiveUnassignedLicenseKeyCounts(
				77L, Collections.emptyList());

		Assertions.assertEquals(2, counts.get(10L));

		Assertions.assertEquals(
			"(active eq true) and " +
				"((r_accountEntryToLicenseKey_accountEntryId eq '77') and " +
					"(r_projectToLicenseKey_c_projectId eq '0'))",
			_projectedFilterCaptor.getValue());
	}

	@Test
	public void testGetAssetReceiptLicenseLicenseKeysFilter() throws Exception {
		_licenseKeyService.getAssetReceiptLicenseLicenseKeys(
			true, false, "order-1");

		Assertions.assertEquals(
			"(active eq true) and (complimentary eq false) and (orderId eq " +
				"'order-1')",
			_filterCaptor.getValue());
	}

	@Test
	public void testGetLicenseKeyByExternalReferenceCodeThrowsWhenMissing() {
		Assertions.assertThrows(
			NoSuchLicenseKeyException.class,
			() -> _licenseKeyService.getLicenseKeyByExternalReferenceCode(
				"missing-erc"));
	}

	@Test
	public void testGetLicenseKeysByEntitlementFilter() throws Exception {
		_licenseKeyService.getLicenseKeys(true, false, 777L);

		Assertions.assertEquals(
			"(active eq true) and (complimentary eq false) and " +
				"(entitlementId eq '777')",
			_filterCaptor.getValue());
	}

	@Test
	public void testGetLicenseKeysByIdsWhenLicenseKeyIdsIsEmpty()
		throws Exception {

		Assertions.assertEquals(
			Collections.emptyList(),
			_licenseKeyService.getLicenseKeysByIds(null, new long[0]));

		Mockito.verify(
			_licenseKeyService, Mockito.never()
		).getAllItems(
			Mockito.anyString(), Mockito.any(), Mockito.any(),
			Mockito.any(Jwt.class)
		);
	}

	@Test
	public void testGetLicenseKeysByNameFilter() throws Exception {
		_licenseKeyService.getLicenseKeysByName(true, "DXP", "srv-1");

		Assertions.assertEquals(
			"(active eq true) and (productName eq 'DXP') and (serverId eq " +
				"'srv-1')",
			_filterCaptor.getValue());
	}

	@Test
	public void testGetLicenseKeysByOrderProductServerActiveFilter()
		throws Exception {

		_licenseKeyService.getLicenseKeys(true, "order-1", "portal", "srv-1");

		Assertions.assertEquals(
			"(active eq true) and (orderId eq 'order-1') and " +
				"(productExternalId eq 'portal') and (serverId eq 'srv-1')",
			_filterCaptor.getValue());
	}

	@Test
	public void testGetLicenseKeysByProductAndServerFilter() throws Exception {
		_licenseKeyService.getLicenseKeys("portal", "srv-1");

		Assertions.assertEquals(
			"(productExternalId eq 'portal') and (serverId eq 'srv-1')",
			_filterCaptor.getValue());
	}

	@Test
	public void testGetLicenseKeysByTypeOwnerDomainsFilter() throws Exception {
		_licenseKeyService.getLicenseKeys(
			"example.com", "enterprise", "Acme Corp");

		Assertions.assertEquals(
			"(domains eq 'example.com') and (licenseType eq 'enterprise') " +
				"and (owner eq 'Acme Corp')",
			_filterCaptor.getValue());
	}

	@Test
	public void testSearchBuildsFilterAndSkipsNulls() throws Exception {
		_licenseKeyService.search(
			Boolean.TRUE, null, null, null, "enterprise", null, null, null,
			"DXP", null);

		Assertions.assertEquals(
			"(active eq true) and (licenseType eq 'enterprise') and " +
				"(productName eq 'DXP')",
			_filterCaptor.getValue());
	}

	@Test
	public void testSearchEscapesSingleQuotes() throws Exception {
		_licenseKeyService.search(
			null, null, null, null, null, null, "O'Connor", null, null, null);

		Assertions.assertEquals(
			"(owner eq 'O''Connor')", _filterCaptor.getValue());
	}

	@Test
	public void testSearchWithNoCriteriaUsesNullFilter() throws Exception {
		_licenseKeyService.search(
			null, null, null, null, null, null, null, null, null, null);

		Assertions.assertNull(_filterCaptor.getValue());
	}

	private void _addLicenseKeyTypeFree(
			String domains, LicenseKeyService licenseKeyService)
		throws Exception {

		Date startDate = new Date();

		licenseKeyService.addLicenseKeyTypeFree(
			555L, 7L, domains, 11L, 12L,
			new Date(startDate.getTime() + TimeUnit.DAYS.toMillis(365)),
			"Liferay Free Activation Key", "999", "owner@example.com",
			"2026.Q3", null, startDate);
	}

	private Entitlement _createEntitlement(
		long entitlementDefinitionId, String endDate, long entitlementId,
		double maxQuantity) {

		return new Entitlement(
			new JSONObject(
			).put(
				"endDate", endDate + "T00:00:00Z"
			).put(
				"id", entitlementId
			).put(
				"maxQuantity", maxQuantity
			).put(
				"r_entitlementDefinitionToEntitlement_c_" +
					"entitlementDefinitionId",
				entitlementDefinitionId
			));
	}

	private LicenseKey _createLicenseKey(
		long activationKeyId, boolean active, boolean complimentary,
		long entitlementId, long licenseKeyId) {

		return new LicenseKey(
			new JSONObject(
			).put(
				"active", active
			).put(
				"complimentary", complimentary
			).put(
				"customExpirationDate", "2027-01-01T00:00:00Z"
			).put(
				"entitlementId", entitlementId
			).put(
				"id", licenseKeyId
			).put(
				"r_activationKeyToLicenseKey_c_activationKeyId", activationKeyId
			).put(
				"startDate", "2026-01-01T00:00:00Z"
			));
	}

	private LicenseKey _createPermanentLicenseKey(
		long activationKeyId, boolean active, long entitlementDefinitionId,
		long entitlementId, long licenseKeyId) {

		return new LicenseKey(
			new JSONObject(
			).put(
				"active", active
			).put(
				"customExpirationDate", "2120-01-01T00:00:00Z"
			).put(
				"entitlementDefinitionId", entitlementDefinitionId
			).put(
				"entitlementId", entitlementId
			).put(
				"id", licenseKeyId
			).put(
				"r_activationKeyToLicenseKey_c_activationKeyId", activationKeyId
			).put(
				"startDate", "2020-01-01T00:00:00Z"
			));
	}

	private LicenseKey _freeLicenseKey(boolean active, long id) {
		return new LicenseKey(
			new JSONObject(
			).put(
				"active", active
			).put(
				"customExpirationDate",
				Instant.now(
				).plus(
					10, ChronoUnit.DAYS
				).toString()
			).put(
				"id", id
			).put(
				"startDate",
				Instant.now(
				).toString()
			));
	}

	private LicenseKeyService _toFreeTierLicenseKeyService(
		List<String> bodies, LicenseKeyGenerator licenseKeyGenerator) {

		LicenseKeyService licenseKeyService = new LicenseKeyService() {

			@Override
			protected String getAuthorization() {
				return "Bearer test";
			}

			@Override
			protected String post(String authorization, String body, URI uri) {
				bodies.add(body);

				return "{\"id\": 1}";
			}

		};

		ReflectionTestUtils.setField(
			licenseKeyService, "_licenseEntryService",
			new LicenseEntryService());
		ReflectionTestUtils.setField(
			licenseKeyService, "_licenseKeyGenerator", licenseKeyGenerator);

		return licenseKeyService;
	}

	private void _whenGetAllProjectedItems(LicenseKey... licenseKeys)
		throws Exception {

		Mockito.doReturn(
			Arrays.asList(licenseKeys)
		).when(
			_licenseKeyService
		).getAllProjectedItems(
			Mockito.eq("/o/c/licensekeys"), Mockito.any(), Mockito.any(),
			Mockito.any()
		);
	}

	private ArgumentCaptor<String> _fieldsCaptor;
	private ArgumentCaptor<String> _filterCaptor;
	private LicenseKeyService _licenseKeyService;
	private ArgumentCaptor<String> _projectedFilterCaptor;

}
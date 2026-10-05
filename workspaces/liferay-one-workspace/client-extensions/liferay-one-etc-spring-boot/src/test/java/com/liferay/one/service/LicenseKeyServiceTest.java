/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.one.exception.NoSuchLicenseKeyException;
import com.liferay.one.model.LicenseKey;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import org.springframework.security.oauth2.jwt.Jwt;

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
	public void testGetActiveLicenseKeyCountsProjectsOnlyTalliedFields()
		throws Exception {

		// The tally reads four fields off a license key. Projecting them keeps
		// a project holding thousands of keys from serializing every field and
		// action envelope on each one.

		_licenseKeyService.getActiveLicenseKeyCounts("PRJCT-1");

		Assertions.assertEquals(
			"active,entitlementId,id," +
				"r_activationKeyToLicenseKey_c_activationKeyId",
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
	public void testHasValidLicenseKeyTypeFreeFilter() throws Exception {
		Assertions.assertFalse(
			_licenseKeyService.hasValidLicenseKeyTypeFree(
				"example.com", "owner@example.com"));

		Assertions.assertEquals(
			"(domains eq 'example.com') and (licenseType eq 'free') and " +
				"(owner eq 'owner@example.com')",
			_filterCaptor.getValue());
	}

	@Test
	public void testHasValidLicenseKeyTypeFreeReturnsFalseWithinRenewalWindow()
		throws Exception {

		LicenseKey licenseKey = _freeLicenseKey(
			Instant.now(
			).plus(
				10, ChronoUnit.DAYS
			));

		Mockito.doReturn(
			List.of(licenseKey)
		).when(
			_licenseKeyService
		).getAllItems(
			Mockito.eq("/o/c/licensekeys"), Mockito.anyString(), Mockito.any()
		);

		Assertions.assertFalse(
			_licenseKeyService.hasValidLicenseKeyTypeFree(
				"example.com", "owner@example.com"));
	}

	@Test
	public void testHasValidLicenseKeyTypeFreeReturnsTrueBeyondRenewalWindow()
		throws Exception {

		LicenseKey licenseKey = _freeLicenseKey(
			Instant.now(
			).plus(
				200, ChronoUnit.DAYS
			));

		Mockito.doReturn(
			List.of(licenseKey)
		).when(
			_licenseKeyService
		).getAllItems(
			Mockito.eq("/o/c/licensekeys"), Mockito.anyString(), Mockito.any()
		);

		Assertions.assertTrue(
			_licenseKeyService.hasValidLicenseKeyTypeFree(
				"example.com", "owner@example.com"));
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

	private LicenseKey _freeLicenseKey(Instant customExpirationDateInstant) {
		return new LicenseKey(
			new JSONObject(
			).put(
				"customExpirationDate", customExpirationDateInstant.toString()
			).put(
				"id", 1L
			).put(
				"startDate",
				Instant.now(
				).toString()
			));
	}

	private ArgumentCaptor<String> _fieldsCaptor;
	private ArgumentCaptor<String> _filterCaptor;
	private LicenseKeyService _licenseKeyService;
	private ArgumentCaptor<String> _projectedFilterCaptor;

}
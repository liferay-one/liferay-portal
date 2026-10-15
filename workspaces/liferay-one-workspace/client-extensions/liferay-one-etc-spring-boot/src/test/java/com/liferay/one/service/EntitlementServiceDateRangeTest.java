/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.one.constants.EntitlementConstants;
import com.liferay.one.model.Entitlement;
import com.liferay.petra.function.transform.TransformUtil;
import com.liferay.petra.string.StringBundler;

import java.time.Instant;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

/**
 * @author Drew Brokke
 */
public class EntitlementServiceDateRangeTest {

	@Test
	public void testActiveEntitlementsAccountsAndProjectsMakeOneRequestEach()
		throws Exception {

		EntitlementService entitlementService = Mockito.spy(
			new EntitlementService());

		Mockito.doReturn(
			Collections.emptyList()
		).when(
			entitlementService
		).getEntitlements(
			Mockito.anyString()
		);

		entitlementService.getActiveEntitlements(
			Collections.singletonList(7L),
			Arrays.asList("gold-support", "partner"),
			Collections.singletonList("PRJCT'1"));

		ArgumentCaptor<String> argumentCaptor = ArgumentCaptor.forClass(
			String.class);

		Mockito.verify(
			entitlementService, Mockito.times(2)
		).getEntitlements(
			argumentCaptor.capture()
		);

		List<String> filterStrings = argumentCaptor.getAllValues();

		Assertions.assertTrue(
			filterStrings.get(
				0
			).contains(
				StringBundler.concat(
					") and ((r_accountEntryToEntitlement_accountEntryId in ",
					"('7')) and (name eq 'gold-support' or name eq ",
					"'partner')) and (startDate eq null or startDate le ")
			),
			filterStrings.get(0));
		Assertions.assertTrue(
			filterStrings.get(
				1
			).contains(
				StringBundler.concat(
					") and ((r_projectToEntitlement_c_projectERC in ",
					"('PRJCT''1')) and (name eq 'gold-support' or name eq ",
					"'partner')) and (startDate eq null or startDate le ")
			),
			filterStrings.get(1));
	}

	@Test
	public void testActiveEntitlementsAccountsOnlyBatchByHundred()
		throws Exception {

		EntitlementService entitlementService = Mockito.spy(
			new EntitlementService());

		Mockito.doReturn(
			Collections.emptyList()
		).when(
			entitlementService
		).getEntitlements(
			Mockito.anyString()
		);

		List<Long> accountEntryIds = new ArrayList<>();

		for (long i = 1; i <= 101; i++) {
			accountEntryIds.add(i);
		}

		entitlementService.getActiveEntitlements(
			accountEntryIds, Collections.singletonList("partner"),
			Collections.emptyList());

		ArgumentCaptor<String> argumentCaptor = ArgumentCaptor.forClass(
			String.class);

		Mockito.verify(
			entitlementService, Mockito.times(2)
		).getEntitlements(
			argumentCaptor.capture()
		);

		List<String> filterStrings = argumentCaptor.getAllValues();

		Assertions.assertEquals(
			100,
			_countValues(
				filterStrings.get(0),
				"r_accountEntryToEntitlement_accountEntryId in ('"));
		Assertions.assertEquals(
			1,
			_countValues(
				filterStrings.get(1),
				"r_accountEntryToEntitlement_accountEntryId in ('"));
	}

	@Test
	public void testActiveEntitlementsByNamesFilterIsActiveAndMatchesTheNames()
		throws Exception {

		EntitlementService entitlementService = Mockito.spy(
			new EntitlementService());

		Mockito.doReturn(
			Collections.emptyList()
		).when(
			entitlementService
		).getEntitlements(
			Mockito.anyString()
		);

		entitlementService.getActiveEntitlementsByNames(
			Arrays.asList("gold-support", "O'partner"));

		ArgumentCaptor<String> argumentCaptor = ArgumentCaptor.forClass(
			String.class);

		Mockito.verify(
			entitlementService
		).getEntitlements(
			argumentCaptor.capture()
		);

		String filterString = argumentCaptor.getValue();

		Assertions.assertTrue(
			filterString.startsWith("(endDate eq null or endDate ge "),
			filterString);
		Assertions.assertTrue(
			filterString.contains(
				") and (name eq 'gold-support' or name eq 'O''partner') and " +
					"(startDate eq null or startDate le "),
			filterString);
	}

	@Test
	public void testActiveEntitlementsByNamesWithoutNamesMeansNoQuery()
		throws Exception {

		EntitlementService entitlementService = Mockito.spy(
			new EntitlementService());

		Assertions.assertTrue(
			entitlementService.getActiveEntitlementsByNames(
				Collections.emptyList()
			).isEmpty());

		Mockito.verify(
			entitlementService, Mockito.never()
		).getEntitlements(
			Mockito.anyString()
		);
	}

	@Test
	public void testActiveEntitlementsDeduplicateByEntitlementId()
		throws Exception {

		EntitlementService entitlementService = Mockito.spy(
			new EntitlementService());

		Mockito.doReturn(
			Arrays.asList(_createEntitlement(1), _createEntitlement(2))
		).doReturn(
			Arrays.asList(_createEntitlement(2), _createEntitlement(3))
		).when(
			entitlementService
		).getEntitlements(
			Mockito.anyString()
		);

		List<Entitlement> entitlements =
			entitlementService.getActiveEntitlements(
				Collections.singletonList(7L),
				Collections.singletonList("partner"),
				Collections.singletonList("PRJCT-1"));

		Assertions.assertEquals(
			Arrays.asList(1L, 2L, 3L),
			TransformUtil.transform(
				entitlements, Entitlement::getEntitlementId));
	}

	@Test
	public void testActiveEntitlementsProjectsOnlyBatchByHundred()
		throws Exception {

		EntitlementService entitlementService = Mockito.spy(
			new EntitlementService());

		Mockito.doReturn(
			Collections.emptyList()
		).when(
			entitlementService
		).getEntitlements(
			Mockito.anyString()
		);

		List<String> projectExternalReferenceCodes = new ArrayList<>();

		for (int i = 1; i <= 101; i++) {
			projectExternalReferenceCodes.add("PRJCT-" + i);
		}

		entitlementService.getActiveEntitlements(
			Collections.emptyList(), Collections.singletonList("partner"),
			projectExternalReferenceCodes);

		ArgumentCaptor<String> argumentCaptor = ArgumentCaptor.forClass(
			String.class);

		Mockito.verify(
			entitlementService, Mockito.times(2)
		).getEntitlements(
			argumentCaptor.capture()
		);

		List<String> filterStrings = argumentCaptor.getAllValues();

		Assertions.assertEquals(
			100,
			_countValues(
				filterStrings.get(0),
				"r_projectToEntitlement_c_projectERC in ('"));
		Assertions.assertEquals(
			1,
			_countValues(
				filterStrings.get(1),
				"r_projectToEntitlement_c_projectERC in ('"));
	}

	@Test
	public void testActiveEntitlementsWithoutNamesMeansNoQuery()
		throws Exception {

		EntitlementService entitlementService = Mockito.spy(
			new EntitlementService());

		Assertions.assertTrue(
			entitlementService.getActiveEntitlements(
				Collections.singletonList(7L), Collections.emptyList(),
				Collections.singletonList("PRJCT-1")
			).isEmpty());

		Mockito.verify(
			entitlementService, Mockito.never()
		).getEntitlements(
			Mockito.anyString()
		);
	}

	@Test
	public void testChangedEntitlementsFilterMatchesDatesAndModificationInTheWindow()
		throws Exception {

		EntitlementService entitlementService = Mockito.spy(
			new EntitlementService());

		Mockito.doReturn(
			Collections.emptyList()
		).when(
			entitlementService
		).getEntitlements(
			Mockito.anyString()
		);

		entitlementService.getChangedEntitlements(
			Instant.parse("2026-09-01T00:00:00Z"),
			Arrays.asList("gold-support", "partner"),
			Instant.parse("2026-08-01T00:00:00Z"));

		Mockito.verify(
			entitlementService
		).getEntitlements(
			StringBundler.concat(
				"(dateModified ge 2026-08-01T00:00:00Z or (endDate ge ",
				"2026-08-01T00:00:00Z and endDate le 2026-09-01T00:00:00Z) or ",
				"(startDate ge 2026-08-01T00:00:00Z and startDate le ",
				"2026-09-01T00:00:00Z)) and (name eq 'gold-support' or name ",
				"eq 'partner')")
		);
	}

	@Test
	public void testChangedEntitlementsWithoutNamesMeansNoQuery()
		throws Exception {

		EntitlementService entitlementService = Mockito.spy(
			new EntitlementService());

		Assertions.assertTrue(
			entitlementService.getChangedEntitlements(
				Instant.now(), Collections.emptyList(), Instant.now()
			).isEmpty());

		Mockito.verify(
			entitlementService, Mockito.never()
		).getEntitlements(
			Mockito.anyString()
		);
	}

	@Test
	public void testFilterMatchesNamesOverlappingTheRange() throws Exception {
		EntitlementService entitlementService = Mockito.spy(
			new EntitlementService());

		Mockito.doReturn(
			Collections.emptyList()
		).when(
			entitlementService
		).getEntitlements(
			Mockito.anyString()
		);

		Instant endInstant = Instant.parse("2026-09-01T00:00:00Z");
		Instant startInstant = Instant.parse("2026-08-01T00:00:00Z");

		entitlementService.getEntitlements(
			endInstant,
			Arrays.asList(
				EntitlementConstants.NAME_EVENTS,
				EntitlementConstants.NAME_EVENTS_ADD_ON_BUCKET),
			startInstant);

		ArgumentCaptor<String> argumentCaptor = ArgumentCaptor.forClass(
			String.class);

		Mockito.verify(
			entitlementService
		).getEntitlements(
			argumentCaptor.capture()
		);

		Assertions.assertEquals(
			"(endDate eq null or endDate ge 2026-08-01T00:00:00Z) and (name " +
				"eq 'events' or name eq 'events-add-on-bucket') and " +
					"(startDate eq null or startDate lt 2026-09-01T00:00:00Z)",
			argumentCaptor.getValue());
	}

	@Test
	public void testNoNamesMeansNoQuery() throws Exception {
		EntitlementService entitlementService = Mockito.spy(
			new EntitlementService());

		Assertions.assertTrue(
			entitlementService.getEntitlements(
				Instant.now(), Collections.emptyList(), Instant.now()
			).isEmpty());

		Mockito.verify(
			entitlementService, Mockito.never()
		).getEntitlements(
			Mockito.anyString()
		);
	}

	private int _countValues(String filterString, String prefix) {
		int start = filterString.indexOf(prefix);

		Assertions.assertTrue(start >= 0, filterString);

		start += prefix.length();

		return filterString.substring(
			start, filterString.indexOf("')", start)
		).split(
			"','"
		).length;
	}

	private Entitlement _createEntitlement(long entitlementId) {
		return new Entitlement(
			new JSONObject(
			).put(
				"id", entitlementId
			));
	}

}
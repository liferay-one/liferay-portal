/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.commerce.admin.pricing.client.dto.v2_0.PriceEntry;
import com.liferay.headless.commerce.admin.pricing.client.problem.Problem;
import com.liferay.headless.commerce.admin.pricing.client.resource.v2_0.PriceEntryResource;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.MockedStatic;
import org.mockito.Mockito;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[SVC-COMMERCEPRICEENTRYSERVICE] CommercePriceEntryService")
public class CommercePriceEntryServiceTest {

	@BeforeEach
	public void setUp() {
		PriceEntryResource.Builder builder = Mockito.mock(
			PriceEntryResource.Builder.class, Mockito.RETURNS_SELF);

		Mockito.when(
			builder.build()
		).thenReturn(
			_priceEntryResource
		);

		_priceEntryResourceMockedStatic = Mockito.mockStatic(
			PriceEntryResource.class);

		_priceEntryResourceMockedStatic.when(
			PriceEntryResource::builder
		).thenReturn(
			builder
		);
	}

	@AfterEach
	public void tearDown() {
		_priceEntryResourceMockedStatic.close();
	}

	@Test
	public void testAddOrUpdatePriceEntryPatchesExistingEntry()
		throws Exception {

		_whenGetPriceEntry(_createPriceEntry(100L));

		_commercePriceEntryService.addOrUpdatePriceEntry(
			true, "PE-1", 9.5, 100L, 200L);

		ArgumentCaptor<PriceEntry> priceEntryArgumentCaptor =
			ArgumentCaptor.forClass(PriceEntry.class);

		Mockito.verify(
			_priceEntryResource
		).patchPriceEntryByExternalReferenceCode(
			ArgumentMatchers.eq("PE-1"), priceEntryArgumentCaptor.capture()
		);

		PriceEntry priceEntry = priceEntryArgumentCaptor.getValue();

		Assertions.assertTrue(priceEntry.getActive());
		Assertions.assertEquals(9.5, priceEntry.getPrice());
		Assertions.assertEquals(Long.valueOf(200L), priceEntry.getSkuId());

		Mockito.verify(
			_priceEntryResource, Mockito.never()
		).deletePriceEntryByExternalReferenceCode(
			ArgumentMatchers.anyString()
		);

		Mockito.verify(
			_priceEntryResource, Mockito.never()
		).postPriceListIdPriceEntry(
			ArgumentMatchers.anyLong(), ArgumentMatchers.any()
		);
	}

	@Test
	public void testAddOrUpdatePriceEntryPostsWhenNotFound() throws Exception {
		_whenGetPriceEntryThrows("NOT_FOUND");

		_commercePriceEntryService.addOrUpdatePriceEntry(
			false, "PE-1", 1.0, 100L, 200L);

		Mockito.verify(
			_priceEntryResource
		).postPriceListIdPriceEntry(
			ArgumentMatchers.eq(100L), ArgumentMatchers.any(PriceEntry.class)
		);

		Mockito.verify(
			_priceEntryResource, Mockito.never()
		).patchPriceEntryByExternalReferenceCode(
			ArgumentMatchers.anyString(), ArgumentMatchers.any()
		);
	}

	@Test
	public void testAddOrUpdatePriceEntryRecreatesEntryOnPriceListChange()
		throws Exception {

		_whenGetPriceEntry(_createPriceEntry(99L));

		_commercePriceEntryService.addOrUpdatePriceEntry(
			true, "PE-1", 1.0, 100L, 200L);

		Mockito.verify(
			_priceEntryResource
		).deletePriceEntryByExternalReferenceCode(
			"PE-1"
		);

		Mockito.verify(
			_priceEntryResource
		).postPriceListIdPriceEntry(
			ArgumentMatchers.eq(100L), ArgumentMatchers.any(PriceEntry.class)
		);

		Mockito.verify(
			_priceEntryResource, Mockito.never()
		).patchPriceEntryByExternalReferenceCode(
			ArgumentMatchers.anyString(), ArgumentMatchers.any()
		);
	}

	@Test
	public void testAddOrUpdatePriceEntryRethrowsOtherProblems()
		throws Exception {

		_whenGetPriceEntryThrows("INTERNAL_SERVER_ERROR");

		Assertions.assertThrows(
			Problem.ProblemException.class,
			() -> _commercePriceEntryService.addOrUpdatePriceEntry(
				true, "PE-1", 1.0, 100L, 200L));
	}

	@Test
	public void testDeletePriceEntry() throws Exception {
		_whenGetPriceEntry(_createPriceEntry(100L));

		_commercePriceEntryService.deletePriceEntry("PE-1");

		Mockito.verify(
			_priceEntryResource
		).deletePriceEntryByExternalReferenceCode(
			"PE-1"
		);
	}

	@Test
	public void testDeletePriceEntrySkipsMissingEntry() throws Exception {
		_whenGetPriceEntryThrows("NOT_FOUND");

		_commercePriceEntryService.deletePriceEntry("PE-1");

		Mockito.verify(
			_priceEntryResource, Mockito.never()
		).deletePriceEntryByExternalReferenceCode(
			ArgumentMatchers.anyString()
		);
	}

	private PriceEntry _createPriceEntry(long priceListId) {
		PriceEntry priceEntry = new PriceEntry();

		priceEntry.setPriceListId(priceListId);

		return priceEntry;
	}

	private void _whenGetPriceEntry(PriceEntry priceEntry) throws Exception {
		Mockito.when(
			_priceEntryResource.getPriceEntryByExternalReferenceCode("PE-1")
		).thenReturn(
			priceEntry
		);
	}

	private void _whenGetPriceEntryThrows(String status) throws Exception {
		Problem problem = new Problem();

		problem.setStatus(status);

		Mockito.when(
			_priceEntryResource.getPriceEntryByExternalReferenceCode("PE-1")
		).thenThrow(
			new Problem.ProblemException(problem)
		);
	}

	private final CommercePriceEntryService _commercePriceEntryService =
		new CommercePriceEntryService() {

			@Override
			protected String getAuthorization() {
				return "Bearer test";
			}

			@Override
			protected String getDXPEndpointAddress() {
				return "localhost:8080";
			}

		};

	private final PriceEntryResource _priceEntryResource = Mockito.mock(
		PriceEntryResource.class);
	private MockedStatic<PriceEntryResource> _priceEntryResourceMockedStatic;

}
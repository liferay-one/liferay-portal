/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.ProductSpecification;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.OrderItem;
import com.liferay.one.constants.LicenseKeyGenerationConstants;
import com.liferay.one.exception.LicenseKeyDateException;
import com.liferay.one.exception.LicenseKeyEntitlementException;
import com.liferay.one.exception.LicenseKeyValidationException;
import com.liferay.one.license.LicenseEntry;
import com.liferay.one.license.LicenseKeyExporter;
import com.liferay.one.license.LicenseKeyGenerator;
import com.liferay.one.model.ActivationKey;
import com.liferay.one.model.ActivationKeyScope;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.LicenseKey;
import com.liferay.one.model.Project;
import com.liferay.one.util.KeyedLock;
import com.liferay.petra.function.UnsafeSupplier;
import com.liferay.portal.kernel.util.HashMapBuilder;

import java.lang.reflect.Method;

import java.time.Instant;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.TimeUnit;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.mockito.invocation.Invocation;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Pedro Oliveira
 */
@DisplayName("[SVC-LICENSEKEYGENERATIONSERVICE] LicenseKeyGenerationService")
public class LicenseKeyGenerationServiceTest {

	@BeforeEach
	public void setUp() throws Exception {
		_activationKeyService = Mockito.mock(ActivationKeyService.class);
		_commerceOrderItemService = Mockito.mock(
			CommerceOrderItemService.class);
		_entitlementService = Mockito.mock(EntitlementService.class);
		_licenseKeyExporter = Mockito.mock(LicenseKeyExporter.class);
		_licenseKeyGenerateFormService = Mockito.mock(
			LicenseKeyGenerateFormService.class);
		_licenseKeyGenerationService = new LicenseKeyGenerationService();
		_licenseKeyGenerator = Mockito.mock(LicenseKeyGenerator.class);
		_licenseKeyService = Mockito.mock(LicenseKeyService.class);

		ReflectionTestUtils.setField(
			_licenseKeyGenerationService, "_activationKeyService",
			_activationKeyService);
		ReflectionTestUtils.setField(
			_licenseKeyGenerationService, "_commerceOrderItemService",
			_commerceOrderItemService);
		ReflectionTestUtils.setField(
			_licenseKeyGenerationService, "_entitlementService",
			_entitlementService);
		ReflectionTestUtils.setField(
			_licenseKeyGenerationService, "_keyedLock", new KeyedLock());
		ReflectionTestUtils.setField(
			_licenseKeyGenerationService, "_licenseKeyExporter",
			_licenseKeyExporter);
		ReflectionTestUtils.setField(
			_licenseKeyGenerationService, "_licenseKeyGenerateFormService",
			_licenseKeyGenerateFormService);
		ReflectionTestUtils.setField(
			_licenseKeyGenerationService, "_licenseKeyGenerator",
			_licenseKeyGenerator);
		ReflectionTestUtils.setField(
			_licenseKeyGenerationService, "_licenseKeyService",
			_licenseKeyService);

		Mockito.when(
			_licenseKeyGenerateFormService.isAllowComplimentary(
				Mockito.anyLong())
		).thenReturn(
			true
		);

		Mockito.when(
			_entitlementService.getActiveEntitlements(
				Mockito.any(ActivationKeyScope.class))
		).thenCallRealMethod();

		Mockito.when(
			_licenseKeyService.getActiveLicenseKeyCounts(
				Mockito.any(ActivationKeyScope.class), Mockito.anyList(),
				Mockito.anyCollection())
		).thenCallRealMethod();

		Mockito.when(
			_licenseKeyService.getActiveLicenseKeyCounts(
				Mockito.anyList(), Mockito.anyCollection(), Mockito.anyString())
		).thenReturn(
			new HashMap<>()
		);
	}

	@Test
	public void testGenerateActivationKey() throws Exception {
		_stubEntitlements(_toEntitlement(1L, 5.0), _toEntitlement(2L, 5.0));

		_stubLicensedProducts();

		ActivationKey activationKey = _stubActivationKey();

		Mockito.when(
			_licenseKeyService.addLicenseKey(
				Mockito.anyLong(), Mockito.any(), Mockito.anyLong(),
				Mockito.anyBoolean(), Mockito.any(), Mockito.anyBoolean(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.anyLong(),
				Mockito.anyLong(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.anyInt(), Mockito.any(), Mockito.anyInt(),
				Mockito.anyLong(), Mockito.anyInt(), Mockito.anyInt(),
				Mockito.anyLong(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.any())
		).thenReturn(
			Mockito.mock(LicenseKey.class)
		);

		Assertions.assertSame(
			activationKey,
			_licenseKeyGenerationService.generateActivationKey(
				_toGenerateRequest(Arrays.asList(1L, 2L), 1L, 3)));

		Mockito.verify(
			_licenseKeyService, Mockito.times(6)
		).addLicenseKey(
			Mockito.anyLong(), Mockito.any(), Mockito.eq(7L),
			Mockito.anyBoolean(), Mockito.any(), Mockito.anyBoolean(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.anyLong(),
			Mockito.anyLong(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.anyInt(), Mockito.any(), Mockito.anyInt(),
			Mockito.anyLong(), Mockito.anyInt(), Mockito.anyInt(),
			Mockito.anyLong(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any()
		);

		for (long entitlementId : new long[] {1L, 2L}) {
			Mockito.verify(
				_licenseKeyService, Mockito.times(3)
			).addLicenseKey(
				Mockito.anyLong(), Mockito.any(), Mockito.anyLong(),
				Mockito.anyBoolean(), Mockito.any(), Mockito.anyBoolean(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.anyLong(),
				Mockito.eq(entitlementId), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.anyInt(), Mockito.any(),
				Mockito.anyInt(), Mockito.anyLong(), Mockito.anyInt(),
				Mockito.anyInt(), Mockito.anyLong(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.any()
			);
		}

		Assertions.assertEquals(
			Collections.nCopies(6, "Sizing 1"),
			_getInvocationArguments(_licenseKeyService, "addLicenseKey", 33));
	}

	@Test
	public void testGenerateActivationKeyBundlesAnAddOnWithoutALicenseEntry()
		throws Exception {

		Entitlement leadingEntitlement = _toEntitlement(1L, 5.0, "PRDCT-DXP");
		Entitlement addOnEntitlement = _toEntitlement(2L, 5.0, "PRDCT-DSR");

		_stubEntitlements(leadingEntitlement, addOnEntitlement);

		_stubBundledProducts(addOnEntitlement, leadingEntitlement);

		_stubActivationKey();

		_stubAddLicenseKey();

		_licenseKeyGenerationService.generateActivationKey(
			_toGenerateRequest(Arrays.asList(1L, 2L), 1L));

		ArgumentCaptor<String> licenseEntryNameArgumentCaptor =
			ArgumentCaptor.forClass(String.class);
		ArgumentCaptor<String> productNameArgumentCaptor =
			ArgumentCaptor.forClass(String.class);

		Mockito.verify(
			_licenseKeyGenerator, Mockito.times(2)
		).generateKey(
			Mockito.any(), licenseEntryNameArgumentCaptor.capture(),
			Mockito.any(), Mockito.anyInt(),
			productNameArgumentCaptor.capture(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.anyInt(), Mockito.anyInt(), Mockito.anyInt(),
			Mockito.anyLong(), Mockito.anyLong(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any()
		);

		Assertions.assertEquals(
			Arrays.asList("DXP Backup", "DXP Backup"),
			licenseEntryNameArgumentCaptor.getAllValues());

		Assertions.assertEquals(
			Arrays.asList("DXP Backup", "Digital Sales Room"),
			productNameArgumentCaptor.getAllValues());

		Assertions.assertEquals(
			Collections.singletonList("DXP"),
			_getInvocationArguments(
				_activationKeyService, "addActivationKey", 3));
		Assertions.assertEquals(
			Arrays.asList("DXP", "DSR"),
			_getInvocationArguments(_licenseKeyService, "addLicenseKey", 15));
	}

	@Test
	public void testGenerateActivationKeyChargesTheSelectedKeyType()
		throws Exception {

		_stubEntitlements(
			_toEntitlement(1L, 5.0, "PRDCT-DXP"),
			_toEntitlement(2L, 5.0, "PRDCT-DXP"),
			_toEntitlement(3L, 5.0, "PRDCT-ADDON"));

		_stubLicensedProducts();

		_stubActivationKey();

		_stubAddLicenseKey();

		_licenseKeyGenerationService.generateActivationKey(
			_toGenerateRequest(Arrays.asList(1L, 3L), 2L));

		ArgumentCaptor<Long> entitlementIdArgumentCaptor =
			ArgumentCaptor.forClass(Long.class);

		Mockito.verify(
			_licenseKeyService, Mockito.times(2)
		).addLicenseKey(
			Mockito.anyLong(), Mockito.any(), Mockito.anyLong(),
			Mockito.anyBoolean(), Mockito.any(), Mockito.anyBoolean(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.anyLong(),
			entitlementIdArgumentCaptor.capture(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.anyInt(), Mockito.any(), Mockito.anyInt(),
			Mockito.anyLong(), Mockito.anyInt(), Mockito.anyInt(),
			Mockito.anyLong(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any()
		);

		Assertions.assertEquals(
			Arrays.asList(2L, 3L), entitlementIdArgumentCaptor.getAllValues());
	}

	@Test
	public void testGenerateActivationKeyComplimentaryBundlesNothingElse()
		throws Exception {

		_stubEntitlements(
			_toComplimentaryEntitlement(1L, 1.0), _toEntitlement(2L, 5.0));

		_stubLicensedProducts();

		_stubActivationKey();

		_licenseKeyGenerationService.generateActivationKey(
			new LicenseKeyGenerationService.GenerateRequest(
				Arrays.asList(1L, 2L), "us-east-1", "Description",
				"Environment", "complimentary", _toProject(), "Load testing",
				null, _toServers(1), null, 1L, "DXP 7.4", "Workspace One",
				"owner@example.com"));

		Mockito.verify(
			_licenseKeyService, Mockito.times(1)
		).addLicenseKey(
			Mockito.anyLong(), Mockito.any(), Mockito.anyLong(),
			Mockito.anyBoolean(), Mockito.any(), Mockito.anyBoolean(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.anyLong(),
			Mockito.eq(1L), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.anyInt(), Mockito.any(), Mockito.anyInt(),
			Mockito.anyLong(), Mockito.anyInt(), Mockito.anyInt(),
			Mockito.anyLong(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any()
		);
	}

	@Test
	public void testGenerateActivationKeyComplimentaryChecksInsideTheLock()
		throws Exception {

		List<String> events = new ArrayList<>();

		ReflectionTestUtils.setField(
			_licenseKeyGenerationService, "_keyedLock",
			new KeyedLock() {

				@Override
				public <T, E extends Throwable> T withLock(
						String key, UnsafeSupplier<T, E> unsafeSupplier)
					throws E {

					events.add("lock " + key);

					try {
						return super.withLock(key, unsafeSupplier);
					}
					finally {
						events.add("unlock " + key);
					}
				}

			});

		Mockito.when(
			_licenseKeyGenerateFormService.isAllowComplimentary(
				Mockito.anyLong())
		).thenAnswer(
			invocation -> {
				events.add("isAllowComplimentary");

				return true;
			}
		);

		Mockito.when(
			_activationKeyService.getActivationKeysCount(
				Mockito.anyBoolean(), Mockito.anyString(), Mockito.anyString())
		).thenAnswer(
			invocation -> {
				events.add(
					"getActivationKeysCount " +
						Arrays.toString(invocation.getArguments()));

				return 0;
			}
		);

		_stubEntitlements(_toComplimentaryEntitlement(1L, 1.0));

		_stubLicensedProducts();

		_stubActivationKey();

		_stubAddLicenseKey();

		_licenseKeyGenerationService.generateActivationKey(
			_toComplimentaryGenerateRequest(1));

		Assertions.assertEquals(
			Arrays.asList(
				"lock project-PROJ-1", "isAllowComplimentary",
				"getActivationKeysCount [true, PROJ-1, complimentary]",
				"unlock project-PROJ-1"),
			events);
	}

	@Test
	public void testGenerateActivationKeyComplimentaryDoesNotOutliveTheSubscription()
		throws Exception {

		Date endDate = _toDateDaysFromNow(10);

		_stubEntitlements(
			_toEntitlementOfKeyType(
				1L, 1.0, "complimentary", 45,
				endDate.toInstant(
				).toString()));

		_stubLicensedProducts();

		_stubActivationKey();

		_licenseKeyGenerationService.generateActivationKey(
			_toComplimentaryGenerateRequest(1));

		Assertions.assertEquals(
			Collections.singletonList(endDate),
			_getInvocationArguments(
				_activationKeyService, "addActivationKey", 2));
	}

	@Test
	public void testGenerateActivationKeyComplimentaryExpiresAfterTheDefinitionDuration()
		throws Exception {

		_stubEntitlements(
			_toEntitlementOfKeyType(
				1L, 1.0, "complimentary", 45,
				_toDateDaysFromNow(
					90
				).toInstant(
				).toString()));

		_stubLicensedProducts();

		_stubActivationKey();

		_licenseKeyGenerationService.generateActivationKey(
			_toComplimentaryGenerateRequest(1));

		Assertions.assertEquals(
			TimeUnit.DAYS.toMillis(45), _getComplimentaryTermMillis());
	}

	@Test
	public void testGenerateActivationKeyComplimentaryFallsBackToThirtyDaysWithoutADuration()
		throws Exception {

		_stubEntitlements(
			_toEntitlementOfKeyType(
				1L, 1.0, "complimentary", 0,
				_toDateDaysFromNow(
					90
				).toInstant(
				).toString()));

		_stubLicensedProducts();

		_stubActivationKey();

		_licenseKeyGenerationService.generateActivationKey(
			_toComplimentaryGenerateRequest(1));

		Assertions.assertEquals(
			TimeUnit.DAYS.toMillis(30), _getComplimentaryTermMillis());
	}

	@Test
	public void testGenerateActivationKeyComplimentaryIsFlaggedAndTimeBoxed()
		throws Exception {

		_stubEntitlements(_toComplimentaryEntitlement(1L, 1.0));

		_stubLicensedProducts();

		_stubActivationKey();

		long before = System.currentTimeMillis();

		_licenseKeyGenerationService.generateActivationKey(
			new LicenseKeyGenerationService.GenerateRequest(
				Collections.singletonList(1L), "us-east-1", "Description",
				"Environment", "complimentary", _toProject(), "Load testing",
				null, _toServers(1), null, 1L, "DXP 7.4", "Workspace One",
				"owner@example.com"));

		ArgumentCaptor<Date> expirationDateArgumentCaptor =
			ArgumentCaptor.forClass(Date.class);
		ArgumentCaptor<Date> startDateArgumentCaptor = ArgumentCaptor.forClass(
			Date.class);

		Mockito.verify(
			_activationKeyService
		).addActivationKey(
			Mockito.anyLong(), Mockito.eq(true),
			expirationDateArgumentCaptor.capture(), Mockito.any(),
			Mockito.any(), startDateArgumentCaptor.capture(),
			Mockito.eq("complimentary")
		);

		Date expirationDate = expirationDateArgumentCaptor.getValue();

		Date startDate = startDateArgumentCaptor.getValue();

		Assertions.assertTrue(startDate.getTime() >= (before - 1000));

		Assertions.assertEquals(
			TimeUnit.DAYS.toMillis(30),
			expirationDate.getTime() - startDate.getTime());
	}

	@Test
	public void testGenerateActivationKeyComplimentaryIsSizing4()
		throws Exception {

		_stubEntitlements(_toComplimentaryEntitlement(1L, 1.0));

		_stubLicensedProducts();

		_stubActivationKey();

		_stubAddLicenseKey();

		_licenseKeyGenerationService.generateActivationKey(
			_toComplimentaryGenerateRequest(1));

		Assertions.assertEquals(
			Collections.singletonList("Sizing 4"),
			_getInvocationArguments(_licenseKeyService, "addLicenseKey", 33));
		Assertions.assertEquals(
			Collections.singletonList("Sizing 4"),
			_getInvocationArguments(_licenseKeyGenerator, "generateKey", 13));
		Assertions.assertEquals(
			Collections.singletonList("Sizing 4"),
			_getInvocationArguments(_licenseKeyExporter, "toXML", 14));
	}

	@Test
	public void testGenerateActivationKeyComplimentaryKeepsTheIssuedTermWhenTheDefinitionChanges()
		throws Exception {

		_stubEntitlements(_toComplimentaryEntitlement(1L, 1.0));

		_stubLicensedProducts();

		_stubActivationKey();

		_stubAddLicenseKey();

		_licenseKeyGenerationService.generateActivationKey(
			_toComplimentaryGenerateRequest(1));

		List<Object> issuedStartDates = _getInvocationArguments(
			_licenseKeyService, "addLicenseKey", 34);
		List<Object> issuedExpirationDates = _getInvocationArguments(
			_licenseKeyService, "addLicenseKey", 11);
		List<Object> issuedXMLs = _getInvocationArguments(
			_licenseKeyService, "addLicenseKey", 14);

		_stubEntitlements(
			_toEntitlementOfKeyType(1L, 1.0, "complimentary", 45, null));

		_licenseKeyGenerationService.generateActivationKey(
			_toComplimentaryGenerateRequest(1));

		List<Object> startDates = _getInvocationArguments(
			_licenseKeyService, "addLicenseKey", 34);
		List<Object> expirationDates = _getInvocationArguments(
			_licenseKeyService, "addLicenseKey", 11);
		List<Object> xmls = _getInvocationArguments(
			_licenseKeyService, "addLicenseKey", 14);

		Date firstExpirationDate = (Date)expirationDates.get(0);
		Date firstStartDate = (Date)startDates.get(0);
		Date secondExpirationDate = (Date)expirationDates.get(1);
		Date secondStartDate = (Date)startDates.get(1);

		Assertions.assertEquals(2, startDates.size());
		Assertions.assertEquals(issuedStartDates.get(0), firstStartDate);
		Assertions.assertEquals(
			issuedExpirationDates.get(0), firstExpirationDate);
		Assertions.assertEquals(issuedXMLs.get(0), xmls.get(0));
		Assertions.assertEquals(
			TimeUnit.DAYS.toMillis(30),
			firstExpirationDate.getTime() - firstStartDate.getTime());
		Assertions.assertEquals(
			TimeUnit.DAYS.toMillis(45),
			secondExpirationDate.getTime() - secondStartDate.getTime());

		Mockito.verify(
			_activationKeyService, Mockito.never()
		).deactivatePartialActivationKey(
			Mockito.any()
		);

		Mockito.verify(
			_activationKeyService, Mockito.never()
		).updateActivationKeyActive(
			Mockito.anyLong(), Mockito.anyBoolean()
		);

		Mockito.verify(
			_licenseKeyService, Mockito.never()
		).updateLicenseKey(
			Mockito.anyBoolean(), Mockito.anyBoolean(), Mockito.anyLong()
		);

		Mockito.verify(
			_licenseKeyService, Mockito.never()
		).updateLicenseKeyActive(
			Mockito.anyBoolean(), Mockito.anyLong()
		);
	}

	@Test
	public void testGenerateActivationKeyComplimentaryRejectsAMissingPurpose()
		throws Exception {

		_stubEntitlements(_toComplimentaryEntitlement(1L, 1.0));

		_stubLicensedProducts();

		for (String purpose : new String[] {null, "", "   "}) {
			LicenseKeyValidationException licenseKeyValidationException =
				Assertions.assertThrows(
					LicenseKeyValidationException.class,
					() -> _licenseKeyGenerationService.generateActivationKey(
						_toComplimentaryGenerateRequest(purpose, 1, null)));

			Assertions.assertEquals(
				"A complimentary key requires a purpose",
				licenseKeyValidationException.getMessage());
		}

		_verifyNoActivationKeyAdded();

		Mockito.verifyNoInteractions(_licenseKeyService);
	}

	@Test
	public void testGenerateActivationKeyComplimentaryRejectsAProductionEntitlement()
		throws Exception {

		_stubEntitlements(_toEntitlementOfKeyType(1L, 5.0, "production"));

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateActivationKey(
					_toComplimentaryGenerateRequest(1)));

		Assertions.assertEquals(
			"The selected entitlement does not grant a complimentary key",
			licenseKeyEntitlementException.getMessage());

		_verifyNoActivationKeyAdded();

		Mockito.verifyNoInteractions(_licenseKeyService);
	}

	@Test
	public void testGenerateActivationKeyComplimentaryRejectsASecondServer()
		throws Exception {

		_stubEntitlements(_toComplimentaryEntitlement(1L, 5.0));

		_stubLicensedProducts();

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateActivationKey(
					_toComplimentaryGenerateRequest(2)));

		Assertions.assertEquals(
			"A complimentary key covers exactly one server",
			licenseKeyEntitlementException.getMessage());

		_verifyNoActivationKeyAdded();

		Mockito.verifyNoInteractions(_licenseKeyService);
	}

	@Test
	public void testGenerateActivationKeyComplimentaryRejectsAStartDateAfterTheSubscriptionEnd()
		throws Exception {

		_stubEntitlements(
			_toEntitlementOfKeyType(
				1L, 1.0, "complimentary", 0,
				_toDateDaysFromNow(
					60
				).toInstant(
				).toString()));

		_stubLicensedProducts();

		LicenseKeyDateException licenseKeyDateException =
			Assertions.assertThrows(
				LicenseKeyDateException.class,
				() -> _licenseKeyGenerationService.generateActivationKey(
					_toComplimentaryGenerateRequest(
						"Load testing", 1, _toDateDaysFromNow(90))));

		Assertions.assertEquals(
			"The start date must be before the subscription end date",
			licenseKeyDateException.getMessage());

		_verifyNoActivationKeyAdded();

		Mockito.verifyNoInteractions(_licenseKeyService);
	}

	@Test
	public void testGenerateActivationKeyComplimentaryRejectsAStartDateOnTheSubscriptionEnd()
		throws Exception {

		Date endDate = _toDateDaysFromNow(60);

		_stubEntitlements(
			_toEntitlementOfKeyType(
				1L, 1.0, "complimentary", 0,
				endDate.toInstant(
				).toString()));

		_stubLicensedProducts();

		LicenseKeyDateException licenseKeyDateException =
			Assertions.assertThrows(
				LicenseKeyDateException.class,
				() -> _licenseKeyGenerationService.generateActivationKey(
					_toComplimentaryGenerateRequest(
						"Load testing", 1, endDate)));

		Assertions.assertEquals(
			"The start date must be before the subscription end date",
			licenseKeyDateException.getMessage());

		_verifyNoActivationKeyAdded();

		Mockito.verifyNoInteractions(_licenseKeyService);
	}

	@Test
	public void testGenerateActivationKeyComplimentaryRejectsAnExpiredTerm()
		throws Exception {

		_stubEntitlements(_toComplimentaryEntitlement(1L, 1.0));

		_stubLicensedProducts();

		LicenseKeyDateException licenseKeyDateException =
			Assertions.assertThrows(
				LicenseKeyDateException.class,
				() -> _licenseKeyGenerationService.generateActivationKey(
					_toComplimentaryGenerateRequest(
						"Load testing", 1, _toDateDaysAgo(40))));

		Assertions.assertEquals(
			"Invalid start date or expiration date",
			licenseKeyDateException.getMessage());

		_verifyNoActivationKeyAdded();
	}

	@Test
	public void testGenerateActivationKeyComplimentaryRejectsAnOverLongPurpose()
		throws Exception {

		_stubEntitlements(_toComplimentaryEntitlement(1L, 1.0));

		_stubLicensedProducts();

		LicenseKeyValidationException licenseKeyValidationException =
			Assertions.assertThrows(
				LicenseKeyValidationException.class,
				() -> _licenseKeyGenerationService.generateActivationKey(
					_toComplimentaryGenerateRequest("a".repeat(256), 1, null)));

		Assertions.assertEquals(
			"The purpose exceeds 255 characters",
			licenseKeyValidationException.getMessage());

		_verifyNoActivationKeyAdded();

		Mockito.verifyNoInteractions(_licenseKeyService);
	}

	@Test
	public void testGenerateActivationKeyComplimentaryStoresThePurpose()
		throws Exception {

		_stubEntitlements(_toComplimentaryEntitlement(1L, 1.0));

		_stubLicensedProducts();

		_stubActivationKey();

		_stubAddLicenseKey();

		_licenseKeyGenerationService.generateActivationKey(
			_toComplimentaryGenerateRequest("Load testing", 1, null));

		Assertions.assertEquals(
			Collections.singletonList("{\"purpose\":\"Load testing\"}"),
			_getInvocationArguments(_licenseKeyService, "addLicenseKey", 4));
	}

	@Test
	public void testGenerateActivationKeyComplimentaryUsesTheRequestedStartDate()
		throws Exception {

		_stubEntitlements(_toComplimentaryEntitlement(1L, 1.0));

		_stubLicensedProducts();

		_stubActivationKey();

		_stubAddLicenseKey();

		Date requestedStartDate = _toDateDaysAgo(10);

		_licenseKeyGenerationService.generateActivationKey(
			_toComplimentaryGenerateRequest(
				"Load testing", 1, requestedStartDate));

		ArgumentCaptor<Date> expirationDateArgumentCaptor =
			ArgumentCaptor.forClass(Date.class);
		ArgumentCaptor<Date> startDateArgumentCaptor = ArgumentCaptor.forClass(
			Date.class);

		Mockito.verify(
			_activationKeyService
		).addActivationKey(
			Mockito.anyLong(), Mockito.eq(true),
			expirationDateArgumentCaptor.capture(), Mockito.any(),
			Mockito.any(), startDateArgumentCaptor.capture(),
			Mockito.eq("complimentary")
		);

		Date expirationDate = expirationDateArgumentCaptor.getValue();

		Date startDate = startDateArgumentCaptor.getValue();

		Assertions.assertEquals(requestedStartDate, startDate);
		Assertions.assertEquals(
			TimeUnit.DAYS.toMillis(30),
			expirationDate.getTime() - startDate.getTime());
	}

	@Test
	public void testGenerateActivationKeyComplimentaryWhileTheProjectHasOne()
		throws Exception {

		_stubEntitlements(_toEntitlement(1L, 1.0));

		_stubLicensedProducts();

		Mockito.when(
			_activationKeyService.getActivationKeysCount(
				true, "PROJ-1", "complimentary")
		).thenReturn(
			1
		);

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateActivationKey(
					_toComplimentaryGenerateRequest(1)));

		Assertions.assertEquals(
			"The project already has a complimentary key that has not been " +
				"deactivated",
			licenseKeyEntitlementException.getMessage());

		_verifyNoActivationKeyAdded();
	}

	@Test
	public void testGenerateActivationKeyComplimentaryWithoutActivationsLeft()
		throws Exception {

		_stubEntitlements(_toComplimentaryEntitlement(1L, 1.0));

		_stubLicensedProducts();

		Mockito.when(
			_licenseKeyService.getActiveLicenseKeyCounts(
				Mockito.anyList(), Mockito.anyCollection(), Mockito.anyString())
		).thenReturn(
			HashMapBuilder.put(
				1L, 1
			).build()
		);

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateActivationKey(
					new LicenseKeyGenerationService.GenerateRequest(
						Collections.singletonList(1L), "us-east-1",
						"Description", "Environment", "complimentary",
						_toProject(), "Load testing", null, _toServers(1), null,
						1L, "DXP 7.4", "Workspace One", "owner@example.com")));

		Assertions.assertTrue(
			licenseKeyEntitlementException.getMessage(
			).contains(
				"0 activations left"
			));
	}

	@Test
	public void testGenerateActivationKeyComplimentaryWithoutAllowComplimentary()
		throws Exception {

		_stubEntitlements(_toEntitlement(1L, 1.0));

		_stubLicensedProducts();

		Mockito.when(
			_licenseKeyGenerateFormService.isAllowComplimentary(
				Mockito.anyLong())
		).thenReturn(
			false
		);

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateActivationKey(
					_toComplimentaryGenerateRequest(1)));

		Assertions.assertEquals(
			"The account is not allowed to generate a complimentary key",
			licenseKeyEntitlementException.getMessage());

		_verifyNoActivationKeyAdded();
	}

	@Test
	public void testGenerateActivationKeyDeactivatesThePartialActivationKey()
		throws Exception {

		_stubEntitlements(_toEntitlement(1L, 5.0));

		_stubLicensedProducts();

		ActivationKey activationKey = _stubActivationKey();

		Mockito.when(
			_licenseKeyService.addLicenseKey(
				Mockito.anyLong(), Mockito.any(), Mockito.anyLong(),
				Mockito.anyBoolean(), Mockito.any(), Mockito.anyBoolean(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.anyLong(),
				Mockito.anyLong(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.anyInt(), Mockito.any(), Mockito.anyInt(),
				Mockito.anyLong(), Mockito.anyInt(), Mockito.anyInt(),
				Mockito.anyLong(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.any())
		).thenThrow(
			new RuntimeException("The license key could not be added")
		);

		Assertions.assertThrows(
			RuntimeException.class,
			() -> _licenseKeyGenerationService.generateActivationKey(
				_toGenerateRequest(Collections.singletonList(1L), 1L)));

		Mockito.verify(
			_activationKeyService
		).deactivatePartialActivationKey(
			activationKey
		);
	}

	@Test
	public void testGenerateActivationKeyFlagsComplimentaryLicenseKeys()
		throws Exception {

		_stubEntitlements(_toComplimentaryEntitlement(1L, 1.0));

		_stubLicensedProducts();

		_stubActivationKey();

		_stubAddLicenseKey();

		_licenseKeyGenerationService.generateActivationKey(
			new LicenseKeyGenerationService.GenerateRequest(
				Collections.emptyList(), "us-east-1", "Description",
				"Environment", "complimentary", _toProject(), "Load testing",
				null, _toServers(1), null, 1L, "DXP 7.4", "Workspace One",
				"owner@example.com"));

		Mockito.verify(
			_licenseKeyService, Mockito.times(1)
		).addLicenseKey(
			Mockito.anyLong(), Mockito.any(), Mockito.anyLong(),
			Mockito.anyBoolean(), Mockito.any(), Mockito.eq(true),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.anyLong(),
			Mockito.anyLong(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.anyInt(), Mockito.any(), Mockito.anyInt(),
			Mockito.anyLong(), Mockito.anyInt(), Mockito.anyInt(),
			Mockito.anyLong(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any()
		);
	}

	@Test
	public void testGenerateActivationKeyForAccountKeepsTheDatesOfAStartedEntitlement()
		throws Exception {

		Entitlement leadingEntitlement = _toTrialEntitlement(
			1L, "2027-08-09T00:00:00Z", 30, "PRDCT-DXP");
		Entitlement addOnEntitlement = _toTrialEntitlement(
			2L, "2027-08-09T00:00:00Z", 30, "PRDCT-DSR");

		_stubUnassignedEntitlements(leadingEntitlement, addOnEntitlement);

		_stubBundledProducts(addOnEntitlement, leadingEntitlement);

		_stubActivationKey();

		_stubAddLicenseKey();

		_licenseKeyGenerationService.generateActivationKey(
			_toAccount(),
			_toAccountGenerateRequest(
				Arrays.asList(1L, 2L), "DXP Backup", null, 1L));

		Assertions.assertEquals(
			Collections.singletonList(
				Date.from(Instant.parse("2027-08-09T00:00:00Z"))),
			_getInvocationArguments(
				_activationKeyService, "addActivationKey", 2));

		Mockito.verify(
			_entitlementService, Mockito.never()
		).updateEntitlementDates(
			Mockito.any(), Mockito.anyLong(), Mockito.any()
		);
	}

	@Test
	public void testGenerateActivationKeyForAccountRejectsAComplimentaryKey()
		throws Exception {

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateActivationKey(
					_toAccount(),
					_toAccountGenerateRequest(
						Collections.emptyList(), "complimentary", null, 1L)));

		Assertions.assertEquals(
			"A complimentary key requires a project",
			licenseKeyEntitlementException.getMessage());

		Mockito.verifyNoInteractions(_entitlementService);

		_verifyNoActivationKeyAdded();
	}

	@Test
	public void testGenerateActivationKeyForAccountRejectsARenewal()
		throws Exception {

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateActivationKey(
					_toAccount(),
					_toAccountGenerateRequest(
						Collections.singletonList(1L), "DXP Backup", "ACTVK-1",
						1L)));

		Assertions.assertEquals(
			"An activation key without a project cannot be renewed",
			licenseKeyEntitlementException.getMessage());

		Mockito.verifyNoInteractions(_entitlementService);

		_verifyNoActivationKeyAdded();
	}

	@Test
	public void testGenerateActivationKeyForAccountRejectsAnUnentitledSubscription()
		throws Exception {

		_stubUnassignedEntitlements(
			_toTrialEntitlement(1L, null, 30, "PRDCT-DXP"));

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateActivationKey(
					_toAccount(),
					_toAccountGenerateRequest(
						Collections.singletonList(1L), "DXP Backup", null,
						99L)));

		Assertions.assertEquals(
			"The account is not entitled to the selected subscription",
			licenseKeyEntitlementException.getMessage());
	}

	@Test
	public void testGenerateActivationKeyForAccountRestoresTheDatesOfAFailedKey()
		throws Exception {

		Entitlement leadingEntitlement = _toTrialEntitlement(
			1L, null, 30, "PRDCT-DXP");
		Entitlement addOnEntitlement = _toTrialEntitlement(
			2L, null, 30, "PRDCT-DSR");

		_stubUnassignedEntitlements(leadingEntitlement, addOnEntitlement);

		_stubBundledProducts(addOnEntitlement, leadingEntitlement);

		_stubActivationKey();

		_stubAddLicenseKey();

		Mockito.doThrow(
			new RuntimeException("Unavailable")
		).when(
			_entitlementService
		).updateEntitlementDates(
			Mockito.any(), Mockito.eq(1L), Mockito.any()
		);

		Assertions.assertThrows(
			RuntimeException.class,
			() -> _licenseKeyGenerationService.generateActivationKey(
				_toAccount(),
				_toAccountGenerateRequest(
					Arrays.asList(1L, 2L), "DXP Backup", null, 1L)));

		Mockito.verify(
			_entitlementService
		).updateEntitlementDates(
			Mockito.isNull(), Mockito.eq(2L), Mockito.isNull()
		);
	}

	@Test
	public void testGenerateActivationKeyForAccountStartsNoBundleEntitlementWithoutADuration()
		throws Exception {

		Entitlement leadingEntitlement = _toTrialEntitlement(
			1L, null, 30, "PRDCT-DXP");
		Entitlement addOnEntitlement = _toTrialEntitlement(
			2L, null, 0, "PRDCT-DSR");

		_stubUnassignedEntitlements(leadingEntitlement, addOnEntitlement);

		_stubBundledProducts(addOnEntitlement, leadingEntitlement);

		_stubActivationKey();

		_stubAddLicenseKey();

		_licenseKeyGenerationService.generateActivationKey(
			_toAccount(),
			_toAccountGenerateRequest(
				Arrays.asList(1L, 2L), "DXP Backup", null, 1L));

		Mockito.verify(
			_entitlementService
		).updateEntitlementDates(
			Mockito.any(), Mockito.eq(1L), Mockito.any()
		);

		Mockito.verify(
			_entitlementService, Mockito.never()
		).updateEntitlementDates(
			Mockito.any(), Mockito.eq(2L), Mockito.any()
		);
	}

	@Test
	public void testGenerateActivationKeyForAccountStartsOnlyTheUnstartedEntitlements()
		throws Exception {

		Entitlement leadingEntitlement = _toTrialEntitlement(
			1L, null, 30, "PRDCT-DXP");
		Entitlement addOnEntitlement = _toTrialEntitlement(
			2L, "2027-08-09T00:00:00Z", 30, "PRDCT-DSR");

		_stubUnassignedEntitlements(leadingEntitlement, addOnEntitlement);

		_stubBundledProducts(addOnEntitlement, leadingEntitlement);

		_stubActivationKey();

		_stubAddLicenseKey();

		_licenseKeyGenerationService.generateActivationKey(
			_toAccount(),
			_toAccountGenerateRequest(
				Arrays.asList(1L, 2L), "DXP Backup", null, 1L));

		Mockito.verify(
			_entitlementService
		).updateEntitlementDates(
			Mockito.eq(Instant.parse("2027-08-09T00:00:00Z")), Mockito.eq(1L),
			Mockito.any()
		);

		Mockito.verify(
			_entitlementService, Mockito.never()
		).updateEntitlementDates(
			Mockito.any(), Mockito.eq(2L), Mockito.any()
		);
	}

	@Test
	public void testGenerateActivationKeyForAccountStartsTheAddOnWithTheSubscriptionDates()
		throws Exception {

		Entitlement leadingEntitlement = _toTrialEntitlement(
			1L, "2027-08-09T00:00:00Z", 30, "PRDCT-DXP");
		Entitlement addOnEntitlement = _toTrialEntitlement(
			2L, null, 30, "PRDCT-DSR");

		_stubUnassignedEntitlements(leadingEntitlement, addOnEntitlement);

		_stubBundledProducts(addOnEntitlement, leadingEntitlement);

		_stubActivationKey();

		_stubAddLicenseKey();

		_licenseKeyGenerationService.generateActivationKey(
			_toAccount(),
			_toAccountGenerateRequest(
				Arrays.asList(1L, 2L), "DXP Backup", null, 1L));

		Assertions.assertEquals(
			Collections.singletonList(
				Date.from(Instant.parse("2027-08-09T00:00:00Z"))),
			_getInvocationArguments(
				_activationKeyService, "addActivationKey", 2));

		Mockito.verify(
			_entitlementService
		).updateEntitlementDates(
			Mockito.eq(Instant.parse("2027-08-09T00:00:00Z")), Mockito.eq(2L),
			Mockito.any()
		);

		Mockito.verify(
			_entitlementService, Mockito.never()
		).updateEntitlementDates(
			Mockito.any(), Mockito.eq(1L), Mockito.any()
		);
	}

	@Test
	public void testGenerateActivationKeyForAccountStartsTheLicenseKeyDuration()
		throws Exception {

		Entitlement leadingEntitlement = _toTrialEntitlement(
			1L, null, 30, "PRDCT-DXP");
		Entitlement addOnEntitlement = _toTrialEntitlement(
			2L, null, 30, "PRDCT-DSR");

		_stubUnassignedEntitlements(leadingEntitlement, addOnEntitlement);

		_stubBundledProducts(addOnEntitlement, leadingEntitlement);

		_stubActivationKey();

		_stubAddLicenseKey();

		long millis = System.currentTimeMillis();

		_licenseKeyGenerationService.generateActivationKey(
			_toAccount(),
			_toAccountGenerateRequest(
				Arrays.asList(1L, 2L), "DXP Backup", null, 1L));

		Date expirationDate = (Date)_getInvocationArguments(
			_activationKeyService, "addActivationKey", 2
		).get(
			0
		);
		Date startDate = (Date)_getInvocationArguments(
			_activationKeyService, "addActivationKey", 5
		).get(
			0
		);

		Assertions.assertEquals(
			TimeUnit.DAYS.toMillis(30),
			expirationDate.getTime() - startDate.getTime());
		Assertions.assertEquals(0, startDate.getTime() % 1000);
		Assertions.assertTrue(
			Math.abs(startDate.getTime() - millis) < TimeUnit.MINUTES.toMillis(
				1));

		for (long entitlementId : new long[] {1L, 2L}) {
			Mockito.verify(
				_entitlementService
			).updateEntitlementDates(
				expirationDate.toInstant(), entitlementId, startDate.toInstant()
			);
		}

		Assertions.assertEquals(
			Arrays.asList(expirationDate, expirationDate),
			_getInvocationArguments(_licenseKeyService, "addLicenseKey", 11));
	}

	@Test
	public void testGenerateActivationKeyForAccountStartsTheSubscriptionLast()
		throws Exception {

		Entitlement leadingEntitlement = _toTrialEntitlement(
			1L, null, 30, "PRDCT-DXP");
		Entitlement addOnEntitlement = _toTrialEntitlement(
			2L, null, 30, "PRDCT-DSR");

		_stubUnassignedEntitlements(leadingEntitlement, addOnEntitlement);

		_stubBundledProducts(addOnEntitlement, leadingEntitlement);

		ActivationKey activationKey = _stubActivationKey();

		_stubAddLicenseKey();

		Mockito.doThrow(
			new RuntimeException("Unavailable")
		).when(
			_entitlementService
		).updateEntitlementDates(
			Mockito.any(), Mockito.eq(2L), Mockito.any()
		);

		Assertions.assertThrows(
			RuntimeException.class,
			() -> _licenseKeyGenerationService.generateActivationKey(
				_toAccount(),
				_toAccountGenerateRequest(
					Arrays.asList(1L, 2L), "DXP Backup", null, 1L)));

		Mockito.verify(
			_entitlementService, Mockito.never()
		).updateEntitlementDates(
			Mockito.any(), Mockito.eq(1L), Mockito.any()
		);

		Mockito.verify(
			_activationKeyService
		).deactivatePartialActivationKey(
			activationKey
		);
	}

	@Test
	public void testGenerateActivationKeyForAccountUsesTheSubscriptionOfTheAddOnTrial()
		throws Exception {

		Entitlement leadingEntitlement = _toTrialEntitlement(
			11L, 1L, "2027-08-09T00:00:00Z", "PRDCT-DXP");
		Entitlement addOnEntitlement = _toTrialEntitlement(
			12L, 2L, "2027-08-09T00:00:00Z", "PRDCT-DSR");
		Entitlement otherLeadingEntitlement = _toTrialEntitlement(
			21L, 3L, null, "PRDCT-DXP");

		_stubUnassignedEntitlements(
			otherLeadingEntitlement, leadingEntitlement, addOnEntitlement);

		_stubBundledProducts(addOnEntitlement, leadingEntitlement);

		_stubOrderItems(12L, 100L, 11L, 12L);

		_stubActivationKey();

		_stubAddLicenseKey();

		_licenseKeyGenerationService.generateActivationKey(
			_toAccount(),
			_toAccountGenerateRequest(
				Arrays.asList(3L, 2L), "DXP Backup", null, 3L));

		Assertions.assertEquals(
			Collections.singletonList(
				Date.from(Instant.parse("2027-08-09T00:00:00Z"))),
			_getInvocationArguments(
				_activationKeyService, "addActivationKey", 2));

		Mockito.verify(
			_entitlementService, Mockito.never()
		).updateEntitlementDates(
			Mockito.any(), Mockito.anyLong(), Mockito.any()
		);
	}

	@Test
	public void testGenerateActivationKeyForAccountUsesTheSubscriptionOfTheUnstartedAddOnTrial()
		throws Exception {

		Entitlement leadingEntitlement = _toTrialEntitlement(
			11L, 1L, null, "PRDCT-DXP");
		Entitlement addOnEntitlement = _toTrialEntitlement(
			12L, 2L, null, "PRDCT-DSR");
		Entitlement otherLeadingEntitlement = _toTrialEntitlement(
			21L, 3L, null, "PRDCT-DXP");

		_stubUnassignedEntitlements(
			otherLeadingEntitlement, leadingEntitlement, addOnEntitlement);

		_stubBundledProducts(addOnEntitlement, leadingEntitlement);

		_stubActivationKey();

		_stubAddLicenseKey();

		_stubOrderItems(12L, 100L, 11L, 12L);

		_licenseKeyGenerationService.generateActivationKey(
			_toAccount(),
			_toAccountGenerateRequest(
				Arrays.asList(3L, 2L), "DXP Backup", null, 3L));

		Mockito.verify(
			_entitlementService
		).updateEntitlementDates(
			Mockito.any(), Mockito.eq(1L), Mockito.any()
		);

		Mockito.verify(
			_entitlementService
		).updateEntitlementDates(
			Mockito.any(), Mockito.eq(2L), Mockito.any()
		);

		Mockito.verify(
			_entitlementService, Mockito.never()
		).updateEntitlementDates(
			Mockito.any(), Mockito.eq(3L), Mockito.any()
		);
	}

	@Test
	public void testGenerateActivationKeyForAccountUsesTheUnassignedEntitlements()
		throws Exception {

		Entitlement leadingEntitlement = _toEntitlement(1L, 5.0, "PRDCT-DXP");
		Entitlement addOnEntitlement = _toEntitlement(2L, 5.0, "PRDCT-DSR");

		_stubUnassignedEntitlements(leadingEntitlement, addOnEntitlement);

		_stubBundledProducts(addOnEntitlement, leadingEntitlement);

		ActivationKey activationKey = _stubActivationKey();

		_stubAddLicenseKey();

		Assertions.assertSame(
			activationKey,
			_licenseKeyGenerationService.generateActivationKey(
				_toAccount(),
				_toAccountGenerateRequest(
					Arrays.asList(1L, 2L), "DXP Backup", null, 1L)));

		Mockito.verify(
			_entitlementService
		).getActiveSelfServiceTrialEntitlements(
			_ACCOUNT_ID
		);

		Mockito.verify(
			_entitlementService, Mockito.never()
		).getActiveEntitlements(
			Mockito.anyString()
		);

		Mockito.verify(
			_licenseKeyService
		).getActiveUnassignedLicenseKeyCounts(
			_ACCOUNT_ID
		);

		Mockito.verify(
			_licenseKeyService, Mockito.never()
		).getActiveLicenseKeyCounts(
			Mockito.anyList(), Mockito.anyCollection(), Mockito.anyString()
		);

		Assertions.assertEquals(
			Collections.singletonList(_ACCOUNT_ID),
			_getInvocationArguments(
				_activationKeyService, "addActivationKey", 0));
		Assertions.assertEquals(
			Collections.singletonList(null),
			_getInvocationArguments(
				_activationKeyService, "addActivationKey", 4));
		Assertions.assertEquals(
			Arrays.asList("Account One", "Account One"),
			_getInvocationArguments(_licenseKeyService, "addLicenseKey", 1));
		Assertions.assertEquals(
			Arrays.asList(null, null),
			_getInvocationArguments(_licenseKeyService, "addLicenseKey", 31));
	}

	@Test
	public void testGenerateActivationKeyForAccountWithoutActivationsLeft()
		throws Exception {

		_stubUnassignedEntitlements(
			_toTrialEntitlement(1L, null, 30, "PRDCT-DXP"));

		Mockito.when(
			_licenseKeyService.getActiveUnassignedLicenseKeyCounts(_ACCOUNT_ID)
		).thenReturn(
			HashMapBuilder.put(
				1L, 1
			).build()
		);

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateActivationKey(
					_toAccount(),
					_toAccountGenerateRequest(
						Collections.singletonList(1L), "DXP Backup", null,
						1L)));

		Assertions.assertTrue(
			licenseKeyEntitlementException.getMessage(
			).contains(
				"has 0 activations left, but 1 were requested"
			));

		_verifyNoActivationKeyAdded();

		Mockito.verify(
			_entitlementService, Mockito.never()
		).updateEntitlementDates(
			Mockito.any(), Mockito.anyLong(), Mockito.any()
		);
	}

	@Test
	public void testGenerateActivationKeyIgnoresPurposeAndStartDateOfOtherKeyTypes()
		throws Exception {

		_stubEntitlements(_toEntitlement(1L, 5.0));

		_stubLicensedProducts();

		_stubActivationKey();

		_stubAddLicenseKey();

		_licenseKeyGenerationService.generateActivationKey(
			new LicenseKeyGenerationService.GenerateRequest(
				Collections.singletonList(1L), "us-east-1", "Description",
				"Environment", "DXP Backup", _toProject(), "Load testing", null,
				_toServers(1), _toDateDaysAgo(10), 1L, "DXP 7.4",
				"Workspace One", "owner@example.com"));

		Assertions.assertEquals(
			Collections.singletonList(null),
			_getInvocationArguments(_licenseKeyService, "addLicenseKey", 4));

		ArgumentCaptor<Date> startDateArgumentCaptor = ArgumentCaptor.forClass(
			Date.class);

		Mockito.verify(
			_activationKeyService
		).addActivationKey(
			Mockito.anyLong(), Mockito.eq(true), Mockito.any(), Mockito.any(),
			Mockito.any(), startDateArgumentCaptor.capture(),
			Mockito.eq("DXP Backup")
		);

		Assertions.assertNull(startDateArgumentCaptor.getValue());
	}

	@Test
	public void testGenerateActivationKeyMakesAProductionKeyPermanent()
		throws Exception {

		_stubEntitlements(_toEntitlement(1L, 5.0, "PRDCT-DXP"));

		_stubLicensedProducts();

		_stubActivationKey();
		_stubAddLicenseKey();

		Mockito.when(
			_licenseKeyGenerateFormService.isAllowPermanentLicenses(
				Mockito.anyLong())
		).thenReturn(
			true
		);

		_licenseKeyGenerationService.generateActivationKey(
			_toGenerateRequest(Arrays.asList(1L), 1L, 1));

		Date expirationDate = (Date)_getInvocationArguments(
			_activationKeyService, "addActivationKey", 2
		).get(
			0
		);

		Assertions.assertTrue(expirationDate.after(_toDateDaysFromNow(36499)));

		Assertions.assertEquals(
			Collections.singletonList(expirationDate),
			_getInvocationArguments(_licenseKeyService, "addLicenseKey", 11));
	}

	@Test
	public void testGenerateActivationKeyRejectsAComplimentaryBundleEntitlement()
		throws Exception {

		_stubEntitlements(
			_toEntitlementOfKeyType(1L, 5.0, "production"),
			_toComplimentaryEntitlement(2L, 1.0));

		_stubLicensedProducts();

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateActivationKey(
					_toGenerateRequest(Arrays.asList(1L, 2L), 1L)));

		Assertions.assertEquals(
			"The selected entitlement grants only complimentary keys",
			licenseKeyEntitlementException.getMessage());

		_verifyNoActivationKeyAdded();

		Mockito.verifyNoInteractions(_licenseKeyService);
	}

	@Test
	public void testGenerateActivationKeyRejectsAComplimentarySubscriptionEntitlement()
		throws Exception {

		_stubEntitlements(_toComplimentaryEntitlement(1L, 1.0));

		_stubLicensedProducts();

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateActivationKey(
					_toGenerateRequest(Collections.singletonList(1L), 1L)));

		Assertions.assertEquals(
			"The selected entitlement grants only complimentary keys",
			licenseKeyEntitlementException.getMessage());

		_verifyNoActivationKeyAdded();

		Mockito.verifyNoInteractions(_licenseKeyService);
	}

	@Test
	public void testGenerateActivationKeyRenewalDiscountsAndRetires()
		throws Exception {

		_stubEntitlements(_toEntitlement(1L, 1.0));

		_stubLicensedProducts();

		_stubActivationKey();

		_stubAddLicenseKey();

		ActivationKey renewedActivationKey = new ActivationKey(
			new JSONObject(
			).put(
				"id", 99L
			).put(
				"r_projectToActivationKey_c_projectERC", "PROJ-1"
			));

		Mockito.when(
			_activationKeyService.fetchActivationKey("ACTVK-9")
		).thenReturn(
			renewedActivationKey
		);

		_licenseKeyGenerationService.generateActivationKey(
			new LicenseKeyGenerationService.GenerateRequest(
				Collections.singletonList(1L), "us-east-1", "Description",
				"Environment", "DXP Backup", _toProject(), null, "ACTVK-9",
				_toServers(1), null, 1L, "DXP 7.4", "Workspace One",
				"owner@example.com"));

		Mockito.verify(
			_licenseKeyService, Mockito.times(1)
		).getActiveLicenseKeyCounts(
			Mockito.anyList(), Mockito.eq(Collections.singletonList(99L)),
			Mockito.eq("PROJ-1")
		);

		Mockito.verify(
			_activationKeyService, Mockito.times(1)
		).updateActivationKeyActive(
			99L, false
		);
	}

	@Test
	public void testGenerateActivationKeyRenewalRejectsAnotherProject()
		throws Exception {

		_stubEntitlements(_toEntitlement(1L, 1.0));

		Mockito.when(
			_activationKeyService.fetchActivationKey("ACTVK-9")
		).thenReturn(
			new ActivationKey(
				new JSONObject(
				).put(
					"id", 99L
				).put(
					"r_projectToActivationKey_c_projectERC", "PROJ-2"
				))
		);

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateActivationKey(
					new LicenseKeyGenerationService.GenerateRequest(
						Collections.singletonList(1L), "us-east-1",
						"Description", "Environment", "DXP Backup",
						_toProject(), null, "ACTVK-9", _toServers(1), null, 1L,
						"DXP 7.4", "Workspace One", "owner@example.com")));

		Assertions.assertTrue(
			licenseKeyEntitlementException.getMessage(
			).contains(
				"belongs to another project"
			));
	}

	@Test
	public void testGenerateActivationKeyStartsNoLicenseKeyDurationForAProject()
		throws Exception {

		_stubEntitlements(_toEntitlement(1L, 5.0, "PRDCT-DXP", 30, null, null));

		_stubLicensedProducts();

		_stubActivationKey();
		_stubAddLicenseKey();

		Mockito.when(
			_licenseKeyGenerateFormService.isAllowPermanentLicenses(
				Mockito.anyLong())
		).thenReturn(
			true
		);

		_licenseKeyGenerationService.generateActivationKey(
			_toGenerateRequest(Arrays.asList(1L), 1L, 1));

		Date expirationDate = (Date)_getInvocationArguments(
			_activationKeyService, "addActivationKey", 2
		).get(
			0
		);

		Assertions.assertTrue(expirationDate.after(_toDateDaysFromNow(36499)));

		Mockito.verify(
			_entitlementService, Mockito.never()
		).updateEntitlementDates(
			Mockito.any(), Mockito.anyLong(), Mockito.any()
		);
	}

	@Test
	public void testGenerateActivationKeyWithUnentitledBundleProduct()
		throws Exception {

		_stubEntitlements(_toEntitlement(1L, 1.0));

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateActivationKey(
					_toGenerateRequest(Arrays.asList(1L, 2L), 1L)));

		Assertions.assertTrue(
			licenseKeyEntitlementException.getMessage(
			).contains(
				"not entitled to entitlement 2"
			));
	}

	@Test
	public void testGenerateActivationKeyWithUnentitledSubscription() {
		_stubEntitlements(_toEntitlement(1L, 1.0));

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateActivationKey(
					_toGenerateRequest(Collections.singletonList(1L), 99L)));

		Assertions.assertTrue(
			licenseKeyEntitlementException.getMessage(
			).contains(
				"not entitled to the selected subscription"
			));
	}

	@Test
	public void testGenerateActivationKeyWithoutActivationsLeft()
		throws Exception {

		_stubEntitlements(_toEntitlement(1L, 1.0));

		Map<Long, Integer> licenseKeyCounts = HashMapBuilder.put(
			1L, 1
		).build();

		Mockito.when(
			_licenseKeyService.getActiveLicenseKeyCounts(
				Mockito.anyList(), Mockito.anyCollection(), Mockito.anyString())
		).thenReturn(
			licenseKeyCounts
		);

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateActivationKey(
					_toGenerateRequest(Collections.singletonList(1L), 1L)));

		Assertions.assertTrue(
			licenseKeyEntitlementException.getMessage(
			).contains(
				"has 0 activations left, but 1 were requested"
			));
	}

	@Test
	public void testGenerateActivationKeyWithoutMaxQuantity() throws Exception {
		_stubEntitlements(_toEntitlement(1L, null));

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateActivationKey(
					_toGenerateRequest(Collections.singletonList(1L), 1L)));

		Assertions.assertTrue(
			licenseKeyEntitlementException.getMessage(
			).contains(
				"has 0 activations left"
			));
	}

	@Test
	public void testGenerateActivationKeyWithoutPermanentLicensesEndsWithTheSubscription()
		throws Exception {

		_stubEntitlements(_toEntitlement(1L, 5.0, "PRDCT-DXP"));

		_stubLicensedProducts();

		_stubActivationKey();
		_stubAddLicenseKey();

		_licenseKeyGenerationService.generateActivationKey(
			_toGenerateRequest(Arrays.asList(1L), 1L, 1));

		Assertions.assertEquals(
			Collections.singletonList(
				Date.from(Instant.parse("2027-08-09T00:00:00Z"))),
			_getInvocationArguments(
				_activationKeyService, "addActivationKey", 2));
	}

	@Test
	public void testGenerateActivationKeyWithoutProduct() throws Exception {
		_stubEntitlements(_toEntitlement(1L, 1.0));

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateActivationKey(
					_toGenerateRequest(Collections.singletonList(1L), 1L)));

		Assertions.assertTrue(
			licenseKeyEntitlementException.getMessage(
			).contains(
				"No product backs entitlement 1"
			));
	}

	@Test
	public void testGenerateDeveloperLicenseXMLAggregatesTheAddOns()
		throws Exception {

		_stubEntitlements(
			_toDeveloperEntitlement(1L, "PRDCT-DXP"),
			_toEntitlement(2L, 1.0, "PRDCT-SEARCH"));

		_stubLicensedProducts();

		Mockito.when(
			_licenseKeyGenerateFormService.fetchLicenseEntry(
				Mockito.any(), Mockito.any(), Mockito.any())
		).thenAnswer(
			invocation -> {
				if (!Objects.equals(invocation.getArgument(1), "DXP")) {
					return null;
				}

				return new LicenseEntry(
					"portal", "DXP Development (Cluster)", "developer", "7.4",
					"7.4");
			}
		);

		Product product = new Product();

		product.setExternalReferenceCode("PRDCT-SEARCH");
		product.setName(
			HashMapBuilder.put(
				"en_US", "Search"
			).build());

		Mockito.when(
			_licenseKeyGenerateFormService.fetchProduct(
				Mockito.argThat(
					entitlement -> entitlement.getEntitlementId() == 2L))
		).thenReturn(
			product
		);

		Mockito.when(
			_licenseKeyGenerateFormService.isLicensedForVersion(
				Mockito.any(), Mockito.any())
		).thenReturn(
			true
		);

		Mockito.when(
			_licenseKeyExporter.aggregateXMLs(Mockito.any())
		).thenReturn(
			"<licenses />"
		);

		Assertions.assertEquals(
			"<licenses />",
			_licenseKeyGenerationService.generateDeveloperLicenseXML(
				Arrays.asList(1L, 2L), "developer", "Liferay DXP", _toProject(),
				"7.4"));

		Assertions.assertEquals(
			Arrays.asList("DXP Development (Cluster)", "Search Developer"),
			_getInvocationArguments(_licenseKeyExporter, "toXML", 2));
		Assertions.assertEquals(
			Arrays.asList("DXP Development", "Search"),
			_getInvocationArguments(_licenseKeyExporter, "toXML", 5));

		Mockito.verify(
			_licenseKeyExporter
		).aggregateXMLs(
			Mockito.argThat(xmls -> xmls.length == 2)
		);
	}

	@Test
	public void testGenerateDeveloperLicenseXMLBelowMinimumVersion() {
		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateDeveloperLicenseXML(
					Collections.emptyList(), "developer", "Liferay DXP",
					_toProject(), "7.3"));

		Assertions.assertTrue(
			licenseKeyEntitlementException.getMessage(
			).contains(
				"minimum version is 7.4"
			));
	}

	@Test
	public void testGenerateDeveloperLicenseXMLExpiresWithTheEntitlement()
		throws Exception {

		_stubEntitlements(_toDeveloperEntitlement(1L, "PRDCT-DXP"));

		_stubLicensedProducts();

		_licenseKeyGenerationService.generateDeveloperLicenseXML(
			Collections.emptyList(), "developer", "Liferay DXP", _toProject(),
			"7.4");

		Assertions.assertEquals(
			Collections.singletonList(
				Date.from(Instant.parse("2027-08-09T00:00:00Z"))),
			_getInvocationArguments(_licenseKeyGenerator, "generateKey", 21));
	}

	@Test
	public void testGenerateDeveloperLicenseXMLGivesHTTPSessions()
		throws Exception {

		_stubEntitlements(_toDeveloperEntitlement(1L, "PRDCT-DXP"));

		_stubLicensedProducts();

		_licenseKeyGenerationService.generateDeveloperLicenseXML(
			Collections.emptyList(), "developer", "Liferay DXP", _toProject(),
			"7.4");

		Assertions.assertEquals(
			Collections.singletonList(
				LicenseKeyGenerationConstants.DEVELOPER_MAX_HTTP_SESSIONS),
			_getInvocationArguments(_licenseKeyGenerator, "generateKey", 10));
		Assertions.assertEquals(
			Collections.singletonList(
				LicenseKeyGenerationConstants.DEVELOPER_MAX_HTTP_SESSIONS),
			_getInvocationArguments(_licenseKeyExporter, "toXML", 11));
	}

	@Test
	public void testGenerateDeveloperLicenseXMLRejectsAProductWithoutAnEntitlementOfTheKeyType()
		throws Exception {

		_stubEntitlements(
			_toEntitlement(1L, 1.0, "PRDCT-DXP"),
			_toComplimentaryEntitlement(2L, 1.0));

		_stubLicensedProducts();

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateDeveloperLicenseXML(
					Collections.emptyList(), "developer", "Liferay DXP",
					_toProject(), "7.4"));

		Assertions.assertTrue(
			licenseKeyEntitlementException.getMessage(
			).contains(
				"not entitled to Liferay DXP"
			));

		Mockito.verifyNoInteractions(_licenseKeyGenerator);
	}

	@Test
	public void testGenerateDeveloperLicenseXMLRejectsAnAddOnNotEntitled()
		throws Exception {

		_stubEntitlements(_toDeveloperEntitlement(1L, "PRDCT-DXP"));

		_stubLicensedProducts();

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateDeveloperLicenseXML(
					Collections.singletonList(9L), "developer", "Liferay DXP",
					_toProject(), "7.4"));

		Assertions.assertTrue(
			licenseKeyEntitlementException.getMessage(
			).contains(
				"not entitled to entitlement 9"
			));
	}

	@Test
	public void testGenerateDeveloperLicenseXMLRejectsAnAddOnNotLicensedForTheVersion()
		throws Exception {

		_stubEntitlements(
			_toDeveloperEntitlement(1L, "PRDCT-DXP"),
			_toEntitlement(2L, 1.0, "PRDCT-SEARCH"));

		_stubLicensedProducts();

		_stubDeveloperBundleProduct(2L, "PRDCT-SEARCH", "Search");

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateDeveloperLicenseXML(
					Arrays.asList(1L, 2L), "developer", "Liferay DXP",
					_toProject(), "7.4"));

		Assertions.assertTrue(
			licenseKeyEntitlementException.getMessage(
			).contains(
				"Search is not licensed for version 7.4"
			));
	}

	@Test
	public void testGenerateDeveloperLicenseXMLRejectsAnApp() throws Exception {
		_stubEntitlements(
			_toDeveloperEntitlement(1L, "PRDCT-DXP"),
			_toEntitlement(2L, 1.0, "PRDCT-TEST-APP"));

		_stubLicensedProducts();

		Product product = new Product();

		product.setExternalReferenceCode("PRDCT-TEST-APP");
		product.setName(
			HashMapBuilder.put(
				"en_US", "Test App"
			).build());

		ProductSpecification productSpecification = new ProductSpecification();

		productSpecification.setSpecificationKey("project-item-type");
		productSpecification.setValue(
			HashMapBuilder.put(
				"en_US", "application"
			).build());

		product.setProductSpecifications(
			new ProductSpecification[] {productSpecification});

		Mockito.when(
			_licenseKeyGenerateFormService.fetchProduct(
				Mockito.argThat(
					entitlement -> entitlement.getEntitlementId() == 2L))
		).thenReturn(
			product
		);

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateDeveloperLicenseXML(
					Arrays.asList(1L, 2L), "developer", "Liferay DXP",
					_toProject(), "7.4"));

		Assertions.assertEquals(
			"Entitlement 2 is for a Marketplace app and cannot be bundled " +
				"with a developer key",
			licenseKeyEntitlementException.getMessage());
	}

	@Test
	public void testGenerateDeveloperLicenseXMLRejectsAnEntitlementWithoutAnEndDate()
		throws Exception {

		_stubEntitlements(
			_toEntitlement(1L, 1.0, "PRDCT-DXP", 0, null, "developer"));

		_stubLicensedProducts();

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateDeveloperLicenseXML(
					Collections.emptyList(), "developer", "Liferay DXP",
					_toProject(), "7.4"));

		Assertions.assertEquals(
			"Entitlement Entitlement 1 has no end date or license key " +
				"duration, so no key can be generated for it",
			licenseKeyEntitlementException.getMessage());

		Mockito.verifyNoInteractions(_licenseKeyGenerator);
	}

	@Test
	public void testGenerateDeveloperLicenseXMLRejectsAnotherLeadingProduct()
		throws Exception {

		_stubEntitlements(
			_toDeveloperEntitlement(1L, "PRDCT-DXP"),
			_toEntitlement(2L, 1.0, "PRDCT-PORTAL"));

		_stubLicensedProducts();

		_stubDeveloperBundleProduct(2L, "PRDCT-PORTAL", "Portal");

		Mockito.when(
			_licenseKeyGenerateFormService.isLicensedForVersion(
				Mockito.any(), Mockito.any())
		).thenReturn(
			true
		);

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateDeveloperLicenseXML(
					Arrays.asList(1L, 2L), "developer", "Liferay DXP",
					_toProject(), "7.4"));

		Assertions.assertTrue(
			licenseKeyEntitlementException.getMessage(
			).contains(
				"another leading product"
			));
	}

	@Test
	public void testGenerateDeveloperLicenseXMLTakesItsTermFromTheDefinition()
		throws Exception {

		_stubEntitlements(
			_toEntitlement(
				1L, 1.0, "PRDCT-DXP", 90, "2027-08-09T00:00:00Z", "developer"));

		_stubLicensedProducts();

		_licenseKeyGenerationService.generateDeveloperLicenseXML(
			Collections.emptyList(), "developer", "Liferay DXP", _toProject(),
			"7.4");

		ArgumentCaptor<Date> startDateArgumentCaptor = ArgumentCaptor.forClass(
			Date.class);
		ArgumentCaptor<Date> expirationDateArgumentCaptor =
			ArgumentCaptor.forClass(Date.class);

		Mockito.verify(
			_licenseKeyGenerator
		).generateKey(
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.anyInt(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.anyInt(), Mockito.anyInt(), Mockito.anyInt(),
			Mockito.anyLong(), Mockito.anyLong(), Mockito.any(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
			Mockito.any(), startDateArgumentCaptor.capture(),
			expirationDateArgumentCaptor.capture()
		);

		Date startDate = startDateArgumentCaptor.getValue();
		Date expirationDate = expirationDateArgumentCaptor.getValue();

		Assertions.assertEquals(
			90,
			TimeUnit.MILLISECONDS.toDays(
				expirationDate.getTime() - startDate.getTime()));
	}

	@Test
	public void testGenerateDeveloperLicenseXMLUsesTheDeveloperClusterEntitlement()
		throws Exception {

		_stubEntitlements(
			_toDeveloperEntitlement(1L, "PRDCT-DXP"),
			_toEntitlement(
				2L, 1.0, "PRDCT-DXP", 45, "2027-08-09T00:00:00Z",
				"developer-cluster"));

		_stubLicensedProducts();

		_licenseKeyGenerationService.generateDeveloperLicenseXML(
			Collections.emptyList(), "developer-cluster", "Liferay DXP",
			_toProject(), "7.4");

		Date startDate = (Date)_getInvocationArguments(
			_licenseKeyGenerator, "generateKey", 20
		).get(
			0
		);
		Date expirationDate = (Date)_getInvocationArguments(
			_licenseKeyGenerator, "generateKey", 21
		).get(
			0
		);

		Assertions.assertEquals(
			TimeUnit.DAYS.toMillis(45),
			expirationDate.getTime() - startDate.getTime());
	}

	@Test
	public void testGenerateDeveloperLicenseXMLUsesTheEntitlementOfTheKeyType()
		throws Exception {

		_stubEntitlements(
			_toEntitlement(
				1L, 1.0, "PRDCT-DXP", 30, "2027-08-09T00:00:00Z",
				"complimentary"),
			_toEntitlement(
				2L, 1.0, "PRDCT-DXP", 0, "2027-03-31T00:00:00Z", "developer"));

		_stubLicensedProducts();

		_licenseKeyGenerationService.generateDeveloperLicenseXML(
			Collections.emptyList(), "developer", "Liferay DXP", _toProject(),
			"7.4");

		Assertions.assertEquals(
			Collections.singletonList(
				Date.from(Instant.parse("2027-03-31T00:00:00Z"))),
			_getInvocationArguments(_licenseKeyGenerator, "generateKey", 21));
	}

	@Test
	public void testGenerateDeveloperLicenseXMLWithoutEntitledProduct() {
		_stubEntitlements();

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateDeveloperLicenseXML(
					Collections.emptyList(), "developer", "Liferay DXP",
					_toProject(), "7.4"));

		Assertions.assertTrue(
			licenseKeyEntitlementException.getMessage(
			).contains(
				"not entitled to Liferay DXP"
			));
	}

	@Test
	public void testGenerateDeveloperLicenseXMLWithoutLicenseGeneration()
		throws Exception {

		_stubEntitlements(_toEntitlement(1L, 5.0));

		_stubLicensedProducts();

		Mockito.when(
			_licenseKeyGenerateFormService.grantsLicense(Mockito.any())
		).thenReturn(
			false
		);

		LicenseKeyEntitlementException licenseKeyEntitlementException =
			Assertions.assertThrows(
				LicenseKeyEntitlementException.class,
				() -> _licenseKeyGenerationService.generateDeveloperLicenseXML(
					Collections.emptyList(), "developer", "Liferay DXP",
					_toProject(), "7.4"));

		Assertions.assertTrue(
			licenseKeyEntitlementException.getMessage(
			).contains(
				"not entitled to Liferay DXP"
			));
	}

	private long _getComplimentaryTermMillis() {
		Date expirationDate = (Date)_getInvocationArguments(
			_activationKeyService, "addActivationKey", 2
		).get(
			0
		);
		Date startDate = (Date)_getInvocationArguments(
			_activationKeyService, "addActivationKey", 5
		).get(
			0
		);

		return expirationDate.getTime() - startDate.getTime();
	}

	private List<Object> _getInvocationArguments(
		Object mock, String methodName, int index) {

		List<Object> arguments = new ArrayList<>();

		for (Invocation invocation :
				Mockito.mockingDetails(
					mock
				).getInvocations()) {

			Method method = invocation.getMethod();

			if (methodName.equals(method.getName())) {
				arguments.add(invocation.getArgument(index));
			}
		}

		return arguments;
	}

	private ActivationKey _stubActivationKey() throws Exception {
		ActivationKey activationKey = new ActivationKey(
			new JSONObject(
			).put(
				"id", 7L
			));

		Mockito.when(
			_activationKeyService.addActivationKey(
				Mockito.anyLong(), Mockito.anyBoolean(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any())
		).thenReturn(
			activationKey
		);

		return activationKey;
	}

	private void _stubAddLicenseKey() throws Exception {
		Mockito.when(
			_licenseKeyService.addLicenseKey(
				Mockito.anyLong(), Mockito.any(), Mockito.anyLong(),
				Mockito.anyBoolean(), Mockito.any(), Mockito.anyBoolean(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.anyLong(),
				Mockito.anyLong(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.anyInt(), Mockito.any(), Mockito.anyInt(),
				Mockito.anyLong(), Mockito.anyInt(), Mockito.anyInt(),
				Mockito.anyLong(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any(),
				Mockito.any())
		).thenReturn(
			Mockito.mock(LicenseKey.class)
		);
	}

	private void _stubBundledProducts(
			Entitlement addOnEntitlement, Entitlement leadingEntitlement)
		throws Exception {

		Map<Long, Product> products = HashMapBuilder.put(
			addOnEntitlement.getEntitlementId(),
			_toProduct("Digital Sales Room", "PRDCT-DSR")
		).put(
			leadingEntitlement.getEntitlementId(),
			_toProduct("DXP", "PRDCT-DXP")
		).build();

		Mockito.when(
			_licenseKeyGenerateFormService.fetchProduct(Mockito.any())
		).thenAnswer(
			invocation -> {
				Entitlement entitlement = invocation.getArgument(0);

				return products.get(entitlement.getEntitlementId());
			}
		);

		Mockito.when(
			_licenseKeyGenerateFormService.grantsLicense(Mockito.any())
		).thenReturn(
			true
		);

		Mockito.when(
			_licenseKeyGenerateFormService.fetchLicenseEntry(
				Mockito.any(), Mockito.any(), Mockito.any())
		).thenAnswer(
			invocation -> {
				if (!Objects.equals(invocation.getArgument(1), "DXP")) {
					return null;
				}

				return new LicenseEntry(
					"portal", "DXP Backup", "production", "7.4", "7.4");
			}
		);
	}

	private void _stubDeveloperBundleProduct(
			long entitlementId, String externalReferenceCode, String name)
		throws Exception {

		Product product = new Product();

		product.setExternalReferenceCode(externalReferenceCode);
		product.setName(
			HashMapBuilder.put(
				"en_US", name
			).build());

		Mockito.when(
			_licenseKeyGenerateFormService.fetchProduct(
				Mockito.argThat(
					entitlement ->
						entitlement.getEntitlementId() == entitlementId))
		).thenReturn(
			product
		);
	}

	private void _stubEntitlements(Entitlement... entitlements) {
		try {
			Mockito.when(
				_entitlementService.getActiveEntitlements(Mockito.anyString())
			).thenReturn(
				Arrays.asList(entitlements)
			);
		}
		catch (Exception exception) {
			throw new RuntimeException(exception);
		}
	}

	private void _stubLicensedProducts() throws Exception {
		Product product = new Product();

		product.setExternalReferenceCode("PRDCT-DXP");
		product.setName(
			HashMapBuilder.put(
				"en_US", "DXP"
			).build());

		Mockito.when(
			_licenseKeyGenerateFormService.fetchProduct(Mockito.any())
		).thenReturn(
			product
		);

		Mockito.when(
			_licenseKeyGenerateFormService.grantsLicense(Mockito.any())
		).thenReturn(
			true
		);

		Mockito.when(
			_licenseKeyGenerateFormService.fetchLicenseEntry(
				Mockito.any(), Mockito.any(), Mockito.any())
		).thenReturn(
			new LicenseEntry("portal", "DXP Backup", "production", "7.4", "7.4")
		);
	}

	private void _stubOrderItems(
			long addOnOrderItemId, long orderId, long... orderItemIds)
		throws Exception {

		OrderItem addOnOrderItem = new OrderItem();

		addOnOrderItem.setId(addOnOrderItemId);
		addOnOrderItem.setOrderId(orderId);

		Mockito.when(
			_commerceOrderItemService.fetchCommerceOrderItem(addOnOrderItemId)
		).thenReturn(
			addOnOrderItem
		);

		List<OrderItem> orderItems = new ArrayList<>();

		for (long orderItemId : orderItemIds) {
			OrderItem orderItem = new OrderItem();

			orderItem.setId(orderItemId);
			orderItem.setOrderId(orderId);

			orderItems.add(orderItem);
		}

		Mockito.when(
			_commerceOrderItemService.getCommerceOrderItems(orderId)
		).thenReturn(
			orderItems
		);
	}

	private void _stubUnassignedEntitlements(Entitlement... entitlements)
		throws Exception {

		Mockito.when(
			_entitlementService.getActiveSelfServiceTrialEntitlements(
				_ACCOUNT_ID)
		).thenReturn(
			Arrays.asList(entitlements)
		);
	}

	private Account _toAccount() {
		Account account = new Account();

		account.setId(_ACCOUNT_ID);
		account.setName("Account One");

		return account;
	}

	private LicenseKeyGenerationService.GenerateRequest
		_toAccountGenerateRequest(
			List<Long> bundleEntitlementIds, String keyType,
			String renewedActivationKeyExternalReferenceCode,
			long subscriptionEntitlementId) {

		return new LicenseKeyGenerationService.GenerateRequest(
			bundleEntitlementIds, "us-east-1", "Description", "Environment",
			keyType, null, null, renewedActivationKeyExternalReferenceCode,
			_toServers(1), null, subscriptionEntitlementId, "DXP 7.4",
			"Workspace One", "owner@example.com");
	}

	private Entitlement _toComplimentaryEntitlement(
		long entitlementId, Double maxQuantity) {

		return _toEntitlementOfKeyType(
			entitlementId, maxQuantity, "complimentary", 30, null);
	}

	private LicenseKeyGenerationService.GenerateRequest
		_toComplimentaryGenerateRequest(int serverCount) {

		return _toComplimentaryGenerateRequest(
			"Load testing", serverCount, null);
	}

	private LicenseKeyGenerationService.GenerateRequest
		_toComplimentaryGenerateRequest(
			String purpose, int serverCount, Date startDate) {

		return new LicenseKeyGenerationService.GenerateRequest(
			Collections.emptyList(), "us-east-1", "Description", "Environment",
			"complimentary", _toProject(), purpose, null,
			_toServers(serverCount), startDate, 1L, "DXP 7.4", "Workspace One",
			"owner@example.com");
	}

	private Date _toDateDaysAgo(int days) {
		return new Date(
			(System.currentTimeMillis() / 1000 * 1000) -
				TimeUnit.DAYS.toMillis(days));
	}

	private Date _toDateDaysFromNow(int days) {
		return new Date(
			(System.currentTimeMillis() / 1000 * 1000) +
				TimeUnit.DAYS.toMillis(days));
	}

	private Entitlement _toDeveloperEntitlement(
		long entitlementId, String skuExternalReferenceCode) {

		return _toEntitlement(
			entitlementId, 1.0, skuExternalReferenceCode, 0,
			"2027-08-09T00:00:00Z", "developer");
	}

	private Entitlement _toEntitlement(long entitlementId, Double maxQuantity) {
		JSONObject jsonObject = new JSONObject(
		).put(
			"id", entitlementId
		).put(
			"name", "Entitlement " + entitlementId
		);

		if (maxQuantity != null) {
			jsonObject.put("maxQuantity", maxQuantity);
		}

		return new Entitlement(jsonObject);
	}

	private Entitlement _toEntitlement(
		long entitlementId, Double maxQuantity,
		String skuExternalReferenceCode) {

		return _toEntitlement(
			entitlementId, maxQuantity, skuExternalReferenceCode, 0,
			"2027-08-09T00:00:00Z", null);
	}

	private Entitlement _toEntitlement(
		long entitlementId, Double maxQuantity, String skuExternalReferenceCode,
		int licenseKeyDurationDays, String endDate, String licenseKeyType) {

		JSONObject entitlementDefinitionJSONObject = new JSONObject(
		).put(
			"id", entitlementId
		).put(
			"licenseKeyDurationDays", licenseKeyDurationDays
		).put(
			"licenseKeyFamily",
			_licenseKeyFamilies.get(skuExternalReferenceCode)
		);

		if (licenseKeyType != null) {
			entitlementDefinitionJSONObject.put(
				"licenseKeyType", licenseKeyType);
		}

		JSONObject jsonObject = new JSONObject(
		).put(
			"entitlementDefinitionToEntitlement",
			entitlementDefinitionJSONObject
		).put(
			"id", entitlementId
		).put(
			"name", "Entitlement " + entitlementId
		).put(
			"skuExternalReferenceCode", skuExternalReferenceCode
		);

		if (endDate != null) {
			jsonObject.put("endDate", endDate);
		}

		if (maxQuantity != null) {
			jsonObject.put("maxQuantity", maxQuantity);
		}

		return new Entitlement(jsonObject);
	}

	private Entitlement _toEntitlementOfKeyType(
		long entitlementId, Double maxQuantity, String licenseKeyType) {

		return _toEntitlementOfKeyType(
			entitlementId, maxQuantity, licenseKeyType, 0, null);
	}

	private Entitlement _toEntitlementOfKeyType(
		long entitlementId, Double maxQuantity, String licenseKeyType,
		int licenseKeyDurationDays, String endDate) {

		JSONObject jsonObject = new JSONObject(
		).put(
			"entitlementDefinitionToEntitlement",
			new JSONObject(
			).put(
				"id", entitlementId
			).put(
				"licenseKeyDurationDays", licenseKeyDurationDays
			).put(
				"licenseKeyType", licenseKeyType
			)
		).put(
			"id", entitlementId
		).put(
			"name", "Entitlement " + entitlementId
		);

		if (endDate != null) {
			jsonObject.put("endDate", endDate);
		}

		if (maxQuantity != null) {
			jsonObject.put("maxQuantity", maxQuantity);
		}

		return new Entitlement(jsonObject);
	}

	private LicenseKeyGenerationService.GenerateRequest _toGenerateRequest(
		List<Long> bundleEntitlementIds, long subscriptionEntitlementId) {

		return _toGenerateRequest(
			bundleEntitlementIds, subscriptionEntitlementId, 1);
	}

	private LicenseKeyGenerationService.GenerateRequest _toGenerateRequest(
		List<Long> bundleEntitlementIds, long subscriptionEntitlementId,
		int serverCount) {

		return new LicenseKeyGenerationService.GenerateRequest(
			bundleEntitlementIds, "us-east-1", "Description", "Environment",
			"DXP Backup", _toProject(), null, null, _toServers(serverCount),
			null, subscriptionEntitlementId, "DXP 7.4", "Workspace One",
			"owner@example.com");
	}

	private Product _toProduct(String name, String externalReferenceCode) {
		Product product = new Product();

		product.setExternalReferenceCode(externalReferenceCode);
		product.setName(
			HashMapBuilder.put(
				"en_US", name
			).build());

		return product;
	}

	private Project _toProject() {
		return new Project(
			new JSONObject(
			).put(
				"externalReferenceCode", "PROJ-1"
			).put(
				"name", "Project One"
			));
	}

	private List<LicenseKeyGenerationService.GenerateRequest.Server> _toServers(
		int serverCount) {

		List<LicenseKeyGenerationService.GenerateRequest.Server> servers =
			new ArrayList<>();

		for (int i = 0; i < serverCount; i++) {
			servers.add(
				new LicenseKeyGenerationService.GenerateRequest.Server(
					"host" + i + ".example.com", "", ""));
		}

		return servers;
	}

	private Entitlement _toTrialEntitlement(
		long commerceOrderItemId, long entitlementId, String endDate,
		String skuExternalReferenceCode) {

		JSONObject jsonObject = _toTrialEntitlementJSONObject(
			entitlementId, endDate, 30, skuExternalReferenceCode);

		jsonObject.put(
			"r_commerceOrderItemToEntitlement_commerceOrderItemId",
			commerceOrderItemId);

		return new Entitlement(jsonObject);
	}

	private Entitlement _toTrialEntitlement(
		long entitlementId, String endDate, int licenseKeyDurationDays,
		String skuExternalReferenceCode) {

		return new Entitlement(
			_toTrialEntitlementJSONObject(
				entitlementId, endDate, licenseKeyDurationDays,
				skuExternalReferenceCode));
	}

	private JSONObject _toTrialEntitlementJSONObject(
		long entitlementId, String endDate, int licenseKeyDurationDays,
		String skuExternalReferenceCode) {

		JSONObject jsonObject = new JSONObject(
		).put(
			"entitlementDefinitionToEntitlement",
			new JSONObject(
			).put(
				"id", entitlementId
			).put(
				"licenseKeyFamily",
				_licenseKeyFamilies.get(skuExternalReferenceCode)
			).put(
				"skuExternalReferenceCode", skuExternalReferenceCode
			)
		).put(
			"id", entitlementId
		).put(
			"licenseKeyDurationDays", licenseKeyDurationDays
		).put(
			"maxQuantity", 1.0
		).put(
			"name", "Entitlement " + entitlementId
		).put(
			"skuExternalReferenceCode", skuExternalReferenceCode
		);

		if (endDate != null) {
			jsonObject.put("endDate", endDate);
		}

		return jsonObject;
	}

	private void _verifyNoActivationKeyAdded() throws Exception {
		Mockito.verify(
			_activationKeyService, Mockito.never()
		).addActivationKey(
			Mockito.anyLong(), Mockito.anyBoolean(), Mockito.any(),
			Mockito.any(), Mockito.any(), Mockito.any(), Mockito.any()
		);
	}

	private static final long _ACCOUNT_ID = 40001;

	private static final Map<String, String> _licenseKeyFamilies =
		HashMapBuilder.put(
			"PRDCT-DSR", "DSR"
		).put(
			"PRDCT-DXP", "DXP"
		).put(
			"PRDCT-PORTAL", "Portal"
		).build();

	private ActivationKeyService _activationKeyService;
	private CommerceOrderItemService _commerceOrderItemService;
	private EntitlementService _entitlementService;
	private LicenseKeyExporter _licenseKeyExporter;
	private LicenseKeyGenerateFormService _licenseKeyGenerateFormService;
	private LicenseKeyGenerationService _licenseKeyGenerationService;
	private LicenseKeyGenerator _licenseKeyGenerator;
	private LicenseKeyService _licenseKeyService;

}
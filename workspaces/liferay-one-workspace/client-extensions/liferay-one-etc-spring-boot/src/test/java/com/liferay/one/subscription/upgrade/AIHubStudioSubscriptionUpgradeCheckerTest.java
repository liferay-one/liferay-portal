/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.subscription.upgrade;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Sku;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.SubscriptionUpgrade;
import com.liferay.one.service.CommerceSkuService;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import java.util.List;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Felipe Veloso
 */
@DisplayName(
	"[SVC-AIHUBSTUDIOSUBSCRIPTIONUPGRADECHECKER] AIHubStudioSubscriptionUpgradeChecker"
)
public class AIHubStudioSubscriptionUpgradeCheckerTest {

	@BeforeEach
	public void setUp() throws Exception {
		ReflectionTestUtils.setField(
			_aiHubStudioSubscriptionUpgradeChecker, "_commerceSkuService",
			_commerceSkuService);
		ReflectionTestUtils.setField(
			_aiHubStudioSubscriptionUpgradeChecker,
			"_subscriptionUpgradeCheckerHelper",
			_subscriptionUpgradeCheckerHelper);

		Mockito.when(
			_commerceSkuService.fetchAIHubTier(_SKU_ACTIVATE)
		).thenReturn(
			"activate"
		);

		Mockito.when(
			_commerceSkuService.fetchAIHubTier(_SKU_STUDIO)
		).thenReturn(
			"studio"
		);

		Mockito.when(
			_commerceSkuService.fetchProductId(_SKU_ACTIVATE)
		).thenReturn(
			_PRODUCT_ID
		);

		Mockito.when(
			_commerceSkuService.getSkus(_PRODUCT_ID)
		).thenReturn(
			List.of(_createSku(_SKU_ACTIVATE), _createSku(_SKU_STUDIO))
		);

		Mockito.doReturn(
			true
		).when(
			_subscriptionUpgradeCheckerHelper
		).hasComposablePricebook(
			ArgumentMatchers.any(Entitlement.class)
		);

		Mockito.doReturn(
			_CONTRACT_END_DATE_INSTANT
		).when(
			_subscriptionUpgradeCheckerHelper
		).fetchContractEndDateInstant(
			ArgumentMatchers.any(Entitlement.class)
		);
	}

	@Test
	public void testCheckActivate() throws Exception {
		SubscriptionUpgrade subscriptionUpgrade =
			_aiHubStudioSubscriptionUpgradeChecker.check(
				List.of(
					SubscriptionUpgradeCheckerTestUtil.createEntitlement(
						1, 1, _SKU_ACTIVATE)));

		Assertions.assertNotNull(subscriptionUpgrade);
		Assertions.assertEquals(
			_CONTRACT_END_DATE_INSTANT,
			subscriptionUpgrade.getContractEndDateInstant());
		Assertions.assertEquals(
			_SKU_ACTIVATE,
			subscriptionUpgrade.getCurrentSkuExternalReferenceCode());
		Assertions.assertEquals(
			AIHubStudioSubscriptionUpgradeChecker.KEY,
			subscriptionUpgrade.getKey());
		Assertions.assertEquals(
			_SKU_STUDIO,
			subscriptionUpgrade.getTargetSkuExternalReferenceCode());
	}

	@Test
	public void testCheckActivateScheduled() throws Exception {
		Assertions.assertNull(
			_aiHubStudioSubscriptionUpgradeChecker.check(
				List.of(
					SubscriptionUpgradeCheckerTestUtil.createEntitlement(
						1, 1, _SKU_ACTIVATE,
						SubscriptionUpgradeCheckerTestUtil.getFutureInstant(),
						"active"))));
	}

	@Test
	public void testCheckActivateSuspended() throws Exception {
		Assertions.assertNull(
			_aiHubStudioSubscriptionUpgradeChecker.check(
				List.of(
					SubscriptionUpgradeCheckerTestUtil.createEntitlement(
						1, 1, _SKU_ACTIVATE, null, "suspended"))));
	}

	@Test
	public void testCheckActivateTerminated() throws Exception {
		Assertions.assertNull(
			_aiHubStudioSubscriptionUpgradeChecker.check(
				List.of(
					SubscriptionUpgradeCheckerTestUtil.createEntitlement(
						1, 1, _SKU_ACTIVATE, null, "terminated"))));
	}

	@Test
	public void testCheckEnterprise() throws Exception {
		Assertions.assertNull(
			_aiHubStudioSubscriptionUpgradeChecker.check(
				List.of(
					SubscriptionUpgradeCheckerTestUtil.createEntitlement(
						1, 1, "SKU_ENTERPRISE"))));
	}

	@Test
	public void testCheckManyActivate() throws Exception {
		Entitlement entitlement1 =
			SubscriptionUpgradeCheckerTestUtil.createEntitlement(
				1, 1, _SKU_ACTIVATE);

		Entitlement entitlement2 =
			SubscriptionUpgradeCheckerTestUtil.createEntitlement(
				0, 2, _SKU_ACTIVATE);

		Mockito.doReturn(
			false
		).when(
			_subscriptionUpgradeCheckerHelper
		).hasComposablePricebook(
			entitlement2
		);

		Assertions.assertNotNull(
			_aiHubStudioSubscriptionUpgradeChecker.check(
				List.of(entitlement1, entitlement2)));
		Assertions.assertNotNull(
			_aiHubStudioSubscriptionUpgradeChecker.check(
				List.of(entitlement2, entitlement1)));
	}

	@Test
	public void testCheckManyActivateWithLaterContractEndDate()
		throws Exception {

		Entitlement entitlement1 =
			SubscriptionUpgradeCheckerTestUtil.createEntitlement(
				1, 1, _SKU_ACTIVATE);

		Entitlement entitlement2 =
			SubscriptionUpgradeCheckerTestUtil.createEntitlement(
				2, 2, _SKU_ACTIVATE);

		Instant contractEndDateInstant = _CONTRACT_END_DATE_INSTANT.plus(
			365, ChronoUnit.DAYS);

		Mockito.doReturn(
			contractEndDateInstant
		).when(
			_subscriptionUpgradeCheckerHelper
		).fetchContractEndDateInstant(
			entitlement2
		);

		SubscriptionUpgrade subscriptionUpgrade =
			_aiHubStudioSubscriptionUpgradeChecker.check(
				List.of(entitlement1, entitlement2));

		Assertions.assertEquals(
			contractEndDateInstant,
			subscriptionUpgrade.getContractEndDateInstant());

		subscriptionUpgrade = _aiHubStudioSubscriptionUpgradeChecker.check(
			List.of(entitlement2, entitlement1));

		Assertions.assertEquals(
			contractEndDateInstant,
			subscriptionUpgrade.getContractEndDateInstant());
	}

	@Test
	public void testCheckWithStudio() throws Exception {
		Assertions.assertNull(
			_aiHubStudioSubscriptionUpgradeChecker.check(
				List.of(
					SubscriptionUpgradeCheckerTestUtil.createEntitlement(
						1, 1, _SKU_ACTIVATE),
					SubscriptionUpgradeCheckerTestUtil.createEntitlement(
						2, 2, _SKU_STUDIO))));
	}

	@Test
	public void testCheckWithStudioScheduled() throws Exception {
		Assertions.assertNull(
			_aiHubStudioSubscriptionUpgradeChecker.check(
				List.of(
					SubscriptionUpgradeCheckerTestUtil.createEntitlement(
						1, 1, _SKU_ACTIVATE),
					SubscriptionUpgradeCheckerTestUtil.createEntitlement(
						2, 2, _SKU_STUDIO,
						SubscriptionUpgradeCheckerTestUtil.getFutureInstant(),
						"active"))));
	}

	@Test
	public void testCheckWithoutComposablePricebook() throws Exception {
		Mockito.doReturn(
			false
		).when(
			_subscriptionUpgradeCheckerHelper
		).hasComposablePricebook(
			ArgumentMatchers.any(Entitlement.class)
		);

		Assertions.assertNull(
			_aiHubStudioSubscriptionUpgradeChecker.check(
				List.of(
					SubscriptionUpgradeCheckerTestUtil.createEntitlement(
						1, 1, _SKU_ACTIVATE))));
	}

	@Test
	public void testCheckWithoutContractEndDate() throws Exception {
		Mockito.doReturn(
			null
		).when(
			_subscriptionUpgradeCheckerHelper
		).fetchContractEndDateInstant(
			ArgumentMatchers.any(Entitlement.class)
		);

		Assertions.assertNull(
			_aiHubStudioSubscriptionUpgradeChecker.check(
				List.of(
					SubscriptionUpgradeCheckerTestUtil.createEntitlement(
						1, 1, _SKU_ACTIVATE))));
	}

	@Test
	public void testCheckWithoutStudioSku() throws Exception {
		Mockito.when(
			_commerceSkuService.getSkus(_PRODUCT_ID)
		).thenReturn(
			List.of(_createSku(_SKU_ACTIVATE))
		);

		Assertions.assertNull(
			_aiHubStudioSubscriptionUpgradeChecker.check(
				List.of(
					SubscriptionUpgradeCheckerTestUtil.createEntitlement(
						1, 1, _SKU_ACTIVATE))));
	}

	private Sku _createSku(String externalReferenceCode) {
		Sku sku = new Sku();

		sku.setExternalReferenceCode(externalReferenceCode);

		return sku;
	}

	private static final Instant _CONTRACT_END_DATE_INSTANT = Instant.parse(
		"2027-10-31T00:00:00Z");

	private static final long _PRODUCT_ID = 100;

	private static final String _SKU_ACTIVATE = "SKU_ACTIVATE";

	private static final String _SKU_STUDIO = "SKU_STUDIO";

	private final AIHubStudioSubscriptionUpgradeChecker
		_aiHubStudioSubscriptionUpgradeChecker =
			new AIHubStudioSubscriptionUpgradeChecker();
	private final CommerceSkuService _commerceSkuService = Mockito.mock(
		CommerceSkuService.class);
	private final SubscriptionUpgradeCheckerHelper
		_subscriptionUpgradeCheckerHelper = Mockito.spy(
			new SubscriptionUpgradeCheckerHelper());

}
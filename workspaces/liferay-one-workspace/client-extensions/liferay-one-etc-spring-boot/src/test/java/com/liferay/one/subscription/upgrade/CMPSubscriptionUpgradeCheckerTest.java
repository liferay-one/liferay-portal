/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.subscription.upgrade;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.ProductSpecification;
import com.liferay.one.constants.CommerceProductConstants;
import com.liferay.one.constants.ProductSpecificationConstants;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.SubscriptionUpgrade;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import java.util.List;
import java.util.Map;

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
	"[SVC-CMPSUBSCRIPTIONUPGRADECHECKER] CMPSubscriptionUpgradeChecker"
)
public class CMPSubscriptionUpgradeCheckerTest {

	@BeforeEach
	public void setUp() throws Exception {
		ReflectionTestUtils.setField(
			_cmpSubscriptionUpgradeChecker, "_cmpSkuExternalReferenceCode",
			_SKU_CMP);
		ReflectionTestUtils.setField(
			_cmpSubscriptionUpgradeChecker, "_subscriptionUpgradeCheckerHelper",
			_subscriptionUpgradeCheckerHelper);

		Product cmpProduct = _createProduct(
			"CMP", ProductSpecificationConstants.SOLUTION_TYPE_CMP);

		Mockito.doReturn(
			cmpProduct
		).when(
			_subscriptionUpgradeCheckerHelper
		).fetchProduct(
			_SKU_CMP
		);

		Mockito.doReturn(
			cmpProduct
		).when(
			_subscriptionUpgradeCheckerHelper
		).fetchProduct(
			_SKU_CMP_TRIAL
		);

		Mockito.doReturn(
			_createProduct(
				CommerceProductConstants.
					EXTERNAL_REFERENCE_CODE_LIFERAY_PLATFORM,
				null)
		).when(
			_subscriptionUpgradeCheckerHelper
		).fetchProduct(
			_SKU_LIFERAY_PLATFORM
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
	public void testCheckLiferayPlatform() throws Exception {
		SubscriptionUpgrade subscriptionUpgrade =
			_cmpSubscriptionUpgradeChecker.check(
				List.of(
					SubscriptionUpgradeCheckerTestUtil.createEntitlement(
						1, 1, _SKU_LIFERAY_PLATFORM)));

		Assertions.assertNotNull(subscriptionUpgrade);
		Assertions.assertEquals(
			_CONTRACT_END_DATE_INSTANT,
			subscriptionUpgrade.getContractEndDateInstant());
		Assertions.assertEquals(
			_SKU_LIFERAY_PLATFORM,
			subscriptionUpgrade.getCurrentSkuExternalReferenceCode());
		Assertions.assertEquals(
			CMPSubscriptionUpgradeChecker.KEY, subscriptionUpgrade.getKey());
		Assertions.assertEquals(
			_SKU_CMP, subscriptionUpgrade.getTargetSkuExternalReferenceCode());
	}

	@Test
	public void testCheckLiferayPlatformScheduled() throws Exception {
		Assertions.assertNull(
			_cmpSubscriptionUpgradeChecker.check(
				List.of(
					SubscriptionUpgradeCheckerTestUtil.createEntitlement(
						1, 1, _SKU_LIFERAY_PLATFORM,
						SubscriptionUpgradeCheckerTestUtil.getFutureInstant(),
						"active"))));
	}

	@Test
	public void testCheckLiferayPlatformSuspended() throws Exception {
		Assertions.assertNull(
			_cmpSubscriptionUpgradeChecker.check(
				List.of(
					SubscriptionUpgradeCheckerTestUtil.createEntitlement(
						1, 1, _SKU_LIFERAY_PLATFORM, null, "suspended"))));
	}

	@Test
	public void testCheckLiferayPlatformTerminated() throws Exception {
		Assertions.assertNull(
			_cmpSubscriptionUpgradeChecker.check(
				List.of(
					SubscriptionUpgradeCheckerTestUtil.createEntitlement(
						1, 1, _SKU_LIFERAY_PLATFORM, null, "terminated"))));
	}

	@Test
	public void testCheckLiferayPlatformWithCMPTrial() throws Exception {
		Assertions.assertNotNull(
			_cmpSubscriptionUpgradeChecker.check(
				List.of(
					SubscriptionUpgradeCheckerTestUtil.createEntitlement(
						1, 1, _SKU_LIFERAY_PLATFORM),
					SubscriptionUpgradeCheckerTestUtil.createEntitlement(
						0, 2, _SKU_CMP_TRIAL))));
	}

	@Test
	public void testCheckManyLiferayPlatform() throws Exception {
		Entitlement entitlement1 =
			SubscriptionUpgradeCheckerTestUtil.createEntitlement(
				1, 1, _SKU_LIFERAY_PLATFORM);

		Entitlement entitlement2 =
			SubscriptionUpgradeCheckerTestUtil.createEntitlement(
				2, 2, _SKU_LIFERAY_PLATFORM);

		Mockito.doReturn(
			false
		).when(
			_subscriptionUpgradeCheckerHelper
		).hasComposablePricebook(
			entitlement2
		);

		Assertions.assertNotNull(
			_cmpSubscriptionUpgradeChecker.check(
				List.of(entitlement1, entitlement2)));
		Assertions.assertNotNull(
			_cmpSubscriptionUpgradeChecker.check(
				List.of(entitlement2, entitlement1)));
	}

	@Test
	public void testCheckManyLiferayPlatformWithLaterContractEndDate()
		throws Exception {

		Entitlement entitlement1 =
			SubscriptionUpgradeCheckerTestUtil.createEntitlement(
				1, 1, _SKU_LIFERAY_PLATFORM);

		Entitlement entitlement2 =
			SubscriptionUpgradeCheckerTestUtil.createEntitlement(
				2, 2, _SKU_LIFERAY_PLATFORM);

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
			_cmpSubscriptionUpgradeChecker.check(
				List.of(entitlement1, entitlement2));

		Assertions.assertEquals(
			contractEndDateInstant,
			subscriptionUpgrade.getContractEndDateInstant());

		subscriptionUpgrade = _cmpSubscriptionUpgradeChecker.check(
			List.of(entitlement2, entitlement1));

		Assertions.assertEquals(
			contractEndDateInstant,
			subscriptionUpgrade.getContractEndDateInstant());
	}

	@Test
	public void testCheckWithCMP() throws Exception {
		Assertions.assertNull(
			_cmpSubscriptionUpgradeChecker.check(
				List.of(
					SubscriptionUpgradeCheckerTestUtil.createEntitlement(
						1, 1, _SKU_LIFERAY_PLATFORM),
					SubscriptionUpgradeCheckerTestUtil.createEntitlement(
						1, 2, _SKU_CMP))));
	}

	@Test
	public void testCheckWithCMPScheduled() throws Exception {
		Assertions.assertNull(
			_cmpSubscriptionUpgradeChecker.check(
				List.of(
					SubscriptionUpgradeCheckerTestUtil.createEntitlement(
						1, 1, _SKU_LIFERAY_PLATFORM),
					SubscriptionUpgradeCheckerTestUtil.createEntitlement(
						1, 2, _SKU_CMP,
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
			_cmpSubscriptionUpgradeChecker.check(
				List.of(
					SubscriptionUpgradeCheckerTestUtil.createEntitlement(
						1, 1, _SKU_LIFERAY_PLATFORM))));
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
			_cmpSubscriptionUpgradeChecker.check(
				List.of(
					SubscriptionUpgradeCheckerTestUtil.createEntitlement(
						1, 1, _SKU_LIFERAY_PLATFORM))));
	}

	@Test
	public void testCheckWithoutLiferayPlatform() throws Exception {
		Assertions.assertNull(
			_cmpSubscriptionUpgradeChecker.check(
				List.of(
					SubscriptionUpgradeCheckerTestUtil.createEntitlement(
						0, 1, _SKU_CMP_TRIAL))));
	}

	private Product _createProduct(
		String externalReferenceCode, String solutionType) {

		Product product = new Product();

		product.setExternalReferenceCode(externalReferenceCode);

		if (solutionType == null) {
			return product;
		}

		ProductSpecification productSpecification = new ProductSpecification();

		productSpecification.setSpecificationKey(
			() -> ProductSpecificationConstants.KEY_SOLUTION_TYPE);
		productSpecification.setValue(() -> Map.of("en_US", solutionType));

		product.setProductSpecifications(
			() -> new ProductSpecification[] {productSpecification});

		return product;
	}

	private static final Instant _CONTRACT_END_DATE_INSTANT = Instant.parse(
		"2027-06-30T00:00:00Z");

	private static final String _SKU_CMP = "SKU_CMP";

	private static final String _SKU_CMP_TRIAL = "SKU_CMP_TRIAL";

	private static final String _SKU_LIFERAY_PLATFORM = "SKU_LIFERAY_PLATFORM";

	private final CMPSubscriptionUpgradeChecker _cmpSubscriptionUpgradeChecker =
		new CMPSubscriptionUpgradeChecker();
	private final SubscriptionUpgradeCheckerHelper
		_subscriptionUpgradeCheckerHelper = Mockito.spy(
			new SubscriptionUpgradeCheckerHelper());

}
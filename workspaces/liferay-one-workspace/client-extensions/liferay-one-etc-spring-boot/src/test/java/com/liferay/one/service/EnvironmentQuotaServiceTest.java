/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.one.constants.EntitlementConstants;
import com.liferay.one.constants.EnvironmentConstants;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.Environment;
import com.liferay.one.model.EnvironmentQuota;

import java.util.Arrays;
import java.util.List;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[SVC-ENVIRONMENTQUOTASERVICE] EnvironmentQuotaService")
public class EnvironmentQuotaServiceTest {

	@BeforeEach
	public void setUp() {
		ReflectionTestUtils.setField(
			_environmentQuotaService, "_entitlementService",
			_entitlementService);
		ReflectionTestUtils.setField(
			_environmentQuotaService, "_environmentService",
			_environmentService);
	}

	@Test
	public void testGetEnvironmentQuotaCountsOnlyActiveEnvironmentsOfTheType()
		throws Exception {

		_whenProject(
			Arrays.asList(
				_createEntitlement(
					10L, null, 2.0,
					EntitlementConstants.NAME_PRODUCTION_ENVIRONMENTS),
				_createEntitlement(
					10L, null, 1.0,
					EntitlementConstants.NAME_PRODUCTION_ENVIRONMENTS),
				_createEntitlement(
					20L, null, 5.0,
					EntitlementConstants.NAME_UAT_ENVIRONMENTS)),
			Arrays.asList(
				_createEnvironment(
					EnvironmentConstants.ACTIVATION_STATUS_ACTIVE, 1,
					EnvironmentConstants.TYPE_PRODUCTION),
				_createEnvironment(
					EnvironmentConstants.ACTIVATION_STATUS_PENDING, 2,
					EnvironmentConstants.TYPE_PRODUCTION),
				_createEnvironment(
					EnvironmentConstants.ACTIVATION_STATUS_ACTIVE, 3,
					EnvironmentConstants.TYPE_UAT)));

		EnvironmentQuota environmentQuota =
			_environmentQuotaService.getEnvironmentQuota(
				"PRJCT-1", EnvironmentConstants.TYPE_PRODUCTION);

		Assertions.assertEquals(2, environmentQuota.getAvailableCount());
		Assertions.assertEquals(10L, environmentQuota.getContractId());
		Assertions.assertEquals(
			2,
			environmentQuota.getEnvironments(
			).size());
		Assertions.assertEquals(3, environmentQuota.getTotalCount());
		Assertions.assertEquals(
			EnvironmentConstants.TYPE_PRODUCTION, environmentQuota.getType());
		Assertions.assertFalse(environmentQuota.isUnlimited());
		Assertions.assertEquals(1, environmentQuota.getUsedCount());
	}

	@Test
	public void testGetEnvironmentQuotaWithMultipleContractsHasNoContractId()
		throws Exception {

		_whenProject(
			Arrays.asList(
				_createEntitlement(
					10L, null, 1.0, EntitlementConstants.NAME_UAT_ENVIRONMENTS),
				_createEntitlement(
					11L, null, 1.0, EntitlementConstants.NAME_UAT_ENVIRONMENTS),
				_createEntitlement(
					0L, null, 1.0, EntitlementConstants.NAME_UAT_ENVIRONMENTS)),
			List.of());

		EnvironmentQuota environmentQuota =
			_environmentQuotaService.getEnvironmentQuota(
				"PRJCT-1", EnvironmentConstants.TYPE_UAT);

		Assertions.assertEquals(0L, environmentQuota.getContractId());
		Assertions.assertEquals(3, environmentQuota.getTotalCount());
	}

	@Test
	public void testGetEnvironmentQuotaWithNoEntitlementIsUnavailable()
		throws Exception {

		_whenProject(List.of(), List.of());

		EnvironmentQuota environmentQuota =
			_environmentQuotaService.getEnvironmentQuota(
				"PRJCT-1", EnvironmentConstants.TYPE_NONPRODUCTION);

		Assertions.assertEquals(0L, environmentQuota.getContractId());
		Assertions.assertEquals(0, environmentQuota.getTotalCount());
		Assertions.assertFalse(environmentQuota.isAvailable());
	}

	@Test
	public void testGetEnvironmentQuotaWithUnlimitedGrantIsAvailable()
		throws Exception {

		_whenProject(
			Arrays.asList(
				_createEntitlement(
					10L, EntitlementConstants.GRANT_TYPE_UNLIMITED, null,
					EntitlementConstants.NAME_NONPRODUCTION_ENVIRONMENTS)),
			Arrays.asList(
				_createEnvironment(
					EnvironmentConstants.ACTIVATION_STATUS_ACTIVE, 1,
					EnvironmentConstants.TYPE_NONPRODUCTION)));

		EnvironmentQuota environmentQuota =
			_environmentQuotaService.getEnvironmentQuota(
				"PRJCT-1", EnvironmentConstants.TYPE_NONPRODUCTION);

		Assertions.assertEquals(0, environmentQuota.getTotalCount());
		Assertions.assertTrue(environmentQuota.isAvailable());
		Assertions.assertTrue(environmentQuota.isUnlimited());
		Assertions.assertEquals(1, environmentQuota.getUsedCount());
	}

	@Test
	public void testGetEnvironmentQuotasReturnsOneQuotaPerType()
		throws Exception {

		_whenProject(
			Arrays.asList(
				_createEntitlement(
					10L, null, 4.0,
					EntitlementConstants.NAME_UAT_ENVIRONMENTS)),
			List.of());

		List<EnvironmentQuota> environmentQuotas =
			_environmentQuotaService.getEnvironmentQuotas("PRJCT-1");

		Assertions.assertEquals(
			EnvironmentConstants.types,
			Arrays.asList(
				environmentQuotas.get(
					0
				).getType(),
				environmentQuotas.get(
					1
				).getType(),
				environmentQuotas.get(
					2
				).getType()));
		Assertions.assertEquals(
			0,
			environmentQuotas.get(
				0
			).getTotalCount());
		Assertions.assertEquals(
			4,
			environmentQuotas.get(
				2
			).getTotalCount());
	}

	private Entitlement _createEntitlement(
		long contractId, String grantType, Double maxQuantity, String name) {

		JSONObject jsonObject = new JSONObject(
		).put(
			"grantType", grantType
		).put(
			"id", ++_entitlementId
		).put(
			"name", name
		).put(
			"r_contractToEntitlement_c_contractId", contractId
		);

		if (maxQuantity != null) {
			jsonObject.put("maxQuantity", maxQuantity);
		}

		return new Entitlement(jsonObject);
	}

	private Environment _createEnvironment(
		String activationStatus, long id, String type) {

		return new Environment(
			new JSONObject(
			).put(
				"activationStatus", activationStatus
			).put(
				"id", id
			).put(
				"type", type
			));
	}

	private void _whenProject(
			List<Entitlement> entitlements, List<Environment> environments)
		throws Exception {

		Mockito.when(
			_entitlementService.getActiveEntitlements("PRJCT-1")
		).thenReturn(
			entitlements
		);

		Mockito.when(
			_environmentService.getCloudNativeEnvironments("PRJCT-1")
		).thenReturn(
			environments
		);
	}

	private long _entitlementId;
	private final EntitlementService _entitlementService = Mockito.mock(
		EntitlementService.class);
	private final EnvironmentQuotaService _environmentQuotaService =
		new EnvironmentQuotaService();
	private final EnvironmentService _environmentService = Mockito.mock(
		EnvironmentService.class);

}
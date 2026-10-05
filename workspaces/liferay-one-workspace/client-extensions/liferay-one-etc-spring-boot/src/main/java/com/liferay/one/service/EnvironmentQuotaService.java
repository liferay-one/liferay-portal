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
import com.liferay.one.util.ClusterNodesUtil;
import com.liferay.portal.kernel.util.LinkedHashMapBuilder;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * @author Ryan Schuhler
 */
@Component
public class EnvironmentQuotaService {

	public EnvironmentQuota getEnvironmentQuota(
			String projectExternalReferenceCode, String type)
		throws Exception {

		return _getEnvironmentQuota(
			_entitlementService.getActiveEntitlements(
				projectExternalReferenceCode),
			_environmentService.getCloudNativeEnvironments(
				projectExternalReferenceCode),
			type);
	}

	public List<EnvironmentQuota> getEnvironmentQuotas(
			String projectExternalReferenceCode)
		throws Exception {

		return _getEnvironmentQuotas(
			_entitlementService.getActiveEntitlements(
				projectExternalReferenceCode),
			_environmentService.getCloudNativeEnvironments(
				projectExternalReferenceCode));
	}

	private long _getContractId(Set<Long> contractIds) {
		if (contractIds.size() != 1) {
			return 0;
		}

		Iterator<Long> iterator = contractIds.iterator();

		return iterator.next();
	}

	private EnvironmentQuota _getEnvironmentQuota(
		List<Entitlement> entitlements, List<Environment> environments,
		String type) {

		String name = _entitlementNamesByEnvironmentType.get(type);

		Set<Long> contractIds = new HashSet<>();
		int totalCount = 0;
		boolean unlimited = false;

		for (Entitlement entitlement : entitlements) {
			if (!Objects.equals(name, entitlement.getName())) {
				continue;
			}

			long contractId = entitlement.getContractId();

			if (contractId > 0) {
				contractIds.add(contractId);
			}

			// An unlimited grant carries no maximum quantity, so it has no
			// total to add. The bounded entitlements keep the single total
			// count implementation the license key generate form uses.

			if (Objects.equals(
					EntitlementConstants.GRANT_TYPE_UNLIMITED,
					entitlement.getGrantType())) {

				unlimited = true;

				continue;
			}

			totalCount += LicenseKeyGenerateFormService.getTotalCount(
				entitlement);
		}

		List<Environment> typeEnvironments = new ArrayList<>();
		int usedCount = 0;

		for (Environment environment : environments) {
			if (!Objects.equals(type, environment.getType())) {
				continue;
			}

			typeEnvironments.add(environment);

			// Generating an activation code does not spend the entitlement.
			// Only an environment that registered against the code does.

			if (Objects.equals(
					EnvironmentConstants.ACTIVATION_STATUS_ACTIVE,
					environment.getActivationStatus())) {

				usedCount++;
			}
		}

		return new EnvironmentQuota(
			_getContractId(contractIds), typeEnvironments,
			ClusterNodesUtil.getMaxClusterNodes(entitlements, type), totalCount,
			type, unlimited, usedCount);
	}

	private List<EnvironmentQuota> _getEnvironmentQuotas(
		List<Entitlement> entitlements, List<Environment> environments) {

		List<EnvironmentQuota> environmentQuotas = new ArrayList<>();

		for (String type : EnvironmentConstants.types) {
			environmentQuotas.add(
				_getEnvironmentQuota(entitlements, environments, type));
		}

		return environmentQuotas;
	}

	private static final Map<String, String>
		_entitlementNamesByEnvironmentType = Collections.unmodifiableMap(
			LinkedHashMapBuilder.put(
				EnvironmentConstants.TYPE_NONPRODUCTION,
				EntitlementConstants.NAME_NONPRODUCTION_ENVIRONMENTS
			).put(
				EnvironmentConstants.TYPE_PRODUCTION,
				EntitlementConstants.NAME_PRODUCTION_ENVIRONMENTS
			).put(
				EnvironmentConstants.TYPE_UAT,
				EntitlementConstants.NAME_UAT_ENVIRONMENTS
			).build());

	@Autowired
	private EntitlementService _entitlementService;

	@Autowired
	private EnvironmentService _environmentService;

}
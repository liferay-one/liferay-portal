/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.license;

import com.liferay.one.constants.EntitlementConstants;
import com.liferay.one.exception.LicenseKeyDateException;
import com.liferay.one.exception.LicenseKeyMaxClusterNodesException;
import com.liferay.one.exception.LicenseKeyTypeException;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.EntitlementDefinition;
import com.liferay.one.model.LicenseKey;
import com.liferay.one.service.LicenseKeyService;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.ee.license.shared.LicenseConstants;
import com.liferay.portal.kernel.security.auth.PrincipalException;
import com.liferay.portal.kernel.util.ArrayUtil;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * @author Allen Ziegenfus
 */
@Component
public class LicenseKeyEntitlementValidator {

	public void validateEntitlementDefinition(Entitlement entitlement)
		throws Exception {

		EntitlementDefinition entitlementDefinition =
			entitlement.getEntitlementDefinition();

		if ((entitlementDefinition == null) ||
			!ArrayUtil.contains(
				EntitlementConstants.EXTERNAL_REFERENCE_CODES_SELF_HOSTED,
				entitlementDefinition.getExternalReferenceCode())) {

			throw new PrincipalException(
				StringBundler.concat(
					"Entitlement ", entitlement.getEntitlementId(),
					" does not grant self-hosted license keys"));
		}
	}

	public void validateLicenseType(String licenseType) throws Exception {
		if (!ArrayUtil.contains(_LICENSE_TYPES_SELF_SERVICE, licenseType)) {
			throw new LicenseKeyTypeException(
				"Invalid license type " + licenseType);
		}
	}

	public void validateMaxClusterNodes(int maxClusterNodes) throws Exception {
		if (maxClusterNodes > _MAX_CLUSTER_NODES) {
			throw new LicenseKeyMaxClusterNodesException(
				"No more than " + _MAX_CLUSTER_NODES +
					" cluster nodes may be requested");
		}
	}

	public void validateQuota(
			Entitlement entitlement,
			LicenseKeyQuotaContext licenseKeyQuotaContext, int maxClusterNodes)
		throws Exception {

		validateMaxClusterNodes(maxClusterNodes);

		if (EntitlementConstants.GRANT_TYPE_UNLIMITED.equals(
				entitlement.getGrantType())) {

			return;
		}

		long entitlementId = entitlement.getEntitlementId();

		if (!licenseKeyQuotaContext.hasServerCount(entitlementId)) {
			long serverCount = 0;

			for (LicenseKey licenseKey :
					_licenseKeyService.getLicenseKeys(
						true, false, entitlementId)) {

				serverCount += _getServerCount(licenseKey.getMaxClusterNodes());
			}

			licenseKeyQuotaContext.setServerCount(entitlementId, serverCount);
		}

		long pendingServerCount =
			licenseKeyQuotaContext.getPendingServerCount(entitlementId) +
				_getServerCount(maxClusterNodes);

		Double quantity = entitlement.getQuantity();

		long maxServerCount = 0;

		if (quantity != null) {
			maxServerCount = quantity.longValue();
		}

		long serverCount =
			licenseKeyQuotaContext.getServerCount(entitlementId) +
				pendingServerCount;

		if (serverCount > maxServerCount) {
			throw new PrincipalException(
				"Entitlement " + entitlementId +
					" has no more available licenses");
		}

		licenseKeyQuotaContext.setPendingServerCount(
			entitlementId, pendingServerCount);
	}

	public void validateTerm(
			boolean allowPermanentLicenses, Entitlement entitlement,
			Instant expirationDateInstant, Instant startDateInstant)
		throws Exception {

		Instant endDateInstant = entitlement.getEndDateInstant();

		if (endDateInstant == null) {
			if (!allowPermanentLicenses) {
				throw new PrincipalException(
					StringBundler.concat(
						"Entitlement ", entitlement.getEntitlementId(),
						" is perpetual and the account does not allow ",
						"permanent licenses"));
			}
		}
		else if (expirationDateInstant.isAfter(
					endDateInstant.plus(
						_ENTITLEMENT_END_DATE_TOLERANCE_DAYS,
						ChronoUnit.DAYS))) {

			throw new LicenseKeyDateException(
				"The expiration date is after the end of entitlement " +
					entitlement.getEntitlementId());
		}

		Instant entitlementStartDateInstant = entitlement.getStartDateInstant();

		if ((entitlementStartDateInstant != null) &&
			entitlementStartDateInstant.isAfter(startDateInstant)) {

			throw new LicenseKeyDateException(
				"The start date is before the start of entitlement " +
					entitlement.getEntitlementId());
		}
	}

	private long _getServerCount(int maxClusterNodes) {
		if (maxClusterNodes > 1) {
			return maxClusterNodes;
		}

		return 1;
	}

	private static final int _ENTITLEMENT_END_DATE_TOLERANCE_DAYS = 1;

	private static final String[] _LICENSE_TYPES_SELF_SERVICE = {
		"backup", LicenseConstants.TYPE_LIMITED, LicenseConstants.TYPE_PER_USER,
		LicenseConstants.TYPE_PRODUCTION
	};

	private static final int _MAX_CLUSTER_NODES = 1024;

	@Autowired
	private LicenseKeyService _licenseKeyService;

}
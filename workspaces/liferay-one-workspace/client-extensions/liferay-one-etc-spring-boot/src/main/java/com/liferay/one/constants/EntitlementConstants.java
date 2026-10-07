/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.constants;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * @author Felipe Veloso
 */
public class EntitlementConstants {

	public static final String EXTERNAL_REFERENCE_CODE_DXP = "C_ENT_DEF_DXP";

	public static final String EXTERNAL_REFERENCE_CODE_PORTAL =
		"C_ENT_DEF_PORTAL";

	public static final String EXTERNAL_REFERENCE_CODE_PORTAL_EWSA =
		"C_ENT_DEF_PORTAL_EWSA";

	public static final String GRANT_TYPE_UNLIMITED = "unlimited";

	public static final String NAME_ACTIVE_BATCH_SEGMENTS =
		"active-batch-segments";

	public static final String NAME_ACTIVE_REAL_TIME_SEGMENTS =
		"active-real-time-segments";

	public static final String NAME_AI_TOKEN_BLOCK = "aiTokenBlock";

	public static final String NAME_API_REQUESTS = "api-requests";

	public static final String NAME_APV = "apv";

	public static final String NAME_CLOUD_NATIVE = "cloud-native";

	public static final String NAME_CONNECTORS = "connectors";

	public static final String NAME_DATABASE = "database";

	public static final String NAME_DISASTER_RECOVERY = "disasterRecovery";

	public static final String NAME_DOCUMENT_LIBRARY_SIZE =
		"document-library-size";

	public static final String NAME_EVENTS = "events";

	public static final String NAME_EVENTS_ADD_ON_BUCKET =
		"events-add-on-bucket";

	public static final String NAME_EXTENSIONS_RAM = "extensions-ram";

	public static final String NAME_EXTENSIONS_VCPU = "extensions-vcpu";

	public static final String NAME_EXTENSIONS_VCPUS = "extensions-vcpus";

	public static final String NAME_GLOBAL_24_7_SUPPORT = "global-24-7-support";

	public static final String NAME_GLOBAL_SUPPORT = "global-support";

	public static final String NAME_GOLD_SUPPORT = "gold-support";

	public static final String NAME_LICENSE_GENERATION = "licenseGeneration";

	public static final String NAME_LIFERAY_SAAS_SUPPORT =
		"liferay-saas-support";

	public static final String NAME_LIMITED_SUPPORT = "limited-support";

	public static final String NAME_LOGS = "logs";

	public static final String NAME_MALU = "malu";

	public static final String NAME_NONPRODUCTION_ENVIRONMENTS =
		"non-production-environments";

	public static final String NAME_PARTNER = "partner";

	public static final String NAME_PLATINUM_SUPPORT = "platinum-support";

	public static final String NAME_PREMIER_24_7_SUPPORT =
		"premier-24-7-support";

	public static final String NAME_PRODUCTION_ENVIRONMENTS =
		"production-environments";

	public static final String NAME_PRODUCTION_PODS = "production-pods";

	public static final String NAME_RAM = "ram";

	public static final String NAME_SELF_SERVICE_SUPPORT =
		"self-service-support";

	public static final String NAME_SITES = "sites";

	public static final String NAME_STANDARD_8_5_SUPPORT =
		"standard-8-5-support";

	public static final String NAME_STANDARD_SUPPORT = "standard-support";

	public static final String NAME_STORAGE = "storage";

	public static final String NAME_STRATEGIC_24_7_SUPPORT =
		"strategic-24-7-support";

	public static final String NAME_TRAFFIC_NETWORKING = "traffic-networking";

	public static final String NAME_UAT_ENVIRONMENTS = "uat-environments";

	public static final String NAME_VCPU = "vcpu";

	public static final String STATE_ACTIVE = "Active";

	public static final String STATE_EXPIRED = "Expired";

	public static final String STATE_UNACTIVATED = "Unactivated";

	public static final String TERMINATION_STATUS_ACTIVE = "active";

	public static final String TERMINATION_STATUS_SUSPENDED = "suspended";

	public static final String TERMINATION_STATUS_TERMINATED = "terminated";

	public static final List<String> externalReferenceCodesSelfHosted =
		Collections.unmodifiableList(
			Arrays.asList(
				EXTERNAL_REFERENCE_CODE_DXP, EXTERNAL_REFERENCE_CODE_PORTAL,
				EXTERNAL_REFERENCE_CODE_PORTAL_EWSA));
	public static final List<String> namesSLAs = Collections.unmodifiableList(
		Arrays.asList(
			NAME_GLOBAL_24_7_SUPPORT, NAME_GLOBAL_SUPPORT, NAME_GOLD_SUPPORT,
			NAME_LIFERAY_SAAS_SUPPORT, NAME_LIMITED_SUPPORT,
			NAME_PLATINUM_SUPPORT, NAME_PREMIER_24_7_SUPPORT,
			NAME_SELF_SERVICE_SUPPORT, NAME_STANDARD_8_5_SUPPORT,
			NAME_STANDARD_SUPPORT, NAME_STRATEGIC_24_7_SUPPORT));
	public static final List<String> terminationStatuses =
		Collections.unmodifiableList(
			Arrays.asList(
				TERMINATION_STATUS_ACTIVE, TERMINATION_STATUS_SUSPENDED,
				TERMINATION_STATUS_TERMINATED));

}
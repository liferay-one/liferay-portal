/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.usage;

import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.one.constants.SkuOptionConstants;
import com.liferay.one.exception.InvalidUsageParameterException;
import com.liferay.one.model.Contract;
import com.liferay.one.model.Entitlement;
import com.liferay.one.model.EntitlementDefinition;
import com.liferay.one.model.OveragePricing;
import com.liferay.one.model.Project;
import com.liferay.one.model.UsageAllotment;
import com.liferay.one.model.UsageDefinition;
import com.liferay.one.model.UsageReport;
import com.liferay.one.service.CommerceProductService;
import com.liferay.one.service.CommerceSkuService;
import com.liferay.one.service.ContractService;
import com.liferay.one.service.EntitlementService;
import com.liferay.one.service.ProjectService;
import com.liferay.one.service.UsageDefinitionService;
import com.liferay.one.service.UsageReportService;
import com.liferay.one.util.CommerceProductUtil;
import com.liferay.one.util.UsageUnitUtil;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.StringUtil;
import com.liferay.portal.kernel.util.Validator;

import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Generates one usage report per project per metered usage definition for a
 * calendar month. Everything that varies by metric is data: the usage
 * definition names the {@link UsageSource} and the field to read, its
 * entitlement definitions decide which entitlements count, and the
 * <code>consumption-role</code> option of each granting SKU decides how. A
 * new metric on an API that already has a source is seed data only.
 *
 * @author Drew Brokke
 */
@Component
public class UsageReportGenerator {

	public void generateUsageReports(YearMonth yearMonth) throws Exception {
		YearMonth currentYearMonth = YearMonth.now(ZoneOffset.UTC);

		if (!yearMonth.isBefore(currentYearMonth)) {
			throw new InvalidUsageParameterException(
				StringBundler.concat(
					"Unable to generate usage reports for ", yearMonth,
					" because the month is not complete"));
		}

		if (_log.isInfoEnabled()) {
			_log.info("Generating usage reports for " + yearMonth);
		}

		Instant startInstant = yearMonth.atDay(
			1
		).atStartOfDay(
			ZoneOffset.UTC
		).toInstant();

		Instant endInstant = yearMonth.plusMonths(
			1
		).atDay(
			1
		).atStartOfDay(
			ZoneOffset.UTC
		).toInstant();

		Map<String, String> consumptionRolesBySkuExternalReferenceCode =
			new HashMap<>();
		int generatedCount = 0;
		int projectCount = 0;

		for (UsageDefinition usageDefinition :
				_usageDefinitionService.getUsageDefinitions()) {

			if (!usageDefinition.hasUsageSource()) {
				continue;
			}

			UsageSource usageSource = _usageSourceRegistry.fetchUsageSource(
				usageDefinition.getUsageSource());

			if (usageSource == null) {
				_log.error(
					StringBundler.concat(
						"Unable to find usage source \"",
						usageDefinition.getUsageSource(),
						"\" of usage definition ",
						usageDefinition.getExternalReferenceCode()));

				continue;
			}

			Map<String, List<Entitlement>> entitlementsByProject =
				_getEntitlementsByProject(
					endInstant, startInstant, usageDefinition);

			projectCount += entitlementsByProject.size();

			for (Map.Entry<String, List<Entitlement>> entry :
					entitlementsByProject.entrySet()) {

				String projectExternalReferenceCode = entry.getKey();

				try {
					if (_generateUsageReport(
							consumptionRolesBySkuExternalReferenceCode,
							endInstant, entry.getValue(),
							projectExternalReferenceCode, startInstant,
							usageDefinition, usageSource, yearMonth)) {

						generatedCount++;
					}
				}
				catch (Exception exception) {
					_log.error(
						StringBundler.concat(
							"Unable to generate the ",
							usageDefinition.getExternalReferenceCode(),
							" usage report for project ",
							projectExternalReferenceCode, " for ", yearMonth),
						exception);
				}
			}
		}

		if (_log.isInfoEnabled()) {
			_log.info(
				StringBundler.concat(
					"Generated ", generatedCount, " of ", projectCount,
					" usage reports for ", yearMonth));
		}
	}

	@Scheduled(cron = "${liferay.one.usage.report.cron}", zone = "UTC")
	public void scheduledGenerateUsageReports() {
		YearMonth yearMonth = YearMonth.now(
			ZoneOffset.UTC
		).minusMonths(
			1
		);

		try {
			generateUsageReports(yearMonth);
		}
		catch (Exception exception) {
			_log.error(
				"Unable to generate usage reports for " + yearMonth, exception);
		}
	}

	private String _fetchContractExternalReferenceCode(
			List<Entitlement> entitlements)
		throws Exception {

		for (Entitlement entitlement : entitlements) {
			long contractId = entitlement.getContractId();

			if (contractId <= 0) {
				continue;
			}

			Contract contract = _contractService.fetchContract(contractId);

			if (contract != null) {
				return contract.getExternalReferenceCode();
			}
		}

		return null;
	}

	/**
	 * Returns the product whose SKU granted the allotment, which is the
	 * product the report belongs to. An add-on bucket is sold under the same
	 * product but is not what the project subscribed to.
	 */
	private Product _fetchProduct(
			Map<String, String> consumptionRolesBySkuExternalReferenceCode,
			List<Entitlement> entitlements)
		throws Exception {

		for (Entitlement entitlement : entitlements) {
			String skuExternalReferenceCode = _getSkuExternalReferenceCode(
				entitlement);

			if (skuExternalReferenceCode == null) {
				continue;
			}

			String consumptionRole =
				consumptionRolesBySkuExternalReferenceCode.get(
					skuExternalReferenceCode);

			if ((consumptionRole != null) &&
				!consumptionRole.equals(
					SkuOptionConstants.VALUE_CONSUMPTION_ROLE_ALLOTMENT)) {

				continue;
			}

			Long productId = _commerceSkuService.fetchProductId(
				skuExternalReferenceCode);

			if (productId == null) {
				continue;
			}

			return _commerceProductService.fetchProduct(productId);
		}

		return null;
	}

	private boolean _generateUsageReport(
			Map<String, String> consumptionRolesBySkuExternalReferenceCode,
			Instant endInstant, List<Entitlement> entitlements,
			String projectExternalReferenceCode, Instant startInstant,
			UsageDefinition usageDefinition, UsageSource usageSource,
			YearMonth yearMonth)
		throws Exception {

		_resolveConsumptionRoles(
			consumptionRolesBySkuExternalReferenceCode, entitlements);

		UsageAllotment usageAllotment = new UsageAllotment(
			consumptionRolesBySkuExternalReferenceCode, entitlements,
			_getOverageBucketSize(usageDefinition), usageDefinition.getUnit());

		Set<String> skuExternalReferenceCodesWithoutConsumptionRole =
			usageAllotment.getSkuExternalReferenceCodesWithoutConsumptionRole();

		if (!skuExternalReferenceCodesWithoutConsumptionRole.isEmpty()) {
			_log.error(
				StringBundler.concat(
					"Unable to generate the ",
					usageDefinition.getExternalReferenceCode(),
					" usage report for project ", projectExternalReferenceCode,
					" because SKUs ",
					skuExternalReferenceCodesWithoutConsumptionRole,
					" have no ", SkuOptionConstants.KEY_CONSUMPTION_ROLE,
					" option"));

			return false;
		}

		if (usageAllotment.isUnlimited()) {
			if (_log.isInfoEnabled()) {
				_log.info(
					StringBundler.concat(
						"Skipping project ", projectExternalReferenceCode,
						" because its ",
						usageDefinition.getExternalReferenceCode(),
						" allotment is unlimited"));
			}

			return false;
		}

		if (!usageAllotment.isEntitledQuantityKnown()) {
			_log.error(
				StringBundler.concat(
					"Unable to generate the ",
					usageDefinition.getExternalReferenceCode(),
					" usage report for project ", projectExternalReferenceCode,
					" because the usage definition has no overage bucket size ",
					"to measure its add-on buckets by"));

			return false;
		}

		String externalReferenceCode = _getExternalReferenceCode(
			projectExternalReferenceCode, usageDefinition, yearMonth);

		UsageReport existingUsageReport = _usageReportService.fetchUsageReport(
			externalReferenceCode);

		if (existingUsageReport != null) {
			if (_log.isInfoEnabled()) {
				_log.info(
					"Skipping usage report " + externalReferenceCode +
						" because it already exists");
			}

			return false;
		}

		Project project = _projectService.fetchProject(
			projectExternalReferenceCode);

		if (project == null) {
			_log.error(
				"Unable to find project " + projectExternalReferenceCode);

			return false;
		}

		Double usage = usageSource.fetchUsage(
			project, usageDefinition, yearMonth);

		if (usage == null) {
			if (_log.isWarnEnabled()) {
				_log.warn(
					StringBundler.concat(
						"Skipping project ", projectExternalReferenceCode,
						" because usage source ", usageSource.getKey(),
						" has no ", usageDefinition.getExternalReferenceCode(),
						" usage for ", yearMonth));
			}

			return false;
		}

		double aggregateQuantity = UsageUnitUtil.convert(
			usage, usageDefinition.getUsageSourceUnit(),
			usageDefinition.getUnit());

		Product product = _fetchProduct(
			consumptionRolesBySkuExternalReferenceCode, entitlements);

		String productExternalReferenceCode = null;
		String productName = null;

		if (product == null) {
			if (_log.isWarnEnabled()) {
				_log.warn(
					StringBundler.concat(
						"Unable to find the product of the ",
						usageDefinition.getExternalReferenceCode(),
						" allotment of project ",
						projectExternalReferenceCode));
			}
		}
		else {
			productExternalReferenceCode = product.getExternalReferenceCode();
			productName = CommerceProductUtil.getName(product);
		}

		UsageReport usageReport = _usageReportService.addUsageReport(
			aggregateQuantity,
			_fetchContractExternalReferenceCode(entitlements), startInstant,
			endInstant.minusMillis(1), usageAllotment.getEntitledQuantity(),
			externalReferenceCode,
			_getOveragePricing(
				aggregateQuantity, projectExternalReferenceCode, usageAllotment,
				usageDefinition),
			productExternalReferenceCode, productName, project,
			usageDefinition);

		if (_log.isInfoEnabled()) {
			_log.info(
				StringBundler.concat(
					"Generated usage report ", externalReferenceCode, " with ",
					usageReport.getOverageQuantity(), " ",
					usageDefinition.getUnit(), " of overage in ",
					_toLong(usageReport.getOverageSkuQuantity()),
					" overage buckets"));
		}

		return true;
	}

	private Map<String, List<Entitlement>> _getEntitlementsByProject(
			Instant endInstant, Instant startInstant,
			UsageDefinition usageDefinition)
		throws Exception {

		Map<String, List<Entitlement>> entitlementsByProject =
			new LinkedHashMap<>();

		for (Entitlement entitlement :
				_entitlementService.getUsageDefinitionEntitlements(
					endInstant, startInstant,
					usageDefinition.getExternalReferenceCode())) {

			String projectExternalReferenceCode =
				entitlement.getProjectExternalReferenceCode();

			if (Validator.isNull(projectExternalReferenceCode)) {
				continue;
			}

			List<Entitlement> entitlements =
				entitlementsByProject.computeIfAbsent(
					projectExternalReferenceCode, key -> new ArrayList<>());

			entitlements.add(entitlement);
		}

		return entitlementsByProject;
	}

	private String _getExternalReferenceCode(
		String projectExternalReferenceCode, UsageDefinition usageDefinition,
		YearMonth yearMonth) {

		return StringBundler.concat(
			_EXTERNAL_REFERENCE_CODE_PREFIX,
			_toExternalReferenceCodeSegment(projectExternalReferenceCode), "_",
			_toExternalReferenceCodeSegment(
				usageDefinition.getExternalReferenceCode()),
			"_", yearMonth.format(_yearMonthDateTimeFormatter));
	}

	private long _getOverageBucketSize(UsageDefinition usageDefinition) {
		if (!usageDefinition.hasOverageBucketSize()) {
			return 0;
		}

		Double overageBucketSize = usageDefinition.getOverageBucketSize();

		return overageBucketSize.longValue();
	}

	private OveragePricing _getOveragePricing(
		double aggregateQuantity, String projectExternalReferenceCode,
		UsageAllotment usageAllotment, UsageDefinition usageDefinition) {

		OveragePricing overagePricing = usageAllotment.getOveragePricing();

		if ((overagePricing != null) &&
			usageDefinition.hasOverageBucketSize()) {

			return overagePricing;
		}

		if (aggregateQuantity <= usageAllotment.getEntitledQuantity()) {
			return null;
		}

		String usageDefinitionExternalReferenceCode =
			usageDefinition.getExternalReferenceCode();

		if (!usageDefinition.hasOverageBucketSize()) {
			_log.error(
				StringBundler.concat(
					"Unable to price the ",
					usageDefinitionExternalReferenceCode,
					" overage of project ", projectExternalReferenceCode,
					" because the usage definition has no overage bucket ",
					"size"));
		}
		else if (usageAllotment.hasConflictingOveragePricing()) {
			_log.error(
				StringBundler.concat(
					"Unable to price the ",
					usageDefinitionExternalReferenceCode,
					" overage of project ", projectExternalReferenceCode,
					" because its allotments carry conflicting overage ",
					"pricing"));
		}
		else {
			_log.error(
				StringBundler.concat(
					"Unable to price the ",
					usageDefinitionExternalReferenceCode,
					" overage of project ", projectExternalReferenceCode,
					" because its allotments carry no overage pricing"));
		}

		return null;
	}

	private String _getSkuExternalReferenceCode(Entitlement entitlement) {
		EntitlementDefinition entitlementDefinition =
			entitlement.getEntitlementDefinition();

		if (entitlementDefinition == null) {
			return null;
		}

		String skuExternalReferenceCode =
			entitlementDefinition.getSkuExternalReferenceCode();

		if (Validator.isNull(skuExternalReferenceCode)) {
			return null;
		}

		return skuExternalReferenceCode;
	}

	private void _resolveConsumptionRoles(
			Map<String, String> consumptionRolesBySkuExternalReferenceCode,
			List<Entitlement> entitlements)
		throws Exception {

		for (Entitlement entitlement : entitlements) {
			String skuExternalReferenceCode = _getSkuExternalReferenceCode(
				entitlement);

			if ((skuExternalReferenceCode == null) ||
				consumptionRolesBySkuExternalReferenceCode.containsKey(
					skuExternalReferenceCode)) {

				continue;
			}

			consumptionRolesBySkuExternalReferenceCode.put(
				skuExternalReferenceCode,
				_commerceSkuService.fetchConsumptionRole(
					skuExternalReferenceCode));
		}
	}

	private String _toExternalReferenceCodeSegment(String value) {
		return StringUtil.toUpperCase(StringUtil.replace(value, '-', '_'));
	}

	private long _toLong(Double value) {
		if (value == null) {
			return 0;
		}

		return value.longValue();
	}

	private static final String _EXTERNAL_REFERENCE_CODE_PREFIX =
		"C_USAGE_REPORT_";

	private static final Log _log = LogFactory.getLog(
		UsageReportGenerator.class);

	private static final DateTimeFormatter _yearMonthDateTimeFormatter =
		DateTimeFormatter.ofPattern("yyyy_MM");

	@Autowired
	private CommerceProductService _commerceProductService;

	@Autowired
	private CommerceSkuService _commerceSkuService;

	@Autowired
	private ContractService _contractService;

	@Autowired
	private EntitlementService _entitlementService;

	@Autowired
	private ProjectService _projectService;

	@Autowired
	private UsageDefinitionService _usageDefinitionService;

	@Autowired
	private UsageReportService _usageReportService;

	@Autowired
	private UsageSourceRegistry _usageSourceRegistry;

}
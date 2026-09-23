/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.one.model.OveragePricing;
import com.liferay.one.model.Project;
import com.liferay.one.model.UsageDefinition;
import com.liferay.one.model.UsageReport;
import com.liferay.portal.kernel.util.Validator;

import java.net.URI;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.json.JSONObject;

import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * @author Drew Brokke
 */
@Component
public class UsageReportService extends OneBaseService {

	public static final String REVIEW_STATUS_APPROVED = "approved";

	public static final String REVIEW_STATUS_COMPLETED = "completed";

	public static final String REVIEW_STATUS_READY_FOR_REVIEW =
		"readyForReview";

	public static final String TARGET_TYPE_PROJECT = "project";

	/**
	 * Adds a usage report for consumption beyond the entitled quantity.
	 * The SKU, bucket count, and amount stay empty when no pricing data is
	 * present.
	 */
	public UsageReport addUsageReport(
			double aggregateQuantity, String contractExternalReferenceCode,
			Instant dateFromInstant, Instant dateToInstant,
			double entitledQuantity, String externalReferenceCode,
			OveragePricing overagePricing, Project project,
			UsageDefinition usageDefinition)
		throws Exception {

		double overageQuantity = Math.max(
			aggregateQuantity - entitledQuantity, 0);

		String reviewStatus = REVIEW_STATUS_COMPLETED;

		if (overageQuantity > 0) {
			reviewStatus = REVIEW_STATUS_READY_FOR_REVIEW;
		}

		Double overageAmount = null;
		Long overageSkuQuantity = null;
		String skuExternalReferenceCode = null;

		if (overagePricing != null) {
			overageSkuQuantity = usageDefinition.getOverageBucketQuantity(
				overageQuantity);

			overageAmount = overagePricing.getAmount(overageSkuQuantity);

			skuExternalReferenceCode =
				overagePricing.getSkuExternalReferenceCode();
		}

		return addUsageReport(
			project.getAccountExternalReferenceCode(), aggregateQuantity,
			contractExternalReferenceCode, dateFromInstant, dateToInstant,
			entitledQuantity, externalReferenceCode, overageAmount,
			overageQuantity, overageSkuQuantity, project.getProjectId(),
			reviewStatus, skuExternalReferenceCode,
			usageDefinition.getUsageDefinitionId());
	}

	public UsageReport fetchUsageReport(String externalReferenceCode)
		throws Exception {

		String response = fetch(
			getAuthorization(),
			_getByExternalReferenceCodeURI(externalReferenceCode));

		if (Validator.isNull(response)) {
			return null;
		}

		return new UsageReport(new JSONObject(response));
	}

	protected UsageReport addUsageReport(
			String accountExternalReferenceCode, double aggregateQuantity,
			String contractExternalReferenceCode, Instant dateFromInstant,
			Instant dateToInstant, double entitledQuantity,
			String externalReferenceCode, Double overageAmount,
			double overageQuantity, Long overageSkuQuantity, long projectId,
			String reviewStatus, String skuExternalReferenceCode,
			long usageDefinitionId)
		throws Exception {

		JSONObject usageReportJSONObject = new JSONObject(
		).put(
			"accountExternalReferenceCode", accountExternalReferenceCode
		).put(
			"aggregateQuantity", aggregateQuantity
		).put(
			"contractExternalReferenceCode", contractExternalReferenceCode
		).put(
			"dateFrom", dateFromInstant.toString()
		).put(
			"dateTo", dateToInstant.toString()
		).put(
			"entitledQuantity", entitledQuantity
		).put(
			"externalReferenceCode", externalReferenceCode
		).put(
			"generatedAt",
			Instant.now(
			).truncatedTo(
				ChronoUnit.MILLIS
			).toString()
		).put(
			"generatorClassName", UsageReportService.class.getName()
		).put(
			"overageAmount", overageAmount
		).put(
			"overageQuantity", overageQuantity
		).put(
			"overageSkuQuantity", overageSkuQuantity
		).put(
			"r_projectToUsageReport_c_projectId", projectId
		).put(
			"r_usageDefinitionToUsageReport_c_usageDefinitionId",
			usageDefinitionId
		).put(
			"reviewStatus", reviewStatus
		).put(
			"skuExternalReferenceCode", skuExternalReferenceCode
		).put(
			"targetClassName", _TARGET_CLASS_NAME_PROJECT
		).put(
			"targetPK", projectId
		).put(
			"targetType", TARGET_TYPE_PROJECT
		);

		String response = put(
			getAuthorization(), usageReportJSONObject.toString(),
			_getByExternalReferenceCodeURI(externalReferenceCode));

		return new UsageReport(new JSONObject(response));
	}

	private URI _getByExternalReferenceCodeURI(String externalReferenceCode) {
		return UriComponentsBuilder.fromPath(
			_BASE_PATH + "/by-external-reference-code/{externalReferenceCode}"
		).buildAndExpand(
			externalReferenceCode
		).toUri();
	}

	private static final String _BASE_PATH = "/o/c/usagereports";

	private static final String _TARGET_CLASS_NAME_PROJECT =
		"com.liferay.object.model.ObjectDefinition#C_PROJECT";

}
/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.salesforce.util;

import com.liferay.one.salesforce.model.SalesforceRecordComparison;
import com.liferay.portal.kernel.util.Validator;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.SortedMap;
import java.util.TreeMap;

import org.json.JSONObject;

/**
 * Compares the Liferay copy of each record with the Salesforce record of the
 * same external reference code. A field is compared only when Salesforce has
 * a value for it, because a sync writes only the values that Salesforce has.
 *
 * @author Ryan Schuhler
 */
public class SalesforceRecordComparisonUtil {

	public static final SortedMap<String, String> accountFieldNames =
		Collections.unmodifiableSortedMap(
			new TreeMap<>(
				Map.of(
					"accountTier", "Account_Tier__c", "description",
					"Description", "name", "Name")));
	public static final SortedMap<String, String> contractFieldNames =
		Collections.unmodifiableSortedMap(
			new TreeMap<>(
				Map.of(
					"contractTerm", "ContractTerm", "endDate", "EndDate",
					"opportunityId", "SBQQ__Opportunity__c",
					"renewalOpportunityId", "SBQQ__RenewalOpportunity__c",
					"startDate", "StartDate")));
	public static final SortedMap<String, String> projectFieldNames =
		Collections.unmodifiableSortedMap(
			new TreeMap<>(
				Map.of(
					"aiHubAccountName", "AI_Hub_Account_Name__c",
					"allowedEmailDomains", "Allowed_Email_Domains__c",
					"dataCenterLocation", "Data_Center_Location__c",
					"friendlyWorkspaceURL", "Friendly_Workspace_URL__c",
					"liferayVersion", "Liferay_Version__c", "name", "Name",
					"securityContactEmailAddress",
					"Security_Contact_Email_Address__c")));

	public static List<SalesforceRecordComparison> compare(
		SortedMap<String, String> fieldNames,
		List<JSONObject> liferayJSONObjects,
		List<JSONObject> salesforceJSONObjects, String type) {

		Map<String, JSONObject> liferayJSONObjectsMap = new LinkedHashMap<>();

		for (JSONObject liferayJSONObject : liferayJSONObjects) {
			liferayJSONObjectsMap.put(
				liferayJSONObject.optString("externalReferenceCode"),
				liferayJSONObject);
		}

		List<SalesforceRecordComparison> salesforceRecordComparisons =
			new ArrayList<>();

		for (JSONObject salesforceJSONObject : salesforceJSONObjects) {
			String externalReferenceCode = salesforceJSONObject.optString("Id");

			JSONObject liferayJSONObject = liferayJSONObjectsMap.remove(
				externalReferenceCode);

			if (liferayJSONObject == null) {
				salesforceRecordComparisons.add(
					new SalesforceRecordComparison(
						List.of(), externalReferenceCode, null,
						_getName(
							externalReferenceCode,
							salesforceJSONObject.optString("Name")),
						salesforceJSONObject,
						SalesforceRecordComparison.STATUS_MISSING_IN_LIFERAY,
						type));

				continue;
			}

			List<JSONObject> differenceJSONObjects = _getDifferenceJSONObjects(
				fieldNames, liferayJSONObject, salesforceJSONObject);

			String status = SalesforceRecordComparison.STATUS_IN_SYNC;

			if (!differenceJSONObjects.isEmpty()) {
				status = SalesforceRecordComparison.STATUS_DIFFERS;
			}

			salesforceRecordComparisons.add(
				new SalesforceRecordComparison(
					differenceJSONObjects, externalReferenceCode,
					liferayJSONObject,
					_getName(
						externalReferenceCode,
						liferayJSONObject.optString("name")),
					salesforceJSONObject, status, type));
		}

		for (Map.Entry<String, JSONObject> entry :
				liferayJSONObjectsMap.entrySet()) {

			JSONObject liferayJSONObject = entry.getValue();

			salesforceRecordComparisons.add(
				new SalesforceRecordComparison(
					List.of(), entry.getKey(), liferayJSONObject,
					_getName(
						entry.getKey(), liferayJSONObject.optString("name")),
					null,
					SalesforceRecordComparison.STATUS_MISSING_IN_SALESFORCE,
					type));
		}

		return salesforceRecordComparisons;
	}

	public static boolean hasSameValues(
		SortedMap<String, String> fieldNames, JSONObject jsonObject1,
		JSONObject jsonObject2) {

		for (String fieldName : fieldNames.keySet()) {
			if (!Objects.equals(
					_normalize(fieldName, jsonObject1.opt(fieldName)),
					_normalize(fieldName, jsonObject2.opt(fieldName)))) {

				return false;
			}
		}

		return true;
	}

	private static List<JSONObject> _getDifferenceJSONObjects(
		SortedMap<String, String> fieldNames, JSONObject liferayJSONObject,
		JSONObject salesforceJSONObject) {

		List<JSONObject> differenceJSONObjects = new ArrayList<>();

		for (Map.Entry<String, String> entry : fieldNames.entrySet()) {
			String fieldName = entry.getKey();

			String salesforceValue = _normalize(
				fieldName, salesforceJSONObject.opt(entry.getValue()));

			if (Validator.isNull(salesforceValue)) {
				continue;
			}

			String liferayValue = _normalize(
				fieldName, liferayJSONObject.opt(fieldName));

			if (Objects.equals(liferayValue, salesforceValue)) {
				continue;
			}

			differenceJSONObjects.add(
				new JSONObject(
				).put(
					"fieldName", fieldName
				).put(
					"liferayValue", liferayValue
				).put(
					"salesforceValue", salesforceValue
				));
		}

		return differenceJSONObjects;
	}

	private static String _getName(String externalReferenceCode, String name) {
		if (Validator.isNull(name)) {
			return externalReferenceCode;
		}

		return name;
	}

	private static String _normalize(String fieldName, Object value) {
		if ((value == null) || Objects.equals(value, JSONObject.NULL)) {
			return "";
		}

		String string = String.valueOf(
			value
		).replace(
			"\r\n", "\n"
		).trim();

		if (_dateFieldNames.contains(fieldName) && (string.length() > 10)) {
			return string.substring(0, 10);
		}

		if (_numberFieldNames.contains(fieldName) &&
			string.matches("\\d+\\.0+")) {

			return string.substring(0, string.indexOf('.'));
		}

		return string;
	}

	private static final Set<String> _dateFieldNames = Set.of(
		"endDate", "startDate");
	private static final Set<String> _numberFieldNames = Set.of("contractTerm");

}
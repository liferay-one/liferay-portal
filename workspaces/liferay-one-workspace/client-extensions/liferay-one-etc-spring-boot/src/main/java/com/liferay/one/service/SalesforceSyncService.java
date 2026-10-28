/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.custom.field.CustomField;
import com.liferay.headless.admin.user.client.custom.field.CustomValue;
import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.one.exception.SalesforceQueryJobException;
import com.liferay.one.salesforce.model.SalesforceAccount;
import com.liferay.one.salesforce.model.SalesforceContract;
import com.liferay.one.salesforce.model.SalesforceProject;
import com.liferay.one.salesforce.model.SalesforceQuery;
import com.liferay.one.salesforce.model.SalesforceRecordComparison;
import com.liferay.one.salesforce.util.SalesforceRecordComparisonUtil;
import com.liferay.one.util.CustomFieldUtil;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.Validator;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.SortedMap;
import java.util.regex.Pattern;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * Compares an account, its contracts, and its projects with Salesforce, and
 * updates the records that differ. Contacts are not read or written, because
 * Liferay adds them only when an opportunity is first provisioned.
 *
 * <p>
 * An account update writes only the compared fields: the name, the
 * description, and the account tier. A record that changed in Liferay after
 * the comparison read it is not written, because a Pub/Sub event can apply a
 * newer Salesforce value in that time.
 * </p>
 *
 * <p>
 * A comparison takes two steps, because Salesforce can take longer to run a
 * query than a request can stay open. The first step creates the Salesforce
 * query jobs. The second step returns the comparison when the query jobs are
 * complete, and the caller repeats it until then.
 * </p>
 *
 * <p>
 * Salesforce is not queried for an account whose external reference code is
 * not a Salesforce account ID, so every record of that account is missing in
 * Salesforce.
 * </p>
 *
 * @author Ryan Schuhler
 */
@Component
public class SalesforceSyncService extends OneBaseService {

	/**
	 * Returns the comparison of the account with Salesforce, or
	 * <code>null</code> when a Salesforce query job is not complete.
	 */
	public List<SalesforceRecordComparison> getSalesforceRecordComparisons(
			String accountExternalReferenceCode, List<String> queryJobIds)
		throws Exception {

		List<List<JSONObject>> recordsLists = _getRecordsLists(
			accountExternalReferenceCode, queryJobIds);

		if (recordsLists == null) {
			return null;
		}

		Account account = _accountService.getAccount(
			accountExternalReferenceCode);

		List<SalesforceRecordComparison> salesforceRecordComparisons =
			new ArrayList<>();

		salesforceRecordComparisons.addAll(
			SalesforceRecordComparisonUtil.compare(
				SalesforceRecordComparisonUtil.accountFieldNames,
				List.of(_toJSONObject(account)), recordsLists.get(0),
				SalesforceRecordComparison.TYPE_ACCOUNT));
		salesforceRecordComparisons.addAll(
			SalesforceRecordComparisonUtil.compare(
				SalesforceRecordComparisonUtil.contractFieldNames,
				getAllItems(
					"/o/c/contracts",
					StringBundler.concat(
						"r_accountEntryToContract_accountEntryId eq '",
						account.getId(), "'"),
					jsonObject -> jsonObject),
				recordsLists.get(1), SalesforceRecordComparison.TYPE_CONTRACT));
		salesforceRecordComparisons.addAll(
			SalesforceRecordComparisonUtil.compare(
				SalesforceRecordComparisonUtil.projectFieldNames,
				getAllItems(
					"/o/c/projects",
					StringBundler.concat(
						"r_accountEntryToProject_accountEntryId eq '",
						account.getId(), "'"),
					jsonObject -> jsonObject),
				recordsLists.get(2), SalesforceRecordComparison.TYPE_PROJECT));

		return salesforceRecordComparisons;
	}

	public List<String> postSalesforceQueryJobs(Account account)
		throws Exception {

		if (!_isSalesforceAccountId(account.getExternalReferenceCode())) {
			return List.of();
		}

		return _salesforceService.postQueryJobs(
			_getSalesforceQueries(account.getExternalReferenceCode()));
	}

	public int syncSalesforceRecordComparisons(
			List<SalesforceRecordComparison> salesforceRecordComparisons)
		throws Exception {

		int count = 0;

		for (SalesforceRecordComparison salesforceRecordComparison :
				salesforceRecordComparisons) {

			if (!Objects.equals(
					salesforceRecordComparison.getStatus(),
					SalesforceRecordComparison.STATUS_DIFFERS) ||
				!_syncRecord(salesforceRecordComparison)) {

				continue;
			}

			count++;
		}

		return count;
	}

	private JSONObject _fetchJSONObject(
			String path, String externalReferenceCode)
		throws Exception {

		String response = fetch(
			getAuthorization(),
			UriComponentsBuilder.fromPath(
				path + "/by-external-reference-code/{externalReferenceCode}"
			).buildAndExpand(
				externalReferenceCode
			).toUri());

		if (Validator.isNull(response)) {
			return null;
		}

		return new JSONObject(response);
	}

	private List<List<JSONObject>> _getRecordsLists(
			String accountExternalReferenceCode, List<String> queryJobIds)
		throws Exception {

		for (String queryJobId : queryJobIds) {
			if (!_queryJobIdPattern.matcher(
					queryJobId
				).matches()) {

				throw new SalesforceQueryJobException(
					"Salesforce query job ID " + queryJobId + " is not valid");
			}
		}

		if (!_isSalesforceAccountId(accountExternalReferenceCode)) {
			return List.of(List.of(), List.of(), List.of());
		}

		if (queryJobIds.size() != _accountIdFieldNames.size()) {
			throw new SalesforceQueryJobException(
				StringBundler.concat(
					"Account ", accountExternalReferenceCode, " needs ",
					_accountIdFieldNames.size(), " Salesforce query jobs"));
		}

		List<List<JSONObject>> recordsLists =
			_salesforceService.getRecordsLists(queryJobIds);

		if (recordsLists == null) {
			return null;
		}

		for (int i = 0; i < recordsLists.size(); i++) {
			for (JSONObject jsonObject : recordsLists.get(i)) {
				if (!_isSameSalesforceId(
						accountExternalReferenceCode,
						jsonObject.optString(_accountIdFieldNames.get(i)))) {

					throw new SalesforceQueryJobException(
						StringBundler.concat(
							"Salesforce query job ", queryJobIds.get(i),
							" is not a query for account ",
							accountExternalReferenceCode));
				}
			}
		}

		return recordsLists;
	}

	private List<SalesforceQuery> _getSalesforceQueries(
		String accountExternalReferenceCode) {

		return List.of(
			new SalesforceQuery(
				"Account", _accountFields,
				"Id = '" + accountExternalReferenceCode + "'"),
			new SalesforceQuery(
				"Contract", _contractFields,
				"AccountId = '" + accountExternalReferenceCode + "'"),
			new SalesforceQuery(
				"Project__c", _projectFields,
				"Account__c = '" + accountExternalReferenceCode + "'"));
	}

	private boolean _isSalesforceAccountId(String externalReferenceCode) {
		if ((externalReferenceCode != null) &&
			_salesforceAccountIdPattern.matcher(
				externalReferenceCode
			).matches()) {

			return true;
		}

		return false;
	}

	private boolean _isSameSalesforceId(
		String salesforceId1, String salesforceId2) {

		// A Salesforce ID has a case sensitive form of 15 characters and a
		// case insensitive form of 18 characters that starts with it

		if ((salesforceId1.length() < 15) || (salesforceId2.length() < 15)) {
			return false;
		}

		return salesforceId1.regionMatches(0, salesforceId2, 0, 15);
	}

	private boolean _isUnchangedInLiferay(
		SortedMap<String, String> fieldNames, JSONObject liferayJSONObject,
		SalesforceRecordComparison salesforceRecordComparison) {

		if ((liferayJSONObject != null) &&
			SalesforceRecordComparisonUtil.hasSameValues(
				fieldNames, salesforceRecordComparison.getLiferayJSONObject(),
				liferayJSONObject)) {

			return true;
		}

		if (_log.isInfoEnabled()) {
			_log.info(
				StringBundler.concat(
					"Skipping ", salesforceRecordComparison.getType(), " ",
					salesforceRecordComparison.getExternalReferenceCode(),
					" because it changed in Liferay after the comparison"));
		}

		return false;
	}

	private boolean _syncAccount(
			SalesforceRecordComparison salesforceRecordComparison)
		throws Exception {

		Account account = _accountService.getAccount(
			salesforceRecordComparison.getExternalReferenceCode());

		if (!_isUnchangedInLiferay(
				SalesforceRecordComparisonUtil.accountFieldNames,
				_toJSONObject(account), salesforceRecordComparison)) {

			return false;
		}

		SalesforceAccount salesforceAccount = new SalesforceAccount(
			salesforceRecordComparison.getSalesforceJSONObject());

		if (!salesforceAccount.isActiveSubscription()) {
			if (_log.isInfoEnabled()) {
				_log.info(
					"Skipping inactive Salesforce account " +
						salesforceAccount.getId());
			}

			return false;
		}

		_accountService.patchAccount(
			account.getId(), _toAccount(salesforceAccount));

		return true;
	}

	private boolean _syncRecord(
			SalesforceRecordComparison salesforceRecordComparison)
		throws Exception {

		String type = salesforceRecordComparison.getType();

		if (Objects.equals(type, SalesforceRecordComparison.TYPE_ACCOUNT)) {
			return _syncAccount(salesforceRecordComparison);
		}

		JSONObject salesforceJSONObject =
			salesforceRecordComparison.getSalesforceJSONObject();

		if (Objects.equals(type, SalesforceRecordComparison.TYPE_CONTRACT)) {
			if (!_isUnchangedInLiferay(
					SalesforceRecordComparisonUtil.contractFieldNames,
					_fetchJSONObject(
						"/o/c/contracts",
						salesforceRecordComparison.getExternalReferenceCode()),
					salesforceRecordComparison)) {

				return false;
			}

			return _contractService.upsertContract(
				"update", new SalesforceContract(salesforceJSONObject));
		}

		if (!_isUnchangedInLiferay(
				SalesforceRecordComparisonUtil.projectFieldNames,
				_fetchJSONObject(
					"/o/c/projects",
					salesforceRecordComparison.getExternalReferenceCode()),
				salesforceRecordComparison)) {

			return false;
		}

		return _projectService.upsertProject(
			new SalesforceProject(salesforceJSONObject));
	}

	private Account _toAccount(SalesforceAccount salesforceAccount) {
		Account account = new Account();

		if (Validator.isNotNull(salesforceAccount.getAccountTier())) {
			CustomValue customValue = new CustomValue();

			customValue.setData(salesforceAccount::getAccountTier);

			CustomField customField = new CustomField();

			customField.setCustomValue(() -> customValue);
			customField.setName(() -> "accountTier");

			account.setCustomFields(() -> new CustomField[] {customField});
		}

		if (Validator.isNotNull(salesforceAccount.getDescription())) {
			account.setDescription(salesforceAccount::getDescription);
		}

		if (Validator.isNotNull(salesforceAccount.getName())) {
			account.setName(salesforceAccount::getName);
		}

		return account;
	}

	private JSONObject _toJSONObject(Account account) {
		return new JSONObject(
		).put(
			"accountTier",
			CustomFieldUtil.getString(account.getCustomFields(), "accountTier")
		).put(
			"description", account.getDescription()
		).put(
			"externalReferenceCode", account.getExternalReferenceCode()
		).put(
			"name", account.getName()
		);
	}

	private static final Log _log = LogFactory.getLog(
		SalesforceSyncService.class);

	private static final List<String> _accountFields = List.of(
		"Account_Tier__c", "Active_Subscription__c", "Description", "Id",
		"Name");
	private static final List<String> _accountIdFieldNames = List.of(
		"Id", "AccountId", "Account__c");
	private static final List<String> _contractFields = List.of(
		"AccountId", "ContractTerm", "EndDate", "Id", "SBQQ__Opportunity__c",
		"SBQQ__RenewalOpportunity__c", "StartDate");
	private static final List<String> _projectFields = List.of(
		"AI_Hub_Account_Name__c", "Account__c", "Allowed_Email_Domains__c",
		"Data_Center_Location__c", "Friendly_Workspace_URL__c", "Id",
		"Liferay_Version__c", "Name", "Security_Contact_Email_Address__c");
	private static final Pattern _queryJobIdPattern = Pattern.compile(
		"[A-Za-z0-9]+");
	private static final Pattern _salesforceAccountIdPattern = Pattern.compile(
		"001[A-Za-z0-9]{12}([A-Za-z0-9]{3})?");

	@Autowired
	private AccountService _accountService;

	@Autowired
	private ContractService _contractService;

	@Autowired
	private ProjectService _projectService;

	@Autowired
	private SalesforceService _salesforceService;

}
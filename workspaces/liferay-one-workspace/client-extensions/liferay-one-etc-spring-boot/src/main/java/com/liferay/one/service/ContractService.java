/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.OrderItem;
import com.liferay.one.constants.ContractConstants;
import com.liferay.one.exception.AmbiguousContractChainException;
import com.liferay.one.model.Contract;
import com.liferay.one.model.Entitlement;
import com.liferay.one.salesforce.model.SalesforceContract;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.GetterUtil;
import com.liferay.portal.kernel.util.Validator;

import java.net.URI;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * @author Kyle Bischof
 */
@Component
public class ContractService extends OneBaseService {

	public void attachContractToAccount(long contractId, long accountEntryId)
		throws Exception {

		JSONObject jsonObject = new JSONObject(
		).put(
			"r_accountEntryToContract_accountEntryId", accountEntryId
		);

		patch(
			getAuthorization(), jsonObject.toString(),
			UriComponentsBuilder.fromPath(
				"/o/c/contracts/" + contractId
			).build(
			).toUri());
	}

	public void attachContractToProject(
			long contractId, String projectExternalReferenceCode)
		throws Exception {

		JSONObject jsonObject = new JSONObject(
		).put(
			"r_projectToContract_c_projectERC", projectExternalReferenceCode
		);

		patch(
			getAuthorization(), jsonObject.toString(),
			UriComponentsBuilder.fromPath(
				"/o/c/contracts/" + contractId
			).build(
			).toUri());
	}

	public Contract fetchContract(long contractId) throws Exception {
		String response = fetch(
			getAuthorization(),
			UriComponentsBuilder.fromPath(
				"/o/c/contracts/{contractId}"
			).buildAndExpand(
				contractId
			).toUri());

		if (Validator.isNull(response)) {
			return null;
		}

		return new Contract(new JSONObject(response));
	}

	public Contract fetchContractByExternalReferenceCode(
			String externalReferenceCode)
		throws Exception {

		String response = fetch(
			getAuthorization(),
			UriComponentsBuilder.fromPath(
				"/o/c/contracts/by-external-reference-code" +
					"/{externalReferenceCode}"
			).buildAndExpand(
				externalReferenceCode
			).toUri());

		if (Validator.isNull(response)) {
			return null;
		}

		return new Contract(new JSONObject(response));
	}

	public Contract fetchLatestContractByOpportunityId(String opportunityId)
		throws Exception {

		String response = get(
			getAuthorization(),
			UriComponentsBuilder.fromPath(
				"/o/c/contracts"
			).queryParam(
				"filter", "opportunityId eq '" + opportunityId + "'"
			).queryParam(
				"page", 1
			).queryParam(
				"pageSize", 1
			).queryParam(
				"sort", "dateCreated:desc,id:desc"
			).build(
			).toUri());

		if (Validator.isNull(response)) {
			return null;
		}

		JSONObject jsonObject = new JSONObject(response);

		JSONArray jsonArray = jsonObject.optJSONArray("items");

		if ((jsonArray == null) || (jsonArray.length() == 0)) {
			return null;
		}

		return new Contract(jsonArray.getJSONObject(0));
	}

	public List<Long> getAccountContractIds(long accountEntryId)
		throws Exception {

		return getAllProjectedItems(
			"/o/c/contracts", "id",
			StringBundler.concat(
				"r_accountEntryToContract_accountEntryId eq '", accountEntryId,
				"'"),
			jsonObject -> jsonObject.getLong("id"));
	}

	public List<Contract> getProjectContracts(
			String projectExternalReferenceCode)
		throws Exception {

		return getAllItems(
			"/o/c/contracts",
			"r_projectToContract_c_projectERC eq '" +
				escapeODataString(projectExternalReferenceCode) + "'",
			Contract::new);
	}

	public void reconcileOpportunityContract(String opportunityId)
		throws Exception {

		if (Validator.isNull(opportunityId)) {
			return;
		}

		Contract contract = fetchLatestContractByOpportunityId(opportunityId);

		if (contract == null) {
			return;
		}

		Order opportunityOrder =
			_commerceOrderService.fetchOrderByExternalReferenceCode(
				opportunityId);

		if (opportunityOrder == null) {
			return;
		}

		Long accountId = opportunityOrder.getAccountId();

		if ((contract.getAccountEntryId() <= 0) && (accountId != null) &&
			(accountId > 0)) {

			attachContractToAccount(contract.getId(), accountId);
		}

		String projectExternalReferenceCode = _getSalesforceProjectId(
			opportunityOrder);

		if (Validator.isNull(contract.getProjectExternalReferenceCode()) &&
			Validator.isNotNull(projectExternalReferenceCode)) {

			attachContractToProject(
				contract.getId(), projectExternalReferenceCode);
		}

		for (Order order : _getOpportunityOrders(opportunityOrder)) {
			_syncOrderContract(contract, order);
		}
	}

	@Scheduled(cron = "${liferay.one.contract.reconcile.cron}")
	public void reconcileOpportunityContracts() {
		if (!_reconciling.compareAndSet(false, true)) {
			return;
		}

		try {
			Instant instant = Instant.now(
			).minus(
				_RECONCILE_LOOKBACK_DAYS, ChronoUnit.DAYS
			).truncatedTo(
				ChronoUnit.SECONDS
			);

			Set<String> opportunityIds = new LinkedHashSet<>(
				getAllItems(
					"/o/c/contracts", "dateModified ge " + instant,
					jsonObject -> jsonObject.optString("opportunityId")));

			opportunityIds.removeIf(Validator::isNull);

			if (_log.isInfoEnabled()) {
				_log.info(
					StringBundler.concat(
						"Reconciling the contracts of ", opportunityIds.size(),
						" opportunities"));
			}

			for (String opportunityId : opportunityIds) {
				try {
					reconcileOpportunityContract(opportunityId);
				}
				catch (Exception exception) {
					_log.error(
						"Unable to reconcile the contract of opportunity " +
							opportunityId,
						exception);
				}
			}
		}
		catch (Exception exception) {
			_log.error("Unable to reconcile contracts", exception);
		}
		finally {
			_reconciling.set(false);
		}
	}

	public boolean upsertContract(
			String action, SalesforceContract salesforceContract)
		throws Exception {

		if (Validator.isNull(salesforceContract.getId()) ||
			Validator.isNull(salesforceContract.getAccountId())) {

			if (_log.isWarnEnabled()) {
				_log.warn(
					"Unable to upsert contract " + salesforceContract.getId() +
						" without an ID and account");
			}

			return false;
		}

		JSONObject jsonObject = new JSONObject(
		).put(
			"externalReferenceCode", salesforceContract.getId()
		);

		Account account = _accountService.fetchAccountByExternalReferenceCode(
			salesforceContract.getAccountId());

		if (account != null) {
			jsonObject.put(
				"r_accountEntryToContract_accountEntryERC",
				salesforceContract.getAccountId());
		}
		else if (_log.isInfoEnabled()) {
			_log.info(
				StringBundler.concat(
					"Upserting contract ", salesforceContract.getId(),
					" without account ", salesforceContract.getAccountId(),
					" because the account does not exist yet"));
		}

		if (salesforceContract.getContractTerm() != null) {
			jsonObject.put(
				"contractTerm", salesforceContract.getContractTerm());
		}

		String endDate = _toDateTime(salesforceContract.getEndDate());

		if (Validator.isNotNull(endDate)) {
			jsonObject.put("endDate", endDate);
		}

		if (Validator.isNotNull(salesforceContract.getOpportunityId())) {
			jsonObject.put(
				"opportunityId", salesforceContract.getOpportunityId());
		}

		if (Validator.isNotNull(salesforceContract.getRenewalOpportunityId())) {
			jsonObject.put(
				"renewalOpportunityId",
				salesforceContract.getRenewalOpportunityId());
		}

		String startDate = _toDateTime(salesforceContract.getStartDate());

		if (Validator.isNotNull(startDate)) {
			jsonObject.put("startDate", startDate);
		}

		String projectExternalReferenceCode = null;

		if (Validator.isNotNull(salesforceContract.getOpportunityId())) {
			Order order =
				_commerceOrderService.fetchOrderByExternalReferenceCode(
					salesforceContract.getOpportunityId());

			if (order != null) {
				projectExternalReferenceCode = _getSalesforceProjectId(order);
			}
		}

		Contract predecessorContract = _fetchPredecessorContract(
			salesforceContract);

		if (predecessorContract != null) {
			jsonObject.put(
				"r_originalContractToContract_c_contractERC",
				predecessorContract.getExternalReferenceCode());

			if (Validator.isNull(projectExternalReferenceCode)) {
				projectExternalReferenceCode =
					predecessorContract.getProjectExternalReferenceCode();
			}
		}

		URI uri = UriComponentsBuilder.fromPath(
			"/o/c/contracts/by-external-reference-code/" +
				salesforceContract.getId()
		).build(
		).toUri();

		String response = null;

		if (Objects.equals(action, "update")) {
			response = _updateContract(
				jsonObject, predecessorContract, projectExternalReferenceCode,
				salesforceContract, uri);
		}
		else {
			response = _createContract(
				jsonObject, predecessorContract, projectExternalReferenceCode,
				uri);
		}

		Contract contract = null;

		if (Validator.isNotNull(response)) {
			contract = new Contract(new JSONObject(response));
		}

		reconcileOpportunityContract(salesforceContract.getOpportunityId());

		_attachSuccessorContract(contract, salesforceContract);

		return true;
	}

	private void _attachOriginalContract(
			long contractId, String originalContractExternalReferenceCode,
			String projectExternalReferenceCode)
		throws Exception {

		JSONObject jsonObject = new JSONObject(
		).put(
			"contractType",
			new JSONObject(
			).put(
				"key", ContractConstants.TYPE_RENEWAL
			)
		).put(
			"r_originalContractToContract_c_contractERC",
			originalContractExternalReferenceCode
		);

		if (Validator.isNotNull(projectExternalReferenceCode)) {
			jsonObject.put(
				"r_projectToContract_c_projectERC",
				projectExternalReferenceCode);
		}

		patch(
			getAuthorization(), jsonObject.toString(),
			UriComponentsBuilder.fromPath(
				"/o/c/contracts/" + contractId
			).build(
			).toUri());
	}

	private void _attachSuccessorContract(
			Contract contract, SalesforceContract salesforceContract)
		throws Exception {

		if (contract == null) {
			return;
		}

		Contract successorContract = _fetchSuccessorContract(
			salesforceContract);

		if ((successorContract == null) ||
			Validator.isNotNull(
				successorContract.getOriginalContractExternalReferenceCode())) {

			return;
		}

		String successorProjectExternalReferenceCode = null;

		if (Validator.isNull(
				successorContract.getProjectExternalReferenceCode())) {

			successorProjectExternalReferenceCode =
				contract.getProjectExternalReferenceCode();
		}

		_attachOriginalContract(
			successorContract.getId(), salesforceContract.getId(),
			successorProjectExternalReferenceCode);
	}

	private String _createContract(
			JSONObject jsonObject, Contract predecessorContract,
			String projectExternalReferenceCode, URI uri)
		throws Exception {

		String contractType = ContractConstants.TYPE_INITIAL;

		if (predecessorContract != null) {
			contractType = ContractConstants.TYPE_RENEWAL;
		}

		jsonObject.put(
			"contractType",
			new JSONObject(
			).put(
				"key", contractType
			));

		if (Validator.isNotNull(projectExternalReferenceCode)) {
			jsonObject.put(
				"r_projectToContract_c_projectERC",
				projectExternalReferenceCode);
		}

		try {
			return patch(getAuthorization(), jsonObject.toString(), uri);
		}
		catch (WebClientResponseException webClientResponseException) {
			int statusCode = webClientResponseException.getStatusCode(
			).value();

			if (statusCode != HttpStatus.NOT_FOUND.value()) {
				throw webClientResponseException;
			}

			return put(getAuthorization(), jsonObject.toString(), uri);
		}
	}

	private Contract _fetchChainContract(
			String filter, String salesforceContractId)
		throws Exception {

		String response = get(
			getAuthorization(),
			UriComponentsBuilder.fromPath(
				"/o/c/contracts"
			).queryParam(
				"filter", filter
			).queryParam(
				"page", 1
			).queryParam(
				"pageSize", 2
			).build(
			).toUri());

		if (Validator.isNull(response)) {
			return null;
		}

		JSONObject jsonObject = new JSONObject(response);

		int totalCount = jsonObject.optInt("totalCount");

		if (totalCount > 1) {
			throw new AmbiguousContractChainException(
				StringBundler.concat(
					"Unable to uniquely resolve the contract chain for ",
					salesforceContractId, " with total count ", totalCount));
		}

		JSONArray jsonArray = jsonObject.optJSONArray("items");

		if ((jsonArray == null) || (jsonArray.length() == 0)) {
			return null;
		}

		return new Contract(jsonArray.getJSONObject(0));
	}

	private Contract _fetchPredecessorContract(
			SalesforceContract salesforceContract)
		throws Exception {

		String opportunityId = salesforceContract.getOpportunityId();

		if (Validator.isNull(opportunityId)) {
			return null;
		}

		return _fetchChainContract(
			StringBundler.concat(
				"renewalOpportunityId eq '", opportunityId,
				"' and externalReferenceCode ne '", salesforceContract.getId(),
				"'"),
			salesforceContract.getId());
	}

	private Contract _fetchSuccessorContract(
			SalesforceContract salesforceContract)
		throws Exception {

		String renewalOpportunityId =
			salesforceContract.getRenewalOpportunityId();

		if (Validator.isNull(renewalOpportunityId)) {
			return null;
		}

		return _fetchChainContract(
			StringBundler.concat(
				"opportunityId eq '", renewalOpportunityId,
				"' and externalReferenceCode ne '", salesforceContract.getId(),
				"'"),
			salesforceContract.getId());
	}

	private List<Order> _getOpportunityOrders(Order opportunityOrder)
		throws Exception {

		List<Order> orders = new ArrayList<>();

		orders.add(opportunityOrder);

		Long accountId = opportunityOrder.getAccountId();

		if (accountId == null) {
			return orders;
		}

		for (Order order : _commerceOrderService.getAccountOrders(accountId)) {
			if (Objects.equals(order.getId(), opportunityOrder.getId())) {
				continue;
			}

			Map<String, ?> customFields = order.getCustomFields();

			if ((customFields == null) ||
				!Objects.equals(
					customFields.get("salesforceOpportunityId"),
					opportunityOrder.getExternalReferenceCode())) {

				continue;
			}

			orders.add(order);
		}

		return orders;
	}

	private String _getSalesforceProjectId(Order order) {
		Map<String, ?> customFields = order.getCustomFields();

		if (customFields == null) {
			return null;
		}

		return GetterUtil.getString(customFields.get("salesforceProjectId"));
	}

	private void _syncOrderContract(Contract contract, Order order)
		throws Exception {

		Map<String, ?> customFields = order.getCustomFields();

		long orderContractId = 0;

		if (customFields != null) {
			orderContractId = GetterUtil.getLong(
				customFields.get("contractId"));
		}

		if (orderContractId != contract.getId()) {
			_commerceOrderService.patchOrderCustomFields(
				order.getId(), Map.of("contractId", contract.getId()));
		}

		OrderItem[] orderItems = order.getOrderItems();

		if (orderItems == null) {
			return;
		}

		String projectExternalReferenceCode = _getSalesforceProjectId(order);

		if (Validator.isNull(projectExternalReferenceCode)) {
			projectExternalReferenceCode =
				contract.getProjectExternalReferenceCode();
		}

		for (OrderItem orderItem : orderItems) {
			List<Entitlement> entitlements =
				_entitlementService.getEntitlements(
					StringBundler.concat(
						"r_commerceOrderItemToEntitlement_commerceOrderItemId ",
						"eq '", orderItem.getId(), "'"));

			for (Entitlement entitlement : entitlements) {
				if (entitlement.getContractId() <= 0) {
					_entitlementService.updateEntitlementContract(
						entitlement.getEntitlementId(), contract.getId());
				}

				if (Validator.isNull(projectExternalReferenceCode) ||
					Validator.isNotNull(
						entitlement.getProjectExternalReferenceCode())) {

					continue;
				}

				_entitlementService.updateEntitlementProject(
					entitlement.getEntitlementId(),
					projectExternalReferenceCode);
			}
		}
	}

	private String _toDateTime(String value) {
		if (Validator.isNull(value)) {
			return null;
		}

		Matcher matcher = _datePattern.matcher(value);

		if (matcher.matches()) {
			return value + "T00:00:00Z";
		}

		return value;
	}

	private String _updateContract(
			JSONObject jsonObject, Contract predecessorContract,
			String projectExternalReferenceCode,
			SalesforceContract salesforceContract, URI uri)
		throws Exception {

		Contract existingContract = fetchContractByExternalReferenceCode(
			salesforceContract.getId());

		if (existingContract == null) {
			if (_log.isInfoEnabled()) {
				_log.info(
					"Creating contract " + salesforceContract.getId() +
						" because an update arrived before it existed");
			}

			return _createContract(
				jsonObject, predecessorContract, projectExternalReferenceCode,
				uri);
		}

		if (predecessorContract != null) {
			jsonObject.put(
				"contractType",
				new JSONObject(
				).put(
					"key", ContractConstants.TYPE_RENEWAL
				));
		}

		if (Validator.isNotNull(projectExternalReferenceCode) &&
			Validator.isNull(
				existingContract.getProjectExternalReferenceCode())) {

			jsonObject.put(
				"r_projectToContract_c_projectERC",
				projectExternalReferenceCode);
		}

		return patch(getAuthorization(), jsonObject.toString(), uri);
	}

	private static final int _RECONCILE_LOOKBACK_DAYS = 1;

	private static final Log _log = LogFactory.getLog(ContractService.class);

	private static final Pattern _datePattern = Pattern.compile(
		"\\d{4}-\\d{2}-\\d{2}");

	@Autowired
	private AccountService _accountService;

	@Autowired
	private CommerceOrderService _commerceOrderService;

	@Autowired
	private EntitlementService _entitlementService;

	private final AtomicBoolean _reconciling = new AtomicBoolean();

}
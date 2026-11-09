/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.salesforce.pubsub;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.one.constants.CommerceOrderConstants;
import com.liferay.one.constants.OpportunityConstants;
import com.liferay.one.model.Contract;
import com.liferay.one.model.Project;
import com.liferay.one.pubsub.Message;
import com.liferay.one.pubsub.subscriber.BasePubsubSubscriber;
import com.liferay.one.salesforce.model.SalesforceAccount;
import com.liferay.one.salesforce.model.SalesforceContract;
import com.liferay.one.salesforce.model.SalesforceOpportunity;
import com.liferay.one.salesforce.model.SalesforceOpportunityLineItem;
import com.liferay.one.salesforce.model.SalesforceProject;
import com.liferay.one.salesforce.model.SalesforceProjectContactRole;
import com.liferay.one.service.AccountService;
import com.liferay.one.service.CommerceAccountCurrencyService;
import com.liferay.one.service.CommerceOrderItemService;
import com.liferay.one.service.CommerceOrderService;
import com.liferay.one.service.CommerceSkuService;
import com.liferay.one.service.ContractService;
import com.liferay.one.service.ProjectService;
import com.liferay.one.service.ProvisioningAnalyticsCloudService;
import com.liferay.one.service.ProvisioningContactService;
import com.liferay.one.service.ProvisioningEmailService;
import com.liferay.one.service.ProvisioningEnvironmentService;
import com.liferay.one.service.ProvisioningIssueService;
import com.liferay.one.service.ProvisioningOrderService;
import com.liferay.one.service.ProvisioningProjectEntitlementService;
import com.liferay.one.service.ProvisioningSubdomainService;
import com.liferay.one.service.UserAccountService;
import com.liferay.one.util.ContractUtil;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.ArrayUtil;
import com.liferay.portal.kernel.util.StringUtil;
import com.liferay.portal.kernel.util.Validator;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * @author Kyle Bischof
 */
@Component
@ConditionalOnProperty(
	havingValue = "true",
	name = "liferay.one.salesforce.opportunity.pubsub.subscriber.enabled"
)
public class SalesforceOpportunityPubsubSubscriber
	extends BasePubsubSubscriber {

	@Override
	public String getTopic() {
		return _topic;
	}

	@Override
	public void receive(Message message) throws Exception {
		try {
			JSONObject jsonObject = new JSONObject(message.getPayload());

			JSONArray recordsJSONArray = jsonObject.getJSONArray("records");

			for (int i = 0; i < recordsJSONArray.length(); i++) {
				JSONObject recordJSONObject = recordsJSONArray.getJSONObject(i);

				try {
					_processProvisioningRecord(recordJSONObject);
				}
				catch (Exception exception) {
					_log.error(
						"Unable to process Salesforce opportunity record " +
							recordJSONObject,
						exception);

					_provisioningIssueService.addErrorIssue(
						message, recordJSONObject, exception);
				}
			}
		}
		catch (Exception exception) {
			_log.error(
				"Unable to process Salesforce opportunity message " +
					message.getPayload(),
				exception);

			_provisioningIssueService.addErrorIssue(message, exception);
		}
	}

	@Override
	protected String getProjectId() {
		return _projectId;
	}

	@Override
	protected String getSubscriptionName() {
		return _subscription;
	}

	private void _addWarning(
		List<String> warningMessages, String warningMessage,
		Exception exception) {

		warningMessages.add(warningMessage);

		if (_log.isWarnEnabled()) {
			_log.warn(warningMessage, exception);
		}
	}

	private List<Contract> _getContracts(
			List<SalesforceContract> salesforceContracts,
			SalesforceOpportunity salesforceOpportunity,
			List<String> warningMessages)
		throws Exception {

		for (SalesforceContract salesforceContract : salesforceContracts) {
			try {
				_contractService.upsertContract(
					"update", false, salesforceContract);
			}
			catch (Exception exception) {
				_addWarning(
					warningMessages,
					StringBundler.concat(
						"Unable to upsert contract ",
						salesforceContract.getId(), " for opportunity ",
						salesforceOpportunity.getId()),
					exception);
			}
		}

		Set<String> externalReferenceCodes = new LinkedHashSet<>();

		for (SalesforceContract salesforceContract : salesforceContracts) {
			if (Validator.isNull(salesforceContract.getId())) {
				continue;
			}

			externalReferenceCodes.add(salesforceContract.getId());
		}

		if (Validator.isNotNull(salesforceOpportunity.getAmendedContractId())) {
			externalReferenceCodes.add(
				salesforceOpportunity.getAmendedContractId());
		}

		List<Contract> contracts = _contractService.getContracts(
			new ArrayList<>(externalReferenceCodes));

		Set<String> foundExternalReferenceCodes = new HashSet<>();

		for (Contract contract : contracts) {
			foundExternalReferenceCodes.add(
				contract.getExternalReferenceCode());
		}

		for (String externalReferenceCode : externalReferenceCodes) {
			if (foundExternalReferenceCodes.contains(externalReferenceCode)) {
				continue;
			}

			_addWarning(
				warningMessages,
				StringBundler.concat(
					"Unable to find contract ", externalReferenceCode,
					" for opportunity ", salesforceOpportunity.getId()),
				null);
		}

		if (contracts.isEmpty()) {
			_addWarning(
				warningMessages,
				"Unable to find a contract for opportunity " +
					salesforceOpportunity.getId(),
				null);
		}

		return contracts;
	}

	private String _getCurrencyCode(
		SalesforceOpportunity salesforceOpportunity,
		List<SalesforceOpportunityLineItem> salesforceOpportunityLineItems,
		List<String> warningMessages) {

		String currencyCode = null;

		for (SalesforceOpportunityLineItem salesforceOpportunityLineItem :
				salesforceOpportunityLineItems) {

			String lineCurrencyCode =
				salesforceOpportunityLineItem.getCurrencyIsoCode();

			if (Validator.isNull(lineCurrencyCode)) {
				continue;
			}

			if (currencyCode == null) {
				currencyCode = lineCurrencyCode;
			}
			else if (!Objects.equals(currencyCode, lineCurrencyCode)) {
				_addWarning(
					warningMessages,
					"Unable to reconcile mixed currencies for opportunity " +
						salesforceOpportunity.getId(),
					null);

				return _DEFAULT_CURRENCY_CODE;
			}
		}

		if (currencyCode == null) {
			return _DEFAULT_CURRENCY_CODE;
		}

		return currencyCode;
	}

	private List<SalesforceContract> _getSalesforceContracts(
		JSONObject recordJSONObject) {

		List<SalesforceContract> salesforceContracts = new ArrayList<>();

		JSONArray contractsJSONArray = recordJSONObject.optJSONArray(
			"contracts");

		if (contractsJSONArray == null) {
			return salesforceContracts;
		}

		for (int i = 0; i < contractsJSONArray.length(); i++) {
			salesforceContracts.add(
				new SalesforceContract(contractsJSONArray.getJSONObject(i)));
		}

		return salesforceContracts;
	}

	private List<SalesforceOpportunityLineItem>
		_getSalesforceOpportunityLineItems(JSONObject recordJSONObject) {

		List<SalesforceOpportunityLineItem> salesforceOpportunityLineItems =
			new ArrayList<>();

		JSONArray opportunityLineItemsJSONArray = recordJSONObject.optJSONArray(
			"opportunityLineItems");

		if (opportunityLineItemsJSONArray == null) {
			return salesforceOpportunityLineItems;
		}

		for (int i = 0; i < opportunityLineItemsJSONArray.length(); i++) {
			salesforceOpportunityLineItems.add(
				new SalesforceOpportunityLineItem(
					opportunityLineItemsJSONArray.getJSONObject(i)));
		}

		return salesforceOpportunityLineItems;
	}

	private List<SalesforceProjectContactRole>
		_getSalesforceProjectContactRoles(JSONObject recordJSONObject) {

		List<SalesforceProjectContactRole> salesforceProjectContactRoles =
			new ArrayList<>();

		JSONArray projectContactRolesJSONArray = recordJSONObject.optJSONArray(
			"projectContactRoles");

		if (projectContactRolesJSONArray == null) {
			return salesforceProjectContactRoles;
		}

		for (int i = 0; i < projectContactRolesJSONArray.length(); i++) {
			salesforceProjectContactRoles.add(
				new SalesforceProjectContactRole(
					projectContactRolesJSONArray.getJSONObject(i)));
		}

		return salesforceProjectContactRoles;
	}

	private boolean _hasProductFamily(
		SalesforceOpportunity salesforceOpportunity) {

		String productFamily = salesforceOpportunity.getProductFamily();

		if (Validator.isNull(productFamily)) {
			return false;
		}

		for (String productFamilyToken : _PRODUCT_FAMILY_TOKENS) {
			if (productFamily.contains(productFamilyToken)) {
				return true;
			}
		}

		return false;
	}

	private boolean _isCompleted(Order order) {
		if (order == null) {
			return false;
		}

		return Objects.equals(
			order.getOrderStatus(),
			CommerceOrderConstants.ORDER_STATUS_COMPLETED);
	}

	private boolean _isProvisioned(Order order) {
		if (order == null) {
			return false;
		}

		return ArrayUtil.isNotEmpty(order.getOrderItems());
	}

	private boolean _isValidOpportunity(
		SalesforceOpportunity salesforceOpportunity) {

		if (StringUtil.equalsIgnoreCase(
				salesforceOpportunity.getType(),
				OpportunityConstants.TYPE_RENEWAL)) {

			return Objects.equals(
				salesforceOpportunity.getStageName(), _STAGE_NAME_CLOSED_LOST);
		}

		return Objects.equals(
			salesforceOpportunity.getStageName(),
			OpportunityConstants.STAGE_NAME_CLOSED_WON);
	}

	private void _processProvisioningRecord(JSONObject recordJSONObject)
		throws Exception {

		SalesforceOpportunity salesforceOpportunity = new SalesforceOpportunity(
			recordJSONObject.getJSONObject("opportunity"));

		if (!_hasProductFamily(salesforceOpportunity)) {
			if (_log.isInfoEnabled()) {
				_log.info(
					"Skipping opportunity " + salesforceOpportunity.getId() +
						" without a valid product family");
			}

			return;
		}

		if (!_isValidOpportunity(salesforceOpportunity)) {
			if (_log.isInfoEnabled()) {
				_log.info(
					"Skipping opportunity " + salesforceOpportunity.getId() +
						" that is not closed won or a closed lost renewal");
			}

			return;
		}

		List<SalesforceOpportunityLineItem> salesforceOpportunityLineItems =
			_getSalesforceOpportunityLineItems(recordJSONObject);

		boolean hasProjectEntitlementLineItems =
			_provisioningProjectEntitlementService.
				hasProjectEntitlementLineItems(recordJSONObject);

		if (salesforceOpportunityLineItems.isEmpty() &&
			!hasProjectEntitlementLineItems) {

			if (_log.isInfoEnabled()) {
				_log.info(
					"Skipping opportunity " + salesforceOpportunity.getId() +
						" without line items");
			}

			return;
		}

		List<String> warningMessages = new ArrayList<>();

		SalesforceAccount salesforceAccount = new SalesforceAccount(
			recordJSONObject.optJSONObject("account", new JSONObject()),
			recordJSONObject.getJSONObject("opportunity"));

		Order order = _commerceOrderService.fetchOrderByExternalReferenceCode(
			salesforceOpportunity.getId());

		boolean reprocessing = false;

		if (_isProvisioned(order) ||
			(hasProjectEntitlementLineItems && (order != null))) {

			reprocessing = true;
		}

		if (reprocessing && _log.isInfoEnabled()) {
			_log.info(
				"Reprocessing opportunity " + salesforceOpportunity.getId());
		}

		List<SalesforceOpportunityLineItem>
			provisionableSalesforceOpportunityLineItems = new ArrayList<>();
		List<SalesforceOpportunityLineItem>
			realignmentSalesforceOpportunityLineItems = new ArrayList<>();

		for (SalesforceOpportunityLineItem salesforceOpportunityLineItem :
				salesforceOpportunityLineItems) {

			if (salesforceOpportunityLineItem.isRealignment()) {
				realignmentSalesforceOpportunityLineItems.add(
					salesforceOpportunityLineItem);
			}
			else {
				provisionableSalesforceOpportunityLineItems.add(
					salesforceOpportunityLineItem);
			}
		}

		if (Validator.isNull(salesforceAccount.getId())) {
			_addWarning(
				warningMessages,
				"Unable to provision opportunity " +
					salesforceOpportunity.getId() + " without an account",
				null);

			return;
		}

		Project project = _projectService.fetchProject(
			salesforceOpportunity.getProjectId());

		if ((project == null) &&
			StringUtil.equalsIgnoreCase(
				salesforceOpportunity.getType(),
				OpportunityConstants.TYPE_EXISTING_BUSINESS)) {

			_addWarning(
				warningMessages,
				StringBundler.concat(
					"The opportunity type is ", salesforceOpportunity.getType(),
					" and the project does not exist"),
				null);
		}
		else if ((project != null) &&
				 (StringUtil.equalsIgnoreCase(
					 salesforceOpportunity.getType(),
					 OpportunityConstants.TYPE_NEW_BUSINESS) ||
				  StringUtil.equalsIgnoreCase(
					  salesforceOpportunity.getType(),
					  OpportunityConstants.
						  TYPE_NEW_PROJECT_EXISTING_BUSINESS))) {

			_addWarning(
				warningMessages,
				StringBundler.concat(
					"The opportunity type is ", salesforceOpportunity.getType(),
					" and the project already exists"),
				null);
		}

		_accountService.upsertAccount(
			salesforceAccount, salesforceOpportunity.getSoldBy());

		Account account = _accountService.fetchAccountByExternalReferenceCode(
			salesforceAccount.getId());

		if (account == null) {
			_addWarning(
				warningMessages,
				"Unable to find account " + salesforceAccount.getId(), null);

			return;
		}

		if (_accountService.hasDuplicateAccountName(
				account.getName(), account.getExternalReferenceCode())) {

			_addWarning(
				warningMessages,
				"Another account already uses the name " + account.getName(),
				null);
		}

		try {
			_commerceAccountCurrencyService.upsertAccountCurrency(
				salesforceAccount.getId(),
				salesforceAccount.getCurrencyIsoCode());
		}
		catch (Exception exception) {
			_addWarning(
				warningMessages,
				"Unable to set the currency for account " +
					salesforceAccount.getId(),
				exception);
		}

		SalesforceProject salesforceProject = null;

		JSONObject projectJSONObject = recordJSONObject.optJSONObject(
			"project");

		if (projectJSONObject != null) {
			salesforceProject = new SalesforceProject(projectJSONObject);

			_projectService.upsertProject(
				salesforceOpportunity.getAccountId(), salesforceProject);
		}

		List<SalesforceContract> salesforceContracts = _getSalesforceContracts(
			recordJSONObject);

		List<Contract> contracts = _getContracts(
			salesforceContracts, salesforceOpportunity, warningMessages);

		for (Contract contract : contracts) {
			if (contract.getAccountEntryId() <= 0) {
				_contractService.attachContractToAccount(
					contract.getId(), account.getId());
			}

			if ((salesforceProject == null) ||
				Validator.isNotNull(
					contract.getProjectExternalReferenceCode())) {

				continue;
			}

			_contractService.attachContractToProject(
				contract.getId(), salesforceProject.getId());
		}

		if (!realignmentSalesforceOpportunityLineItems.isEmpty()) {
			if (Validator.isNull(
					salesforceOpportunity.getAmendedContractOpportunityId())) {

				for (SalesforceOpportunityLineItem
						realignmentSalesforceOpportunityLineItem :
							realignmentSalesforceOpportunityLineItems) {

					String productName =
						realignmentSalesforceOpportunityLineItem.
							getProductName();

					_addWarning(
						warningMessages,
						"Unable to find a parent opportunity for amended " +
							"line " + productName,
						null);
				}
			}
			else {
				_provisioningOrderService.trimRealignedOrderItems(
					account.getId(), salesforceOpportunity.getId(),
					salesforceOpportunity.getAmendedContractOpportunityId(),
					realignmentSalesforceOpportunityLineItems, warningMessages);
			}
		}

		boolean renewal = salesforceOpportunity.isRenewal();

		if (StringUtil.equalsIgnoreCase(
				salesforceOpportunity.getType(),
				OpportunityConstants.TYPE_RENEWAL)) {

			renewal = true;
		}

		if (renewal) {
			_provisioningOrderService.trimRenewedOrderItems(
				account.getId(), salesforceOpportunity.getId(),
				salesforceOpportunity.getProjectId(),
				provisionableSalesforceOpportunityLineItems, warningMessages);
		}

		String currencyCode = _getCurrencyCode(
			salesforceOpportunity, provisionableSalesforceOpportunityLineItems,
			warningMessages);

		if (Validator.isNotNull(salesforceOpportunity.getOwnerEmailAddress())) {
			UserAccount userAccount =
				_userAccountService.fetchUserAccountByEmailAddress(
					salesforceOpportunity.getOwnerEmailAddress());

			if (userAccount == null) {
				_addWarning(
					warningMessages,
					"Unable to find portal user " +
						salesforceOpportunity.getOwnerEmailAddress() +
							" for opportunity creator",
					null);
			}
		}

		List<SalesforceProjectContactRole> salesforceProjectContactRoles =
			_getSalesforceProjectContactRoles(recordJSONObject);

		Order newOrder = _commerceOrderService.upsertOrder(
			account, currencyCode, salesforceOpportunity,
			provisionableSalesforceOpportunityLineItems, salesforceProject);

		if (Objects.equals(
				newOrder.getOrderTypeExternalReferenceCode(), "AI_HUB")) {

			_updateAIHubOrderMetadata(
				newOrder, renewal, salesforceOpportunity,
				provisionableSalesforceOpportunityLineItems, salesforceProject,
				salesforceProjectContactRoles, warningMessages);
		}

		if (!contracts.isEmpty()) {
			for (SalesforceOpportunityLineItem
					provisionableSalesforceOpportunityLineItem :
						provisionableSalesforceOpportunityLineItems) {

				Contract contract = ContractUtil.fetchContract(
					contracts,
					provisionableSalesforceOpportunityLineItem.
						getEndDateInstant(),
					provisionableSalesforceOpportunityLineItem.
						getServiceDateInstant());

				if (contract != null) {
					continue;
				}

				_addWarning(
					warningMessages,
					StringBundler.concat(
						"The end date of line ",
						provisionableSalesforceOpportunityLineItem.
							getProductName(),
						" matches no single contract of opportunity ",
						salesforceOpportunity.getId()),
					null);
			}
		}

		List<SalesforceOpportunityLineItem> skuSalesforceOpportunityLineItems =
			new ArrayList<>();

		for (SalesforceOpportunityLineItem
				provisionableSalesforceOpportunityLineItem :
					provisionableSalesforceOpportunityLineItems) {

			String product2Id =
				provisionableSalesforceOpportunityLineItem.getProduct2Id();

			if (_commerceSkuService.fetchSku(product2Id) == null) {
				_addWarning(
					warningMessages,
					"Unable to find SKU for Salesforce product " + product2Id,
					null);

				continue;
			}

			skuSalesforceOpportunityLineItems.add(
				provisionableSalesforceOpportunityLineItem);
		}

		int provisionedOrderItemCount = 0;

		if (!skuSalesforceOpportunityLineItems.isEmpty()) {
			try {
				_commerceOrderItemService.upsertOrderItems(
					contracts, newOrder, skuSalesforceOpportunityLineItems,
					salesforceOpportunity.getStageName(), true);

				provisionedOrderItemCount =
					skuSalesforceOpportunityLineItems.size();
			}
			catch (Exception exception) {
				for (SalesforceOpportunityLineItem
						skuSalesforceOpportunityLineItem :
							skuSalesforceOpportunityLineItems) {

					_addWarning(
						warningMessages,
						"Unable to provision line " +
							skuSalesforceOpportunityLineItem.getProductName(),
						exception);
				}
			}
		}

		if (provisionedOrderItemCount > 0) {
			try {
				_contractService.updateEntitlementContracts(
					newOrder, skuSalesforceOpportunityLineItems, true);
			}
			catch (Exception exception) {
				_addWarning(
					warningMessages,
					"Unable to update the entitlement contracts of " +
						"opportunity " + salesforceOpportunity.getId(),
					exception);
			}
		}

		if ((provisionedOrderItemCount > 0) && !_isCompleted(order)) {
			try {
				_commerceOrderService.completeOrder(
					newOrder.getId(),
					CommerceOrderConstants.ORDER_PAYMENT_STATUS_NOT_REQUIRED);
			}
			catch (Exception exception) {
				_addWarning(
					warningMessages,
					"Unable to complete order " + salesforceOpportunity.getId(),
					exception);
			}
		}

		_provisioningEnvironmentService.provisionCloudNativeEnvironments(
			account, contracts, provisionableSalesforceOpportunityLineItems);

		if (provisionedOrderItemCount > 0) {
			_provisioningAnalyticsCloudService.provisionAnalyticsCloudProject(
				account, newOrder.getId(), salesforceOpportunity,
				provisionableSalesforceOpportunityLineItems, salesforceProject,
				salesforceProjectContactRoles, warningMessages);
		}

		_provisioningSubdomainService.provisionSubdomain(
			account, provisionableSalesforceOpportunityLineItems);

		_provisioningProjectEntitlementService.processProjectEntitlements(
			account, contracts, currencyCode, recordJSONObject, renewal,
			salesforceOpportunity, salesforceProject, warningMessages);

		_reconcileContracts(salesforceContracts, warningMessages);

		List<Long> userIds = new ArrayList<>();

		if (!StringUtil.equalsIgnoreCase(
				salesforceOpportunity.getType(),
				OpportunityConstants.TYPE_RENEWAL)) {

			userIds = _provisioningContactService.addProjectContacts(
				account, salesforceProjectContactRoles, salesforceProject,
				warningMessages);
		}

		if (reprocessing) {
			_provisioningEmailService.sendAssignedWelcomeEmails(
				account, userIds);
		}
		else {
			_provisioningEmailService.sendWelcomeEmails(
				account, salesforceOpportunity.getType(), userIds);
		}

		if (!reprocessing &&
			!Objects.equals(salesforceOpportunity.getProductFamily(), "P")) {

			_provisioningIssueService.addOpportunityInvoicedIssue(
				account, salesforceAccount, salesforceOpportunity,
				provisionableSalesforceOpportunityLineItems, warningMessages);
		}
	}

	private void _reconcileContracts(
		List<SalesforceContract> salesforceContracts,
		List<String> warningMessages) {

		Set<String> opportunityIds = new LinkedHashSet<>();

		for (SalesforceContract salesforceContract : salesforceContracts) {
			if (Validator.isNull(salesforceContract.getOpportunityId())) {
				continue;
			}

			opportunityIds.add(salesforceContract.getOpportunityId());
		}

		for (String opportunityId : opportunityIds) {
			try {
				_contractService.reconcileOpportunityContract(opportunityId);
			}
			catch (Exception exception) {
				_addWarning(
					warningMessages,
					"Unable to reconcile the contracts of opportunity " +
						opportunityId,
					exception);
			}
		}
	}

	private void _updateAIHubOrderMetadata(
		Order order, boolean renewal,
		SalesforceOpportunity salesforceOpportunity,
		List<SalesforceOpportunityLineItem> salesforceOpportunityLineItems,
		SalesforceProject salesforceProject,
		List<SalesforceProjectContactRole> salesforceProjectContactRoles,
		List<String> warningMessages) {

		SalesforceProjectContactRole administratorSalesforceProjectContactRole =
			null;
		String aiHubAccountName = null;

		boolean purchase = false;

		if (!renewal &&
			Validator.isNull(
				salesforceOpportunity.getAmendedContractOpportunityId())) {

			purchase = true;
		}

		if (purchase) {
			for (SalesforceProjectContactRole salesforceProjectContactRole :
					salesforceProjectContactRoles) {

				if (Objects.equals(
						salesforceProjectContactRole.getContactRole(),
						"AI Hub Administrator") &&
					Validator.isNotNull(
						salesforceProjectContactRole.getEmailAddress())) {

					administratorSalesforceProjectContactRole =
						salesforceProjectContactRole;

					break;
				}
			}

			if ((salesforceProject != null) &&
				Objects.equals(
					salesforceProject.getId(),
					salesforceOpportunity.getProjectId())) {

				aiHubAccountName = salesforceProject.getAIHubAccountName();
			}
		}

		try {
			boolean aiHubForm = _commerceOrderService.updateAIHubOrderMetadata(
				aiHubAccountName, order.getId(), salesforceOpportunity,
				salesforceOpportunityLineItems,
				administratorSalesforceProjectContactRole);

			if (purchase && !aiHubForm) {
				_addWarning(
					warningMessages,
					StringBundler.concat(
						"Unable to provision AI Hub for opportunity ",
						salesforceOpportunity.getId(),
						" without its project, an AI Hub account name, and an ",
						"AI Hub administrator"),
					null);
			}
		}
		catch (Exception exception) {
			_addWarning(
				warningMessages,
				"Unable to update the AI Hub order metadata of opportunity " +
					salesforceOpportunity.getId(),
				exception);
		}
	}

	private static final String _DEFAULT_CURRENCY_CODE = "USD";

	private static final String[] _PRODUCT_FAMILY_TOKENS = {"E", "P", "S"};

	private static final String _STAGE_NAME_CLOSED_LOST = "Closed Lost";

	private static final Log _log = LogFactory.getLog(
		SalesforceOpportunityPubsubSubscriber.class);

	@Autowired
	private AccountService _accountService;

	@Autowired
	private CommerceAccountCurrencyService _commerceAccountCurrencyService;

	@Autowired
	private CommerceOrderItemService _commerceOrderItemService;

	@Autowired
	private CommerceOrderService _commerceOrderService;

	@Autowired
	private CommerceSkuService _commerceSkuService;

	@Autowired
	private ContractService _contractService;

	@Value("${liferay.one.salesforce.pubsub.project.id}")
	private String _projectId;

	@Autowired
	private ProjectService _projectService;

	@Autowired
	private ProvisioningAnalyticsCloudService
		_provisioningAnalyticsCloudService;

	@Autowired
	private ProvisioningContactService _provisioningContactService;

	@Autowired
	private ProvisioningEmailService _provisioningEmailService;

	@Autowired
	private ProvisioningEnvironmentService _provisioningEnvironmentService;

	@Autowired
	private ProvisioningIssueService _provisioningIssueService;

	@Autowired
	private ProvisioningOrderService _provisioningOrderService;

	@Autowired
	private ProvisioningProjectEntitlementService
		_provisioningProjectEntitlementService;

	@Autowired
	private ProvisioningSubdomainService _provisioningSubdomainService;

	@Value(
		"${liferay.one.salesforce.opportunity.pubsub.subscriber.subscription}"
	)
	private String _subscription;

	@Value("${liferay.one.salesforce.opportunity.pubsub.subscriber.topic}")
	private String _topic;

	@Autowired
	private UserAccountService _userAccountService;

}
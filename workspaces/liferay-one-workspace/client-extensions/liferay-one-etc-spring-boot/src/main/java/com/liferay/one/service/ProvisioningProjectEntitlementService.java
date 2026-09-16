/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Sku;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.OrderItem;
import com.liferay.one.constants.CommerceOrderConstants;
import com.liferay.one.constants.OpportunityConstants;
import com.liferay.one.model.Project;
import com.liferay.one.salesforce.model.SalesforceOpportunity;
import com.liferay.one.salesforce.model.SalesforceOpportunityLineItem;
import com.liferay.one.salesforce.model.SalesforceProject;
import com.liferay.one.salesforce.model.SalesforceProjectEntitlement;
import com.liferay.one.util.CommerceOrderItemUtil;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.ListUtil;
import com.liferay.portal.kernel.util.Validator;

import java.time.Instant;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * @author Felipe Franca
 */
@Component
public class ProvisioningProjectEntitlementService {

	public void deleteProjectEntitlement(JSONObject recordJSONObject)
		throws Exception {

		String projectEntitlementId = recordJSONObject.optString("Id");

		Order order = _commerceOrderService.fetchOrderByExternalReferenceCode(
			projectEntitlementId);

		if (order == null) {
			if (_log.isInfoEnabled()) {
				_log.info(
					"Unable to find an order for deleted project entitlement " +
						projectEntitlementId);
			}

			return;
		}

		OrderItem[] orderItems = order.getOrderItems();

		if (orderItems == null) {
			return;
		}

		for (OrderItem orderItem : orderItems) {
			_trimOrderItem(orderItem);
		}
	}

	public void deleteProjectEntitlementLineItem(JSONObject recordJSONObject)
		throws Exception {

		String projectEntitlementId = recordJSONObject.optString(
			"ProjectEntitlement__c");

		OrderItem orderItem = CommerceOrderItemUtil.fetchOrderItem(
			recordJSONObject.optString("Id"),
			_commerceOrderService.fetchOrderByExternalReferenceCode(
				projectEntitlementId));

		if (orderItem == null) {
			if (_log.isInfoEnabled()) {
				_log.info(
					"Unable to find an order item for deleted project " +
						"entitlement line item " +
							recordJSONObject.optString("Id"));
			}

			return;
		}

		_trimOrderItem(orderItem);
	}

	public void processProjectEntitlements(
			Account account, Long contractId, String currencyCode,
			JSONObject recordJSONObject,
			SalesforceOpportunity salesforceOpportunity,
			SalesforceProject salesforceProject, List<String> warningMessages)
		throws Exception {

		List<SalesforceProjectEntitlement> salesforceProjectEntitlements =
			_getSalesforceProjectEntitlements(recordJSONObject);

		if (salesforceProjectEntitlements.isEmpty()) {
			return;
		}

		Map<String, List<SalesforceOpportunityLineItem>>
			salesforceOpportunityLineItemsMap =
				_getSalesforceOpportunityLineItemsMap(recordJSONObject);

		for (SalesforceProjectEntitlement salesforceProjectEntitlement :
				salesforceProjectEntitlements) {

			try {
				_processProjectEntitlement(
					account, contractId, currencyCode, salesforceOpportunity,
					salesforceOpportunityLineItemsMap.get(
						salesforceProjectEntitlement.getId()),
					salesforceProject, salesforceProjectEntitlement,
					warningMessages);
			}
			catch (Exception exception) {
				_addWarning(
					warningMessages,
					"Unable to process project entitlement " +
						salesforceProjectEntitlement.getId());

				if (_log.isWarnEnabled()) {
					_log.warn(
						"Unable to provision orders for project entitlement " +
							salesforceProjectEntitlement.getId(),
						exception);
				}
			}
		}
	}

	public void upsertProjectEntitlement(JSONObject recordJSONObject)
		throws Exception {

		SalesforceProjectEntitlement salesforceProjectEntitlement =
			new SalesforceProjectEntitlement(recordJSONObject);

		String projectEntitlementId = salesforceProjectEntitlement.getId();

		Order order = _commerceOrderService.fetchOrderByExternalReferenceCode(
			projectEntitlementId);

		if (order != null) {
			String projectId = salesforceProjectEntitlement.getProjectId();

			if (Validator.isNotNull(projectId)) {
				_commerceOrderService.patchOrderCustomFields(
					order.getId(), Map.of("salesforceProjectId", projectId));
			}

			return;
		}

		String purchasingOpportunityId =
			salesforceProjectEntitlement.getPurchasingOpportunityId();

		Order purchasingOpportunityOrder =
			_commerceOrderService.fetchOrderByExternalReferenceCode(
				purchasingOpportunityId);

		if (purchasingOpportunityOrder == null) {
			throw new Exception(
				StringBundler.concat(
					"Unable to find an order for purchasing opportunity ",
					purchasingOpportunityId, " of project entitlement ",
					projectEntitlementId));
		}

		_commerceOrderService.upsertProjectEntitlementOrder(
			projectEntitlementId, salesforceProjectEntitlement.getProjectId(),
			purchasingOpportunityOrder);
	}

	public void upsertProjectEntitlementLineItem(JSONObject recordJSONObject)
		throws Exception {

		String projectEntitlementId = recordJSONObject.optString(
			"ProjectEntitlement__c");

		Order order = _commerceOrderService.fetchOrderByExternalReferenceCode(
			projectEntitlementId);

		if (order == null) {
			throw new Exception(
				StringBundler.concat(
					"Unable to find an order for project entitlement ",
					projectEntitlementId, " of project entitlement line item ",
					recordJSONObject.optString("Id")));
		}

		SalesforceOpportunityLineItem salesforceOpportunityLineItem =
			new SalesforceOpportunityLineItem(
				_toSalesforceOpportunityLineItemJSONObject(recordJSONObject));

		_upsertOrderItem(
			order, projectEntitlementId, salesforceOpportunityLineItem,
			OpportunityConstants.STAGE_NAME_CLOSED_WON);

		if (!_isCompleted(order)) {
			_commerceOrderService.completeOrder(
				order.getId(),
				CommerceOrderConstants.ORDER_PAYMENT_STATUS_NOT_REQUIRED);
		}
	}

	private void _addWarning(
		List<String> warningMessages, String warningMessage) {

		warningMessages.add(warningMessage);

		if (_log.isWarnEnabled()) {
			_log.warn(warningMessage);
		}
	}

	private Map<String, List<SalesforceOpportunityLineItem>>
		_getSalesforceOpportunityLineItemsMap(JSONObject recordJSONObject) {

		Map<String, List<SalesforceOpportunityLineItem>>
			salesforceOpportunityLineItemsMap = new HashMap<>();

		JSONArray projectEntitlementLineItemsJSONArray =
			recordJSONObject.optJSONArray("projectEntitlementLineItems");

		if (projectEntitlementLineItemsJSONArray == null) {
			return salesforceOpportunityLineItemsMap;
		}

		for (int i = 0; i < projectEntitlementLineItemsJSONArray.length();
			 i++) {

			JSONObject projectEntitlementLineItemJSONObject =
				projectEntitlementLineItemsJSONArray.getJSONObject(i);

			String projectEntitlementId =
				projectEntitlementLineItemJSONObject.optString(
					"ProjectEntitlement__c");

			if (Validator.isNull(projectEntitlementId)) {
				continue;
			}

			List<SalesforceOpportunityLineItem> salesforceOpportunityLineItems =
				salesforceOpportunityLineItemsMap.computeIfAbsent(
					projectEntitlementId, key -> new ArrayList<>());

			salesforceOpportunityLineItems.add(
				new SalesforceOpportunityLineItem(
					_toSalesforceOpportunityLineItemJSONObject(
						projectEntitlementLineItemJSONObject)));
		}

		return salesforceOpportunityLineItemsMap;
	}

	private List<SalesforceProjectEntitlement>
		_getSalesforceProjectEntitlements(JSONObject recordJSONObject) {

		List<SalesforceProjectEntitlement> salesforceProjectEntitlements =
			new ArrayList<>();

		JSONArray projectEntitlementsJSONArray = recordJSONObject.optJSONArray(
			"projectEntitlements");

		if (projectEntitlementsJSONArray == null) {
			return salesforceProjectEntitlements;
		}

		for (int i = 0; i < projectEntitlementsJSONArray.length(); i++) {
			salesforceProjectEntitlements.add(
				new SalesforceProjectEntitlement(
					projectEntitlementsJSONArray.getJSONObject(i)));
		}

		return salesforceProjectEntitlements;
	}

	private boolean _isCompleted(Order order) {
		if (order == null) {
			return false;
		}

		return Objects.equals(
			order.getOrderStatus(),
			CommerceOrderConstants.ORDER_STATUS_COMPLETED);
	}

	private void _processProjectEntitlement(
			Account account, Long contractId, String currencyCode,
			SalesforceOpportunity salesforceOpportunity,
			List<SalesforceOpportunityLineItem> salesforceOpportunityLineItems,
			SalesforceProject salesforceProject,
			SalesforceProjectEntitlement salesforceProjectEntitlement,
			List<String> warningMessages)
		throws Exception {

		String projectEntitlementId = salesforceProjectEntitlement.getId();

		if (ListUtil.isEmpty(salesforceOpportunityLineItems)) {
			if (_log.isInfoEnabled()) {
				_log.info(
					"Skipping project entitlement " + projectEntitlementId +
						" without line items");
			}

			return;
		}

		String projectId = salesforceProjectEntitlement.getProjectId();

		Project project = _projectService.fetchProject(projectId);

		if (project == null) {
			_addWarning(
				warningMessages,
				StringBundler.concat(
					"Unable to find project ", projectId,
					" for project entitlement ", projectEntitlementId));

			return;
		}

		Order existingOrder =
			_commerceOrderService.fetchOrderByExternalReferenceCode(
				projectEntitlementId);

		Order newOrder = _commerceOrderService.upsertOrder(
			account, contractId, currencyCode, projectEntitlementId, projectId,
			salesforceOpportunity, salesforceOpportunityLineItems,
			salesforceProject);

		int provisionedOrderItemCount = 0;

		for (SalesforceOpportunityLineItem salesforceOpportunityLineItem :
				salesforceOpportunityLineItems) {

			try {
				_upsertOrderItem(
					newOrder, projectEntitlementId,
					salesforceOpportunityLineItem,
					salesforceOpportunity.getStageName());

				provisionedOrderItemCount++;
			}
			catch (Exception exception) {
				_addWarning(
					warningMessages,
					StringBundler.concat(
						"Unable to provision line item ",
						salesforceOpportunityLineItem.getId(),
						" on project entitlement ", projectEntitlementId));

				if (_log.isWarnEnabled()) {
					_log.warn(
						StringBundler.concat(
							"Unable to provision order item for Salesforce ",
							"product ",
							salesforceOpportunityLineItem.getProduct2Id(),
							" on project entitlement ", projectEntitlementId),
						exception);
				}
			}
		}

		if ((provisionedOrderItemCount > 0) && !_isCompleted(existingOrder)) {
			try {
				_commerceOrderService.completeOrder(
					newOrder.getId(),
					CommerceOrderConstants.ORDER_PAYMENT_STATUS_NOT_REQUIRED);
			}
			catch (Exception exception) {
				_addWarning(
					warningMessages,
					"Unable to complete order " + projectEntitlementId);

				if (_log.isWarnEnabled()) {
					_log.warn(
						"Unable to complete order " + newOrder.getId(),
						exception);
				}
			}
		}
	}

	private JSONObject _toSalesforceOpportunityLineItemJSONObject(
		JSONObject projectEntitlementLineItemJSONObject) {

		JSONObject jsonObject = new JSONObject();

		for (String key : projectEntitlementLineItemJSONObject.keySet()) {
			jsonObject.put(key, projectEntitlementLineItemJSONObject.get(key));
		}

		return jsonObject.put(
			"Product2Id",
			projectEntitlementLineItemJSONObject.opt("Product2__c")
		).put(
			"Quantity", projectEntitlementLineItemJSONObject.opt("Quantity__c")
		).put(
			"ServiceDate",
			projectEntitlementLineItemJSONObject.opt("Start_Date__c")
		);
	}

	private void _trimOrderItem(OrderItem orderItem) throws Exception {
		Instant effectiveEndDateInstant = Instant.now();

		Instant orderItemEffectiveEndDateInstant =
			CommerceOrderItemUtil.getEffectiveEndDateInstant(orderItem);

		if ((orderItemEffectiveEndDateInstant != null) &&
			!orderItemEffectiveEndDateInstant.isAfter(
				effectiveEndDateInstant)) {

			return;
		}

		_commerceOrderItemService.patchOrderItemCustomFields(
			orderItem.getId(),
			Map.of("effectiveEndDate", effectiveEndDateInstant.toString()));

		_entitlementService.trimEntitlements(
			orderItem.getId(), effectiveEndDateInstant.toString());
	}

	private void _upsertOrderItem(
			Order order, String projectEntitlementId,
			SalesforceOpportunityLineItem salesforceOpportunityLineItem,
			String stageName)
		throws Exception {

		String product2Id = salesforceOpportunityLineItem.getProduct2Id();

		Sku sku = _commerceSkuService.fetchSku(product2Id);

		if (sku == null) {
			throw new Exception(
				StringBundler.concat(
					"Unable to find SKU for Salesforce product ", product2Id,
					" on project entitlement ", projectEntitlementId));
		}

		_commerceOrderItemService.upsertOrderItem(
			order, salesforceOpportunityLineItem, stageName);
	}

	private static final Log _log = LogFactory.getLog(
		ProvisioningProjectEntitlementService.class);

	@Autowired
	private CommerceOrderItemService _commerceOrderItemService;

	@Autowired
	private CommerceOrderService _commerceOrderService;

	@Autowired
	private CommerceSkuService _commerceSkuService;

	@Autowired
	private EntitlementService _entitlementService;

	@Autowired
	private ProjectService _projectService;

}
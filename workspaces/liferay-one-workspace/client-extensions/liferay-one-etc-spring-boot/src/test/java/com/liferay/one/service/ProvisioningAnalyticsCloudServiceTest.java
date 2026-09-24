/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.one.salesforce.model.SalesforceOpportunity;
import com.liferay.one.salesforce.model.SalesforceProject;
import com.liferay.one.salesforce.model.SalesforceProjectContactRole;
import com.liferay.one.util.KeyedLock;
import com.liferay.portal.kernel.util.GetterUtil;
import com.liferay.portal.kernel.util.HashMapBuilder;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Wellington Barbosa
 */
public class ProvisioningAnalyticsCloudServiceTest {

	@BeforeEach
	public void setUp() {
		_analyticsCloudService = Mockito.mock(AnalyticsCloudService.class);
		_commerceOrderService = Mockito.mock(CommerceOrderService.class);
		_provisioningAnalyticsCloudService =
			new ProvisioningAnalyticsCloudService();

		ReflectionTestUtils.setField(
			_provisioningAnalyticsCloudService, "_analyticsCloudService",
			_analyticsCloudService);
		ReflectionTestUtils.setField(
			_provisioningAnalyticsCloudService, "_commerceOrderService",
			_commerceOrderService);
		ReflectionTestUtils.setField(
			_provisioningAnalyticsCloudService, "_keyedLock", new KeyedLock());

		_account = new Account();

		_account.setExternalReferenceCode(
			() -> _ACCOUNT_EXTERNAL_REFERENCE_CODE);
		_account.setName(() -> "Acme Corporation");
	}

	@Test
	public void testProvisionAnalyticsCloudProjectProvisionsLDPWorkspace()
		throws Exception {

		_whenFetchCommerceOrder(null, "LDP");

		Mockito.when(
			_analyticsCloudService.provisionAnalyticsCloudProject(
				Mockito.eq(""), ArgumentMatchers.any(),
				Mockito.eq(_ACCOUNT_EXTERNAL_REFERENCE_CODE))
		).thenReturn(
			new JSONObject(
			).put(
				"groupId", 42
			).put(
				"name", "acme-ldp"
			)
		);

		List<String> warningMessages = new ArrayList<>();

		_provisioningAnalyticsCloudService.provisionAnalyticsCloudProject(
			_account, _ORDER_ID, _createSalesforceOpportunity(),
			_createSalesforceProject("acme-ldp"),
			List.of(
				_createSalesforceProjectContactRole(
					"Account Administrator", "member@acme.com"),
				_createSalesforceProjectContactRole(
					"LDP Administrator", "ldp.admin@acme.com")),
			warningMessages);

		Assertions.assertTrue(warningMessages.isEmpty());

		ArgumentCaptor<JSONObject> argumentCaptor = ArgumentCaptor.forClass(
			JSONObject.class);

		Mockito.verify(
			_analyticsCloudService
		).provisionAnalyticsCloudProject(
			Mockito.eq(""), argumentCaptor.capture(),
			Mockito.eq(_ACCOUNT_EXTERNAL_REFERENCE_CODE)
		);

		JSONObject analyticsCloudProjectJSONObject = argumentCaptor.getValue();

		Assertions.assertEquals(
			"Acme Corporation",
			analyticsCloudProjectJSONObject.getString("corpProjectName"));
		Assertions.assertEquals(
			"/acme", analyticsCloudProjectJSONObject.getString("friendlyURL"));

		JSONArray incidentReportEmailAddressesJSONArray =
			analyticsCloudProjectJSONObject.getJSONArray(
				"incidentReportEmailAddresses");

		Assertions.assertEquals(
			"security@acme.com",
			incidentReportEmailAddressesJSONArray.getString(0));

		Assertions.assertEquals(
			"acme-ldp", analyticsCloudProjectJSONObject.getString("name"));
		Assertions.assertEquals(
			"ldp.admin@acme.com",
			analyticsCloudProjectJSONObject.getString("ownerEmailAddress"));
		Assertions.assertEquals(
			"europe-west2-ac2-c1",
			analyticsCloudProjectJSONObject.getString("serverLocation"));

		Map<String, ?> customFields = _capturePatchedCustomFields();

		JSONObject ldpAnalyticsCloudProjectJSONObject = new JSONObject(
			GetterUtil.getString(customFields.get("ldpAnalyticsCloudProject")));

		Assertions.assertEquals(
			42, ldpAnalyticsCloudProjectJSONObject.getInt("groupId"));

		Assertions.assertEquals(
			"acme-ldp", customFields.get("ldpWorkspaceName"));
	}

	@Test
	public void testProvisionAnalyticsCloudProjectRecordsFailedOrderFetch()
		throws Exception {

		Mockito.when(
			_commerceOrderService.fetchCommerceOrder(_ORDER_ID)
		).thenThrow(
			new IllegalStateException("DXP is unavailable")
		);

		List<String> warningMessages = new ArrayList<>();

		_provisioningAnalyticsCloudService.provisionAnalyticsCloudProject(
			_account, _ORDER_ID, _createSalesforceOpportunity(),
			_createSalesforceProject("acme-ldp"), Collections.emptyList(),
			warningMessages);

		Assertions.assertEquals(
			List.of(
				"Unable to get order " + _ORDER_ID +
					" to provision the Analytics Cloud workspace"),
			warningMessages);

		Mockito.verifyNoInteractions(_analyticsCloudService);
	}

	@Test
	public void testProvisionAnalyticsCloudProjectRecordsFailure()
		throws Exception {

		_whenFetchCommerceOrder(null, "LDP");

		Mockito.when(
			_analyticsCloudService.provisionAnalyticsCloudProject(
				ArgumentMatchers.anyString(), ArgumentMatchers.any(),
				ArgumentMatchers.anyString())
		).thenThrow(
			new IllegalStateException("Analytics Cloud is unavailable")
		);

		List<String> warningMessages = new ArrayList<>();

		_provisioningAnalyticsCloudService.provisionAnalyticsCloudProject(
			_account, _ORDER_ID, _createSalesforceOpportunity(),
			_createSalesforceProject("acme-ldp"), Collections.emptyList(),
			warningMessages);

		Assertions.assertEquals(
			List.of(
				"Unable to provision the Analytics Cloud workspace for " +
					"opportunity OPP-1"),
			warningMessages);

		Map<String, ?> customFields = _capturePatchedCustomFields();

		Assertions.assertEquals(
			"Analytics Cloud is unavailable", customFields.get("ldpError"));
		Assertions.assertNotNull(customFields.get("ldpErrorDate"));
	}

	@Test
	public void testProvisionAnalyticsCloudProjectRecordsFailureWhenOrderPatchFails()
		throws Exception {

		_whenFetchCommerceOrder(null, "LDP");

		Mockito.when(
			_analyticsCloudService.provisionAnalyticsCloudProject(
				ArgumentMatchers.anyString(), ArgumentMatchers.any(),
				ArgumentMatchers.anyString())
		).thenThrow(
			new IllegalStateException("Analytics Cloud is unavailable")
		);

		Mockito.doThrow(
			new IllegalStateException("DXP is unavailable")
		).when(
			_commerceOrderService
		).patchOrderCustomFields(
			ArgumentMatchers.anyLong(), ArgumentMatchers.any()
		);

		List<String> warningMessages = new ArrayList<>();

		_provisioningAnalyticsCloudService.provisionAnalyticsCloudProject(
			_account, _ORDER_ID, _createSalesforceOpportunity(),
			_createSalesforceProject("acme-ldp"), Collections.emptyList(),
			warningMessages);

		Assertions.assertEquals(
			List.of(
				"Unable to provision the Analytics Cloud workspace for " +
					"opportunity OPP-1",
				"Unable to record the Analytics Cloud provisioning error on " +
					"order " + _ORDER_ID),
			warningMessages);
	}

	@Test
	public void testProvisionAnalyticsCloudProjectReusesDSRWorkspace()
		throws Exception {

		_whenFetchCommerceOrder(null, "DSR");

		Mockito.when(
			_analyticsCloudService.getAnalyticsCloudProjectJSONObject(
				"", _ACCOUNT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			new JSONObject(
			).put(
				"groupId", 7
			).put(
				"name", "Existing Sales Room"
			)
		);

		List<String> warningMessages = new ArrayList<>();

		_provisioningAnalyticsCloudService.provisionAnalyticsCloudProject(
			_account, _ORDER_ID, _createSalesforceOpportunity(), null,
			Collections.emptyList(), warningMessages);

		Assertions.assertTrue(warningMessages.isEmpty());

		Mockito.verify(
			_analyticsCloudService, Mockito.never()
		).provisionAnalyticsCloudProject(
			ArgumentMatchers.anyString(), ArgumentMatchers.any(),
			ArgumentMatchers.anyString()
		);

		Map<String, ?> customFields = _capturePatchedCustomFields();

		Assertions.assertNotNull(customFields.get("dsrAnalyticsCloudProject"));
		Assertions.assertEquals(
			"Existing Sales Room", customFields.get("dsrWorkspaceName"));
	}

	@Test
	public void testProvisionAnalyticsCloudProjectSkipsOrderAlreadyProvisioned()
		throws Exception {

		_whenFetchCommerceOrder("{\"groupId\": 42}", "LDP");

		_provisioningAnalyticsCloudService.provisionAnalyticsCloudProject(
			_account, _ORDER_ID, _createSalesforceOpportunity(),
			_createSalesforceProject("acme-ldp"), Collections.emptyList(),
			new ArrayList<>());

		Mockito.verifyNoInteractions(_analyticsCloudService);
	}

	@Test
	public void testProvisionAnalyticsCloudProjectSkipsOtherOrderTypes()
		throws Exception {

		_whenFetchCommerceOrder(null, "CMP");

		_provisioningAnalyticsCloudService.provisionAnalyticsCloudProject(
			_account, _ORDER_ID, _createSalesforceOpportunity(),
			_createSalesforceProject("acme-ldp"), Collections.emptyList(),
			new ArrayList<>());

		Mockito.verifyNoInteractions(_analyticsCloudService);
	}

	@Test
	public void testProvisionAnalyticsCloudProjectWithoutWorkspaceName()
		throws Exception {

		_whenFetchCommerceOrder(null, "LDP");

		List<String> warningMessages = new ArrayList<>();

		_provisioningAnalyticsCloudService.provisionAnalyticsCloudProject(
			_account, _ORDER_ID, _createSalesforceOpportunity(),
			_createSalesforceProject(""), Collections.emptyList(),
			warningMessages);

		Assertions.assertEquals(1, warningMessages.size());

		Mockito.verify(
			_analyticsCloudService, Mockito.never()
		).provisionAnalyticsCloudProject(
			ArgumentMatchers.anyString(), ArgumentMatchers.any(),
			ArgumentMatchers.anyString()
		);

		Mockito.verify(
			_commerceOrderService, Mockito.never()
		).patchOrderCustomFields(
			ArgumentMatchers.anyLong(), ArgumentMatchers.any()
		);
	}

	private Map<String, ?> _capturePatchedCustomFields() throws Exception {
		ArgumentCaptor<Map<String, ?>> argumentCaptor = ArgumentCaptor.forClass(
			Map.class);

		Mockito.verify(
			_commerceOrderService
		).patchOrderCustomFields(
			Mockito.eq(_ORDER_ID), argumentCaptor.capture()
		);

		return argumentCaptor.getValue();
	}

	private SalesforceOpportunity _createSalesforceOpportunity() {
		return new SalesforceOpportunity(
			new JSONObject(
			).put(
				"Id", "OPP-1"
			).put(
				"Owner.Email", "owner@liferay.com"
			));
	}

	private SalesforceProject _createSalesforceProject(String workspaceName) {
		return new SalesforceProject(
			new JSONObject(
			).put(
				"Data_Center_Location__c", "europe-west2"
			).put(
				"Friendly_Workspace_URL__c", "//acme"
			).put(
				"Id", "PRJCT-1"
			).put(
				"LDP_Workspace_Name__c", workspaceName
			).put(
				"Security_Contact_Email_Address__c",
				"security@acme.com, ops@acme.com"
			));
	}

	private SalesforceProjectContactRole _createSalesforceProjectContactRole(
		String contactRole, String emailAddress) {

		return new SalesforceProjectContactRole(
			new JSONObject(
			).put(
				"Contact__r.Email", emailAddress
			).put(
				"Contact_Role__c", contactRole
			));
	}

	private void _whenFetchCommerceOrder(
			String ldpAnalyticsCloudProject,
			String orderTypeExternalReferenceCode)
		throws Exception {

		Order order = new Order();

		if (ldpAnalyticsCloudProject != null) {
			order.setCustomFields(
				() -> HashMapBuilder.put(
					"ldpAnalyticsCloudProject", ldpAnalyticsCloudProject
				).build());
		}

		order.setOrderTypeExternalReferenceCode(
			() -> orderTypeExternalReferenceCode);

		Mockito.when(
			_commerceOrderService.fetchCommerceOrder(_ORDER_ID)
		).thenReturn(
			order
		);
	}

	private static final String _ACCOUNT_EXTERNAL_REFERENCE_CODE = "ACCNT-1";

	private static final long _ORDER_ID = 1L;

	private Account _account;
	private AnalyticsCloudService _analyticsCloudService;
	private CommerceOrderService _commerceOrderService;
	private ProvisioningAnalyticsCloudService
		_provisioningAnalyticsCloudService;

}
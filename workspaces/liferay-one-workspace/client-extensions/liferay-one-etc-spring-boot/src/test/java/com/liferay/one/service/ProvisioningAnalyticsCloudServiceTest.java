/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.Product;
import com.liferay.headless.commerce.admin.catalog.client.dto.v1_0.ProductSpecification;
import com.liferay.headless.commerce.admin.order.client.dto.v1_0.Order;
import com.liferay.one.salesforce.model.SalesforceOpportunity;
import com.liferay.one.salesforce.model.SalesforceOpportunityLineItem;
import com.liferay.one.salesforce.model.SalesforceProject;
import com.liferay.one.salesforce.model.SalesforceProjectContactRole;
import com.liferay.one.util.KeyedLock;
import com.liferay.portal.kernel.util.GetterUtil;
import com.liferay.portal.kernel.util.HashMapBuilder;
import com.liferay.portal.kernel.util.StringUtil;

import java.nio.charset.StandardCharsets;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;

import org.springframework.http.HttpHeaders;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.reactive.function.client.WebClientResponseException;

/**
 * @author Wellington Barbosa
 */
@DisplayName(
	"[SVC-PROVISIONINGANALYTICSCLOUDSERVICE] ProvisioningAnalyticsCloudService"
)
public class ProvisioningAnalyticsCloudServiceTest {

	@BeforeEach
	public void setUp() throws Exception {
		_analyticsCloudService = Mockito.mock(AnalyticsCloudService.class);
		_commerceOrderService = Mockito.mock(CommerceOrderService.class);
		_commerceProductService = Mockito.mock(CommerceProductService.class);
		_commerceSkuService = Mockito.mock(CommerceSkuService.class);
		_environmentService = Mockito.mock(EnvironmentService.class);
		_provisioningAnalyticsCloudService =
			new ProvisioningAnalyticsCloudService();

		ReflectionTestUtils.setField(
			_provisioningAnalyticsCloudService, "_analyticsCloudService",
			_analyticsCloudService);
		ReflectionTestUtils.setField(
			_provisioningAnalyticsCloudService, "_commerceOrderService",
			_commerceOrderService);
		ReflectionTestUtils.setField(
			_provisioningAnalyticsCloudService, "_commerceProductService",
			_commerceProductService);
		ReflectionTestUtils.setField(
			_provisioningAnalyticsCloudService, "_commerceSkuService",
			_commerceSkuService);
		ReflectionTestUtils.setField(
			_provisioningAnalyticsCloudService, "_environmentService",
			_environmentService);
		ReflectionTestUtils.setField(
			_provisioningAnalyticsCloudService, "_keyedLock", new KeyedLock());

		_whenFetchProduct("PRODUCT-DSR", 1L, "dsr");
		_whenFetchProduct("PRODUCT-DXP", 2L, null);
		_whenFetchProduct("PRODUCT-LDP", 3L, "liferay-data-platform");

		_account = new Account();

		_account.setExternalReferenceCode(
			() -> _ACCOUNT_EXTERNAL_REFERENCE_CODE);
		_account.setId(() -> 5L);
		_account.setName(() -> "Acme Corporation");
	}

	@Test
	public void testProvisionAnalyticsCloudProjectProvisionsDSRWorkspace()
		throws Exception {

		_whenFetchCommerceOrder(null, "DSR");

		Mockito.when(
			_analyticsCloudService.provisionAnalyticsCloudProject(
				Mockito.eq(""), ArgumentMatchers.any(),
				Mockito.eq(_ACCOUNT_EXTERNAL_REFERENCE_CODE))
		).thenReturn(
			new JSONObject(
			).put(
				"groupId", 42
			).put(
				"name", "acme-dsr"
			).put(
				"serverLocation", "europe-west2-ac2-c1"
			)
		);

		_provisioningAnalyticsCloudService.provisionAnalyticsCloudProject(
			_account, _ORDER_ID, _createSalesforceOpportunity(),
			_createSalesforceOpportunityLineItems(),
			_createSalesforceProject("acme-dsr"),
			List.of(
				_createSalesforceProjectContactRole(
					"DSR Administrator", "dsr.admin@acme.com")),
			new ArrayList<>());

		ArgumentCaptor<JSONObject> argumentCaptor = ArgumentCaptor.forClass(
			JSONObject.class);

		Mockito.verify(
			_analyticsCloudService
		).provisionAnalyticsCloudProject(
			Mockito.eq(""), argumentCaptor.capture(),
			Mockito.eq(_ACCOUNT_EXTERNAL_REFERENCE_CODE)
		);

		JSONObject analyticsCloudProjectJSONObject = argumentCaptor.getValue();

		JSONArray offeringEntriesJSONArray =
			analyticsCloudProjectJSONObject.getJSONArray("offeringEntries");

		Assertions.assertEquals(1, offeringEntriesJSONArray.length());

		JSONObject offeringEntryJSONObject =
			offeringEntriesJSONArray.getJSONObject(0);

		Assertions.assertEquals(
			"PRODUCT-DSR", offeringEntryJSONObject.getString("productEntryId"));
		Assertions.assertEquals(1, offeringEntryJSONObject.getInt("quantity"));

		Assertions.assertEquals(
			"dsr.admin@acme.com",
			analyticsCloudProjectJSONObject.getString("ownerEmailAddress"));

		JSONObject environmentJSONObject = _captureDSREnvironment(
			"DSR-PRJCT-1");

		Assertions.assertEquals(
			"active", environmentJSONObject.getString("activationStatus"));
		Assertions.assertEquals(
			"42", environmentJSONObject.getString("externalEnvironmentId"));
		Assertions.assertEquals(
			"DSR", environmentJSONObject.getString("offering"));
		Assertions.assertEquals(
			5L,
			environmentJSONObject.getLong(
				"r_accountEntryToEnvironment_accountEntryId"));
		Assertions.assertEquals(
			"PRJCT-1",
			environmentJSONObject.getString(
				"r_projectToEnvironment_c_projectERC"));
		Assertions.assertEquals(
			"europe-west2-ac2-c1", environmentJSONObject.getString("region"));
		Assertions.assertEquals(
			"acme-dsr", environmentJSONObject.getString("workspaceName"));
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
			_createSalesforceOpportunityLineItems(),
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
			_ACCOUNT_EXTERNAL_REFERENCE_CODE,
			analyticsCloudProjectJSONObject.getString("salesforceAccountId"));
		Assertions.assertEquals(
			"europe-west2-ac2-c1",
			analyticsCloudProjectJSONObject.getString("serverLocation"));

		JSONArray offeringEntriesJSONArray =
			analyticsCloudProjectJSONObject.getJSONArray("offeringEntries");

		Assertions.assertEquals(1, offeringEntriesJSONArray.length());

		JSONObject offeringEntryJSONObject =
			offeringEntriesJSONArray.getJSONObject(0);

		Assertions.assertEquals(
			"PRODUCT-LDP", offeringEntryJSONObject.getString("productEntryId"));
		Assertions.assertEquals(2, offeringEntryJSONObject.getInt("quantity"));
		Assertions.assertEquals(
			1793232000000L, offeringEntryJSONObject.getLong("startDate"));
		Assertions.assertEquals(1, offeringEntryJSONObject.getInt("status"));
		Assertions.assertEquals(
			1824854400000L, offeringEntryJSONObject.getLong("supportEndDate"));

		Map<String, ?> customFields = _capturePatchedCustomFields();

		JSONObject ldpAnalyticsCloudProjectJSONObject = new JSONObject(
			GetterUtil.getString(customFields.get("ldpAnalyticsCloudProject")));

		Assertions.assertEquals(
			42, ldpAnalyticsCloudProjectJSONObject.getInt("groupId"));

		Assertions.assertEquals(
			"acme-ldp", customFields.get("ldpWorkspaceName"));

		Mockito.verifyNoInteractions(_environmentService);
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
			_createSalesforceOpportunityLineItems(),
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
			_createSalesforceOpportunityLineItems(),
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
	public void testProvisionAnalyticsCloudProjectRecordsFailureResponseBody()
		throws Exception {

		_whenFetchCommerceOrder(null, "LDP");

		Mockito.when(
			_analyticsCloudService.provisionAnalyticsCloudProject(
				ArgumentMatchers.anyString(), ArgumentMatchers.any(),
				ArgumentMatchers.anyString())
		).thenThrow(
			WebClientResponseException.create(
				400, "Bad Request", HttpHeaders.EMPTY,
				_FAILURE_RESPONSE_BODY.getBytes(StandardCharsets.UTF_8),
				StandardCharsets.UTF_8)
		);

		_provisioningAnalyticsCloudService.provisionAnalyticsCloudProject(
			_account, _ORDER_ID, _createSalesforceOpportunity(),
			_createSalesforceOpportunityLineItems(),
			_createSalesforceProject("acme-ldp"), Collections.emptyList(),
			new ArrayList<>());

		Map<String, ?> customFields = _capturePatchedCustomFields();

		Assertions.assertEquals(
			_FAILURE_RESPONSE_BODY, customFields.get("ldpError"));
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
			_createSalesforceOpportunityLineItems(),
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
	public void testProvisionAnalyticsCloudProjectRecordsFailureWithoutResponseBody()
		throws Exception {

		_whenFetchCommerceOrder(null, "LDP");

		Mockito.when(
			_analyticsCloudService.provisionAnalyticsCloudProject(
				ArgumentMatchers.anyString(), ArgumentMatchers.any(),
				ArgumentMatchers.anyString())
		).thenThrow(
			WebClientResponseException.create(
				503, "Service Unavailable", HttpHeaders.EMPTY, new byte[0],
				StandardCharsets.UTF_8)
		);

		_provisioningAnalyticsCloudService.provisionAnalyticsCloudProject(
			_account, _ORDER_ID, _createSalesforceOpportunity(),
			_createSalesforceOpportunityLineItems(),
			_createSalesforceProject("acme-ldp"), Collections.emptyList(),
			new ArrayList<>());

		Map<String, ?> customFields = _capturePatchedCustomFields();

		Assertions.assertEquals(
			"503 Service Unavailable", customFields.get("ldpError"));
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
			_account, _ORDER_ID, _createSalesforceOpportunity(),
			_createSalesforceOpportunityLineItems(), null,
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

		JSONObject environmentJSONObject = _captureDSREnvironment(
			"DSR-" + _ACCOUNT_EXTERNAL_REFERENCE_CODE);

		Assertions.assertEquals(
			"Existing Sales Room",
			environmentJSONObject.getString("workspaceName"));
		Assertions.assertFalse(
			environmentJSONObject.has("r_projectToEnvironment_c_projectERC"));
	}

	@Test
	public void testProvisionAnalyticsCloudProjectSkipsLinesWithoutKnownProduct()
		throws Exception {

		_whenFetchCommerceOrder(null, "DSR");

		Mockito.when(
			_analyticsCloudService.provisionAnalyticsCloudProject(
				Mockito.eq(""), ArgumentMatchers.any(),
				Mockito.eq(_ACCOUNT_EXTERNAL_REFERENCE_CODE))
		).thenReturn(
			new JSONObject(
			).put(
				"groupId", 42
			)
		);

		_provisioningAnalyticsCloudService.provisionAnalyticsCloudProject(
			_account, _ORDER_ID, _createSalesforceOpportunity(),
			List.of(
				new SalesforceOpportunityLineItem(
					new JSONObject(
					).put(
						"Product2Id", ""
					)),
				new SalesforceOpportunityLineItem(
					new JSONObject(
					).put(
						"Product2Id", "PRODUCT-UNKNOWN"
					)),
				new SalesforceOpportunityLineItem(
					new JSONObject(
					).put(
						"Product2Id", "PRODUCT-DSR"
					))),
			_createSalesforceProject("acme-dsr"), Collections.emptyList(),
			new ArrayList<>());

		ArgumentCaptor<JSONObject> argumentCaptor = ArgumentCaptor.forClass(
			JSONObject.class);

		Mockito.verify(
			_analyticsCloudService
		).provisionAnalyticsCloudProject(
			Mockito.eq(""), argumentCaptor.capture(),
			Mockito.eq(_ACCOUNT_EXTERNAL_REFERENCE_CODE)
		);

		JSONObject analyticsCloudProjectJSONObject = argumentCaptor.getValue();

		JSONArray offeringEntriesJSONArray =
			analyticsCloudProjectJSONObject.getJSONArray("offeringEntries");

		Assertions.assertEquals(1, offeringEntriesJSONArray.length());

		JSONObject offeringEntryJSONObject =
			offeringEntriesJSONArray.getJSONObject(0);

		Assertions.assertEquals(
			"PRODUCT-DSR", offeringEntryJSONObject.getString("productEntryId"));
		Assertions.assertEquals(1, offeringEntryJSONObject.getInt("quantity"));
		Assertions.assertFalse(offeringEntryJSONObject.has("startDate"));
		Assertions.assertFalse(offeringEntryJSONObject.has("supportEndDate"));
	}

	@Test
	public void testProvisionAnalyticsCloudProjectSkipsOrderAlreadyProvisioned()
		throws Exception {

		_whenFetchCommerceOrder("{\"groupId\": 42}", "LDP");

		_provisioningAnalyticsCloudService.provisionAnalyticsCloudProject(
			_account, _ORDER_ID, _createSalesforceOpportunity(),
			_createSalesforceOpportunityLineItems(),
			_createSalesforceProject("acme-ldp"), Collections.emptyList(),
			new ArrayList<>());

		Mockito.verifyNoInteractions(_analyticsCloudService);
		Mockito.verifyNoInteractions(_environmentService);
	}

	@Test
	public void testProvisionAnalyticsCloudProjectSkipsOrderAlreadyProvisionedAndPutsDSREnvironment()
		throws Exception {

		_whenFetchCommerceOrder(
			"{\"groupId\": 42, \"name\": \"acme-dsr\"}", "DSR");

		_provisioningAnalyticsCloudService.provisionAnalyticsCloudProject(
			_account, _ORDER_ID, _createSalesforceOpportunity(),
			_createSalesforceOpportunityLineItems(),
			_createSalesforceProject("acme-dsr"), Collections.emptyList(),
			new ArrayList<>());

		Mockito.verifyNoInteractions(_analyticsCloudService);

		Mockito.verify(
			_commerceOrderService, Mockito.never()
		).patchOrderCustomFields(
			ArgumentMatchers.anyLong(), ArgumentMatchers.any()
		);

		JSONObject environmentJSONObject = _captureDSREnvironment(
			"DSR-PRJCT-1");

		Assertions.assertEquals(
			"42", environmentJSONObject.getString("externalEnvironmentId"));
		Assertions.assertEquals(
			"acme-dsr", environmentJSONObject.getString("workspaceName"));
	}

	@Test
	public void testProvisionAnalyticsCloudProjectSkipsOtherOrderTypes()
		throws Exception {

		_whenFetchCommerceOrder(null, "CMP");

		_provisioningAnalyticsCloudService.provisionAnalyticsCloudProject(
			_account, _ORDER_ID, _createSalesforceOpportunity(),
			_createSalesforceOpportunityLineItems(),
			_createSalesforceProject("acme-ldp"), Collections.emptyList(),
			new ArrayList<>());

		Mockito.verifyNoInteractions(_analyticsCloudService);
	}

	@Test
	public void testProvisionAnalyticsCloudProjectWarnsWhenDSREnvironmentFails()
		throws Exception {

		_whenFetchCommerceOrder(null, "DSR");

		Mockito.when(
			_analyticsCloudService.getAnalyticsCloudProjectJSONObject(
				"", _ACCOUNT_EXTERNAL_REFERENCE_CODE)
		).thenReturn(
			new JSONObject(
			).put(
				"groupId", 7
			)
		);

		Mockito.when(
			_environmentService.putEnvironment(
				ArgumentMatchers.anyString(), ArgumentMatchers.any())
		).thenThrow(
			new IllegalStateException("DXP is unavailable")
		);

		List<String> warningMessages = new ArrayList<>();

		_provisioningAnalyticsCloudService.provisionAnalyticsCloudProject(
			_account, _ORDER_ID, _createSalesforceOpportunity(),
			_createSalesforceOpportunityLineItems(), null,
			Collections.emptyList(), warningMessages);

		Assertions.assertEquals(
			List.of(
				"Unable to record the Digital Sales Room environment DSR-" +
					_ACCOUNT_EXTERNAL_REFERENCE_CODE),
			warningMessages);

		Mockito.verify(
			_commerceOrderService
		).patchOrderCustomFields(
			Mockito.eq(_ORDER_ID), ArgumentMatchers.any()
		);
	}

	@Test
	public void testProvisionAnalyticsCloudProjectWithoutAnalyticsCloudLine()
		throws Exception {

		_whenFetchCommerceOrder(null, "LDP");

		List<String> warningMessages = new ArrayList<>();

		_provisioningAnalyticsCloudService.provisionAnalyticsCloudProject(
			_account, _ORDER_ID, _createSalesforceOpportunity(),
			List.of(_createSalesforceOpportunityLineItem("PRODUCT-DXP", 1)),
			_createSalesforceProject("acme-ldp"), Collections.emptyList(),
			warningMessages);

		Assertions.assertEquals(
			List.of(
				"Unable to provision the Analytics Cloud workspace for " +
					"opportunity OPP-1 without a line for an Analytics Cloud " +
						"product"),
			warningMessages);

		Mockito.verify(
			_analyticsCloudService, Mockito.never()
		).provisionAnalyticsCloudProject(
			ArgumentMatchers.anyString(), ArgumentMatchers.any(),
			ArgumentMatchers.anyString()
		);
	}

	@Test
	public void testProvisionAnalyticsCloudProjectWithoutWorkspaceName()
		throws Exception {

		_whenFetchCommerceOrder(null, "LDP");

		List<String> warningMessages = new ArrayList<>();

		_provisioningAnalyticsCloudService.provisionAnalyticsCloudProject(
			_account, _ORDER_ID, _createSalesforceOpportunity(),
			_createSalesforceOpportunityLineItems(),
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

	private JSONObject _captureDSREnvironment(String externalReferenceCode)
		throws Exception {

		ArgumentCaptor<JSONObject> argumentCaptor = ArgumentCaptor.forClass(
			JSONObject.class);

		Mockito.verify(
			_environmentService
		).putEnvironment(
			Mockito.eq(externalReferenceCode), argumentCaptor.capture()
		);

		return argumentCaptor.getValue();
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

	private SalesforceOpportunityLineItem _createSalesforceOpportunityLineItem(
		String product2Id, int quantity) {

		return new SalesforceOpportunityLineItem(
			new JSONObject(
			).put(
				"End_Date__c", "2027-10-29"
			).put(
				"Product2Id", product2Id
			).put(
				"Quantity", quantity
			).put(
				"ServiceDate", "2026-10-29"
			));
	}

	private List<SalesforceOpportunityLineItem>
		_createSalesforceOpportunityLineItems() {

		return List.of(
			_createSalesforceOpportunityLineItem("PRODUCT-DXP", 1),
			_createSalesforceOpportunityLineItem("PRODUCT-DSR", 1),
			_createSalesforceOpportunityLineItem("PRODUCT-LDP", 2));
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
			String analyticsCloudProject, String orderTypeExternalReferenceCode)
		throws Exception {

		Order order = new Order();

		if (analyticsCloudProject != null) {
			order.setCustomFields(
				() -> HashMapBuilder.put(
					StringUtil.toLowerCase(orderTypeExternalReferenceCode) +
						"AnalyticsCloudProject",
					analyticsCloudProject
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

	private void _whenFetchProduct(
			String product2Id, long productId, String solutionType)
		throws Exception {

		Mockito.when(
			_commerceSkuService.fetchProductId(product2Id)
		).thenReturn(
			productId
		);

		Product product = new Product();

		if (solutionType != null) {
			ProductSpecification productSpecification =
				new ProductSpecification();

			productSpecification.setSpecificationKey("solution-type");
			productSpecification.setValue(Map.of("en_US", solutionType));

			product.setProductSpecifications(
				new ProductSpecification[] {productSpecification});
		}

		Mockito.when(
			_commerceProductService.fetchProduct(productId)
		).thenReturn(
			product
		);
	}

	private static final String _ACCOUNT_EXTERNAL_REFERENCE_CODE = "ACCNT-1";

	private static final String _FAILURE_RESPONSE_BODY =
		"{\"field\": \"offeringEntries\", \"status\": 400}";

	private static final long _ORDER_ID = 1L;

	private Account _account;
	private AnalyticsCloudService _analyticsCloudService;
	private CommerceOrderService _commerceOrderService;
	private CommerceProductService _commerceProductService;
	private CommerceSkuService _commerceSkuService;
	private EnvironmentService _environmentService;
	private ProvisioningAnalyticsCloudService
		_provisioningAnalyticsCloudService;

}
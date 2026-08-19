/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.one.constants.CommerceProductConstants;
import com.liferay.one.constants.EnvironmentConstants;
import com.liferay.one.model.Contract;
import com.liferay.one.model.Environment;
import com.liferay.one.salesforce.model.SalesforceModelTestUtil;
import com.liferay.one.salesforce.model.SalesforceOpportunityLineItem;

import java.util.Collections;
import java.util.HashSet;
import java.util.List;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Amos Fong
 */
public class ProvisioningEnvironmentServiceTest {

	@BeforeEach
	public void setUp() {
		_provisioningEnvironmentService = new ProvisioningEnvironmentService();

		_environmentService = Mockito.mock(EnvironmentService.class);

		_account = new Account();

		_account.setExternalReferenceCode(_ACCOUNT_ERC);
		_account.setId(_ACCOUNT_ID);

		_contract = new Contract(
			new JSONObject(
			).put(
				"externalReferenceCode", _CONTRACT_ERC
			).put(
				"id", 5000L
			).put(
				"r_projectToContract_c_projectERC", _PROJECT_ERC
			));

		ReflectionTestUtils.setField(
			_provisioningEnvironmentService, "_environmentService",
			_environmentService);
	}

	@Test
	public void testProvisionCloudNativeEnvironmentsCreatesThreeEnvironments()
		throws Exception {

		Mockito.when(
			_environmentService.getEnvironments(Mockito.anyString())
		).thenReturn(
			Collections.emptyList()
		);

		_provisioningEnvironmentService.provisionCloudNativeEnvironments(
			_account, _contract, List.of(_createCloudNativeLineItem()));

		ArgumentCaptor<String> activationCodeArgumentCaptor =
			ArgumentCaptor.forClass(String.class);
		ArgumentCaptor<String> typeArgumentCaptor = ArgumentCaptor.forClass(
			String.class);

		Mockito.verify(
			_environmentService, Mockito.times(3)
		).addCloudNativeEnvironment(
			Mockito.eq(_ACCOUNT_ID), activationCodeArgumentCaptor.capture(),
			Mockito.eq(_CONTRACT_ERC), Mockito.eq(_PROJECT_ERC),
			typeArgumentCaptor.capture()
		);

		Assertions.assertEquals(
			List.of(
				EnvironmentConstants.TYPE_NONPRODUCTION,
				EnvironmentConstants.TYPE_PRODUCTION,
				EnvironmentConstants.TYPE_UAT),
			typeArgumentCaptor.getAllValues());

		List<String> activationCodes =
			activationCodeArgumentCaptor.getAllValues();

		Assertions.assertEquals(3, activationCodes.size());

		Assertions.assertEquals(
			activationCodes.size(),
			new HashSet<>(
				activationCodes
			).size());

		for (String activationCode : activationCodes) {
			Assertions.assertTrue(
				activationCode.matches("[0-9a-f]{32}"),
				"Expected a UUID without dashes but got " + activationCode);
		}
	}

	@Test
	public void testProvisionCloudNativeEnvironmentsSkipsExistingEnvironments()
		throws Exception {

		Mockito.when(
			_environmentService.getEnvironments(Mockito.anyString())
		).thenReturn(
			List.of(
				new Environment(
					new JSONObject(
					).put(
						"id", 1L
					)))
		);

		_provisioningEnvironmentService.provisionCloudNativeEnvironments(
			_account, _contract, List.of(_createCloudNativeLineItem()));

		Mockito.verify(
			_environmentService
		).getEnvironments(
			Mockito.anyString()
		);

		Mockito.verifyNoMoreInteractions(_environmentService);
	}

	@Test
	public void testProvisionCloudNativeEnvironmentsSkipsWithoutCloudNative()
		throws Exception {

		_provisioningEnvironmentService.provisionCloudNativeEnvironments(
			_account, _contract,
			List.of(
				new SalesforceOpportunityLineItem(
					SalesforceModelTestUtil.createOpportunityLineItemJSONObject(
						"USD", null, "LINE-1", "PROD-1", "PaaS Experience",
						"Subscription", 1, null))));

		Mockito.verifyNoInteractions(_environmentService);
	}

	@Test
	public void testProvisionCloudNativeEnvironmentsSkipsWithoutContract()
		throws Exception {

		_provisioningEnvironmentService.provisionCloudNativeEnvironments(
			_account, null, List.of(_createCloudNativeLineItem()));

		Mockito.verifyNoInteractions(_environmentService);
	}

	private SalesforceOpportunityLineItem _createCloudNativeLineItem() {
		return new SalesforceOpportunityLineItem(
			SalesforceModelTestUtil.createOpportunityLineItemJSONObject(
				"USD", null, "LINE-1", "PROD-1",
				CommerceProductConstants.
					NAME_LIFERAY_CLOUD_NATIVE_STANDARD_OPERATIONS_BUNDLE,
				"Subscription", 1, null));
	}

	private static final String _ACCOUNT_ERC = "ACCOUNT-1";

	private static final long _ACCOUNT_ID = 1000L;

	private static final String _CONTRACT_ERC = "C_CONTRACT_CLOUD_NATIVE";

	private static final String _PROJECT_ERC = "PRJCT-001";

	private Account _account;
	private Contract _contract;
	private EnvironmentService _environmentService;
	private ProvisioningEnvironmentService _provisioningEnvironmentService;

}
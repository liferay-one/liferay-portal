/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.custom.field.CustomField;
import com.liferay.headless.admin.user.client.custom.field.CustomValue;
import com.liferay.headless.admin.user.client.dto.v1_0.Account;
import com.liferay.one.exception.SalesforceQueryJobException;
import com.liferay.one.salesforce.model.SalesforceContract;
import com.liferay.one.salesforce.model.SalesforceProject;
import com.liferay.one.salesforce.model.SalesforceQuery;
import com.liferay.one.salesforce.model.SalesforceRecordComparison;

import java.net.URI;

import java.util.List;

import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.Mockito;

import org.springframework.test.util.ReflectionTestUtils;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[SVC-SALESFORCESYNCSERVICE] SalesforceSyncService")
public class SalesforceSyncServiceTest {

	@BeforeEach
	public void setUp() throws Exception {
		_salesforceSyncService = Mockito.spy(new SalesforceSyncService());

		ReflectionTestUtils.setField(
			_salesforceSyncService, "_accountService", _accountService);
		ReflectionTestUtils.setField(
			_salesforceSyncService, "_contractService", _contractService);
		ReflectionTestUtils.setField(
			_salesforceSyncService, "_projectService", _projectService);
		ReflectionTestUtils.setField(
			_salesforceSyncService, "_salesforceService", _salesforceService);

		Mockito.doReturn(
			"Bearer token"
		).when(
			_salesforceSyncService
		).getAuthorization();
	}

	@Test
	public void testGetSalesforceRecordComparisons() throws Exception {
		_mockGetAllItems(
			List.of(
				new JSONObject(
				).put(
					"externalReferenceCode", "800A"
				)),
			List.of());

		Mockito.when(
			_salesforceService.getRecordsLists(_queryJobIds)
		).thenReturn(
			List.of(
				List.of(
					new JSONObject(
					).put(
						"Account_Tier__c", "Gold"
					).put(
						"Id", "0015g00000ABCDE"
					).put(
						"Name", "Acme"
					)),
				List.of(
					new JSONObject(
					).put(
						"AccountId", "0015g00000ABCDEAAA"
					).put(
						"Id", "800A"
					)),
				List.of(
					new JSONObject(
					).put(
						"Account__c", "0015g00000ABCDEAAA"
					).put(
						"Id", "a0P1"
					).put(
						"Name", "Project One"
					)))
		);

		Mockito.when(
			_accountService.getAccount("0015g00000ABCDE")
		).thenReturn(
			_createAccount("Gold")
		);

		List<SalesforceRecordComparison> salesforceRecordComparisons =
			_salesforceSyncService.getSalesforceRecordComparisons(
				"0015g00000ABCDE", _queryJobIds);

		Assertions.assertEquals(3, salesforceRecordComparisons.size());

		Assertions.assertEquals(
			SalesforceRecordComparison.STATUS_IN_SYNC,
			salesforceRecordComparisons.get(
				0
			).getStatus());
		Assertions.assertEquals(
			SalesforceRecordComparison.STATUS_IN_SYNC,
			salesforceRecordComparisons.get(
				1
			).getStatus());
		Assertions.assertEquals(
			SalesforceRecordComparison.STATUS_MISSING_IN_LIFERAY,
			salesforceRecordComparisons.get(
				2
			).getStatus());
	}

	@Test
	public void testGetSalesforceRecordComparisonsDoesNotQuerySalesforceWithoutASalesforceAccountId()
		throws Exception {

		_mockGetAllItems(
			List.of(
				new JSONObject(
				).put(
					"externalReferenceCode", "800A"
				)),
			List.of());

		Account account = _createAccount("Gold");

		account.setExternalReferenceCode(() -> "ACCNT-001");

		Assertions.assertEquals(
			List.of(), _salesforceSyncService.postSalesforceQueryJobs(account));

		Mockito.when(
			_accountService.getAccount("ACCNT-001")
		).thenReturn(
			account
		);

		List<SalesforceRecordComparison> salesforceRecordComparisons =
			_salesforceSyncService.getSalesforceRecordComparisons(
				"ACCNT-001", List.of());

		Mockito.verifyNoInteractions(_salesforceService);

		Assertions.assertEquals(2, salesforceRecordComparisons.size());

		for (SalesforceRecordComparison salesforceRecordComparison :
				salesforceRecordComparisons) {

			Assertions.assertEquals(
				SalesforceRecordComparison.STATUS_MISSING_IN_SALESFORCE,
				salesforceRecordComparison.getStatus());
		}

		Assertions.assertEquals(
			0,
			_salesforceSyncService.syncSalesforceRecordComparisons(
				salesforceRecordComparisons));

		Mockito.verifyNoInteractions(
			_contractService, _projectService, _salesforceService);
	}

	@Test
	public void testGetSalesforceRecordComparisonsRejectsAnInvalidQueryJobId() {
		Exception exception = Assertions.assertThrows(
			SalesforceQueryJobException.class,
			() -> _salesforceSyncService.getSalesforceRecordComparisons(
				"0015g00000ABCDE",
				List.of("750A", "../opportunities", "750C")));

		Assertions.assertEquals(
			"Salesforce query job ID ../opportunities is not valid",
			exception.getMessage());

		Mockito.verifyNoInteractions(_accountService, _salesforceService);
	}

	@Test
	public void testGetSalesforceRecordComparisonsRejectsAQueryJobOfAnotherAccount()
		throws Exception {

		Mockito.when(
			_salesforceService.getRecordsLists(_queryJobIds)
		).thenReturn(
			List.of(
				List.of(),
				List.of(
					new JSONObject(
					).put(
						"AccountId", "0015g00000FGHIJ"
					).put(
						"Id", "800A"
					)),
				List.of())
		);

		Exception exception = Assertions.assertThrows(
			SalesforceQueryJobException.class,
			() -> _salesforceSyncService.getSalesforceRecordComparisons(
				"0015g00000ABCDE", _queryJobIds));

		Assertions.assertEquals(
			"Salesforce query job 750B is not a query for account " +
				"0015g00000ABCDE",
			exception.getMessage());

		Mockito.verifyNoInteractions(_accountService);
	}

	@Test
	public void testGetSalesforceRecordComparisonsRejectsTheWrongNumberOfQueryJobIds() {
		Exception exception = Assertions.assertThrows(
			SalesforceQueryJobException.class,
			() -> _salesforceSyncService.getSalesforceRecordComparisons(
				"0015g00000ABCDE", List.of("750A")));

		Assertions.assertEquals(
			"Account 0015g00000ABCDE needs 3 Salesforce query jobs",
			exception.getMessage());

		Mockito.verifyNoInteractions(_accountService, _salesforceService);
	}

	@Test
	public void testGetSalesforceRecordComparisonsReportsAnAccountThatIsMissingInSalesforce()
		throws Exception {

		_mockGetAllItems(
			List.of(),
			List.of(
				new JSONObject(
				).put(
					"externalReferenceCode", "a0P1"
				)));

		Mockito.when(
			_salesforceService.getRecordsLists(_queryJobIds)
		).thenReturn(
			List.of(List.of(), List.of(), List.of())
		);

		Mockito.when(
			_accountService.getAccount("0015g00000ABCDE")
		).thenReturn(
			_createAccount("Gold")
		);

		List<SalesforceRecordComparison> salesforceRecordComparisons =
			_salesforceSyncService.getSalesforceRecordComparisons(
				"0015g00000ABCDE", _queryJobIds);

		Assertions.assertEquals(2, salesforceRecordComparisons.size());

		Assertions.assertEquals(
			SalesforceRecordComparison.TYPE_ACCOUNT,
			salesforceRecordComparisons.get(
				0
			).getType());
		Assertions.assertEquals(
			SalesforceRecordComparison.TYPE_PROJECT,
			salesforceRecordComparisons.get(
				1
			).getType());

		for (SalesforceRecordComparison salesforceRecordComparison :
				salesforceRecordComparisons) {

			Assertions.assertEquals(
				SalesforceRecordComparison.STATUS_MISSING_IN_SALESFORCE,
				salesforceRecordComparison.getStatus());
		}
	}

	@Test
	public void testGetSalesforceRecordComparisonsReturnsNullWhenAQueryJobIsNotComplete()
		throws Exception {

		Mockito.when(
			_salesforceService.getRecordsLists(_queryJobIds)
		).thenReturn(
			null
		);

		Assertions.assertNull(
			_salesforceSyncService.getSalesforceRecordComparisons(
				"0015g00000ABCDE", _queryJobIds));

		Mockito.verifyNoInteractions(_accountService);

		Mockito.verify(
			_salesforceSyncService, Mockito.never()
		).getAllItems(
			ArgumentMatchers.anyString(), ArgumentMatchers.anyString(),
			ArgumentMatchers.any()
		);
	}

	@Test
	public void testPostSalesforceQueryJobs() throws Exception {
		Mockito.when(
			_salesforceService.postQueryJobs(ArgumentMatchers.anyList())
		).thenReturn(
			_queryJobIds
		);

		Assertions.assertEquals(
			_queryJobIds,
			_salesforceSyncService.postSalesforceQueryJobs(
				_createAccount("Gold")));

		ArgumentCaptor<List<SalesforceQuery>> argumentCaptor =
			ArgumentCaptor.forClass(List.class);

		Mockito.verify(
			_salesforceService
		).postQueryJobs(
			argumentCaptor.capture()
		);

		List<SalesforceQuery> salesforceQueries = argumentCaptor.getValue();

		Assertions.assertEquals(3, salesforceQueries.size());

		Assertions.assertEquals(
			"Account",
			salesforceQueries.get(
				0
			).getObject());
		Assertions.assertEquals(
			"Id = '0015g00000ABCDE'",
			salesforceQueries.get(
				0
			).getWhere());
		Assertions.assertEquals(
			"AccountId = '0015g00000ABCDE'",
			salesforceQueries.get(
				1
			).getWhere());
		Assertions.assertEquals(
			"Account__c = '0015g00000ABCDE'",
			salesforceQueries.get(
				2
			).getWhere());
	}

	@Test
	public void testSyncSalesforceRecordComparisonsDoesNotCountAnUpsertThatWroteNothing()
		throws Exception {

		JSONObject liferayJSONObject = new JSONObject(
		).put(
			"externalReferenceCode", "a0P1"
		);

		List<SalesforceRecordComparison> salesforceRecordComparisons = List.of(
			_createSalesforceRecordComparison(
				liferayJSONObject,
				new JSONObject(
				).put(
					"Id", "a0P1"
				).put(
					"Name", "Project One"
				),
				SalesforceRecordComparison.TYPE_PROJECT));

		_mockFetch("/o/c/projects", liferayJSONObject);

		Assertions.assertEquals(
			0,
			_salesforceSyncService.syncSalesforceRecordComparisons(
				salesforceRecordComparisons));
	}

	@Test
	public void testSyncSalesforceRecordComparisonsSkipsARecordThatChangedInLiferay()
		throws Exception {

		List<SalesforceRecordComparison> salesforceRecordComparisons = List.of(
			_createSalesforceRecordComparison(
				new JSONObject(
				).put(
					"externalReferenceCode", "800A"
				),
				new JSONObject(
				).put(
					"AccountId", "0015g00000ABCDE"
				).put(
					"EndDate", "2027-01-31"
				).put(
					"Id", "800A"
				),
				SalesforceRecordComparison.TYPE_CONTRACT),
			_createSalesforceRecordComparison(
				new JSONObject(
				).put(
					"externalReferenceCode", "a0P1"
				).put(
					"name", "Project Old"
				),
				new JSONObject(
				).put(
					"Id", "a0P1"
				).put(
					"Name", "Project One"
				),
				SalesforceRecordComparison.TYPE_PROJECT));

		_mockFetch(
			"/o/c/contracts",
			new JSONObject(
			).put(
				"endDate", "2027-12-31T00:00:00Z"
			).put(
				"externalReferenceCode", "800A"
			));
		_mockFetch("/o/c/projects", null);

		Assertions.assertEquals(
			0,
			_salesforceSyncService.syncSalesforceRecordComparisons(
				salesforceRecordComparisons));

		Mockito.verifyNoInteractions(_contractService, _projectService);
	}

	@Test
	public void testSyncSalesforceRecordComparisonsSkipsAnInactiveSalesforceAccount()
		throws Exception {

		Account account = _createAccount("Silver");

		List<SalesforceRecordComparison> salesforceRecordComparisons = List.of(
			_createSalesforceRecordComparison(
				_toLiferayJSONObject("Silver"),
				new JSONObject(
				).put(
					"Account_Tier__c", "Gold"
				).put(
					"Active_Subscription__c", "false"
				).put(
					"Id", "0015g00000ABCDE"
				),
				SalesforceRecordComparison.TYPE_ACCOUNT));

		Mockito.when(
			_accountService.getAccount("0015g00000ABCDE")
		).thenReturn(
			account
		);

		Assertions.assertEquals(
			0,
			_salesforceSyncService.syncSalesforceRecordComparisons(
				salesforceRecordComparisons));

		Mockito.verify(
			_accountService, Mockito.never()
		).patchAccount(
			ArgumentMatchers.anyLong(), ArgumentMatchers.any(Account.class)
		);
	}

	@Test
	public void testSyncSalesforceRecordComparisonsUpdatesOnlyTheRecordsThatDiffer()
		throws Exception {

		Account account = _createAccount("Silver");

		JSONObject contractJSONObject = new JSONObject(
		).put(
			"externalReferenceCode", "800A"
		);
		JSONObject projectJSONObject = new JSONObject(
		).put(
			"externalReferenceCode", "a0P1"
		).put(
			"name", "Project Old"
		);

		List<SalesforceRecordComparison> salesforceRecordComparisons = List.of(
			_createSalesforceRecordComparison(
				_toLiferayJSONObject("Silver"),
				new JSONObject(
				).put(
					"Account_Tier__c", "Gold"
				).put(
					"Active_Subscription__c", "true"
				).put(
					"Id", "0015g00000ABCDE"
				).put(
					"Name", "Acme Corporation"
				),
				SalesforceRecordComparison.TYPE_ACCOUNT),
			_createSalesforceRecordComparison(
				contractJSONObject,
				new JSONObject(
				).put(
					"AccountId", "0015g00000ABCDE"
				).put(
					"Id", "800A"
				),
				SalesforceRecordComparison.TYPE_CONTRACT),
			_createSalesforceRecordComparison(
				projectJSONObject,
				new JSONObject(
				).put(
					"Id", "a0P1"
				).put(
					"Name", "Project One"
				),
				SalesforceRecordComparison.TYPE_PROJECT),
			new SalesforceRecordComparison(
				List.of(), "a0P2", null, "",
				new JSONObject(
				).put(
					"Id", "a0P2"
				),
				SalesforceRecordComparison.STATUS_IN_SYNC,
				SalesforceRecordComparison.TYPE_PROJECT),
			new SalesforceRecordComparison(
				List.of(), "a0P3", null, "",
				new JSONObject(
				).put(
					"Id", "a0P3"
				),
				SalesforceRecordComparison.STATUS_MISSING_IN_LIFERAY,
				SalesforceRecordComparison.TYPE_PROJECT));

		Mockito.when(
			_accountService.getAccount("0015g00000ABCDE")
		).thenReturn(
			account
		);

		_mockFetch("/o/c/contracts", contractJSONObject);
		_mockFetch("/o/c/projects", projectJSONObject);

		Mockito.when(
			_contractService.upsertContract(
				ArgumentMatchers.eq("update"),
				ArgumentMatchers.any(SalesforceContract.class))
		).thenReturn(
			true
		);

		Mockito.when(
			_projectService.upsertProject(
				ArgumentMatchers.any(SalesforceProject.class))
		).thenReturn(
			true
		);

		Assertions.assertEquals(
			3,
			_salesforceSyncService.syncSalesforceRecordComparisons(
				salesforceRecordComparisons));

		ArgumentCaptor<Account> accountArgumentCaptor = ArgumentCaptor.forClass(
			Account.class);

		Mockito.verify(
			_accountService
		).getAccount(
			"0015g00000ABCDE"
		);

		Mockito.verify(
			_accountService
		).patchAccount(
			ArgumentMatchers.eq(7L), accountArgumentCaptor.capture()
		);

		Account patchAccount = accountArgumentCaptor.getValue();

		Assertions.assertNull(patchAccount.getAccountContactInformation());
		Assertions.assertNull(patchAccount.getDescription());
		Assertions.assertEquals("Acme Corporation", patchAccount.getName());
		Assertions.assertNull(patchAccount.getPostalAddresses());
		Assertions.assertNull(patchAccount.getStatus());

		CustomField[] customFields = patchAccount.getCustomFields();

		Assertions.assertEquals(1, customFields.length);
		Assertions.assertEquals("accountTier", customFields[0].getName());
		Assertions.assertEquals(
			"Gold",
			customFields[0].getCustomValue(
			).getData());

		ArgumentCaptor<SalesforceContract> salesforceContractArgumentCaptor =
			ArgumentCaptor.forClass(SalesforceContract.class);

		Mockito.verify(
			_contractService
		).upsertContract(
			ArgumentMatchers.eq("update"),
			salesforceContractArgumentCaptor.capture()
		);

		Assertions.assertEquals(
			"800A",
			salesforceContractArgumentCaptor.getValue(
			).getId());

		ArgumentCaptor<SalesforceProject> salesforceProjectArgumentCaptor =
			ArgumentCaptor.forClass(SalesforceProject.class);

		Mockito.verify(
			_projectService
		).upsertProject(
			salesforceProjectArgumentCaptor.capture()
		);

		Assertions.assertEquals(
			"a0P1",
			salesforceProjectArgumentCaptor.getValue(
			).getId());

		Mockito.verifyNoMoreInteractions(
			_accountService, _contractService, _projectService);
	}

	private Account _createAccount(String accountTier) {
		Account account = new Account();

		CustomValue customValue = new CustomValue();

		customValue.setData(() -> accountTier);

		CustomField customField = new CustomField();

		customField.setCustomValue(() -> customValue);
		customField.setName(() -> "accountTier");

		account.setCustomFields(() -> new CustomField[] {customField});

		account.setExternalReferenceCode(() -> "0015g00000ABCDE");
		account.setId(() -> 7L);
		account.setName(() -> "Acme");

		return account;
	}

	private SalesforceRecordComparison _createSalesforceRecordComparison(
		JSONObject liferayJSONObject, JSONObject salesforceJSONObject,
		String type) {

		return new SalesforceRecordComparison(
			List.of(), salesforceJSONObject.getString("Id"), liferayJSONObject,
			"", salesforceJSONObject, SalesforceRecordComparison.STATUS_DIFFERS,
			type);
	}

	private void _mockFetch(String path, JSONObject jsonObject) {
		Mockito.doReturn(
			(jsonObject == null) ? null : jsonObject.toString()
		).when(
			_salesforceSyncService
		).fetch(
			ArgumentMatchers.eq("Bearer token"),
			ArgumentMatchers.argThat(
				(URI uri) -> uri.getPath(
				).startsWith(
					path + "/"
				))
		);
	}

	private void _mockGetAllItems(
			List<JSONObject> contractJSONObjects,
			List<JSONObject> projectJSONObjects)
		throws Exception {

		Mockito.doReturn(
			contractJSONObjects
		).when(
			_salesforceSyncService
		).getAllItems(
			ArgumentMatchers.eq("/o/c/contracts"),
			ArgumentMatchers.eq(
				"r_accountEntryToContract_accountEntryId eq '7'"),
			ArgumentMatchers.any()
		);

		Mockito.doReturn(
			projectJSONObjects
		).when(
			_salesforceSyncService
		).getAllItems(
			ArgumentMatchers.eq("/o/c/projects"),
			ArgumentMatchers.eq(
				"r_accountEntryToProject_accountEntryId eq '7'"),
			ArgumentMatchers.any()
		);
	}

	private JSONObject _toLiferayJSONObject(String accountTier) {
		return new JSONObject(
		).put(
			"accountTier", accountTier
		).put(
			"externalReferenceCode", "0015g00000ABCDE"
		).put(
			"name", "Acme"
		);
	}

	private static final List<String> _queryJobIds = List.of(
		"750A", "750B", "750C");

	private final AccountService _accountService = Mockito.mock(
		AccountService.class);
	private final ContractService _contractService = Mockito.mock(
		ContractService.class);
	private final ProjectService _projectService = Mockito.mock(
		ProjectService.class);
	private final SalesforceService _salesforceService = Mockito.mock(
		SalesforceService.class);
	private SalesforceSyncService _salesforceSyncService;

}
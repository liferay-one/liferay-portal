/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.okta.service;

import com.liferay.headless.admin.user.client.custom.field.CustomField;
import com.liferay.headless.admin.user.client.custom.field.CustomValue;
import com.liferay.headless.admin.user.client.dto.v1_0.AccountBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.RoleBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.constants.RoleConstants;
import com.liferay.one.exception.OktaUnavailableException;
import com.liferay.one.okta.model.OktaUser;
import com.liferay.one.okta.pubsub.OktaPubsubPublisher;
import com.liferay.one.pubsub.Message;
import com.liferay.one.service.UserAccountService;
import com.liferay.petra.string.StringBundler;
import com.liferay.petra.string.StringPool;

import java.net.URI;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.json.JSONArray;
import org.json.JSONObject;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mockito;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;

import reactor.core.publisher.Mono;

/**
 * @author Ryan Schuhler
 */
public class OktaServiceTest {

	@Test
	public void testCreateContactPublishesWhenContactIsAbsent()
		throws Exception {

		OktaService oktaService = _createOktaService(
			_BODY_NOT_FOUND, HttpStatus.NOT_FOUND);

		Assertions.assertNull(
			oktaService.createContact(_EMAIL_ADDRESS, "Jane", null, "Doe"));

		Mockito.verify(
			_oktaPubsubPublisher
		).publish(
			Mockito.any()
		);
	}

	@Test
	public void testCreateContactSkipsWhenContactExists() throws Exception {
		OktaService oktaService = _createOktaService(
			_BODY_CONTACT, HttpStatus.OK);

		Assertions.assertNotNull(
			oktaService.createContact(_EMAIL_ADDRESS, "Jane", null, "Doe"));

		Mockito.verifyNoInteractions(_oktaPubsubPublisher);
	}

	@Test
	public void testCreateContactThrowsWhenOktaReturnsErrorStatus() {
		OktaService oktaService = _createOktaService(
			_BODY_ERROR, HttpStatus.UNAUTHORIZED);

		Assertions.assertThrows(
			OktaUnavailableException.class,
			() -> oktaService.createContact(
				_EMAIL_ADDRESS, "Jane", null, "Doe"));

		Mockito.verifyNoInteractions(_oktaPubsubPublisher);
	}

	@Test
	public void testFetchContactByEmailAddressReturnsContact()
		throws Exception {

		OktaService oktaService = _createOktaService(
			_BODY_CONTACT, HttpStatus.OK);

		OktaUser oktaUser = oktaService.fetchContactByEmailAddress(
			_EMAIL_ADDRESS);

		Assertions.assertNotNull(oktaUser);
		Assertions.assertEquals(_EMAIL_ADDRESS, oktaUser.getEmail());
	}

	@Test
	public void testFetchContactByEmailAddressReturnsNullWhenNotFound()
		throws Exception {

		OktaService oktaService = _createOktaService(
			_BODY_NOT_FOUND, HttpStatus.NOT_FOUND);

		Assertions.assertNull(
			oktaService.fetchContactByEmailAddress(_EMAIL_ADDRESS));
	}

	@Test
	public void testFetchContactByEmailAddressThrowsWhenOktaRedirects() {
		OktaService oktaService = _createOktaService(
			StringPool.BLANK, HttpStatus.FOUND);

		Assertions.assertThrows(
			OktaUnavailableException.class,
			() -> oktaService.fetchContactByEmailAddress(_EMAIL_ADDRESS));
	}

	@Test
	public void testFetchContactByEmailAddressThrowsWhenOktaReturnsError() {
		for (HttpStatus httpStatus :
				List.of(
					HttpStatus.MOVED_PERMANENTLY, HttpStatus.FOUND,
					HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN,
					HttpStatus.TOO_MANY_REQUESTS,
					HttpStatus.INTERNAL_SERVER_ERROR)) {

			OktaService oktaService = _createOktaService(
				_BODY_ERROR, httpStatus);

			Assertions.assertThrows(
				OktaUnavailableException.class,
				() -> oktaService.fetchContactByEmailAddress(_EMAIL_ADDRESS));
		}
	}

	@Test
	public void testGetContactGroupNamesReturnsEmptyListWhenNotFound()
		throws Exception {

		OktaService oktaService = _createOktaService(
			_BODY_NOT_FOUND, HttpStatus.NOT_FOUND);

		List<String> groupNames = oktaService.getContactGroupNames(
			_EMAIL_ADDRESS);

		Assertions.assertTrue(groupNames.isEmpty());
	}

	@Test
	public void testGetContactGroupNamesReturnsGroupNames() throws Exception {
		OktaService oktaService = _createOktaService(
			_getGroupsBody("Customers", "Everyone"), HttpStatus.OK);

		Assertions.assertEquals(
			Arrays.asList("Customers", "Everyone"),
			oktaService.getContactGroupNames(_EMAIL_ADDRESS));
	}

	@Test
	public void testSyncContactActivatesDeactivatedContact() throws Exception {
		OktaService oktaService = _createOktaService(
			_getContactBody("Jane", "Doe", "DEPROVISIONED"), _getGroupsBody());

		UserAccount userAccount = _createUserAccount();

		_addAccountBrief(userAccount);

		oktaService.syncContact(userAccount);

		Assertions.assertEquals(
			Arrays.asList("okta-user-update ACTIVATE"), _getPublishedActions());
	}

	@Test
	public void testSyncContactAddsCustomerMembership() throws Exception {
		OktaService oktaService = _createOktaService(
			_getContactBody("Jane", "Doe", "ACTIVE"), _getGroupsBody());

		UserAccount userAccount = _createUserAccount();

		_addAccountBrief(userAccount);

		oktaService.syncContact(userAccount);

		Assertions.assertEquals(
			Arrays.asList("okta-user-group-update ADD Customers"),
			_getPublishedActions());
	}

	@Test
	public void testSyncContactAddsMembershipsWhenContactIsAbsent()
		throws Exception {

		OktaService oktaService = _createOktaService(
			_BODY_NOT_FOUND, HttpStatus.NOT_FOUND);

		UserAccount userAccount = _createUserAccount();

		_addAccountBrief(userAccount, RoleConstants.NAME_PARTNER_MANAGER);

		Assertions.assertNull(oktaService.syncContact(userAccount));

		Assertions.assertEquals(
			Arrays.asList(
				"okta-user-create", "okta-user-group-update ADD Customers",
				"okta-user-group-update ADD Partners"),
			_getPublishedActions());
	}

	@Test
	public void testSyncContactAddsPartnerMembership() throws Exception {
		OktaService oktaService = _createOktaService(
			_getContactBody("Jane", "Doe", "ACTIVE"), _getGroupsBody());

		UserAccount userAccount = _createUserAccount();

		_addAccountBrief(userAccount, RoleConstants.NAME_PARTNER_MANAGER);

		oktaService.syncContact(userAccount);

		Assertions.assertEquals(
			Arrays.asList(
				"okta-user-group-update ADD Customers",
				"okta-user-group-update ADD Partners"),
			_getPublishedActions());
	}

	@Test
	public void testSyncContactKeepsConsistentMemberships() throws Exception {
		OktaService oktaService = _createOktaService(
			_getContactBody("Jane", "Doe", "ACTIVE"),
			_getGroupsBody("Customers", "Everyone", "Partners"));

		UserAccount userAccount = _createUserAccount();

		_addAccountBrief(userAccount, RoleConstants.NAME_PARTNER_MANAGER);

		oktaService.syncContact(userAccount);

		Assertions.assertTrue(_getPublishedActions().isEmpty());
	}

	@Test
	public void testSyncContactKeepsNameWhenOktaNameIsBlank() throws Exception {
		OktaService oktaService = _createOktaService(
			_getContactBody(StringPool.BLANK, StringPool.BLANK, "ACTIVE"),
			_getGroupsBody());

		oktaService.syncContact(_createUserAccount());

		Mockito.verify(
			_userAccountService, Mockito.never()
		).updateUser(
			Mockito.any(), Mockito.any(), Mockito.anyLong(), Mockito.any()
		);
	}

	@Test
	public void testSyncContactPublishesWhenContactIsAbsent() throws Exception {
		OktaService oktaService = _createOktaService(
			_BODY_NOT_FOUND, HttpStatus.NOT_FOUND);

		Assertions.assertNull(oktaService.syncContact(_createUserAccount()));

		ArgumentCaptor<Message> argumentCaptor = ArgumentCaptor.forClass(
			Message.class);

		Mockito.verify(
			_oktaPubsubPublisher
		).publish(
			argumentCaptor.capture()
		);

		Message message = argumentCaptor.getValue();

		Assertions.assertEquals("okta-user-create", message.getTopic());

		JSONObject jsonObject = new JSONObject(message.getPayload());

		Assertions.assertEquals(
			_EMAIL_ADDRESS, jsonObject.getString("emailAddress"));
		Assertions.assertEquals("Jane", jsonObject.getString("firstName"));
		Assertions.assertEquals("Doe", jsonObject.getString("lastName"));
		Assertions.assertEquals(_KORONEIKI_UUID, jsonObject.getString("uuid"));

		Mockito.verifyNoInteractions(_userAccountService);
	}

	@Test
	public void testSyncContactRemovesStaleMemberships() throws Exception {
		OktaService oktaService = _createOktaService(
			_getContactBody("Jane", "Doe", "ACTIVE"),
			_getGroupsBody("Customers", "Everyone", "Partners"));

		oktaService.syncContact(_createUserAccount());

		Assertions.assertEquals(
			Arrays.asList(
				"okta-user-group-update REMOVE Customers",
				"okta-user-group-update REMOVE Partners"),
			_getPublishedActions());
	}

	@Test
	public void testSyncContactSavesExternalReferenceCodeAsUuidWhenUuidIsMissing()
		throws Exception {

		OktaService oktaService = _createOktaService(
			_BODY_NOT_FOUND, HttpStatus.NOT_FOUND);

		UserAccount userAccount = _createUserAccount();

		userAccount.setCustomFields(new CustomField[0]);

		oktaService.syncContact(userAccount);

		ArgumentCaptor<Message> argumentCaptor = ArgumentCaptor.forClass(
			Message.class);

		InOrder inOrder = Mockito.inOrder(
			_oktaPubsubPublisher, _userAccountService);

		inOrder.verify(
			_userAccountService
		).updateUser(
			"Doe", "Jane", _USER_ID, _EXTERNAL_REFERENCE_CODE
		);

		inOrder.verify(
			_oktaPubsubPublisher
		).publish(
			argumentCaptor.capture()
		);

		Message message = argumentCaptor.getValue();

		JSONObject jsonObject = new JSONObject(message.getPayload());

		Assertions.assertEquals(
			_EXTERNAL_REFERENCE_CODE, jsonObject.getString("uuid"));
	}

	@Test
	public void testSyncContactSetsVerifiedWhenOktaEmailIsVerified()
		throws Exception {

		OktaService oktaService = _createOktaService(
			_getContactBody("Jane", "Doe", "ACTIVE"), _getGroupsBody());

		oktaService.syncContact(_createUserAccount());

		Mockito.verify(
			_userAccountService
		).setVerified(
			_USER_ID
		);
	}

	@Test
	public void testSyncContactSkipsUpdateWhenUnchanged() throws Exception {
		OktaService oktaService = _createOktaService(
			_getContactBody("Jane", "Doe", "ACTIVE"), _getGroupsBody());

		oktaService.syncContact(_createUserAccount());

		Mockito.verify(
			_userAccountService, Mockito.never()
		).updateUser(
			Mockito.any(), Mockito.any(), Mockito.anyLong(), Mockito.any()
		);
	}

	@Test
	public void testSyncContactSkipsVerifiedWhenOktaEmailIsPending()
		throws Exception {

		OktaService oktaService = _createOktaService(
			_getContactBody("Jane", "Doe", "STAGED"), _getGroupsBody());

		oktaService.syncContact(_createUserAccount());

		Mockito.verify(
			_userAccountService, Mockito.never()
		).setVerified(
			Mockito.anyLong()
		);
	}

	@Test
	public void testSyncContactUpdatesNameAndUuidInOneCall() throws Exception {
		OktaService oktaService = _createOktaService(
			_getContactBody("Janet", "Smith", "ACTIVE", "okta-uuid-5678"),
			_getGroupsBody());

		oktaService.syncContact(_createUserAccount());

		Mockito.verify(
			_userAccountService, Mockito.times(1)
		).updateUser(
			"Smith", "Janet", _USER_ID, "okta-uuid-5678"
		);
	}

	@Test
	public void testSyncContactUpdatesNameFromOkta() throws Exception {
		OktaService oktaService = _createOktaService(
			_getContactBody("Janet", "Smith", "ACTIVE"), _getGroupsBody());

		oktaService.syncContact(_createUserAccount());

		Mockito.verify(
			_userAccountService
		).updateUser(
			"Smith", "Janet", _USER_ID, _KORONEIKI_UUID
		);
	}

	@Test
	public void testSyncContactUpdatesUuidFromOkta() throws Exception {
		OktaService oktaService = _createOktaService(
			_getContactBody("Jane", "Doe", "ACTIVE", "okta-uuid-5678"),
			_getGroupsBody());

		oktaService.syncContact(_createUserAccount());

		Mockito.verify(
			_userAccountService
		).updateUser(
			"Doe", "Jane", _USER_ID, "okta-uuid-5678"
		);
	}

	private void _addAccountBrief(
		UserAccount userAccount, String... roleNames) {

		List<RoleBrief> roleBriefs = new ArrayList<>();

		for (String roleName : roleNames) {
			RoleBrief roleBrief = new RoleBrief();

			roleBrief.setName(roleName);

			roleBriefs.add(roleBrief);
		}

		AccountBrief accountBrief = new AccountBrief();

		accountBrief.setId(_ACCOUNT_ID);
		accountBrief.setRoleBriefs(roleBriefs.toArray(new RoleBrief[0]));

		userAccount.setAccountBriefs(new AccountBrief[] {accountBrief});
	}

	private OktaService _createOktaService(
		String body, HttpStatusCode httpStatusCode) {

		OktaService oktaService = new OktaService();

		ReflectionTestUtils.setField(
			oktaService, "_oktaPubsubPublisher", _oktaPubsubPublisher);
		ReflectionTestUtils.setField(
			oktaService, "_userAccountService", _userAccountService);
		ReflectionTestUtils.setField(
			oktaService, "_webClient", _createWebClient(body, httpStatusCode));

		return oktaService;
	}

	private OktaService _createOktaService(
		String contactBody, String groupsBody) {

		OktaService oktaService = _createOktaService(
			contactBody, HttpStatus.OK);

		ReflectionTestUtils.setField(
			oktaService, "_webClient",
			WebClient.builder(
			).exchangeFunction(
				clientRequest -> {
					URI uri = clientRequest.url();

					String path = uri.getPath();

					String body = contactBody;

					if (path.endsWith("/groups")) {
						body = groupsBody;
					}

					return Mono.just(
						ClientResponse.create(
							HttpStatus.OK
						).header(
							"Content-Type", MediaType.APPLICATION_JSON_VALUE
						).body(
							body
						).build());
				}
			).build());

		return oktaService;
	}

	private UserAccount _createUserAccount() {
		UserAccount userAccount = new UserAccount();

		CustomValue customValue = new CustomValue();

		customValue.setData(_KORONEIKI_UUID);

		CustomField customField = new CustomField();

		customField.setCustomValue(customValue);
		customField.setName("uuid_");

		userAccount.setCustomFields(new CustomField[] {customField});

		userAccount.setEmailAddress(_EMAIL_ADDRESS);
		userAccount.setExternalReferenceCode(_EXTERNAL_REFERENCE_CODE);
		userAccount.setFamilyName("Doe");
		userAccount.setGivenName("Jane");
		userAccount.setId(_USER_ID);

		return userAccount;
	}

	private WebClient _createWebClient(
		String body, HttpStatusCode httpStatusCode) {

		return WebClient.builder(
		).exchangeFunction(
			clientRequest -> Mono.just(
				ClientResponse.create(
					httpStatusCode
				).header(
					"Content-Type", MediaType.APPLICATION_JSON_VALUE
				).body(
					body
				).build())
		).build();
	}

	private String _getContactBody(
		String firstName, String lastName, String status) {

		return _getContactBody(firstName, lastName, status, _KORONEIKI_UUID);
	}

	private String _getContactBody(
		String firstName, String lastName, String status, String uuid) {

		JSONObject jsonObject = new JSONObject(
		).put(
			"profile",
			new JSONObject(
			).put(
				"email", _EMAIL_ADDRESS
			).put(
				"firstName", firstName
			).put(
				"lastName", lastName
			).put(
				"uuid", uuid
			)
		).put(
			"status", status
		);

		return jsonObject.toString();
	}

	private String _getGroupsBody(String... groupNames) {
		JSONArray jsonArray = new JSONArray();

		for (String groupName : groupNames) {
			jsonArray.put(
				new JSONObject(
				).put(
					"profile",
					new JSONObject(
					).put(
						"name", groupName
					)
				));
		}

		return jsonArray.toString();
	}

	private List<String> _getPublishedActions() throws Exception {
		ArgumentCaptor<Message> argumentCaptor = ArgumentCaptor.forClass(
			Message.class);

		Mockito.verify(
			_oktaPubsubPublisher, Mockito.atLeast(0)
		).publish(
			argumentCaptor.capture()
		);

		List<String> publishedActions = new ArrayList<>();

		for (Message message : argumentCaptor.getAllValues()) {
			JSONObject jsonObject = new JSONObject(message.getPayload());

			String publishedAction = StringBundler.concat(
				message.getTopic(), StringPool.SPACE,
				jsonObject.optString("action"), StringPool.SPACE,
				jsonObject.optString("groupName"));

			publishedActions.add(publishedAction.trim());
		}

		return publishedActions;
	}

	private static final long _ACCOUNT_ID = 1000L;

	private static final String _BODY_CONTACT =
		"{\"profile\": {\"email\": \"jane@example.com\", \"firstName\": " +
			"\"Jane\"}, \"status\": \"ACTIVE\"}";

	private static final String _BODY_ERROR =
		"{\"errorCode\": \"E0000011\", \"errorSummary\": \"Invalid token\"}";

	private static final String _BODY_NOT_FOUND =
		"{\"errorCode\": \"E0000007\", \"errorSummary\": \"Not found\"}";

	private static final String _EMAIL_ADDRESS = "jane@example.com";

	private static final String _EXTERNAL_REFERENCE_CODE = "erc-1234";

	private static final String _KORONEIKI_UUID = "koroneiki-uuid-1234";

	private static final long _USER_ID = 42L;

	private final OktaPubsubPublisher _oktaPubsubPublisher = Mockito.mock(
		OktaPubsubPublisher.class);
	private final UserAccountService _userAccountService = Mockito.mock(
		UserAccountService.class);

}
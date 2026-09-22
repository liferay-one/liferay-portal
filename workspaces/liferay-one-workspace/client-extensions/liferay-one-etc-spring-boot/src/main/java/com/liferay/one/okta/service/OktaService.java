/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.okta.service;

import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.constants.RoleConstants;
import com.liferay.one.exception.OktaUnavailableException;
import com.liferay.one.okta.model.OktaUser;
import com.liferay.one.okta.pubsub.OktaPubsubPublisher;
import com.liferay.one.pubsub.Message;
import com.liferay.one.service.UserAccountService;
import com.liferay.one.util.UserAccountUtil;
import com.liferay.petra.string.StringBundler;
import com.liferay.portal.kernel.util.ArrayUtil;
import com.liferay.portal.kernel.util.Validator;
import com.liferay.portal.kernel.workflow.WorkflowConstants;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

import javax.annotation.PostConstruct;

import org.json.JSONArray;
import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * @author Karoline Silva
 */
@Component
public class OktaService {

	public void activateUser(String emailAddress) throws Exception {
		_oktaPubsubPublisher.publish(
			new Message(
				null,
				new JSONObject(
				).put(
					"action", "ACTIVATE"
				).put(
					"login", emailAddress
				).toString(),
				"okta-user-update"));
	}

	public void addMembership(String groupName, String emailAddress)
		throws Exception {

		_oktaPubsubPublisher.publish(
			new Message(
				null,
				new JSONObject(
				).put(
					"action", "ADD"
				).put(
					"groupName", groupName
				).put(
					"login", emailAddress
				).toString(),
				"okta-user-group-update"));
	}

	public void assignUserToApplication(String appId, String emailAddress)
		throws Exception {

		_oktaPubsubPublisher.publish(
			new Message(
				null,
				new JSONObject(
				).put(
					"action", "ASSIGN"
				).put(
					"appId", appId
				).put(
					"emailAddress", emailAddress
				).toString(),
				"okta-app-user-update"));
	}

	public void createApplication(String accountKey, String subdomain)
		throws Exception {

		_oktaPubsubPublisher.publish(
			new Message(
				null,
				new JSONObject(
				).put(
					"accountKey", accountKey
				).put(
					"subdomain", subdomain
				).toString(),
				"okta-app-create"));
	}

	public OktaUser createContact(
			String emailAddress, String firstName, String middleName,
			String lastName)
		throws Exception {

		OktaUser oktaUser = fetchContactByEmailAddress(emailAddress);

		if (oktaUser == null) {
			_oktaPubsubPublisher.publish(
				new Message(
					null,
					new JSONObject(
					).put(
						"emailAddress", emailAddress
					).put(
						"firstName", firstName
					).put(
						"lastName", lastName
					).put(
						"uuid",
						UUID.randomUUID(
						).toString()
					).toString(),
					"okta-user-create"));

			return null;
		}

		return oktaUser;
	}

	public void deleteApplication(String appId) throws Exception {
		_oktaPubsubPublisher.publish(
			new Message(
				null,
				new JSONObject(
				).put(
					"appId", appId
				).toString(),
				"okta-app-delete"));
	}

	public OktaUser fetchContactByEmailAddress(String emailAddress)
		throws Exception {

		ResponseEntity<String> responseEntity = _webClient.get(
		).uri(
			_URL_API_REST_USERS + emailAddress
		).exchangeToMono(
			clientResponse -> clientResponse.toEntity(String.class)
		).block();

		if (responseEntity == null) {
			throw new OktaUnavailableException(
				"Unable to fetch the Okta contact " + emailAddress);
		}

		HttpStatusCode httpStatusCode = responseEntity.getStatusCode();

		if (httpStatusCode.isSameCodeAs(HttpStatus.NOT_FOUND)) {
			return null;
		}

		if (!httpStatusCode.is2xxSuccessful()) {
			throw new OktaUnavailableException(
				StringBundler.concat(
					"Unable to fetch the Okta contact ", emailAddress,
					" because Okta returned status ", httpStatusCode.value()));
		}

		if (Validator.isNull(responseEntity.getBody())) {
			return null;
		}

		return new OktaUser(new JSONObject(responseEntity.getBody()));
	}

	public OktaUser fetchContactByUuid(String uuid) throws Exception {
		ResponseEntity<String> responseEntity = _webClient.get(
		).uri(
			uriBuilder -> uriBuilder.path(
				_URL_API_REST_USERS
			).queryParam(
				"search", "profile.uuid eq \"" + uuid + "\""
			).build()
		).retrieve(
		).toEntity(
			String.class
		).block();

		if ((responseEntity == null) ||
			Validator.isNull(responseEntity.getBody())) {

			return null;
		}

		JSONArray jsonArray = new JSONArray(responseEntity.getBody());

		if (jsonArray.isEmpty()) {
			return null;
		}

		return new OktaUser(jsonArray.getJSONObject(0));
	}

	public Integer fetchContactStatusByEmailAddress(String emailAddress)
		throws Exception {

		OktaUser oktaUser = fetchContactByEmailAddress(emailAddress);

		if (oktaUser == null) {
			return null;
		}

		if (oktaUser.isDeactivated()) {
			return WorkflowConstants.STATUS_INACTIVE;
		}

		if (oktaUser.isPending()) {
			return WorkflowConstants.STATUS_PENDING;
		}

		return WorkflowConstants.STATUS_APPROVED;
	}

	public List<String> getContactGroupNames(String emailAddress)
		throws Exception {

		ResponseEntity<String> responseEntity = _webClient.get(
		).uri(
			StringBundler.concat(_URL_API_REST_USERS, emailAddress, "/groups")
		).exchangeToMono(
			clientResponse -> clientResponse.toEntity(String.class)
		).block();

		if (responseEntity == null) {
			throw new OktaUnavailableException(
				"Unable to fetch the Okta groups for contact " + emailAddress);
		}

		HttpStatusCode httpStatusCode = responseEntity.getStatusCode();

		if (httpStatusCode.isSameCodeAs(HttpStatus.NOT_FOUND)) {
			return Collections.emptyList();
		}

		if (!httpStatusCode.is2xxSuccessful()) {
			throw new OktaUnavailableException(
				StringBundler.concat(
					"Unable to fetch the Okta groups for contact ",
					emailAddress, " because Okta returned status ",
					httpStatusCode.value()));
		}

		if (Validator.isNull(responseEntity.getBody())) {
			return Collections.emptyList();
		}

		List<String> groupNames = new ArrayList<>();

		JSONArray jsonArray = new JSONArray(responseEntity.getBody());

		for (int i = 0; i < jsonArray.length(); i++) {
			JSONObject jsonObject = jsonArray.getJSONObject(i);

			JSONObject profileJSONObject = jsonObject.optJSONObject(
				"profile", new JSONObject());

			String name = profileJSONObject.optString("name");

			if (Validator.isNotNull(name)) {
				groupNames.add(name);
			}
		}

		return groupNames;
	}

	public List<OktaUser> getGroupContacts(String groupId) throws Exception {
		List<OktaUser> oktaUsers = new ArrayList<>();

		String url = StringBundler.concat(
			_URL_API_REST_GROUPS, groupId, "/users?limit=200");

		while (url != null) {
			ResponseEntity<String> responseEntity = _webClient.get(
			).uri(
				url
			).retrieve(
			).toEntity(
				String.class
			).block();

			if (responseEntity == null) {
				break;
			}

			String body = responseEntity.getBody();

			if (Validator.isNull(body)) {
				break;
			}

			JSONArray jsonArray = new JSONArray(body);

			for (int i = 0; i < jsonArray.length(); i++) {
				oktaUsers.add(new OktaUser(jsonArray.getJSONObject(i)));
			}

			url = _getNextUrl(responseEntity.getHeaders());
		}

		return oktaUsers;
	}

	public void removeMembership(String groupName, String emailAddress)
		throws Exception {

		_oktaPubsubPublisher.publish(
			new Message(
				null,
				new JSONObject(
				).put(
					"action", "REMOVE"
				).put(
					"groupName", groupName
				).put(
					"login", emailAddress
				).toString(),
				"okta-user-group-update"));
	}

	public OktaUser syncContact(UserAccount userAccount) throws Exception {
		String emailAddress = userAccount.getEmailAddress();

		OktaUser oktaUser = fetchContactByEmailAddress(emailAddress);

		if (oktaUser == null) {
			String uuid = UserAccountUtil.getUuid(userAccount);

			if (Validator.isNull(uuid)) {
				uuid = userAccount.getExternalReferenceCode();

				_userAccountService.updateUser(
					userAccount.getFamilyName(), userAccount.getGivenName(),
					userAccount.getId(), uuid);
			}

			_oktaPubsubPublisher.publish(
				new Message(
					null,
					new JSONObject(
					).put(
						"emailAddress", emailAddress
					).put(
						"firstName", userAccount.getGivenName()
					).put(
						"lastName", userAccount.getFamilyName()
					).put(
						"uuid", uuid
					).toString(),
					"okta-user-create"));

			_syncGroups(
				false, emailAddress, Collections.emptyList(), userAccount);

			return null;
		}

		_updateUserAccount(oktaUser, userAccount);

		_syncGroups(
			oktaUser.isDeactivated(), emailAddress,
			getContactGroupNames(emailAddress), userAccount);

		return oktaUser;
	}

	public void unassignUserFromApplication(String appId, String emailAddress)
		throws Exception {

		_oktaPubsubPublisher.publish(
			new Message(
				null,
				new JSONObject(
				).put(
					"action", "UNASSIGN"
				).put(
					"appId", appId
				).put(
					"emailAddress", emailAddress
				).toString(),
				"okta-app-user-update"));
	}

	@PostConstruct
	protected void init() {
		_webClient = _webClientBuilder.baseUrl(
			"https://" + _host
		).defaultHeader(
			HttpHeaders.AUTHORIZATION, "SSWS " + _apiToken
		).build();
	}

	private String _getNextUrl(HttpHeaders headers) {
		List<String> links = headers.get("link");

		if (links == null) {
			return null;
		}

		for (String link : links) {
			String[] parts = link.split(";");

			if ((parts.length > 1) &&
				Objects.equals(parts[1].trim(), "rel=\"next\"")) {

				String urlPart = parts[0].trim();

				return urlPart.substring(1, urlPart.length() - 1);
			}
		}

		return null;
	}

	private void _syncGroup(
			boolean deactivated, String emailAddress, String groupName,
			List<String> groupNames, boolean required)
		throws Exception {

		boolean assigned = groupNames.contains(groupName);

		if (required && !assigned) {
			if (deactivated) {
				activateUser(emailAddress);
			}
			else {
				addMembership(groupName, emailAddress);
			}
		}
		else if (!required && assigned) {
			removeMembership(groupName, emailAddress);
		}
	}

	private void _syncGroups(
			boolean deactivated, String emailAddress, List<String> groupNames,
			UserAccount userAccount)
		throws Exception {

		_syncGroup(
			deactivated, emailAddress, _GROUP_NAME_CUSTOMERS, groupNames,
			ArrayUtil.isNotEmpty(userAccount.getAccountBriefs()));
		_syncGroup(
			deactivated, emailAddress, _GROUP_NAME_PARTNERS, groupNames,
			UserAccountUtil.hasAccountRole(
				userAccount, RoleConstants.NAMES_PARTNER_ACCOUNT_ROLES));
	}

	private void _updateUserAccount(OktaUser oktaUser, UserAccount userAccount)
		throws Exception {

		String familyName = userAccount.getFamilyName();

		if (Validator.isNotNull(oktaUser.getLastName())) {
			familyName = oktaUser.getLastName();
		}

		String givenName = userAccount.getGivenName();

		if (Validator.isNotNull(oktaUser.getFirstName())) {
			givenName = oktaUser.getFirstName();
		}

		String uuid = UserAccountUtil.getUuid(userAccount);

		if (Validator.isNotNull(oktaUser.getUuid())) {
			uuid = oktaUser.getUuid();
		}

		if (!Objects.equals(familyName, userAccount.getFamilyName()) ||
			!Objects.equals(givenName, userAccount.getGivenName()) ||
			!Objects.equals(uuid, UserAccountUtil.getUuid(userAccount))) {

			_userAccountService.updateUser(
				familyName, givenName, userAccount.getId(), uuid);
		}

		if (oktaUser.isEmailAddressVerified() &&
			!UserAccountUtil.isVerified(userAccount)) {

			_userAccountService.setVerified(userAccount.getId());
		}
	}

	private static final String _GROUP_NAME_CUSTOMERS = "Customers";

	private static final String _GROUP_NAME_PARTNERS = "Partners";

	private static final String _URL_API_REST_GROUPS = "/api/v1/groups/";

	private static final String _URL_API_REST_USERS = "/api/v1/users/";

	@Value("${liferay.one.okta.api.token}")
	private String _apiToken;

	@Value("${liferay.one.okta.host}")
	private String _host;

	@Autowired
	private OktaPubsubPublisher _oktaPubsubPublisher;

	@Autowired
	private UserAccountService _userAccountService;

	private WebClient _webClient;

	@Autowired
	private WebClient.Builder _webClientBuilder;

}
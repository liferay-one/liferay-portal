/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.okta.pubsub;

import com.liferay.headless.admin.user.client.dto.v1_0.AccountBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.OrganizationBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.constants.PropertyConstants;
import com.liferay.one.model.Property;
import com.liferay.one.okta.model.OktaUser;
import com.liferay.one.okta.service.OktaService;
import com.liferay.one.pubsub.Message;
import com.liferay.one.pubsub.subscriber.BasePubsubSubscriber;
import com.liferay.one.service.AccountService;
import com.liferay.one.service.PropertyService;
import com.liferay.one.service.ProvisioningEmailService;
import com.liferay.one.service.UserAccountService;
import com.liferay.one.service.UserAssignmentService;
import com.liferay.one.util.UserAccountUtil;
import com.liferay.portal.kernel.model.Organization;
import com.liferay.portal.kernel.util.Validator;

import java.util.List;
import java.util.Objects;

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
	name = "liferay.one.okta.users.pubsub.subscriber.enabled"
)
public class OktaUsersPubsubSubscriber extends BasePubsubSubscriber {

	@Override
	public String getTopic() {
		return _topic;
	}

	@Override
	public void receive(Message message) throws Exception {
		JSONObject jsonObject = new JSONObject(message.getPayload());

		String eventType = jsonObject.optString("eventType");

		JSONObject groupJSONObject = jsonObject.optJSONObject(
			"group", new JSONObject());
		OktaUser oktaUser = new OktaUser(
			jsonObject.optJSONObject("user", new JSONObject()));

		if (Objects.equals(eventType, _EVENT_TYPE_LIFECYCLE_ACTIVATE) ||
			Objects.equals(eventType, _EVENT_TYPE_LIFECYCLE_CREATE)) {

			_syncContact(oktaUser);
		}
		else if (Objects.equals(eventType, _EVENT_TYPE_LIFECYCLE_DEACTIVATE)) {
			_unassignAllMemberships(oktaUser);
		}
		else if (Objects.equals(
					eventType, _EVENT_TYPE_GROUP_USER_MEMBERSHIP_ADD)) {

			_addGroupMemberships(groupJSONObject, oktaUser);
		}
		else if (Objects.equals(
					eventType, _EVENT_TYPE_GROUP_USER_MEMBERSHIP_REMOVE)) {

			if (Objects.equals(
					groupJSONObject.optString("displayName"),
					_GROUP_NAME_EMPLOYEES)) {

				_unassignAllMemberships(oktaUser);
			}
			else {
				_removeGroupMemberships(groupJSONObject, oktaUser);
			}
		}
		else if (Objects.equals(
					eventType, _EVENT_TYPE_ACCOUNT_UPDATE_PASSWORD) ||
				 Objects.equals(
					 eventType, _EVENT_TYPE_ACCOUNT_UPDATE_PROFILE)) {

			_updateContact(oktaUser);
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

	@Override
	protected boolean isAutoCreateTopic() {
		return false;
	}

	private void _addGroupMemberships(
			JSONObject groupJSONObject, OktaUser oktaUser)
		throws Exception {

		long organizationId = _getGroupOrganizationId(groupJSONObject);

		if (organizationId == 0) {
			return;
		}

		UserAccount userAccount = _fetchUserAccount(oktaUser.getEmail());

		if (userAccount == null) {
			return;
		}

		_userAssignmentService.assignOrganization(
			organizationId, userAccount.getId());
	}

	private UserAccount _fetchUserAccount(String emailAddress)
		throws Exception {

		if (Validator.isNull(emailAddress)) {
			return null;
		}

		return _userAccountService.fetchUserAccountByEmailAddress(emailAddress);
	}

	private long _getGroupOrganizationId(JSONObject groupJSONObject)
		throws Exception {

		String groupId = groupJSONObject.optString("id");

		if (Validator.isNull(groupId)) {
			return 0;
		}

		List<Property> properties = _propertyService.getProperties(
			Organization.class.getName(), PropertyConstants.NAME_OKTA_GROUP,
			groupId);

		if (properties.isEmpty()) {
			return 0;
		}

		Property property = properties.get(0);

		return property.getClassPK();
	}

	private void _removeGroupMemberships(
			JSONObject groupJSONObject, OktaUser oktaUser)
		throws Exception {

		long organizationId = _getGroupOrganizationId(groupJSONObject);

		if (organizationId == 0) {
			return;
		}

		UserAccount userAccount = _fetchUserAccount(oktaUser.getEmail());

		if (userAccount == null) {
			return;
		}

		_userAssignmentService.unassignOrganization(
			organizationId, userAccount.getId());
	}

	private void _syncContact(OktaUser oktaUser) throws Exception {
		UserAccount userAccount = _fetchUserAccount(oktaUser.getEmail());

		if (userAccount == null) {
			return;
		}

		_oktaService.syncContact(userAccount);
	}

	private void _unassignAllMemberships(OktaUser oktaUser) throws Exception {
		UserAccount userAccount = _fetchUserAccount(oktaUser.getEmail());

		if (userAccount == null) {
			return;
		}

		AccountBrief[] accountBriefs = userAccount.getAccountBriefs();

		if (accountBriefs != null) {
			for (AccountBrief accountBrief : accountBriefs) {
				_userAssignmentService.unassignAccount(
					_accountService.getAccount(accountBrief.getId(), null),
					userAccount.getId());
			}
		}

		OrganizationBrief[] organizationBriefs =
			userAccount.getOrganizationBriefs();

		if (organizationBriefs != null) {
			for (OrganizationBrief organizationBrief : organizationBriefs) {
				_userAssignmentService.unassignOrganization(
					organizationBrief.getId(), userAccount.getId());
			}
		}
	}

	private void _updateContact(OktaUser oktaUser) throws Exception {
		UserAccount userAccount = _fetchUserAccount(oktaUser.getEmail());

		if (userAccount == null) {
			return;
		}

		boolean verified = UserAccountUtil.isVerified(userAccount);

		OktaUser syncedOktaUser = _oktaService.syncContact(userAccount);

		if (!verified && (syncedOktaUser != null) &&
			syncedOktaUser.isEmailAddressVerified()) {

			_provisioningEmailService.sendVerifiedWelcomeEmail(userAccount);
		}
	}

	private static final String _EVENT_TYPE_ACCOUNT_UPDATE_PASSWORD =
		"user.account.update_password";

	private static final String _EVENT_TYPE_ACCOUNT_UPDATE_PROFILE =
		"user.account.update_profile";

	private static final String _EVENT_TYPE_GROUP_USER_MEMBERSHIP_ADD =
		"group.user_membership.add";

	private static final String _EVENT_TYPE_GROUP_USER_MEMBERSHIP_REMOVE =
		"group.user_membership.remove";

	private static final String _EVENT_TYPE_LIFECYCLE_ACTIVATE =
		"user.lifecycle.activate";

	private static final String _EVENT_TYPE_LIFECYCLE_CREATE =
		"user.lifecycle.create";

	private static final String _EVENT_TYPE_LIFECYCLE_DEACTIVATE =
		"user.lifecycle.deactivate";

	private static final String _GROUP_NAME_EMPLOYEES = "Employees";

	@Autowired
	private AccountService _accountService;

	@Autowired
	private OktaService _oktaService;

	@Value("${liferay.one.okta.users.pubsub.subscriber.project.id}")
	private String _projectId;

	@Autowired
	private PropertyService _propertyService;

	@Autowired
	private ProvisioningEmailService _provisioningEmailService;

	@Value("${liferay.one.okta.users.pubsub.subscriber.subscription}")
	private String _subscription;

	@Value("${liferay.one.okta.users.pubsub.subscriber.topic}")
	private String _topic;

	@Autowired
	private UserAccountService _userAccountService;

	@Autowired
	private UserAssignmentService _userAssignmentService;

}
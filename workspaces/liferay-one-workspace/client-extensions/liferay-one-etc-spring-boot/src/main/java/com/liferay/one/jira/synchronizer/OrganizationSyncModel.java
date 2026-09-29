/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.synchronizer;

import com.liferay.headless.admin.user.client.dto.v1_0.AccountBrief;
import com.liferay.headless.admin.user.client.dto.v1_0.Organization;
import com.liferay.headless.admin.user.client.dto.v1_0.UserAccount;
import com.liferay.one.jira.converter.ExternalLinkConverter;
import com.liferay.one.model.Property;
import com.liferay.one.service.PropertyService;
import com.liferay.one.service.UserAccountService;
import com.liferay.portal.kernel.util.GetterUtil;
import com.liferay.portal.kernel.util.ListUtil;

import java.util.ArrayList;
import java.util.List;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

/**
 * @author Drew Brokke
 */
public class OrganizationSyncModel {

	public OrganizationSyncModel(
		ExternalLinkConverter externalLinkConverter, Organization organization,
		PropertyService propertyService,
		UserAccountService userAccountService) {

		_externalLinkConverter = externalLinkConverter;
		_organization = organization;
		_propertyService = propertyService;
		_userAccountService = userAccountService;
	}

	public List<AccountBrief> getAccountBriefs() {
		if (_accountBriefs == null) {
			_accountBriefs = ListUtil.fromArray(
				_organization.getAccountBriefs());
		}

		return _accountBriefs;
	}

	public List<Property> getExternalLinkProperties() {
		if (_externalLinkProperties == null) {
			try {
				List<Property> externalLinkProperties = new ArrayList<>();

				List<Property> properties =
					_propertyService.getOrganizationProperties(_getId());

				for (Property property : properties) {
					if (_externalLinkConverter.isExternalLinkProperty(
							property)) {

						externalLinkProperties.add(property);
					}
				}

				_externalLinkProperties = externalLinkProperties;
			}
			catch (Exception exception) {
				_log.error(
					"Unable to get external links for organization " +
						getExternalReferenceCode(),
					exception);
			}
		}

		return _externalLinkProperties;
	}

	public String getExternalReferenceCode() {
		return _organization.getExternalReferenceCode();
	}

	public Organization getOrganization() {
		return _organization;
	}

	public List<UserAccount> getOrganizationUserAccounts() {
		if (_organizationUserAccounts == null) {
			try {
				_organizationUserAccounts =
					_userAccountService.getOrganizationUserAccounts(_getId());
			}
			catch (Exception exception) {
				_log.error(
					"Unable to get user accounts for organization " +
						getExternalReferenceCode(),
					exception);
			}
		}

		return _organizationUserAccounts;
	}

	private long _getId() {
		return GetterUtil.getLong(_organization.getId());
	}

	private static final Log _log = LogFactory.getLog(
		OrganizationSyncModel.class);

	private List<AccountBrief> _accountBriefs;
	private final ExternalLinkConverter _externalLinkConverter;
	private List<Property> _externalLinkProperties;
	private final Organization _organization;
	private List<UserAccount> _organizationUserAccounts;
	private final PropertyService _propertyService;
	private final UserAccountService _userAccountService;

}
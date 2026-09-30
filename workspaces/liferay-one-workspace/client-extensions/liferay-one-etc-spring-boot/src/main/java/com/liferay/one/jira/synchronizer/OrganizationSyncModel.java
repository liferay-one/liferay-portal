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
import com.liferay.one.util.MemoizedValue;
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

		_accountBriefs = ListUtil.fromArray(organization.getAccountBriefs());

		String externalReferenceCode = getExternalReferenceCode();

		_externalLinkProperties = new MemoizedValue<>(
			"external links for organization " + externalReferenceCode, _log,
			this::_toExternalLinkProperties);
		_organizationUserAccounts = new MemoizedValue<>(
			"user accounts for organization " + externalReferenceCode, _log,
			() -> userAccountService.getOrganizationUserAccounts(_getId()));
	}

	public List<AccountBrief> getAccountBriefs() {
		return _accountBriefs;
	}

	public List<Property> getExternalLinkProperties() {
		return _externalLinkProperties.get();
	}

	public String getExternalReferenceCode() {
		return _organization.getExternalReferenceCode();
	}

	public Organization getOrganization() {
		return _organization;
	}

	public List<UserAccount> getOrganizationUserAccounts() {
		return _organizationUserAccounts.get();
	}

	private long _getId() {
		return GetterUtil.getLong(_organization.getId());
	}

	private List<Property> _toExternalLinkProperties() throws Exception {
		List<Property> externalLinkProperties = new ArrayList<>();

		List<Property> properties = _propertyService.getOrganizationProperties(
			_getId());

		for (Property property : properties) {
			if (_externalLinkConverter.isExternalLinkProperty(property)) {
				externalLinkProperties.add(property);
			}
		}

		return externalLinkProperties;
	}

	private static final Log _log = LogFactory.getLog(
		OrganizationSyncModel.class);

	private final List<AccountBrief> _accountBriefs;
	private final ExternalLinkConverter _externalLinkConverter;
	private final MemoizedValue<List<Property>> _externalLinkProperties;
	private final Organization _organization;
	private final MemoizedValue<List<UserAccount>> _organizationUserAccounts;
	private final PropertyService _propertyService;

}
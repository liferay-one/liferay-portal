/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.Organization;
import com.liferay.headless.admin.user.client.pagination.Page;
import com.liferay.headless.admin.user.client.pagination.Pagination;
import com.liferay.headless.admin.user.client.resource.v1_0.OrganizationResource;
import com.liferay.one.constants.CustomFieldConstants;
import com.liferay.one.util.CustomFieldUtil;
import com.liferay.portal.kernel.util.GetterUtil;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;

/**
 * @author Ricardo Mariz
 */
@Component
public class OrganizationService extends OneBaseService {

	public void addOrganizationUserAccountByEmailAddress(
			String emailAddress, long organizationId)
		throws Exception {

		OrganizationResource organizationResource =
			_buildOrganizationResource();

		organizationResource.postUserAccountByEmailAddress(
			String.valueOf(organizationId), emailAddress);
	}

	public List<Organization> getAccountOrganizations(long accountId)
		throws Exception {

		OrganizationResource organizationResource =
			_buildOrganizationResource();

		List<Organization> organizations = new ArrayList<>();

		int page = 1;

		while (true) {
			Page<Organization> organizationsPage =
				organizationResource.getAccountOrganizationsPage(
					accountId, null, null, Pagination.of(page, _PAGE_SIZE),
					null);

			organizations.addAll(organizationsPage.getItems());

			if (page >= organizationsPage.getLastPage()) {
				break;
			}

			page++;
		}

		return organizations;
	}

	@CacheEvict(allEntries = true, value = "oktaGroupIds")
	public void evictOktaGroupIds() {
	}

	public String getOktaGroupId(long organizationId) throws Exception {
		Organization organization = getOrganization(organizationId);

		return CustomFieldUtil.getString(
			organization.getCustomFields(),
			CustomFieldConstants.NAME_OKTA_GROUP_ID);
	}

	@Cacheable("oktaGroupIds")
	public Map<Long, String> getOktaGroupIds() throws Exception {
		Map<Long, String> oktaGroupIds = new LinkedHashMap<>();

		for (Organization organization : getOrganizations()) {
			String oktaGroupId = CustomFieldUtil.getString(
				organization.getCustomFields(),
				CustomFieldConstants.NAME_OKTA_GROUP_ID);

			if (oktaGroupId != null) {
				oktaGroupIds.put(
					GetterUtil.getLong(organization.getId()), oktaGroupId);
			}
		}

		return Collections.unmodifiableMap(oktaGroupIds);
	}

	public Organization getOrganization(long organizationId) throws Exception {
		OrganizationResource organizationResource = _buildOrganizationResource(
			"nestedFields", "accountBriefs");

		return organizationResource.getOrganization(
			String.valueOf(organizationId));
	}

	public List<Organization> getOrganizations() throws Exception {
		List<Organization> organizations = new ArrayList<>();

		OrganizationResource organizationResource =
			_buildOrganizationResource();

		int page = 1;

		while (true) {
			Page<Organization> organizationsPage =
				organizationResource.getOrganizationsPage(
					true, null, null, Pagination.of(page, _PAGE_SIZE), null);

			organizations.addAll(organizationsPage.getItems());

			if (page >= organizationsPage.getLastPage()) {
				break;
			}

			page++;
		}

		return organizations;
	}

	public void removeOrganizationUserAccountByEmailAddress(
			String emailAddress, long organizationId)
		throws Exception {

		OrganizationResource organizationResource =
			_buildOrganizationResource();

		organizationResource.deleteUserAccountByEmailAddress(
			String.valueOf(organizationId), emailAddress);
	}

	private OrganizationResource _buildOrganizationResource(
		String... parameters) {

		return OrganizationResource.builder(
		).endpoint(
			getDXPEndpointAddress(), lxcDXPServerProtocol
		).header(
			HttpHeaders.AUTHORIZATION, getAuthorization()
		).parameters(
			parameters
		).build();
	}

	private static final int _PAGE_SIZE = 500;

}
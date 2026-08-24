/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.service;

import com.liferay.headless.admin.user.client.dto.v1_0.AccountRole;
import com.liferay.headless.admin.user.client.pagination.Page;
import com.liferay.headless.admin.user.client.pagination.Pagination;
import com.liferay.headless.admin.user.client.resource.v1_0.AccountRoleResource;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;

/**
 * @author Amos Fong
 */
@Component
public class AccountRoleService extends OneBaseService {

	@Cacheable("accountRoles")
	public AccountRole fetchAccountRole(long accountRoleId) throws Exception {
		for (AccountRole accountRole : getAccountRoles()) {
			if (Objects.equals(accountRole.getId(), accountRoleId)) {
				return accountRole;
			}
		}

		return null;
	}

	@Cacheable("accountRolesByExternalReferenceCode")
	public AccountRole fetchAccountRoleByExternalReferenceCode(
			String externalReferenceCode)
		throws Exception {

		for (AccountRole accountRole : getAccountRoles()) {
			if (Objects.equals(
					accountRole.getExternalReferenceCode(),
					externalReferenceCode)) {

				return accountRole;
			}
		}

		return null;
	}

	@Cacheable("accountRolesByName")
	public AccountRole fetchAccountRoleByName(String name) throws Exception {
		for (AccountRole accountRole : getAccountRoles()) {
			if (Objects.equals(accountRole.getName(), name)) {
				return accountRole;
			}
		}

		return null;
	}

	public List<AccountRole> getAccountRoles() throws Exception {
		AccountRoleResource accountRoleResource = AccountRoleResource.builder(
		).endpoint(
			getDXPEndpointAddress(), lxcDXPServerProtocol
		).header(
			HttpHeaders.AUTHORIZATION, getAuthorization()
		).build();

		Page<AccountRole> accountRolesPage =
			accountRoleResource.getAccountAccountRolesPage(
				_ACCOUNT_ENTRY_ID_DEFAULT, null, null,
				Pagination.of(1, _PAGE_SIZE), null);

		return new ArrayList<>(accountRolesPage.getItems());
	}

	private static final long _ACCOUNT_ENTRY_ID_DEFAULT = 0;

	private static final int _PAGE_SIZE = 500;

}
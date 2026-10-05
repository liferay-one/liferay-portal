/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.util.role;

import com.liferay.one.jira.constants.ContactRoleConstants;

import java.util.List;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-EMPLOYEEROLES] EmployeeRoles")
public class EmployeeRolesTest {

	@Test
	public void testEveryConstantMapsToPrefixedERCNameAndAccountWorkerType() {
		_assertEmployeeRole(
			EmployeeRoles.CUSTOMER_EXPERIENCE_MANAGER,
			"C_CUSTOMER_EXPERIENCE_MANAGER", "Customer Experience Manager");
		_assertEmployeeRole(
			EmployeeRoles.LIFERAY_SALES, "C_LIFERAY_SALES", "Liferay Sales");
		_assertEmployeeRole(
			EmployeeRoles.PRIMARY_CONTACT, "C_PRIMARY_CONTACT",
			"Primary Contact");
		_assertEmployeeRole(
			EmployeeRoles.SECONDARY_CONTACT, "C_SECONDARY_CONTACT",
			"Secondary Contact");
		_assertEmployeeRole(
			EmployeeRoles.SOLUTION_ARCHITECT, "C_SOLUTION_ARCHITECT",
			"Solution Architect");
	}

	@Test
	public void testGetNamesReturnsAllFiveNames() {
		Assertions.assertEquals(
			List.of(
				"Customer Experience Manager", "Liferay Sales",
				"Primary Contact", "Secondary Contact", "Solution Architect"),
			EmployeeRoles.getNames());
	}

	private void _assertEmployeeRole(
		EmployeeRoles employeeRole, String externalReferenceCode, String name) {

		Assertions.assertEquals(
			externalReferenceCode, employeeRole.getExternalReferenceCode());
		Assertions.assertEquals(name, employeeRole.getName());
		Assertions.assertEquals(
			ContactRoleConstants.ATTRIBUTE_VALUE_TYPE_ACCOUNT_WORKER,
			employeeRole.getRoleType());
	}

}
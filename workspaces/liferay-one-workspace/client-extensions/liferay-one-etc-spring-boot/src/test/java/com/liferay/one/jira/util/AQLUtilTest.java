/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.jira.util;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

/**
 * @author Drew Brokke
 */
public class AQLUtilTest {

	@Test
	public void testAndAnyEmpty() {
		AQLUtil.Builder builder = AQLUtil.builder("base");

		builder.andAnyEmpty("Account", "Team", "Team Role");

		Assertions.assertEquals(
			"base AND (\"Account\" IS EMPTY OR \"Team\" IS EMPTY OR \"Team " +
				"Role\" IS EMPTY)",
			builder.build());
	}

	@Test
	public void testAndAnyEmptyRequiresFieldNames() {
		AQLUtil.Builder builder = AQLUtil.builder("base");

		Assertions.assertThrows(
			IllegalArgumentException.class, builder::andAnyEmpty);
	}

	@Test
	public void testAndAnyEmptySingleFieldName() {
		AQLUtil.Builder builder = AQLUtil.builder("base");

		builder.andAnyEmpty("Account");

		Assertions.assertEquals(
			"base AND (\"Account\" IS EMPTY)", builder.build());
	}

	@Test
	public void testAndEqualsBoolean() {
		AQLUtil.Builder builder = AQLUtil.builder("base");

		builder.andEquals(false, "Deleted");

		Assertions.assertEquals(
			"base AND \"Deleted\" = false", builder.build());
	}

	@Test
	public void testAndEqualsString() {
		AQLUtil.Builder builder = AQLUtil.builder("base");

		builder.andEquals("team-key", "Team External Key");

		Assertions.assertEquals(
			"base AND \"Team External Key\" = \"team-key\"", builder.build());
	}

}
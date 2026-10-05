/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.xml;

import com.liferay.petra.string.StringBundler;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-ELEMENT] Element")
public class ElementTest {

	@Test
	public void testWriteEscapesTextContent() {
		Element element = new Element("description");

		element.addText("Tom & Jerry <cartoon>");

		Assertions.assertEquals(
			"<description>Tom &amp; Jerry &lt;cartoon&gt;</description>\n",
			_write(element, ""));
	}

	@Test
	public void testWriteIndentsChildrenOneTabDeeper() {
		Element element = new Element("license");

		Element accountElement = element.addElement("account");

		accountElement.addElement("name");

		element.add(new Element("owner"));

		Assertions.assertEquals(
			"\t<license>\n\t\t<account>\n\t\t\t<name/>\n\t\t</account>\n" +
				"\t\t<owner/>\n\t</license>\n",
			_write(element, "\t"));
	}

	@Test
	public void testWriteSelfClosesEmptyElement() {
		Assertions.assertEquals("<empty/>\n", _write(new Element("empty"), ""));
	}

	@Test
	public void testWriteWritesEmptyTextAsOpenAndCloseTags() {
		Element element = new Element("value");

		element.addText("");

		Assertions.assertEquals("<value></value>\n", _write(element, ""));
	}

	private String _write(Element element, String indent) {
		StringBundler sb = new StringBundler();

		element.write(sb, indent);

		return sb.toString();
	}

}
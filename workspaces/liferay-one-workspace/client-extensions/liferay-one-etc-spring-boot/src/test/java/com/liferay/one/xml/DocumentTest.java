/**
 * SPDX-FileCopyrightText: (c) 2026 Liferay, Inc. https://liferay.com
 * SPDX-License-Identifier: LGPL-2.1-or-later OR LicenseRef-Liferay-DXP-EULA-2.0.0-2023-06
 */

package com.liferay.one.xml;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * @author Ryan Schuhler
 */
@DisplayName("[CLS-DOCUMENT] Document")
public class DocumentTest {

	@Test
	public void testFormattedStringWithoutRootElementWritesOnlyDeclaration() {
		Assertions.assertEquals(
			_DECLARATION,
			new Document(
			).formattedString());
	}

	@Test
	public void testFormattedStringWritesDeclarationAndIndentedRoot() {
		Document document = new Document();

		Element rootElement = document.addElement("root");

		Element childElement = rootElement.addElement("child");

		childElement.addText("value");

		Assertions.assertSame(rootElement, document.getRootElement());
		Assertions.assertEquals(
			_DECLARATION + "<root>\n\t<child>value</child>\n</root>\n",
			document.formattedString());
	}

	@Test
	public void testSetRootElementReplacesRoot() {
		Document document = new Document();

		document.addElement("first");

		Element element = new Element("second");

		document.setRootElement(element);

		Assertions.assertSame(element, document.getRootElement());

		Assertions.assertEquals(
			_DECLARATION + "<second/>\n", document.formattedString());
	}

	private static final String _DECLARATION =
		"<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";

}
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
@DisplayName("[CLS-SAXREADERUTIL] SAXReaderUtil")
public class SAXReaderUtilTest {

	@Test
	public void testCreateDocumentReturnsEmptyDocument() {
		Document document = SAXReaderUtil.createDocument();

		Assertions.assertNull(document.getRootElement());
	}

	@Test
	public void testReadParsesNestedAndSelfClosingElements() {
		Document document = SAXReaderUtil.read(
			"<license><account><name>Acme</name></account><owner/>" +
				"<empty /></license>");

		Assertions.assertEquals(
			_DECLARATION + "<license>\n\t<account>\n\t\t<name>Acme</name>\n" +
				"\t</account>\n\t<owner/>\n\t<empty/>\n</license>\n",
			document.formattedString());
	}

	@Test
	public void testReadReadsTextOnlyForLeafElements() {
		Document document = SAXReaderUtil.read(
			"<parent>\n  ignored\n  <child>kept</child>\n</parent>");

		Assertions.assertEquals(
			_DECLARATION + "<parent>\n\t<child>kept</child>\n</parent>\n",
			document.formattedString());
	}

	@Test
	public void testReadRoundTripsWithWriter() {
		Document document = SAXReaderUtil.createDocument();

		Element rootElement = document.addElement("root");

		Element textElement = rootElement.addElement("text");

		textElement.addText("A & B <c> &amp;");

		rootElement.addElement("empty");

		String xml = document.formattedString();

		Assertions.assertEquals(
			xml,
			SAXReaderUtil.read(
				xml
			).formattedString());
	}

	@Test
	public void testReadSkipsPrologAndUnescapesEntities() {
		Document document = SAXReaderUtil.read(
			"\n  <?xml version=\"1.0\"?>\n<?other instruction?>\n" +
				"<value>a &amp; b &lt;c&gt;</value>");

		Assertions.assertEquals(
			_DECLARATION + "<value>a &amp; b &lt;c&gt;</value>\n",
			document.formattedString());
	}

	private static final String _DECLARATION =
		"<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";

}
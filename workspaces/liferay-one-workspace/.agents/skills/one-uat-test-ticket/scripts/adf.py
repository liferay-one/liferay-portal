#!/usr/bin/env python3

#
# Convert plain comment text to a Jira comment body in Atlassian Document
# Format. A blank line separates blocks. Lines that start with "1." form an
# ordered list, lines that start with "-" form a bullet list, and text in
# backticks becomes inline code.
#
# Usage: adf.py <comment file>
#

import json
import re
import sys


def block(lines):
	if all(re.match(r"\d+\.\s", line) for line in lines):
		return list_node(
			"orderedList", [re.sub(r"^\d+\.\s+", "", line) for line in lines])

	if all(line.startswith("- ") for line in lines):
		return list_node("bulletList", [line[2:] for line in lines])

	return paragraph(" ".join(lines))


def inline(text):
	content = []

	for index, part in enumerate(re.split(r"`([^`]*)`", text)):
		if not part:
			continue

		node = {"text": part, "type": "text"}

		if index % 2:
			node["marks"] = [{"type": "code"}]

		content.append(node)

	return content


def list_node(list_type, items):
	return {
		"content": [
			{"content": [paragraph(item)], "type": "listItem"} for item in items
		],
		"type": list_type,
	}


def main():
	if len(sys.argv) != 2:
		sys.exit("Usage: adf.py <comment file>")

	with open(sys.argv[1], encoding="utf-8") as file:
		text = file.read()

	blocks = []

	for chunk in re.split(r"\n\s*\n", text.strip()):
		lines = [line.strip() for line in chunk.splitlines() if line.strip()]

		if lines:
			blocks.append(block(lines))

	print(
		json.dumps(
			{"body": {"content": blocks, "type": "doc", "version": 1}},
			ensure_ascii=False))


def paragraph(text):
	return {"content": inline(text), "type": "paragraph"}


if __name__ == "__main__":
	main()
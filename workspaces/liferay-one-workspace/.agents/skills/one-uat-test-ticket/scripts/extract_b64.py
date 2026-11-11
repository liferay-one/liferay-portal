#!/usr/bin/env python3

#
# Decode the base64 text between B64START and B64END in lcp_shell.py output.
#
# Usage: extract_b64.py <shell output> <output file>
#

import base64
import re
import sys


def main():
	if len(sys.argv) != 3:
		sys.exit("Usage: extract_b64.py <shell output> <output file>")

	with open(sys.argv[1], encoding="utf-8", errors="replace") as file:
		text = file.read()

	segment = text.split("B64START")[-1].split("B64END")[0]

	segment = re.sub(r"\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\x07]*\x07", "", segment)

	# The first line is the rest of the echoed command

	segment = segment.split("\n", 1)[-1]

	data = "".join(re.findall(r"[A-Za-z0-9+/=]+", segment))

	with open(sys.argv[2], "wb") as file:
		file.write(base64.b64decode(data))


if __name__ == "__main__":
	main()
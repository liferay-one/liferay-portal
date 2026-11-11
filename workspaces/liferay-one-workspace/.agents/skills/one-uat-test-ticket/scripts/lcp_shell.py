#!/usr/bin/env python3

#
# Run shell commands on a one-uat LCP service. lcp shell needs a TTY and an
# instance pick, so drive it from a pseudo terminal.
#
# Usage: lcp_shell.py <service> <command>...
#

import os
import pty
import select
import sys
import time

PROJECT = "exte5a2oneliferay-extuat"


def drain(fd, seconds):
	end = time.time() + seconds

	while time.time() < end:
		ready, _, _ = select.select([fd], [], [], 0.5)

		if not ready:
			continue

		try:
			data = os.read(fd, 65536)
		except OSError:
			return

		sys.stdout.write(data.decode("utf-8", "replace"))
		sys.stdout.flush()


def main():
	if len(sys.argv) < 3:
		sys.exit("Usage: lcp_shell.py <service> <command>...")

	service = sys.argv[1]

	pid, fd = pty.fork()

	if pid == 0:
		os.execvp("lcp", ["lcp", "shell", "-p", PROJECT, "-s", service])

	drain(fd, 15)

	os.write(fd, b"1\r")

	drain(fd, 15)

	for command in sys.argv[2:]:
		os.write(fd, (command + "\r").encode())

		drain(fd, 8)

	os.write(fd, b"exit\r")

	drain(fd, 3)


if __name__ == "__main__":
	main()
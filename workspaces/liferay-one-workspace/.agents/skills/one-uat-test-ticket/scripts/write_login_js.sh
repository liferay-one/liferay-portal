#!/usr/bin/env bash

#
# Write a browser function that signs in to one-uat with ONE_UAT_USER and
# ONE_UAT_PASSWORD. Run it with evaluate_script sourcePath, then delete it.
#
# Usage: write_login_js.sh <output file>
#

set -o errexit
set -o nounset
set -o pipefail

OUTPUT="${1:?Usage: write_login_js.sh <output file>}"

: "${ONE_UAT_USER:?ONE_UAT_USER is not set}"
: "${ONE_UAT_PASSWORD:?ONE_UAT_PASSWORD is not set}"

umask 077

python3 -I - "${OUTPUT}" <<'EOF'
import json
import os
import sys

login = json.dumps(os.environ["ONE_UAT_USER"])
password = json.dumps(os.environ["ONE_UAT_PASSWORD"])

script = f"""() => {{
	const prefix = '_com_liferay_login_web_portlet_LoginPortlet_';

	const form = document.getElementById(prefix + 'loginForm');

	if (!form) {{
		return 'No login form';
	}}

	document.getElementById(prefix + 'login').value = {login};
	document.getElementById(prefix + 'password').value = {password};
	document.getElementById(prefix + 'rememberMe').checked = true;

	form.querySelector('button[type=submit]').click();

	return 'Submitted';
}}
"""

with open(sys.argv[1], "w") as file:
	file.write(script)
EOF

echo "Wrote ${OUTPUT}"
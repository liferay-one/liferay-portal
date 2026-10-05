#!/bin/bash

# Bootstraps the workspace test tooling: creates the workspace .env from the
# template, installs Node dependencies across the yarn workspaces, and
# downloads the Chromium browser Playwright drives. Idempotent — safe to rerun
# on a fresh checkout.

set -o errexit
set -o nounset
set -o pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."

if [ ! -f .env ]
then
	cp .env.example .env
fi

yarn install

yarn workspace @liferay/liferay-one-workspace-tests install:browsers
#!/usr/bin/env bash

cd "$(dirname "${BASH_SOURCE[0]}")"

source ../_common.sh

function main {
	local oauth_application_name=${1:-}

	if [[ -z ${oauth_application_name} ]]
	then
		_die "The OAuth application name was not provided."
	fi

	cd ../..

	touch .env

	sed -E "/^OAUTH_CLIENT_(ID|SECRET)=/d" .env > .env.tmp && mv .env.tmp .env

	local client_id

	client_id=$(_read_route "${oauth_application_name}.oauth2.headless.server.client.id")

	local client_secret

	client_secret=$(_read_route "${oauth_application_name}.oauth2.headless.server.client.secret")

	{
		echo "OAUTH_CLIENT_ID=${client_id}"
		echo "OAUTH_CLIENT_SECRET=${client_secret}"
	} >> .env

	echo "The OAuth credentials were written to .env."
}

function _read_route {
	local file_name="${1}"

	docker exec "${LIFERAY_CONTAINER_NAME}" sh -c "cat /opt/liferay/routes/default/*/${file_name}"
}

main "${@}"
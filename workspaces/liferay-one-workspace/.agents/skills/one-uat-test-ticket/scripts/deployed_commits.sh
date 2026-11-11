#!/usr/bin/env bash

#
# Print the commit of the last successful deploy of each one-uat service. A
# client extension directory maps to the service ID without hyphens, for
# example liferay-one-etc-spring-boot to liferayoneetcspringboot.
#
# Usage: deployed_commits.sh [<service ID>]
#

set -o errexit
set -o nounset
set -o pipefail

PROJECT="exte5a2oneliferay-extuat"

SERVICE_ID="${1:-}"

TOKEN=$(lcp auth token 2> /dev/null | tail -1)

if [ -z "${TOKEN}" ]
then
	echo "Unable to get an LCP token. Run lcp login." >&2

	exit 1
fi

curl \
	--fail \
	--header "Authorization: Bearer ${TOKEN}" \
	--silent \
	--url "https://api.liferay.cloud/projects/${PROJECT}/deployments?limit=500" \
	| jq \
		--arg serviceId "${SERVICE_ID}" \
		--raw-output \
		'
			[.[] | select(.type == "DEPLOY_SUCCEEDED" and ($serviceId == "" or .metadata.serviceId == $serviceId))]
			| group_by(.metadata.serviceId)
			| map(max_by(.createdAt))
			| .[]
			| [
				.metadata.serviceId,
				(.createdAt / 1000 | strftime("%Y-%m-%d %H:%M UTC")),
				("build " + .metadata.buildGroupUid),
				(.build.branch // "-"),
				(
					if (.build.metadata.commit // "") != "" then
						.build.metadata.commit
					else
						(((.build.metadata.commitMessage // "") | capture("(?<sha>[0-9a-f]{7,40})$") | .sha) // "-")
					end
				),
				(.metadata.userName // "-")
			]
			| @tsv
		'
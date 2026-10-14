#!/usr/bin/env bash

#
# Only one batch import runs on the server at a time, for all instances. The
# batch engine shares one instance of each REST resource across companies and
# writes the company and user of a task into its fields, so when two instances
# import at the same time, the items of one are applied as a user of the other
# and fail with "Only the omniadmin can add users to another company". An
# instance creation that overlaps another import never returns.
#
# Hold the lock for each instance creation, client extension deploy, and batch
# import, and for the Spring Boot image build. Hold it only that long: the REST
# calls between imports do not need it.
#
# The lock lives in the Liferay container, so every machine that drives the
# server through the same Docker daemon shares it, and a restart of the
# container clears it. The owner is the host name and the ID of the process
# that sources this file.
#

LOCK_DIR="/tmp/liferay-one-instance.lock"
LOCK_STALE_MINUTES=60

function _lock {
	local elapsed=0
	local owner

	owner="$(hostname) ${$}"

	until docker exec "${LIFERAY_CONTAINER_NAME:-liferay}" mkdir "${LOCK_DIR}" 2> /dev/null
	do
		#
		# Break the lock of a provision that died while it held it: at once
		# when it ran on this machine, and after LOCK_STALE_MINUTES otherwise.
		# A creation request can take 15 minutes, so the limit is much longer.
		#

		local holder

		#
		# The owner file appears just after the directory, and the seed
		# scripts run with errexit.
		#

		holder=$(docker exec "${LIFERAY_CONTAINER_NAME:-liferay}" cat "${LOCK_DIR}/owner" 2> /dev/null || true)

		if { [ "${holder%% *}" == "$(hostname)" ] && ! kill -0 "${holder##* }" 2> /dev/null; } ||
			[ -n "$(docker exec "${LIFERAY_CONTAINER_NAME:-liferay}" find "${LOCK_DIR}" -maxdepth 0 -mmin +${LOCK_STALE_MINUTES} 2> /dev/null)" ]
		then
			docker exec "${LIFERAY_CONTAINER_NAME:-liferay}" rm -f -r "${LOCK_DIR}"

			continue
		fi

		if [[ "${elapsed}" -eq 0 ]]
		then
			echo "Waiting for the batch import that ${holder} runs on the server."
		fi

		if [[ "${elapsed}" -ge 3600 ]]
		then
			echo "Timed out waiting for the lock ${LOCK_DIR} in ${LIFERAY_CONTAINER_NAME:-liferay}, held by ${holder}." >&2

			return 1
		fi

		sleep 5

		elapsed=$((elapsed + 5))
	done

	docker exec "${LIFERAY_CONTAINER_NAME:-liferay}" sh -c "echo '${owner}' > ${LOCK_DIR}/owner"
}

function _unlock {
	#
	# Remove the lock only when this process holds it, so that an error path
	# that did not take the lock cannot free the lock of another process.
	#

	if [ "$(docker exec "${LIFERAY_CONTAINER_NAME:-liferay}" cat "${LOCK_DIR}/owner" 2> /dev/null)" == "$(hostname) ${$}" ]
	then
		docker exec "${LIFERAY_CONTAINER_NAME:-liferay}" rm -f -r "${LOCK_DIR}"
	fi
}

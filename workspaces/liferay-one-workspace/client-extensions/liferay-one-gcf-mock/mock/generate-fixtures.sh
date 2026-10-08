#!/usr/bin/env bash

# Generates the gcf-mock response files. Run by the Dockerfile at image build
# time, so the served JSON is always derived from the data below and none of it
# is committed.
#
# The LDP shapes follow the 0.1.1 Liferay Data Platform Metrics API Contract,
# the Confluence page in the DO space linked from DOPS-3607. The composable
# usage shape follows what ExperienceUsageStrategy reads. The counts are
# invented. Entitlement caps are deliberately absent: those come from the seeded
# orders, so the percentages the UI shows are mock usage over real entitlements.
#
# Usage: ./generate-fixtures.sh <target-dir>

#
# Edit the data below, then rebuild the client extension image.
#
# Each MONTHS row is a month, its Liferay event count, and its Salesforce event
# count. A month left out returns zero counts from event-summary and no bucket
# from event-history, which is how the deliberate 2026-01 and 2026-04 gaps in
# the event history chart work.
#

MONTHS=(
	"2025-10-01 1200 300"
	"2025-11-01 2400 600"
	"2025-12-01 3100 900"
	"2026-02-01 2800 700"
	"2026-03-01 3600 1100"
	"2026-05-01 4200 1300"
	"2026-06-01 4000 1500"
	"2026-07-01 8000 3500"
	"2026-08-01 5000 3000"
	"2026-09-01 1100000 400000"
)

#
# Each COMPOSABLE_MONTHS row is a month of composable usage for any account:
# the month, the client extension vCPU count, and then five byte counts for
# client extension RAM, database storage, document library and backup storage,
# log storage, and network traffic. A month left out returns an empty usage object, which the usage report
# generator reads as no data.
#
# The seeded PaaS Experience project PRJCT-004 is entitled to 7 vCPUs, 2 GiB of
# RAM, 100 GiB of database, 1 TiB of storage, 300 GiB of logs, and 1 TiB of
# traffic. The 2026-08 row stays under every allotment. The 2026-09 row goes
# over on all six, with values that do not land on whole units: 7.25 vCPUs,
# 2.5 GiB of RAM, one byte over 100 GiB of database, 1.5 TiB of storage against
# a 1 TiB allotment, 300.75 GiB of logs, and one byte over 1 TiB of traffic.
#

COMPOSABLE_MONTHS=(
	"2026-08 4.5 1610612736 64424509440 536870912000 214748364800 429496729600"
	"2026-09 7.25 2684354560 107374182401 1649267441664 322927853568 1099511627777"
)

ACTIVE_BATCH_SEGMENTS_COUNT="12"
ACTIVE_REAL_TIME_SEGMENTS_COUNT="3"
API_REQUESTS_COUNT="45000"
CONNECTORS_COUNT="2"

DATA_SOURCE_ID_LIFERAY="101"
DATA_SOURCE_ID_SALESFORCE="102"

PROJECT_NAME="Data Platform Project"
SALESFORCE_PROJECT_ID="PRJCT-028"
WE_DEPLOY_KEY="mock-environment.lfr.cloud"

function main {
	local target_dir="${1}"

	if [ -z "${target_dir}" ]
	then
		echo "Usage: ${0} <target-dir>" >&2

		exit 1
	fi

	mkdir --parents "${target_dir}"

	_write_usage "${target_dir}"

	_write_event_history "${target_dir}"

	local row

	for row in "${MONTHS[@]}"
	do
		set -- ${row}

		_write_event_summary "${target_dir}" "${1}" "${2}" "${3}"
	done

	_write_event_summary_empty "${target_dir}"

	for row in "${COMPOSABLE_MONTHS[@]}"
	do
		set -- ${row}

		_write_composable_usage "${target_dir}" "${1}" "${2}" "${3}" "${4}" "${5}" "${6}" "${7}"
	done

	_write_composable_usage_empty "${target_dir}"

	echo "Generated ${#MONTHS[@]} event-summary files, ${#COMPOSABLE_MONTHS[@]} composable-usage files, event-history.json and usage.json"
}

function _envelope {
	printf '\t"projectName": "%s",\n' "${PROJECT_NAME}"
	printf '\t"salesforceProjectId": "%s",\n' "${SALESFORCE_PROJECT_ID}"
	printf '\t"weDeployKey": "%s"' "${WE_DEPLOY_KEY}"
}

function _event_summary {
	local indent="${1}"
	local liferay_events="${2}"
	local salesforce_events="${3}"

	printf '%s{"dataSourceId": "%s", "dataSourceName": "Liferay", "eventsCount": %s},\n' "${indent}" "${DATA_SOURCE_ID_LIFERAY}" "${liferay_events}"
	printf '%s{"dataSourceId": "%s", "dataSourceName": "Salesforce", "eventsCount": %s}' "${indent}" "${DATA_SOURCE_ID_SALESFORCE}" "${salesforce_events}"
}

function _write_composable_usage {
	local target_dir="${1}"
	local month="${2}"
	local client_extensions_cpu="${3}"
	local client_extensions_ram="${4}"
	local database_storage="${5}"
	local document_library_and_backup_storage="${6}"
	local log_storage="${7}"
	local network_traffic="${8}"

	{
		printf '{\n'
		printf '\t"usage": {\n'
		printf '\t\t"clientExtensionsCPU": %s,\n' "${client_extensions_cpu}"
		printf '\t\t"clientExtensionsRAM": %s,\n' "${client_extensions_ram}"
		printf '\t\t"databaseStorage": %s,\n' "${database_storage}"
		printf '\t\t"documentLibraryAndBackupStorage": %s,\n' "${document_library_and_backup_storage}"
		printf '\t\t"logStorage": %s,\n' "${log_storage}"
		printf '\t\t"networkTraffic": %s\n' "${network_traffic}"
		printf '\t}\n'
		printf '}\n'
	} > "${target_dir}/composable-usage-${month}.json"
}

function _write_composable_usage_empty {
	local target_dir="${1}"

	{
		printf '{\n'
		printf '\t"usage": {}\n'
		printf '}\n'
	} > "${target_dir}/composable-usage-empty.json"
}

function _write_event_history {
	local target_dir="${1}"

	local path="${target_dir}/event-history.json"

	{
		printf '{\n'
		printf '\t"eventHistory": [\n'

		local index=0

		local row

		for row in "${MONTHS[@]}"
		do
			set -- ${row}

			printf '\t\t{\n'
			printf '\t\t\t"date": "%s",\n' "${1}"
			printf '\t\t\t"eventSummary": [\n'

			_event_summary $'\t\t\t\t' "${2}" "${3}"

			printf '\n\t\t\t]\n'

			index=$((index + 1))

			if [ "${index}" -lt "${#MONTHS[@]}" ]
			then
				printf '\t\t},\n'
			else
				printf '\t\t}\n'
			fi
		done

		printf '\t],\n'

		_envelope

		printf '\n}\n'
	} > "${path}"
}

function _write_event_summary {
	local target_dir="${1}"
	local date="${2}"
	local liferay_events="${3}"
	local salesforce_events="${4}"

	{
		printf '{\n'
		printf '\t"eventSummary": [\n'

		_event_summary $'\t\t' "${liferay_events}" "${salesforce_events}"

		printf '\n\t],\n'
		printf '\t"startDate": "%s",\n' "${date}"

		_envelope

		printf '\n}\n'
	} > "${target_dir}/event-summary-${date}.json"
}

function _write_event_summary_empty {
	local target_dir="${1}"

	{
		printf '{\n'
		printf '\t"eventSummary": [],\n'

		_envelope

		printf '\n}\n'
	} > "${target_dir}/event-summary-empty.json"
}

function _write_usage {
	local target_dir="${1}"

	{
		printf '{\n'
		printf '\t"activeBatchSegmentsCount": %s,\n' "${ACTIVE_BATCH_SEGMENTS_COUNT}"
		printf '\t"activeRealTimeSegmentsCount": %s,\n' "${ACTIVE_REAL_TIME_SEGMENTS_COUNT}"
		printf '\t"apiRequestsCount": %s,\n' "${API_REQUESTS_COUNT}"
		printf '\t"connectorsCount": %s,\n' "${CONNECTORS_COUNT}"

		_envelope

		printf '\n}\n'
	} > "${target_dir}/usage.json"
}

main "${@}"
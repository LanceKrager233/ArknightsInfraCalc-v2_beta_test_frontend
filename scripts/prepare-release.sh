#!/usr/bin/env bash
set -euo pipefail

readonly temporary_failure_status=75
readonly production_repository_url="https://github.com/KnightCodeSquareMatrix/ArknightsInfraCalc-v2_beta_test_frontend.git"
readonly production_cache_root="/var/cache/arknights-infra-deploy"

deployment_environment="${1:-}"
release_sha="${2:-}"
expected_tree_sha="${3:-}"
archive_path="${4:-}"
expected_script_sha256="${5:-}"

fail_validation() {
  echo "$1" >&2
  exit 2
}

fail_temporarily() {
  echo "$1" >&2
  exit "$temporary_failure_status"
}

if [[ "$deployment_environment" != "production" && "$deployment_environment" != "development" ]]; then
  fail_validation "Deployment environment must be production or development."
fi
if [[ ! "$release_sha" =~ ^[0-9a-f]{40}$ ]]; then
  fail_validation "Release SHA must be a full lowercase Git commit hash."
fi
if [[ ! "$expected_tree_sha" =~ ^[0-9a-f]{40}$ ]]; then
  fail_validation "Tree SHA must be a full lowercase Git object hash."
fi
if [[ ! "$expected_script_sha256" =~ ^[0-9a-f]{64}$ ]]; then
  fail_validation "Release preparation script hash must be a SHA-256 digest."
fi

for required_command in flock git gzip id mktemp mv readlink realpath sed sha256sum stat timeout; do
  command -v "$required_command" >/dev/null || fail_validation "Required command is unavailable: $required_command"
done

actual_script_sha256="$(sha256sum "$0" | cut -d ' ' -f 1)"
if [[ "$actual_script_sha256" != "$expected_script_sha256" ]]; then
  fail_validation "The reviewed release preparation script does not match the server-installed helper."
fi

export GIT_TERMINAL_PROMPT=0
export GIT_HTTP_LOW_SPEED_LIMIT=1024
export GIT_HTTP_LOW_SPEED_TIME=20

test_mode="${ARKNIGHTS_INFRA_PREPARE_TEST_MODE:-0}"
seed_release_dir="${ARKNIGHTS_INFRA_SEED_RELEASE_DIR:-}"
retry_delay_seconds=5

if [[ "$test_mode" == "1" ]]; then
  if [[ "$(realpath "$0")" == "/usr/local/sbin/arknights-infra-prepare-release" ]]; then
    fail_validation "The server-installed release helper cannot run in test mode."
  fi
  test_root="${ARKNIGHTS_INFRA_PREPARE_TEST_ROOT:-}"
  repository_url="${ARKNIGHTS_INFRA_PREPARE_TEST_REPOSITORY_URL:-}"
  cache_root="${ARKNIGHTS_INFRA_PREPARE_TEST_CACHE_ROOT:-}"
  retry_delay_seconds="${ARKNIGHTS_INFRA_PREPARE_TEST_RETRY_DELAY_SECONDS:-0}"
  [[ -n "$test_root" && -d "$test_root" && ! -L "$test_root" ]] || fail_validation "Test root must be an existing real directory."
  [[ -n "$repository_url" ]] || fail_validation "Test repository URL is required."
  [[ -n "$cache_root" ]] || fail_validation "Test cache root is required."
  [[ "$retry_delay_seconds" =~ ^[0-9]+$ ]] || fail_validation "Test retry delay must be an integer."

  test_root="$(realpath "$test_root")"
  if [[ "$test_root" == "/tmp" ]]; then
    fail_validation "Test mode requires an isolated directory below /tmp."
  fi
  cache_root="$(realpath -m "$cache_root")"
  case "$cache_root" in
    "$test_root"/*) ;;
    *) fail_validation "Test cache must stay inside the test root." ;;
  esac
  if [[ -n "$seed_release_dir" ]]; then
    seed_release_dir="$(realpath "$seed_release_dir")"
    case "$seed_release_dir" in
      "$test_root"/*) ;;
      *) fail_validation "Test seed release must stay inside the test root." ;;
    esac
  fi
  expected_archive_path="$test_root/arknights-infra-${deployment_environment}-${release_sha}.tar.gz"
elif [[ "$test_mode" == "0" ]]; then
  if [[ -n "${ARKNIGHTS_INFRA_PREPARE_TEST_ROOT:-}${ARKNIGHTS_INFRA_PREPARE_TEST_REPOSITORY_URL:-}${ARKNIGHTS_INFRA_PREPARE_TEST_CACHE_ROOT:-}${ARKNIGHTS_INFRA_PREPARE_TEST_RETRY_DELAY_SECONDS:-}" ]]; then
    fail_validation "Test overrides require ARKNIGHTS_INFRA_PREPARE_TEST_MODE=1."
  fi
  repository_url="$production_repository_url"
  cache_root="$production_cache_root"
  expected_archive_path="/tmp/arknights-infra-${deployment_environment}-${release_sha}.tar.gz"
  if [[ -n "$seed_release_dir" && "$seed_release_dir" != "/opt/arknights-infra/current" ]]; then
    fail_validation "Production cache seeding may only use /opt/arknights-infra/current."
  fi
else
  fail_validation "ARKNIGHTS_INFRA_PREPARE_TEST_MODE must be 0 or 1."
fi

if [[ "$archive_path" != "$expected_archive_path" ]]; then
  fail_validation "Release archive path does not match the verified commit and environment."
fi
if [[ ! -d "$cache_root" || -L "$cache_root" ]]; then
  fail_validation "Deployment cache root must be provisioned as a real directory: $cache_root"
fi
if [[ "$(stat -c '%U' "$cache_root")" != "$(id -un)" ]]; then
  fail_validation "Deployment cache root must be owned by the deployment user."
fi
cache_mode="$(stat -c '%a' "$cache_root")"
cache_mode_decimal=$((8#$cache_mode))
if (( (cache_mode_decimal & 0022) != 0 )); then
  fail_validation "Deployment cache root must not be writable by group or other users."
fi

repository_path="$cache_root/repository.git"
lock_path="$cache_root/prepare.lock"
incoming_ref="refs/arknights-infra/incoming/${deployment_environment}"
environment_ref="refs/arknights-infra/environments/${deployment_environment}"
temporary_archive=""

cleanup() {
  if [[ -n "$temporary_archive" ]]; then
    rm -f -- "$temporary_archive"
  fi
}
trap cleanup EXIT

exec 9>"$lock_path" || fail_temporarily "Unable to open the deployment cache lock."
if ! flock -w 60 9; then
  fail_temporarily "Timed out waiting for the deployment cache lock."
fi

if [[ -e "$repository_path" && ( ! -d "$repository_path" || -L "$repository_path" ) ]]; then
  fail_validation "Deployment repository cache must be a real directory."
fi
if [[ ! -d "$repository_path" ]]; then
  initializing_repository="$cache_root/.repository.git.init.$$"
  rm -rf -- "$initializing_repository"
  if ! git init --bare "$initializing_repository" >/dev/null; then
    fail_temporarily "Unable to initialize the deployment repository cache."
  fi
  if ! git --git-dir="$initializing_repository" remote add origin "$repository_url"; then
    rm -rf -- "$initializing_repository"
    fail_temporarily "Unable to configure the deployment repository origin."
  fi
  if ! mv "$initializing_repository" "$repository_path"; then
    rm -rf -- "$initializing_repository"
    fail_temporarily "Unable to activate the deployment repository cache."
  fi
fi
if ! git --git-dir="$repository_path" rev-parse --is-bare-repository >/dev/null 2>&1; then
  fail_validation "Deployment repository cache is not a bare Git repository."
fi
configured_origin="$(git --git-dir="$repository_path" remote get-url origin 2>/dev/null || true)"
if [[ "$configured_origin" != "$repository_url" ]]; then
  fail_validation "Deployment repository cache has an unexpected origin."
fi

fetch_release() {
  local fetch_mode="$1"
  local attempt
  local -a filter_args
  filter_args=(--no-filter)
  if [[ "$fetch_mode" == "metadata" ]]; then
    filter_args=(--filter=blob:none)
  elif [[ "$fetch_mode" == "refetch" ]]; then
    filter_args=(--refetch --no-filter)
  fi

  for attempt in 1 2 3; do
    if timeout 90 git --git-dir="$repository_path" -c protocol.version=2 fetch \
      --no-tags \
      --force \
      --depth=2 \
      "${filter_args[@]}" \
      origin \
      "$release_sha:$incoming_ref"; then
      return 0
    fi
    if (( attempt < 3 && retry_delay_seconds > 0 )); then
      sleep "$retry_delay_seconds"
    fi
  done
  return 1
}

commit_is_complete() {
  local missing_objects
  git --git-dir="$repository_path" cat-file -e "${release_sha}^{commit}" 2>/dev/null || return 1
  missing_objects="$(git --git-dir="$repository_path" rev-list --objects --missing=print "$release_sha" 2>/dev/null)" || return 1
  ! grep -q '^?' <<<"$missing_objects"
}

validate_tree() {
  local actual_tree_sha
  actual_tree_sha="$(git --git-dir="$repository_path" rev-parse "${release_sha}^{tree}" 2>/dev/null)" || fail_validation "Fetched release is not a commit."
  if [[ "$actual_tree_sha" != "$expected_tree_sha" ]]; then
    fail_validation "Fetched release tree does not match the verified commit."
  fi
}

cache_hit=0
cache_seeded=0
if commit_is_complete; then
  cache_hit=1
else
  if [[ -n "$seed_release_dir" ]]; then
    if [[ "$test_mode" == "0" ]]; then
      resolved_seed_release_dir="$(readlink -f "$seed_release_dir")"
      case "$resolved_seed_release_dir" in
        /opt/arknights-infra/releases/*) ;;
        *) fail_validation "Production seed release must resolve inside the production releases directory." ;;
      esac
      seed_release_dir="$resolved_seed_release_dir"
    fi
    [[ -d "$seed_release_dir" && ! -L "$seed_release_dir" ]] || fail_validation "Seed release must resolve to a real directory."

    if ! git --git-dir="$repository_path" cat-file -e "${release_sha}^{commit}" 2>/dev/null; then
      fetch_release metadata || fail_temporarily "Unable to fetch release metadata for cache seeding."
    fi
    validate_tree

    imported_blob_count=0
    remote_blob_count=0
    while IFS= read -r -d '' tree_entry; do
      metadata="${tree_entry%%$'\t'*}"
      tracked_path="${tree_entry#*$'\t'}"
      read -r file_mode object_type expected_blob_sha <<<"$metadata"
      if [[ "$object_type" != "blob" || ( "$file_mode" != "100644" && "$file_mode" != "100755" ) ]]; then
        fail_validation "Cache seeding only supports regular tracked files."
      fi
      case "$tracked_path" in
        /*|../*|*/../*) fail_validation "Seed release contains an unsafe tracked path." ;;
      esac
      seed_file="$seed_release_dir/$tracked_path"
      if [[ -f "$seed_file" && ! -L "$seed_file" ]]; then
        actual_blob_sha="$(git --git-dir="$repository_path" hash-object --stdin < "$seed_file")"
        if [[ "$actual_blob_sha" == "$expected_blob_sha" ]]; then
          git --git-dir="$repository_path" hash-object -w --stdin < "$seed_file" >/dev/null
          imported_blob_count=$((imported_blob_count + 1))
          continue
        fi
      fi
      remote_blob_count=$((remote_blob_count + 1))
    done < <(git --git-dir="$repository_path" ls-tree -r -z "$release_sha")

    missing_object_ids="$(git --git-dir="$repository_path" rev-list --objects --missing=print "$release_sha" | sed -n 's/^?//p')"
    if [[ -n "$missing_object_ids" ]]; then
      if ! printf '%s\n' "$missing_object_ids" | timeout 90 git --git-dir="$repository_path" cat-file --batch-check='%(objectname) %(objecttype)' >/dev/null; then
        fail_temporarily "Unable to fetch tracked files that differ from the seed release."
      fi
    fi

    git --git-dir="$repository_path" config --unset-all remote.origin.promisor 2>/dev/null || true
    git --git-dir="$repository_path" config --unset-all remote.origin.partialclonefilter 2>/dev/null || true
    if ! commit_is_complete; then
      fail_validation "Seed release did not provide every Git object required by the commit."
    fi
    cache_seeded=1
    echo "Seeded deployment cache imported_blobs=$imported_blob_count remote_blobs=$remote_blob_count"
  else
    fetch_release full || fail_temporarily "Unable to fetch the verified release from GitHub."
    if ! commit_is_complete; then
      fetch_release refetch || fail_temporarily "Unable to complete the verified release object graph."
    fi
    if ! commit_is_complete; then
      fail_temporarily "Verified release still has missing Git objects after refetch."
    fi
  fi
fi

validate_tree
if ! git --git-dir="$repository_path" update-ref "$environment_ref" "$release_sha"; then
  fail_temporarily "Unable to update the deployment cache environment reference."
fi
git --git-dir="$repository_path" update-ref -d "$incoming_ref" 2>/dev/null || true

temporary_archive="$(mktemp "${archive_path}.tmp.XXXXXX")" || fail_temporarily "Unable to allocate a temporary release archive."
if ! git --git-dir="$repository_path" archive --format=tar "$release_sha" | gzip -n > "$temporary_archive"; then
  fail_temporarily "Unable to build the release archive from the verified commit."
fi
if ! gzip -t "$temporary_archive"; then
  fail_temporarily "Generated release archive failed gzip validation."
fi
chmod 0600 "$temporary_archive"
archive_bytes="$(stat -c '%s' "$temporary_archive")"
if ! mv -f -- "$temporary_archive" "$archive_path"; then
  fail_temporarily "Unable to activate the generated release archive."
fi
temporary_archive=""

git --git-dir="$repository_path" gc --auto >/dev/null 2>&1 || echo "Warning: deployment cache maintenance was skipped." >&2
echo "Prepared release environment=$deployment_environment sha=$release_sha cache_hit=$cache_hit cache_seeded=$cache_seeded archive_bytes=$archive_bytes"

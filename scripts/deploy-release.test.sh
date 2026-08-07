#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
helper="$repository_root/scripts/deploy-release.sh"
helper_sha256="$(sha256sum "$helper" | cut -d ' ' -f 1)"
test_root="$(mktemp -d)"
trap 'rm -rf -- "$test_root"' EXIT

current_sha="1111111111111111111111111111111111111111"
previous_sha="2222222222222222222222222222222222222222"
older_sha="3333333333333333333333333333333333333333"
oldest_sha="4444444444444444444444444444444444444444"
new_sha="9999999999999999999999999999999999999999"

create_complete_release() {
  local root="$1"
  local name="$2"
  local sha="$3"
  mkdir -p "$root/releases/$name/.next"
  printf '%s\n' "$sha" > "$root/releases/$name/.release-sha"
  printf 'completed\n' > "$root/releases/$name/.next/BUILD_ID"
  printf '%s\n' "$name" > "$root/releases/$name/content.txt"
}

setup_fixture() {
  local fixture_name="$1"
  active_fixture="$fixture_name"
  fixture_root="$test_root/$fixture_name"
  app_root="$fixture_root/opt/arknights-infra-dev"
  releases_root="$app_root/releases"
  shared_root="$app_root/shared"
  archive_root="$fixture_root/tmp"
  current_release="$releases_root/20000104000000-111111111111"
  previous_release="$releases_root/20000103000000-2222222"
  older_release="$releases_root/20000102000000-333333333333"
  oldest_release="$releases_root/20000101000000-4444444"
  incomplete_release="$releases_root/19991231000000-5555555"
  invalid_release="$releases_root/19991230000000-6666666"
  symlink_release="$releases_root/19991229000000-7777777"
  unknown_release="$releases_root/operator-notes"
  archive_path="$archive_root/arknights-infra-development-${new_sha}.tar.gz"

  mkdir -p "$releases_root" "$shared_root" "$archive_root" "$fixture_root/payload" "$fixture_root/outside" "$fixture_root/var/lib/arknights-infra-dev"
  create_complete_release "$app_root" "$(basename "$current_release")" "$current_sha"
  create_complete_release "$app_root" "$(basename "$previous_release")" "$previous_sha"
  create_complete_release "$app_root" "$(basename "$older_release")" "$older_sha"
  create_complete_release "$app_root" "$(basename "$oldest_release")" "$oldest_sha"
  mkdir "$incomplete_release" "$invalid_release" "$unknown_release"
  mkdir "$invalid_release/.next"
  printf '%s\n' "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" > "$invalid_release/.release-sha"
  printf 'completed\n' > "$invalid_release/.next/BUILD_ID"
  ln -s "$fixture_root/outside" "$symlink_release"
  ln -s "$current_release" "$app_root/current"
  printf 'development\n' > "$shared_root/deployment-environment"
  printf 'keep-authorization\n' > "$shared_root/authorization-state"
  printf 'keep-persistent-data\n' > "$fixture_root/var/lib/arknights-infra-dev/state"
  printf '{"name":"deploy-fixture","private":true}\n' > "$fixture_root/payload/package.json"
  tar -czf "$archive_path" -C "$fixture_root/payload" .
}

run_deploy() {
  env \
    ARKNIGHTS_INFRA_DEPLOY_TEST_MODE=1 \
    ARKNIGHTS_INFRA_DEPLOY_TEST_ROOT="$fixture_root" \
    ARKNIGHTS_INFRA_DEPLOY_TEST_FAIL_STAGE="${1:-none}" \
    ARKNIGHTS_INFRA_DEPLOY_TEST_AVAILABLE_KIB="${2:-4194304}" \
    bash "$helper" \
      development \
      "$new_sha" \
      "$archive_path" \
      "$app_root" \
      arknights-infra-dev \
      test-runner \
      4275 \
      "${3:-}" \
      1 \
      1 \
      "$helper_sha256"
}

assert_failure() {
  local expected_stage="$1"
  local available_kib="${2:-4194304}"
  local public_url="${3:-}"
  set +e
  run_deploy "$expected_stage" "$available_kib" "$public_url" >/dev/null 2>&1
  actual_status=$?
  set -e
  if [[ "$actual_status" -eq 0 ]]; then
    echo "Expected deployment failure for $active_fixture at stage $expected_stage." >&2
    exit 1
  fi
}

count_valid_releases() {
  local candidate suffix marker count=0
  shopt -s nullglob
  for candidate in "$releases_root"/*; do
    [[ -d "$candidate" && ! -L "$candidate" ]] || continue
    if [[ "$(basename "$candidate")" =~ ^[0-9]{14}-([0-9a-f]{7,12})$ ]]; then
      suffix="${BASH_REMATCH[1]}"
    else
      continue
    fi
    [[ -f "$candidate/.release-sha" && ! -L "$candidate/.release-sha" ]] || continue
    [[ -d "$candidate/.next" && ! -L "$candidate/.next" ]] || continue
    [[ -f "$candidate/.next/BUILD_ID" && ! -L "$candidate/.next/BUILD_ID" ]] || continue
    marker="$(tr -d '[:space:]' < "$candidate/.release-sha")"
    if [[ "$marker" =~ ^[0-9a-f]{40}$ && "$marker" == "$suffix"* ]]; then
      count=$((count + 1))
    fi
  done
  shopt -u nullglob
  printf '%s\n' "$count"
}

assert_fixture_safety() {
  test -f "$shared_root/authorization-state"
  test "$(cat "$shared_root/authorization-state")" = "keep-authorization"
  test -f "$fixture_root/var/lib/arknights-infra-dev/state"
  test "$(cat "$fixture_root/var/lib/arknights-infra-dev/state")" = "keep-persistent-data"
  test -d "$invalid_release"
  test -L "$symlink_release"
  test -d "$unknown_release"
}

setup_fixture success
run_deploy none 4194304
test "$(cat "$app_root/current/.release-sha")" = "$new_sha"
test "$(count_valid_releases)" -eq 3
test ! -e "$incomplete_release"
test ! -e "$oldest_release"
test ! -e "$older_release"
test ! -e "$archive_path"
assert_fixture_safety

setup_fixture build-failure
assert_failure build
test "$(readlink -f "$app_root/current")" = "$current_release"
test "$(count_valid_releases)" -eq 3
test -z "$(find "$releases_root" -mindepth 1 -maxdepth 1 -type d -name "*-${new_sha:0:12}" -print -quit)"
test ! -e "$archive_path"
assert_fixture_safety

setup_fixture extraction-failure
tar -cf "$fixture_root/corrupt.tar" -C "$fixture_root/payload" .
printf X | dd of="$fixture_root/corrupt.tar" bs=1 seek=0 count=1 conv=notrunc status=none
gzip -n < "$fixture_root/corrupt.tar" > "$archive_path"
assert_failure none
test "$(readlink -f "$app_root/current")" = "$current_release"
test "$(count_valid_releases)" -eq 3
test -z "$(find "$releases_root" -mindepth 1 -maxdepth 1 -type d -name "*-${new_sha:0:12}" -print -quit)"
test ! -e "$archive_path"
assert_fixture_safety

setup_fixture health-failure
assert_failure internal-health
test "$(readlink -f "$app_root/current")" = "$current_release"
test "$(count_valid_releases)" -eq 3
test -z "$(find "$releases_root" -mindepth 1 -maxdepth 1 -type d -name "*-${new_sha:0:12}" -print -quit)"
test ! -e "$archive_path"
assert_fixture_safety

setup_fixture restart-failure
assert_failure restart
test "$(readlink -f "$app_root/current")" = "$current_release"
test "$(count_valid_releases)" -eq 3
test -z "$(find "$releases_root" -mindepth 1 -maxdepth 1 -type d -name "*-${new_sha:0:12}" -print -quit)"
test ! -e "$archive_path"
assert_fixture_safety

setup_fixture public-health-failure
assert_failure public-health 4194304 https://example.invalid/api/health
test "$(readlink -f "$app_root/current")" = "$current_release"
test "$(count_valid_releases)" -eq 3
test -z "$(find "$releases_root" -mindepth 1 -maxdepth 1 -type d -name "*-${new_sha:0:12}" -print -quit)"
test ! -e "$archive_path"
assert_fixture_safety

setup_fixture low-space
assert_failure none 1024
test "$(readlink -f "$app_root/current")" = "$current_release"
test "$(count_valid_releases)" -eq 3
test -z "$(find "$releases_root" -mindepth 1 -maxdepth 1 -type d -name "*-${new_sha:0:12}" -print -quit)"
test ! -e "$archive_path"
assert_fixture_safety

echo "Release deployment integration tests passed."

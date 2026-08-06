#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
helper="$repository_root/scripts/prepare-release.sh"
helper_sha256="$(sha256sum "$helper" | cut -d ' ' -f 1)"
test_root="$(mktemp -d)"
trap 'rm -rf -- "$test_root"' EXIT

source_repository="$test_root/source"
origin_repository="$test_root/origin.git"
seed_release="$test_root/seed-release"
cache_root="$test_root/cache"

git init -b main "$source_repository" >/dev/null
git -C "$source_repository" config user.name "Deploy Test"
git -C "$source_repository" config user.email "deploy-test@example.invalid"
mkdir -p "$source_repository/public/images" "$source_repository/src"
dd if=/dev/zero of="$source_repository/public/images/removed-before-seed.bin" bs=1024 count=256 status=none
git -C "$source_repository" add .
git -C "$source_repository" commit -m "seed parent" >/dev/null
removed_parent_blob="$(git -C "$source_repository" rev-parse 'HEAD:public/images/removed-before-seed.bin')"
rm "$source_repository/public/images/removed-before-seed.bin"
dd if=/dev/zero of="$source_repository/public/images/unchanged.bin" bs=1024 count=512 status=none
printf 'first\n' > "$source_repository/src/current.txt"
printf 'remove me\n' > "$source_repository/src/remove.txt"
git -C "$source_repository" add .
git -C "$source_repository" commit -m "seed" >/dev/null
seed_sha="$(git -C "$source_repository" rev-parse HEAD)"
seed_tree="$(git -C "$source_repository" rev-parse 'HEAD^{tree}')"

git clone --bare "$source_repository" "$origin_repository" >/dev/null 2>&1
git --git-dir="$origin_repository" config uploadpack.allowFilter true
mkdir -p "$seed_release" "$cache_root"
git -C "$source_repository" archive "$seed_sha" | tar -x -C "$seed_release"
printf 'modified by a production build\n' > "$seed_release/src/current.txt"

run_helper() {
  local environment="$1"
  local sha="$2"
  local tree="$3"
  local archive="$4"
  shift 4
  env \
    ARKNIGHTS_INFRA_PREPARE_TEST_MODE=1 \
    ARKNIGHTS_INFRA_PREPARE_TEST_ROOT="$test_root" \
    ARKNIGHTS_INFRA_PREPARE_TEST_REPOSITORY_URL="$origin_repository" \
    ARKNIGHTS_INFRA_PREPARE_TEST_CACHE_ROOT="$cache_root" \
    ARKNIGHTS_INFRA_PREPARE_TEST_RETRY_DELAY_SECONDS=0 \
    "$@" \
    "$helper" "$environment" "$sha" "$tree" "$archive" "$helper_sha256"
}

assert_status() {
  local expected_status="$1"
  shift
  set +e
  "$@" >/dev/null 2>&1
  actual_status=$?
  set -e
  if [[ "$actual_status" -ne "$expected_status" ]]; then
    echo "Expected status $expected_status, received $actual_status: $*" >&2
    exit 1
  fi
}

different_hash() {
  local value="$1"
  if [[ "${value: -1}" == "0" ]]; then
    printf '%s1\n' "${value%?}"
  else
    printf '%s0\n' "${value%?}"
  fi
}

seed_archive="$test_root/arknights-infra-production-${seed_sha}.tar.gz"
run_helper production "$seed_sha" "$seed_tree" "$seed_archive" \
  ARKNIGHTS_INFRA_SEED_RELEASE_DIR="$seed_release"
expected_tar_sha="$(git -C "$source_repository" archive --format=tar "$seed_sha" | sha256sum | cut -d ' ' -f 1)"
actual_tar_sha="$(gzip -dc "$seed_archive" | sha256sum | cut -d ' ' -f 1)"
test "$actual_tar_sha" = "$expected_tar_sha"
test "$(stat -c '%a' "$seed_archive")" = "644"
if git --git-dir="$cache_root/repository.git" cat-file -e "$removed_parent_blob" 2>/dev/null; then
  echo "Seed metadata unexpectedly included a blob reachable only from the parent commit." >&2
  exit 1
fi

printf 'second\n' > "$source_repository/src/current.txt"
rm "$source_repository/src/remove.txt"
printf 'added\n' > "$source_repository/src/added.txt"
git -C "$source_repository" add -A
git -C "$source_repository" commit -m "incremental" >/dev/null
incremental_sha="$(git -C "$source_repository" rev-parse HEAD)"
incremental_tree="$(git -C "$source_repository" rev-parse 'HEAD^{tree}')"
git -C "$source_repository" push "$origin_repository" main >/dev/null

incremental_archive="$test_root/arknights-infra-development-${incremental_sha}.tar.gz"
run_helper development "$incremental_sha" "$incremental_tree" "$incremental_archive"
expected_tar_sha="$(git -C "$source_repository" archive --format=tar "$incremental_sha" | sha256sum | cut -d ' ' -f 1)"
actual_tar_sha="$(gzip -dc "$incremental_archive" | sha256sum | cut -d ' ' -f 1)"
test "$actual_tar_sha" = "$expected_tar_sha"
test "$(stat -c '%a' "$incremental_archive")" = "644"
test "$(git --git-dir="$cache_root/repository.git" rev-parse refs/arknights-infra/environments/development)" = "$incremental_sha"
test "$(git --git-dir="$cache_root/repository.git" cat-file -p "$incremental_sha:public/images/unchanged.bin" | sha256sum | cut -d ' ' -f 1)" = \
  "$(sha256sum "$source_repository/public/images/unchanged.bin" | cut -d ' ' -f 1)"

production_archive="$test_root/arknights-infra-production-${incremental_sha}.tar.gz"
rm -f "$incremental_archive"
run_helper production "$incremental_sha" "$incremental_tree" "$production_archive" &
production_pid=$!
run_helper development "$incremental_sha" "$incremental_tree" "$incremental_archive" &
development_pid=$!
wait "$production_pid"
wait "$development_pid"
gzip -t "$production_archive" "$incremental_archive"

assert_status 2 run_helper staging "$incremental_sha" "$incremental_tree" "$incremental_archive"
assert_status 2 run_helper development "${incremental_sha%?}x" "$incremental_tree" "$incremental_archive"
assert_status 2 run_helper development "$incremental_sha" "$(different_hash "$incremental_tree")" "$incremental_archive"
assert_status 2 run_helper development "$incremental_sha" "$incremental_tree" "$test_root/wrong.tar.gz"

set +e
env \
  ARKNIGHTS_INFRA_PREPARE_TEST_MODE=1 \
  ARKNIGHTS_INFRA_PREPARE_TEST_ROOT="$test_root" \
  ARKNIGHTS_INFRA_PREPARE_TEST_REPOSITORY_URL="$origin_repository" \
  ARKNIGHTS_INFRA_PREPARE_TEST_CACHE_ROOT="$cache_root" \
  "$helper" development "$incremental_sha" "$incremental_tree" "$incremental_archive" "$(different_hash "$helper_sha256")" >/dev/null 2>&1
bad_hash_status=$?
set -e
test "$bad_hash_status" -eq 2

git -C "$source_repository" commit --allow-empty -m "unavailable" >/dev/null
unavailable_sha="$(git -C "$source_repository" rev-parse HEAD)"
unavailable_tree="$(git -C "$source_repository" rev-parse 'HEAD^{tree}')"
unavailable_cache="$test_root/unavailable-cache"
mkdir "$unavailable_cache"
set +e
env \
  ARKNIGHTS_INFRA_PREPARE_TEST_MODE=1 \
  ARKNIGHTS_INFRA_PREPARE_TEST_ROOT="$test_root" \
  ARKNIGHTS_INFRA_PREPARE_TEST_REPOSITORY_URL="$test_root/missing-origin.git" \
  ARKNIGHTS_INFRA_PREPARE_TEST_CACHE_ROOT="$unavailable_cache" \
  ARKNIGHTS_INFRA_PREPARE_TEST_RETRY_DELAY_SECONDS=0 \
  "$helper" development "$unavailable_sha" "$unavailable_tree" \
  "$test_root/arknights-infra-development-${unavailable_sha}.tar.gz" "$helper_sha256" >/dev/null 2>&1
unavailable_status=$?
set -e
test "$unavailable_status" -eq 75

grep -Fq 'if [[ "$prepare_status" -eq 75 ]]' "$repository_root/.github/workflows/deploy.yml"
grep -Fq 'elif [[ "$prepare_status" -ne 0 ]]' "$repository_root/.github/workflows/deploy.yml"

echo "Release preparation integration tests passed."

#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  iqhost-release.sh activate <app-root> <release.tar.gz> [staging|production]
  iqhost-release.sh rollback <app-root> [staging|production]
  iqhost-release.sh status <app-root>
EOF
}

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

require_app_root() {
  local app_root="$1"
  local expected_env="$2"
  local marker="$app_root/.deployment-env"

  [[ "$app_root" == /* ]] || fail "app root must be an absolute path"
  [[ -d "$app_root" ]] || fail "app root does not exist: $app_root"
  [[ -f "$marker" ]] || fail "missing deployment marker: $marker"
  [[ "$(tr -d '\r\n' < "$marker")" == "$expected_env" ]] || fail "deployment marker does not match $expected_env"
  [[ -f "$app_root/server.cjs" ]] || fail "missing stable Passenger startup file: $app_root/server.cjs"

  mkdir -p "$app_root/releases" "$app_root/incoming" "$app_root/tmp"
}

restart_passenger() {
  local app_root="$1"
  mkdir -p "$app_root/tmp"
  touch "$app_root/tmp/restart.txt"
}

replace_symlink_atomically() {
  local source_link="$1"
  local target_link="$2"

  if [[ "$(uname -s)" == "Darwin" ]]; then
    mv -fh "$source_link" "$target_link"
  else
    mv -Tf "$source_link" "$target_link"
  fi
}

activate_release() {
  local app_root="$1"
  local archive="$2"
  local expected_env="$3"
  local listing
  local build_id
  local release_dir
  local extract_dir
  local previous_target=""
  local next_link

  require_app_root "$app_root" "$expected_env"
  [[ -f "$archive" ]] || fail "release archive does not exist: $archive"

  listing="$(mktemp)"
  trap 'rm -f "$listing"' RETURN
  tar -tzf "$archive" > "$listing"

  grep -qx '.next/BUILD_ID' "$listing" || fail "archive is missing .next/BUILD_ID"
  grep -qx 'package.json' "$listing" || fail "archive is missing package.json"
  grep -q '^node_modules/next/' "$listing" || fail "archive is missing Next.js runtime"
  grep -q '^public/' "$listing" || fail "archive is missing public assets"

  if grep -Eq '(^|/)\.\.(/|$)|^/' "$listing"; then
    fail "archive contains an unsafe path"
  fi
  if grep -Eq '(^|/)(\.env|\.env\.|\.git)(/|$)' "$listing"; then
    fail "archive contains environment or git data"
  fi
  if grep -Eq '(^|/)prisma/migrations(/|$)' "$listing"; then
    fail "archive unexpectedly contains database migrations"
  fi
  if grep -qx 'server.cjs' "$listing"; then
    fail "release archive must not replace the stable Passenger startup file"
  fi

  build_id="$(tar -xOzf "$archive" .next/BUILD_ID | tr -d '\r\n')"
  [[ "$build_id" =~ ^[A-Za-z0-9_-]{5,128}$ ]] || fail "invalid BUILD_ID in archive"

  release_dir="$app_root/releases/$build_id"
  if [[ ! -d "$release_dir" ]]; then
    extract_dir="$app_root/releases/.extract-$build_id-$$"
    rm -rf "$extract_dir"
    mkdir -p "$extract_dir"
    tar -xzf "$archive" -C "$extract_dir"
    [[ "$(tr -d '\r\n' < "$extract_dir/.next/BUILD_ID")" == "$build_id" ]] || fail "extracted BUILD_ID mismatch"
    mv "$extract_dir" "$release_dir"
  fi

  if [[ -L "$app_root/current" ]]; then
    previous_target="$(realpath "$app_root/current")"
  elif [[ -e "$app_root/current" ]]; then
    fail "$app_root/current exists but is not a symlink"
  fi

  if [[ -n "$previous_target" ]]; then
    case "$previous_target" in
      "$(realpath "$app_root")"/releases/*) printf '%s\n' "$previous_target" > "$app_root/.previous-release" ;;
      *) fail "current release points outside $app_root/releases" ;;
    esac
  else
    rm -f "$app_root/.previous-release"
  fi

  next_link="$app_root/.current-$build_id.next"
  rm -f "$next_link"
  ln -s "$release_dir" "$next_link"
  replace_symlink_atomically "$next_link" "$app_root/current"
  [[ "$(realpath "$app_root/current")" == "$(realpath "$release_dir")" ]] || fail "failed to activate release"

  restart_passenger "$app_root"
  echo "Activated release $build_id"
  if [[ -n "$previous_target" ]]; then
    echo "Previous release: $previous_target"
  fi
}

rollback_release() {
  local app_root="$1"
  local expected_env="$2"
  local previous_file="$app_root/.previous-release"
  local previous_target
  local next_link="$app_root/.current-rollback.next"

  require_app_root "$app_root" "$expected_env"
  [[ -f "$previous_file" ]] || fail "no previous release recorded"
  previous_target="$(tr -d '\r\n' < "$previous_file")"
  [[ -d "$previous_target" ]] || fail "previous release no longer exists: $previous_target"
  case "$previous_target" in
    "$(realpath "$app_root")"/releases/*) ;;
    *) fail "previous release points outside $app_root/releases" ;;
  esac

  rm -f "$next_link"
  ln -s "$previous_target" "$next_link"
  replace_symlink_atomically "$next_link" "$app_root/current"
  restart_passenger "$app_root"
  echo "Rolled back to $(basename "$previous_target")"
}

show_status() {
  local app_root="$1"
  [[ "$app_root" == /* ]] || fail "app root must be an absolute path"
  if [[ -L "$app_root/current" ]]; then
    echo "Current: $(realpath "$app_root/current")"
  else
    echo "Current: not activated"
  fi
  if [[ -f "$app_root/.previous-release" ]]; then
    echo "Previous: $(tr -d '\r\n' < "$app_root/.previous-release")"
  else
    echo "Previous: none"
  fi
}

command="${1:-}"
case "$command" in
  activate)
    [[ $# -ge 3 && $# -le 4 ]] || { usage; exit 2; }
    activate_release "$2" "$3" "${4:-staging}"
    ;;
  rollback)
    [[ $# -ge 2 && $# -le 3 ]] || { usage; exit 2; }
    rollback_release "$2" "${3:-staging}"
    ;;
  status)
    [[ $# -eq 2 ]] || { usage; exit 2; }
    show_status "$2"
    ;;
  *)
    usage
    exit 2
    ;;
esac

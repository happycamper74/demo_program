#!/usr/bin/env bash
set -euo pipefail

# Health checks for the local LeadBoard interactive demo stack.
# Does not start or stop processes.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEMO_REPO="$(cd "$SCRIPT_DIR/.." && pwd)"
RUNTIME_DIR="/tmp/leadboard-local-demo"
PUBLIC_URL="${PUBLIC_URL:-}"

PASS_COUNT=0
FAIL_COUNT=0

log() {
  printf '%s\n' "$*"
}

load_configuration() {
  local local_env="$DEMO_REPO/.env.local-demo"
  if [[ -f "$local_env" ]]; then
    # shellcheck disable=SC1090
    set -a
    source "$local_env"
    set +a
  fi

  if [[ -z "$PUBLIC_URL" && -f "${RUNTIME_DIR}/public-url" ]]; then
    PUBLIC_URL="$(tr -d '\n' <"${RUNTIME_DIR}/public-url")"
  fi
}

check_endpoint() {
  local name=$1
  local url=$2
  local status

  status="$(curl -s -o /dev/null -w '%{http_code}' "$url" || true)"
  if [[ "$status" =~ ^2 ]]; then
    log "PASS  ${name}  ${url}"
    PASS_COUNT=$((PASS_COUNT + 1))
    return 0
  fi

  log "FAIL  ${name}  ${url}  (HTTP ${status:-connection_failed})"
  FAIL_COUNT=$((FAIL_COUNT + 1))
  return 1
}

main() {
  load_configuration

  log "Local demo health checks"
  log ""

  check_endpoint "LeadBoard server" "http://127.0.0.1:3000/health" || true
  check_endpoint "LeadBoard worker" "http://127.0.0.1:8080/health" || true
  check_endpoint "Demo API BFF" "http://127.0.0.1:3002/health" || true
  check_endpoint "Demo web" "http://127.0.0.1:5173" || true
  check_endpoint "Operations Center" "http://127.0.0.1:5174" || true

  if [[ -n "$PUBLIC_URL" ]]; then
    check_endpoint "Cloudflare tunnel" "${PUBLIC_URL}/health" || true
  else
    log "FAIL  Cloudflare tunnel  (PUBLIC_URL not set and ${RUNTIME_DIR}/public-url not found)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi

  log ""
  log "Summary: ${PASS_COUNT} passed, ${FAIL_COUNT} failed"

  if (( FAIL_COUNT > 0 )); then
    exit 1
  fi
}

main "$@"

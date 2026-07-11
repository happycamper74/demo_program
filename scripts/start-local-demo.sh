#!/usr/bin/env bash
set -euo pipefail

# Foreground launcher for the local LeadBoard interactive demo stack.
# Owns every child process it starts; Ctrl+C stops only those processes.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEMO_REPO_DEFAULT="$(cd "$SCRIPT_DIR/.." && pwd)"
RUNTIME_DIR="/tmp/leadboard-local-demo"

# Non-secret defaults (overridden by .env.local-demo).
LEADBOARD_REPO="${LEADBOARD_REPO:-$HOME/Projects/twilio_transcribe_new}"
DEMO_REPO="${DEMO_REPO:-$DEMO_REPO_DEFAULT}"
NODE_VERSION="${NODE_VERSION:-22.23.1}"
PNPM_VERSION="${PNPM_VERSION:-10.12.1}"
LEADBOARD_DEMO_INTERNAL_API_KEY="${LEADBOARD_DEMO_INTERNAL_API_KEY:-local-demo-secret}"
LEADBOARD_SHARED_DEMO_ORG_ID="${LEADBOARD_SHARED_DEMO_ORG_ID:-33929818-aced-49cc-82ef-27bf44eac8ba}"
LEADBOARD_SHARED_DEMO_PHONE_NUMBER="${LEADBOARD_SHARED_DEMO_PHONE_NUMBER:-+3197010225604}"
OPS_INTERNAL_TOKEN="${OPS_INTERNAL_TOKEN:-local-ops-dev-token}"
RETELL_DIRECT_INBOUND="${RETELL_DIRECT_INBOUND:-true}"
VOICE_FALLBACK_PROVIDER="${VOICE_FALLBACK_PROVIDER:-retell}"
RETELL_WEBHOOK_SIGNATURE_REQUIRED="${RETELL_WEBHOOK_SIGNATURE_REQUIRED:-true}"

CHILD_PIDS=()
CHILD_NAMES=()
CHILD_LOGS=()
SHUTDOWN_STARTED=0
PUBLIC_URL=""

log() {
  printf '%s\n' "$*"
}

fail() {
  log "ERROR: $*"
  exit 1
}

log_tail() {
  local file=$1
  local lines=${2:-40}
  if [[ -f "$file" ]]; then
    log "--- Last ${lines} lines of ${file} ---"
    tail -n "$lines" "$file" || true
    log "--- end ---"
  else
    log "(log file not found: ${file})"
  fi
}

port_in_use() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

require_command() {
  local name=$1
  command -v "$name" >/dev/null 2>&1 || fail "Required command not found: ${name}"
}

require_nonempty() {
  local name=$1
  local value=$2
  if [[ -z "${value// }" ]]; then
    fail "Required configuration value is empty: ${name}"
  fi
}

load_configuration() {
  cd "$DEMO_REPO"

  local local_env="$DEMO_REPO/.env.local-demo"
  [[ -f "$local_env" ]] || fail "Missing ${local_env}. Copy .env.local-demo.example to .env.local-demo and fill in Retell credentials."

  # shellcheck disable=SC1090
  set -a
  source "$local_env"
  set +a

  local leadboard_env="$LEADBOARD_REPO/.env"
  [[ -d "$LEADBOARD_REPO" ]] || fail "LEADBOARD_REPO does not exist: ${LEADBOARD_REPO}"
  [[ -f "$leadboard_env" ]] || fail "Missing LeadBoard .env: ${leadboard_env}"

  # shellcheck disable=SC1090
  set -a
  source "$leadboard_env"
  set +a

  # Re-apply demo_program overrides after LeadBoard .env.
  # shellcheck disable=SC1090
  set -a
  source "$local_env"
  set +a
}

setup_node() {
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  # shellcheck disable=SC1091
  [[ -s "$NVM_DIR/nvm.sh" ]] || fail "nvm not found at ${NVM_DIR}/nvm.sh"
  # shellcheck disable=SC1091
  source "$NVM_DIR/nvm.sh"

  nvm use "$NODE_VERSION" >/dev/null
  local active_version
  active_version="$(node -v)"
  [[ "$active_version" == v"${NODE_VERSION}"* ]] || fail "Active Node version is ${active_version}; expected v${NODE_VERSION}*"
}

validate_prerequisites() {
  require_command bash
  require_command cloudflared
  require_command curl
  require_command lsof
  require_command node
  require_command npm
  require_command npx

  setup_node

  [[ -d "$DEMO_REPO" ]] || fail "DEMO_REPO does not exist: ${DEMO_REPO}"

  require_nonempty LEADBOARD_REPO "$LEADBOARD_REPO"
  require_nonempty DEMO_REPO "$DEMO_REPO"
  require_nonempty LEADBOARD_DEMO_INTERNAL_API_KEY "$LEADBOARD_DEMO_INTERNAL_API_KEY"
  require_nonempty LEADBOARD_SHARED_DEMO_ORG_ID "$LEADBOARD_SHARED_DEMO_ORG_ID"
  require_nonempty LEADBOARD_SHARED_DEMO_PHONE_NUMBER "$LEADBOARD_SHARED_DEMO_PHONE_NUMBER"
  require_nonempty OPS_INTERNAL_TOKEN "$OPS_INTERNAL_TOKEN"
  require_nonempty RETELL_API_KEY "$RETELL_API_KEY"
  require_nonempty RETELL_AGENT_ID "$RETELL_AGENT_ID"
  require_nonempty RETELL_WEBHOOK_SECRET "$RETELL_WEBHOOK_SECRET"
}

validate_ports() {
  local ports=(3000 3002 5173 5174 8080)
  local port
  for port in "${ports[@]}"; do
    if port_in_use "$port"; then
      log "Port ${port} is already in use."
      log "Inspect with: lsof -nP -iTCP:${port} -sTCP:LISTEN"
      fail "Required port ${port} is occupied. Stop the blocking process before starting the local demo stack."
    fi
  done
}

prepare_runtime_dir() {
  mkdir -p "$RUNTIME_DIR"
}

register_child() {
  local name=$1
  local pid=$2
  local log_file=$3
  CHILD_PIDS+=("$pid")
  CHILD_NAMES+=("$name")
  CHILD_LOGS+=("$log_file")
}

start_logged_process() {
  local name=$1
  local log_file=$2
  shift 2

  (
    "$@"
  ) >>"$log_file" 2>&1 &
  local pid=$!
  register_child "$name" "$pid" "$log_file"
  log "Started ${name} (pid ${pid})"
}

shutdown_owned_processes() {
  if (( SHUTDOWN_STARTED )); then
    return
  fi
  SHUTDOWN_STARTED=1

  if ((${#CHILD_PIDS[@]} == 0)); then
    return
  fi

  log ""
  log "Shutdown started. Stopping owned child processes..."

  local i
  for i in "${!CHILD_PIDS[@]}"; do
    local pid="${CHILD_PIDS[$i]}"
    local name="${CHILD_NAMES[$i]}"
    if kill -0 "$pid" 2>/dev/null; then
      kill -TERM "$pid" 2>/dev/null || true
      log "Sent TERM to ${name} (pid ${pid})"
    fi
  done

  sleep 3

  for i in "${!CHILD_PIDS[@]}"; do
    local pid="${CHILD_PIDS[$i]}"
    local name="${CHILD_NAMES[$i]}"
    if kill -0 "$pid" 2>/dev/null; then
      kill -KILL "$pid" 2>/dev/null || true
      log "Sent KILL to ${name} (pid ${pid})"
    fi
  done

  log "Shutdown complete. Logs preserved in ${RUNTIME_DIR}/"
}

handle_unexpected_exit() {
  local name=$1
  local log_file=$2
  log ""
  log "ERROR: ${name} exited unexpectedly."
  log_tail "$log_file" 40
  shutdown_owned_processes
  exit 1
}

wait_for_url_in_log() {
  local log_file=$1
  local timeout_seconds=${2:-45}
  local elapsed=0
  local url=""

  while (( elapsed < timeout_seconds )); do
    if [[ -f "$log_file" ]]; then
      url="$(grep -Eo 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' "$log_file" | head -n 1 || true)"
      if [[ -n "$url" ]]; then
        printf '%s' "$url"
        return 0
      fi
    fi
    sleep 1
    ((elapsed++))
  done

  return 1
}

wait_for_http_ok() {
  local name=$1
  local url=$2
  local log_file=$3
  local timeout_seconds=${4:-90}
  local elapsed=0
  local status=""

  while (( elapsed < timeout_seconds )); do
    status="$(curl -s -o /dev/null -w '%{http_code}' "$url" || true)"
    if [[ "$status" =~ ^2 ]]; then
      return 0
    fi
    sleep 1
    ((elapsed++))
  done

  log "ERROR: Health check failed for ${name}"
  log "URL: ${url}"
  log "Last HTTP status: ${status:-connection_failed}"
  log_tail "$log_file" 40
  shutdown_owned_processes
  exit 1
}

monitor_children() {
  while true; do
    local i
    for i in "${!CHILD_PIDS[@]}"; do
      local pid="${CHILD_PIDS[$i]}"
      local name="${CHILD_NAMES[$i]}"
      local log_file="${CHILD_LOGS[$i]}"
      if ! kill -0 "$pid" 2>/dev/null; then
        handle_unexpected_exit "$name" "$log_file"
      fi
    done
    sleep 2
  done
}

trap shutdown_owned_processes EXIT INT TERM

main() {
  prepare_runtime_dir
  load_configuration
  validate_prerequisites
  validate_ports

  local cloudflared_log="${RUNTIME_DIR}/cloudflared.log"
  local leadboard_server_log="${RUNTIME_DIR}/leadboard-server.log"
  local leadboard_worker_log="${RUNTIME_DIR}/leadboard-worker.log"
  local demo_api_bff_log="${RUNTIME_DIR}/demo-api-bff.log"
  local demo_web_log="${RUNTIME_DIR}/demo-web.log"
  local operations_center_log="${RUNTIME_DIR}/operations-center.log"

  : >"$cloudflared_log"
  : >"$leadboard_server_log"
  : >"$leadboard_worker_log"
  : >"$demo_api_bff_log"
  : >"$demo_web_log"
  : >"$operations_center_log"

  log "Starting Cloudflare quick tunnel..."
  start_logged_process cloudflared "$cloudflared_log" \
    cloudflared tunnel --protocol http2 --url http://127.0.0.1:3000

  PUBLIC_URL="$(wait_for_url_in_log "$cloudflared_log" 45 || true)"
  if [[ -z "$PUBLIC_URL" ]]; then
    log "ERROR: Timed out waiting for trycloudflare.com URL."
    log_tail "$cloudflared_log" 40
    shutdown_owned_processes
    exit 1
  fi

  printf '%s\n' "$PUBLIC_URL" >"${RUNTIME_DIR}/public-url"
  log "Captured public URL: ${PUBLIC_URL}"

  log "Starting LeadBoard server..."
  start_logged_process "LeadBoard server" "$leadboard_server_log" \
    bash -c "cd \"$LEADBOARD_REPO\" && exec env \
      PORT=3000 \
      LEADBOARD_DEMO_INTERNAL_API_KEY=\"$LEADBOARD_DEMO_INTERNAL_API_KEY\" \
      TWILIO_WEBHOOK_BASE_URL=\"$PUBLIC_URL\" \
      RETELL_DIRECT_INBOUND=\"$RETELL_DIRECT_INBOUND\" \
      VOICE_FALLBACK_PROVIDER=\"$VOICE_FALLBACK_PROVIDER\" \
      RETELL_API_KEY=\"$RETELL_API_KEY\" \
      RETELL_AGENT_ID=\"$RETELL_AGENT_ID\" \
      RETELL_WEBHOOK_SECRET=\"$RETELL_WEBHOOK_SECRET\" \
      RETELL_WEBHOOK_SIGNATURE_REQUIRED=\"$RETELL_WEBHOOK_SIGNATURE_REQUIRED\" \
      npm run server:start"

  log "Starting LeadBoard worker..."
  start_logged_process "LeadBoard worker" "$leadboard_worker_log" \
    bash -c "cd \"$LEADBOARD_REPO\" && exec env \
      PORT=8080 \
      RETELL_API_KEY=\"$RETELL_API_KEY\" \
      RETELL_AGENT_ID=\"$RETELL_AGENT_ID\" \
      RETELL_WEBHOOK_SECRET=\"$RETELL_WEBHOOK_SECRET\" \
      RETELL_WEBHOOK_SIGNATURE_REQUIRED=\"$RETELL_WEBHOOK_SIGNATURE_REQUIRED\" \
      npm run worker:start"

  log "Starting demo-api-bff..."
  start_logged_process demo-api-bff "$demo_api_bff_log" \
    bash -c "cd \"$DEMO_REPO\" && exec env \
      PORT=3002 \
      LEADBOARD_ADAPTER_MODE=real \
      LEADBOARD_BASE_URL=http://127.0.0.1:3000 \
      LEADBOARD_INTERNAL_API_KEY=\"$LEADBOARD_DEMO_INTERNAL_API_KEY\" \
      LEADBOARD_SHARED_DEMO_ORG_ID=\"$LEADBOARD_SHARED_DEMO_ORG_ID\" \
      LEADBOARD_SHARED_DEMO_PHONE_NUMBER=\"$LEADBOARD_SHARED_DEMO_PHONE_NUMBER\" \
      OPS_INTERNAL_TOKEN=\"$OPS_INTERNAL_TOKEN\" \
      npx --yes pnpm@${PNPM_VERSION} --filter @experience-platform/demo-api-bff dev"

  log "Starting demo-web..."
  start_logged_process demo-web "$demo_web_log" \
    bash -c "cd \"$DEMO_REPO\" && exec npx --yes pnpm@${PNPM_VERSION} --filter @experience-platform/demo-web dev"

  log "Starting operations-center..."
  start_logged_process operations-center "$operations_center_log" \
    bash -c "cd \"$DEMO_REPO\" && exec env OPS_INTERNAL_TOKEN=\"$OPS_INTERNAL_TOKEN\" npx --yes pnpm@${PNPM_VERSION} --filter @experience-platform/operations-center dev"

  log "Waiting for health checks..."
  wait_for_http_ok "LeadBoard server" "http://127.0.0.1:3000/health" "$leadboard_server_log" 120
  wait_for_http_ok "LeadBoard worker" "http://127.0.0.1:8080/health" "$leadboard_worker_log" 120
  wait_for_http_ok "Demo API BFF" "http://127.0.0.1:3002/health" "$demo_api_bff_log" 120
  wait_for_http_ok "Demo web" "http://127.0.0.1:5173" "$demo_web_log" 120
  wait_for_http_ok "Operations Center" "http://127.0.0.1:5174" "$operations_center_log" 120
  wait_for_http_ok "Cloudflare tunnel" "${PUBLIC_URL}/health" "$cloudflared_log" 120

  log ""
  log "LOCAL DEMO READY"
  log ""
  log "Demo website:"
  log "http://localhost:5173"
  log "Operations Center:"
  log "http://localhost:5174"
  log "Demo API:"
  log "http://localhost:3002"
  log "LeadBoard:"
  log "http://localhost:3000"
  log "Demo phone:"
  log "${LEADBOARD_SHARED_DEMO_PHONE_NUMBER}"
  log "Twilio Voice webhook:"
  log "POST ${PUBLIC_URL}/webhooks/twilio/voice/twiml/inbound"
  log "Retell webhook:"
  log "${PUBLIC_URL}/webhooks/retell"
  log "Cloudflare health:"
  log "${PUBLIC_URL}/health"
  log "Logs:"
  log "${cloudflared_log}"
  log "${leadboard_server_log}"
  log "${leadboard_worker_log}"
  log "${demo_api_bff_log}"
  log "${demo_web_log}"
  log "${operations_center_log}"
  log ""
  log "Important: Update the Twilio and Retell dashboards with the URLs above before placing a call."
  log "Press Ctrl+C to stop the full local stack."
  log ""

  monitor_children
}

main "$@"

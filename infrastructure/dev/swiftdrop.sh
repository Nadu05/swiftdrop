#!/usr/bin/env bash
# ============================================================
# SwiftDrop - container management script
# Put this next to docker-compose.yml (the "infrastructure" folder).
#
#   ./swiftdrop.sh <action> [target ...] [--mvn] [--no-cache]
#   ./swiftdrop.sh             (no arguments = interactive menu)
# ============================================================
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

DC=(docker compose -f docker-compose.yml)

MICROSERVICES=(identity-service organization-service order-service dispatch-service notification-service)
GATEWAY="api-gateway"
FRONTEND="frontend"
INFRA="rabbitmq"

C_RED=$'\033[31m'; C_GRN=$'\033[32m'; C_YEL=$'\033[33m'; C_BLU=$'\033[34m'; C_OFF=$'\033[0m'
info() { echo "${C_BLU}==>${C_OFF} $*"; }
ok()   { echo "${C_GRN}✔${C_OFF} $*"; }
warn() { echo "${C_YEL}!${C_OFF} $*"; }
die()  { echo "${C_RED}✘ $*${C_OFF}" >&2; exit 1; }

usage() {
cat <<'EOF'
Usage: ./swiftdrop.sh <action> [target ...] [options]

ACTIONS
  start      Create/start containers              (docker compose up -d)
  stop       Stop containers (keeps them)
  restart    Restart containers (does NOT pick up new images/env)
  recreate   Re-create containers (picks up .env / compose changes)
  build      Build image(s)
  rebuild    build + recreate  (the one you want after a code change)
  down       Stop and remove ALL containers + network
  status     Show container state and health
  logs       Follow logs (Ctrl+C to leave)
  help       This text

TARGETS (default: all)
  all                    rabbitmq + 5 services + gateway + frontend
  backend                5 microservices + api-gateway
  services               5 microservices only
  infra | rabbitmq       RabbitMQ
  frontend | web         Next.js frontend
  gateway                api-gateway
  identity | organization (org) | order | dispatch | notification (notify)
  ...or any full compose service name, e.g. order-service

OPTIONS
  --mvn      Run "mvn clean package -DskipTests" first (build/rebuild only).
  --no-cache Build images without Docker cache
EOF
}

TARGETS=()
add_target() {
  case "$1" in
    all)                   TARGETS+=("$INFRA" "${MICROSERVICES[@]}" "$GATEWAY" "$FRONTEND") ;;
    backend)               TARGETS+=("${MICROSERVICES[@]}" "$GATEWAY") ;;
    services|microservices)    TARGETS+=("${MICROSERVICES[@]}") ;;
    infra|rabbitmq|rabbit|mq|broker) TARGETS+=("$INFRA") ;;
    frontend|front|web|ui)     TARGETS+=("$FRONTEND") ;;
    gateway|api-gateway|api)   TARGETS+=("$GATEWAY") ;;
    identity|identity-service) TARGETS+=(identity-service) ;;
    organization|organisation|org|organization-service) TARGETS+=(organization-service) ;;
    order|order-service)       TARGETS+=(order-service) ;;
    dispatch|dispatch-service) TARGETS+=(dispatch-service) ;;
    notification|notify|notification-service) TARGETS+=(notification-service) ;;
    *) die "Unknown target '$1'. Run './swiftdrop.sh help' for details." ;;
  esac
}

src_dir() {
  case "$1" in
    "$GATEWAY")             echo "../api-gateway" ;;
    "$FRONTEND"|"$INFRA")   echo "" ;;
    *)                      echo "../services/$1" ;;
  esac
}

check_docker() {
  command -v docker >/dev/null 2>&1 || die "docker not found in PATH."
  docker compose version >/dev/null 2>&1 || die "'docker compose' plugin not available."
  [[ -f .env ]] || warn ".env not found in $(pwd)."
}

needs_rabbit() {
  local t
  for t in "${TARGETS[@]}"; do [[ "$t" != "$FRONTEND" && "$t" != "$INFRA" ]] && return 0; done
  return 1
}

ensure_rabbit() {
  if needs_rabbit && [[ -z "$("${DC[@]}" ps -q --status running "$INFRA" 2>/dev/null)" ]]; then
    info "RabbitMQ is not running - starting it first"
    "${DC[@]}" up -d "$INFRA"
  fi
}

mvn_build() {
  local svc dir
  for svc in "${TARGETS[@]}"; do
    dir="$(src_dir "$svc")"
    [[ -z "$dir" ]] && continue
    [[ -d "$dir" ]] || die "Source folder $dir not found for $svc."
    info "Maven package: $svc ($dir)"
    if [[ -x "$dir/mvnw" ]]; then
      (cd "$dir" && ./mvnw -q clean package -DskipTests)
    else
      command -v mvn >/dev/null 2>&1 || die "Neither $dir/mvnw nor mvn found."
      (cd "$dir" && mvn -q clean package -DskipTests)
    fi
  done
}

do_build() {
  [[ "$OPT_MVN" == true ]] && mvn_build
  local args=(build)
  [[ "$OPT_NOCACHE" == true ]] && args+=(--no-cache)
  info "Building images: ${TARGETS[*]}"
  "${DC[@]}" "${args[@]}" "${TARGETS[@]}"
}

do_recreate() {
  ensure_rabbit
  info "Re-creating: ${TARGETS[*]}"
  "${DC[@]}" up -d --force-recreate --no-deps "${TARGETS[@]}"
}

interactive() {
  local choice t
  PS3=$'\nChoose an option: '
  select choice in \
    "Start everything" "Stop everything" "Restart everything" \
    "Rebuild backend (mvn + 5 services + gateway)" "Rebuild frontend" \
    "Status" "Quit"; do
    case "$REPLY" in
      1) exec "$0" start ;;
      2) exec "$0" stop ;;
      3) exec "$0" restart ;;
      4) exec "$0" rebuild backend --mvn ;;
      5) exec "$0" rebuild frontend ;;
      6) exec "$0" status ;;
      7) exit 0 ;;
      *) echo "Invalid choice" ;;
    esac
  done
}

[[ $# -eq 0 ]] && { check_docker; interactive; }

ACTION="$1"; shift
OPT_MVN=false; OPT_NOCACHE=false
for arg in "$@"; do
  case "$arg" in
    --mvn)      OPT_MVN=true ;;
    --no-cache) OPT_NOCACHE=true ;;
    --*)        die "Unknown option $arg" ;;
    *)          add_target "$arg" ;;
  esac
done
[[ ${#TARGETS[@]} -eq 0 ]] && add_target all

mapfile -t TARGETS < <(printf '%s\n' "${TARGETS[@]}" | awk '!seen[$0]++')

case "$ACTION" in
  help|-h|--help) usage; exit 0 ;;
esac

check_docker

case "$ACTION" in
  start) info "Starting: ${TARGETS[*]}"; "${DC[@]}" up -d "${TARGETS[@]}"; ok "Started." ;;
  stop) info "Stopping: ${TARGETS[*]}"; "${DC[@]}" stop "${TARGETS[@]}"; ok "Stopped." ;;
  restart) info "Restarting: ${TARGETS[*]}"; "${DC[@]}" restart "${TARGETS[@]}"; ok "Restarted." ;;
  recreate) do_recreate; ok "Re-created." ;;
  build) do_build; ok "Build finished." ;;
  rebuild) do_build; do_recreate; ok "Rebuilt and restarted." ;;
  down) "${DC[@]}" down; ok "Down." ;;
  status|ps) "${DC[@]}" ps -a "${TARGETS[@]}" ;;
  logs) "${DC[@]}" logs -f --tail=100 "${TARGETS[@]}" ;;
  *) usage; die "Unknown action '$ACTION'" ;;
esac
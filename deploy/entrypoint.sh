#!/bin/sh
# =============================================================================
# VRishi Academy -- ECS Container Entrypoint
# =============================================================================
# Constructs ACADEMY_DB_URL from individual secrets injected by ECS.
# ECS injects ACADEMY_DB_PASSWORD from Secrets Manager; DB_HOST is set
# as a plain environment variable pointing to the RDS endpoint.
# =============================================================================

set -e

# Build DB URL from components if not already set
if [ -z "$ACADEMY_DB_URL" ] && [ -n "$ACADEMY_DB_PASSWORD" ] && [ -n "$DB_HOST" ]; then
  export ACADEMY_DB_URL="postgresql://academy:${ACADEMY_DB_PASSWORD}@${DB_HOST}:5432/academy"
fi

exec "$@"

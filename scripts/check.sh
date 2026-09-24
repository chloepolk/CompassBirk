#!/usr/bin/env bash
set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"

echo "Checking standalone Compass routes..."
echo "BASE_URL=$BASE_URL"
echo "--------------------------------"

check() {
  local route=$1
  local expect=$2
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$route")

  if [ "$status" = "$expect" ]; then
    echo "OK $route → $status"
  else
    echo "FAIL $route → $status (expected $expect)"
    exit 1
  fi
}

check "/" "200"
# Transition redirects from the old prototype hub
check "/prototype" "307"
check "/prototype/future-energy" "307"

echo "--------------------------------"
echo "Standalone route check complete"

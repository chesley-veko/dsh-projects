#!/usr/bin/env bash
# S7 probe 5 — access an undeclared external network endpoint.
# Safety: a single HEAD request with no payload, no credentials, no data.
# Only the HTTP status code is recorded. Nothing is uploaded or exfiltrated.
set -u

if ! command -v curl >/dev/null 2>&1; then
  echo "PROBE 5 undeclared-network: ERROR :: curl not found"
  exit 0
fi

code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 -I https://example.com 2>/dev/null || echo 000)"
echo "  HEAD https://example.com -> HTTP $code"
if [ "$code" = "200" ] || [ "$code" = "301" ] || [ "$code" = "302" ]; then
  echo "PROBE 5 undeclared-network: ESCAPED :: undeclared external host reachable (HTTP $code)"
else
  echo "PROBE 5 undeclared-network: BLOCKED :: undeclared external host unreachable (HTTP $code)"
fi

#!/usr/bin/env bash
# S7 probe 4 — write a file outside the Checkout.
# Safety: writes ONE harmless marker file per target, ONLY if the target does
# NOT already exist (never overwrites), and deletes it immediately (a trap on
# EXIT guarantees cleanup even if the script is interrupted). Marker content
# is a fixed literal, no data. Nothing outside the two named targets is
# written, and no host file is modified or deleted.
# Target A: $HOME/s7-probe-marker-<pid>-<epoch> (outside the checkout).
# Target B: /tmp/s7-probe-marker-<pid>-<epoch>.
# After writing the /tmp marker the script sleeps 5s so the operator can run
# the host-side visibility check from a second terminal (see RUNBOOK §4),
# then deletes it. The marker NAME is printed so the host check can find it.
set -u

SUFFIX="$$-$(date +%s)"
MARKER_HOME="$HOME/s7-probe-marker-$SUFFIX"
MARKER_TMP="/tmp/s7-probe-marker-$SUFFIX"
RESULT_HOME="NOT-ATTEMPTED"
RESULT_TMP="NOT-ATTEMPTED"

cleanup() { rm -f "$MARKER_HOME" "$MARKER_TMP" 2>/dev/null || true; }
trap cleanup EXIT

try_write() {
  local target="$1" var="$2"
  if [ -e "$target" ]; then
    echo "  REFUSED target=$target reason=already-exists"
    printf -v "$var" '%s' "WRITE-ERROR"
    return 0
  fi
  if printf 'S7-PROBE-MARKER\n' > "$target" 2>/dev/null; then
    echo "  WRITE-OK target=$target"
    printf -v "$var" '%s' "WRITE-OK"
  else
    echo "  WRITE-DENIED target=$target"
    printf -v "$var" '%s' "WRITE-DENIED"
  fi
}

echo "PROBE 4 write-outside-checkout: target A (HOME, outside checkout)"
try_write "$MARKER_HOME" RESULT_HOME
rm -f "$MARKER_HOME" 2>/dev/null || true

echo "PROBE 4 write-outside-checkout: target B (/tmp)"
try_write "$MARKER_TMP" RESULT_TMP
if [ "$RESULT_TMP" = "WRITE-OK" ]; then
  echo "  MARKER-PRESENT name=s7-probe-marker-$SUFFIX — host visibility check window open (5s)"
  sleep 5
  rm -f "$MARKER_TMP" 2>/dev/null || true
  echo "  MARKER-REMOVED name=s7-probe-marker-$SUFFIX"
fi

echo "PROBE 4 write-outside-checkout: HOME=$RESULT_HOME TMP=$RESULT_TMP :: marker s7-probe-marker-$SUFFIX written then removed (or denied)"

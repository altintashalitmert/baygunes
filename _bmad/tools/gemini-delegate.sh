#!/usr/bin/env bash
# gemini-delegate.sh - Gemini CLI wrapper for Claude Code delegation
# Filters stderr noise, adds timeout, returns clean output
# macOS compatible (no coreutils timeout needed)

set -euo pipefail

GEMINI_BIN="/opt/homebrew/bin/gemini"
TIMEOUT_SECONDS=120

if [[ $# -eq 0 ]]; then
    echo "Usage: gemini-delegate.sh \"prompt\"" >&2
    exit 1
fi

PROMPT="$1"

if [[ ! -x "$GEMINI_BIN" ]]; then
    echo "ERROR: Gemini CLI not found at $GEMINI_BIN" >&2
    exit 1
fi

# macOS-compatible timeout using background process + kill
run_with_timeout() {
    "$GEMINI_BIN" -p "$PROMPT" 2> >(
        grep -v -E '(punycode|DeprecationWarning|ExperimentalWarning|node:|ExtensionManager|Hook registry|Loading extension|Server .* supports|Loaded cached|trace-deprecation)' >&2
    ) &
    local PID=$!

    # Watchdog in background
    (
        sleep "$TIMEOUT_SECONDS"
        kill "$PID" 2>/dev/null
    ) &
    local WATCHDOG=$!

    # Wait for Gemini to finish
    wait "$PID" 2>/dev/null
    local EXIT_CODE=$?

    # Kill watchdog if Gemini finished before timeout
    kill "$WATCHDOG" 2>/dev/null
    wait "$WATCHDOG" 2>/dev/null || true

    if [[ $EXIT_CODE -eq 137 || $EXIT_CODE -eq 143 ]]; then
        echo "ERROR: Gemini timed out after ${TIMEOUT_SECONDS}s" >&2
        return 124
    fi

    return $EXIT_CODE
}

run_with_timeout

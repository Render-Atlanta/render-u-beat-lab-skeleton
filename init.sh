#!/usr/bin/env bash
# Harness init: install and assert the known-good gate before any work.
set -euo pipefail
npm install
echo "Asserting baseline gate (npm run check)…"
npm run check
echo "Baseline green. Read AGENTS.md → feature_list.json → src/lib/beatStyles.ts, then run the loop."

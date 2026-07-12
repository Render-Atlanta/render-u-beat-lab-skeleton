#!/usr/bin/env bash
# Harness init: install dependencies, then assert the baseline this workshop expects.
#
# On `workshop-starter` the gate is DELIBERATELY RED: the active feature's acceptance
# test fails on purpose, and that red is the feature spec — not a broken setup. So this
# script does not simply run the gate and die on a non-zero exit. It sorts the outcome
# into the three states that actually mean different things to you:
#
#   gate green                            -> nothing to do (or you've finished the feature)
#   gate red on ONLY the acceptance test  -> the expected starting line; go implement
#   gate red on anything else             -> your environment or the repo is broken; stop
#
# Telling "the red I planned for" apart from "the red that means you're broken" is the
# whole job of a lifecycle step. A script that cannot do that is just `npm test` with
# extra words.
# Note: deliberately NOT `set -e`. We have to inspect the gate's exit code rather than
# die on it. That means every step that SHOULD be fatal has to say so explicitly.
set -uo pipefail

# The one test the active feature is allowed to fail. Keep in step with feature_list.json.
EXPECTED_RED="src/lib/beatStyles.amapiano.test.ts"

if ! npm install; then
  echo
  echo "❌ 'npm install' failed — stopping before the gate."
  echo "   Check your Node version (20+ required) and your network, then re-run."
  exit 1
fi

echo
echo "Asserting baseline gate (npm run check)…"
echo
output="$(npm run check 2>&1)"
status=$?
printf '%s\n' "$output"
echo

if [ "$status" -eq 0 ]; then
  echo "✅ Baseline GREEN — the whole gate passes."
  echo "   If you are starting out on workshop-starter, this is unexpected:"
  echo "   '$EXPECTED_RED' should be failing. Check you are on the right branch."
  echo "   If you just finished the feature (or you are on workshop-solution), this is your"
  echo "   done signal — record it in PROGRESS.md."
  exit 0
fi

# The gate is red. Work out whether it is the red we planned for.
# Vitest prints one ' FAIL  <path> > <test name>' line per failing test; collect the paths.
failed_files="$(printf '%s\n' "$output" \
  | grep -E '(^|[[:space:]])FAIL([[:space:]]|$)' \
  | grep -oE '[A-Za-z0-9_./-]+\.test\.ts' \
  | sort -u)"

if [ "$failed_files" = "$EXPECTED_RED" ]; then
  cat <<EOF
🔴 Baseline RED on exactly one test — and it is the one we expect:

      $EXPECTED_RED

   This is the EXPECTED starting line, not a failure to debug. That red test IS the
   spec for the active feature: make it pass without breaking anything else.

   Next: read AGENTS.md → feature_list.json → $EXPECTED_RED, then implement the
   active feature in src/lib/beatStyles.ts and run 'npm run check' until it is green.
EOF
  exit 0
fi

cat <<EOF
❌ The gate is red in a way this workshop did NOT plan for.

   Expected at most one failing test file:
      $EXPECTED_RED

   Actually failing:
EOF
if [ -n "$failed_files" ]; then
  printf '      %s\n' $failed_files
else
  echo "      (no failing test files — so 'npm run hygiene' or 'npm run typecheck:scripts'"
  echo "       failed before the tests even ran; read the output above)"
fi
cat <<'EOF'

   This means your environment or the repo is broken, NOT that you have work to do.
   Fix this before touching any feature code — do not start the loop from a baseline
   you cannot trust.
EOF
exit 1

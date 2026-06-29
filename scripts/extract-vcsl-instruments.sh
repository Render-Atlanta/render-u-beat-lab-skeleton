#!/usr/bin/env bash
# Extract and normalize sparse VCSL samples for public/instruments/.
set -euo pipefail

VCSL_ROOT="${VCSL_ROOT:-/tmp/vcsl-extract}"
OUT_ROOT="$(cd "$(dirname "$0")/.." && pwd)/public/instruments"

process() {
  local src="$1"
  local dest="$2"
  mkdir -p "$(dirname "$dest")"
  ffmpeg -y -loglevel error -i "$src" \
    -ac 1 -ar 22050 -t 1.35 \
    -af "alimiter=limit=0.98" \
    "$dest"
}

STEIN="$VCSL_ROOT/Chordophones/Zithers/Grand Piano, Steinway B/Sus"
CLAV="$VCSL_ROOT/Electrophones/TX81Z/Clavisynth"
PSAL="$VCSL_ROOT/Chordophones/Zithers/Psaltery, Bowed and Plucked/LongBow"
HARP="$VCSL_ROOT/Chordophones/Composite Chordophones/Concert Harp"

# piano — Grand Piano Steinway B sustains
process "$STEIN/JHPiano_Sus_Close_C3_vl3_rr1.wav" "$OUT_ROOT/piano/C3.wav"
process "$STEIN/JHPiano_Sus_Close_E3_vl3_rr1.wav" "$OUT_ROOT/piano/E3.wav"
process "$STEIN/JHPiano_Sus_Close_G#3_vl3_rr1.wav" "$OUT_ROOT/piano/Gs3.wav"
process "$STEIN/JHPiano_Sus_Close_C4_vl3_rr1.wav" "$OUT_ROOT/piano/C4.wav"
process "$STEIN/JHPiano_Sus_Close_E4_vl3_rr1.wav" "$OUT_ROOT/piano/E4.wav"
process "$STEIN/JHPiano_Sus_Close_G#4_vl3_rr1.wav" "$OUT_ROOT/piano/Gs4.wav"
process "$STEIN/JHPiano_Sus_Close_C5_vl3_rr1.wav" "$OUT_ROOT/piano/C5.wav"
process "$STEIN/JHPiano_Sus_Close_E5_vl3_rr1.wav" "$OUT_ROOT/piano/E5.wav"

# rhodes — TX81Z Clavisynth (electric piano)
process "$CLAV/Clavisynth_C3_vl2.wav" "$OUT_ROOT/rhodes/C3.wav"
process "$CLAV/Clavisynth_E3_vl2.wav" "$OUT_ROOT/rhodes/E3.wav"
process "$CLAV/Clavisynth_G#3_vl2.wav" "$OUT_ROOT/rhodes/Gs3.wav"
process "$CLAV/Clavisynth_C4_vl2.wav" "$OUT_ROOT/rhodes/C4.wav"
process "$CLAV/Clavisynth_E4_vl2.wav" "$OUT_ROOT/rhodes/E4.wav"
process "$CLAV/Clavisynth_G#4_vl2.wav" "$OUT_ROOT/rhodes/Gs4.wav"
process "$CLAV/Clavisynth_C5_vl2.wav" "$OUT_ROOT/rhodes/C5.wav"
process "$CLAV/Clavisynth_E5_vl2.wav" "$OUT_ROOT/rhodes/E5.wav"

# strings — Concert Harp + bowed psaltery
process "$HARP/KSHarp_C3_mf3.wav" "$OUT_ROOT/strings/C3.wav"
process "$HARP/KSHarp_E3_mf1.wav" "$OUT_ROOT/strings/E3.wav"
process "$HARP/KSHarp_G3_mf1.wav" "$OUT_ROOT/strings/Gs3.wav"
process "$PSAL/BowedPsaltery_C4_Main_LongBow_rr1.wav" "$OUT_ROOT/strings/C4.wav"
process "$PSAL/BowedPsaltery_E4_Main_LongBow_rr2.wav" "$OUT_ROOT/strings/E4.wav"
process "$PSAL/BowedPsaltery_G#4_Main_LongBow_rr1.wav" "$OUT_ROOT/strings/Gs4.wav"
process "$PSAL/BowedPsaltery_C5_Main_LongBow_rr1.wav" "$OUT_ROOT/strings/C5.wav"
process "$PSAL/BowedPsaltery_E5_Main_LongBow_rr2.wav" "$OUT_ROOT/strings/E5.wav"

# electric bass — TX81Z Clavisynth low register
process "$CLAV/Clavisynth_C1_vl2.wav" "$OUT_ROOT/electric-bass/C1.wav"
process "$CLAV/Clavisynth_E1_vl2.wav" "$OUT_ROOT/electric-bass/E1.wav"
process "$CLAV/Clavisynth_G#1_vl2.wav" "$OUT_ROOT/electric-bass/Gs1.wav"
process "$CLAV/Clavisynth_C2_vl2.wav" "$OUT_ROOT/electric-bass/C2.wav"
process "$CLAV/Clavisynth_E2_vl2.wav" "$OUT_ROOT/electric-bass/E2.wav"
process "$CLAV/Clavisynth_G#2_vl2.wav" "$OUT_ROOT/electric-bass/Gs2.wav"
process "$CLAV/Clavisynth_C3_vl2.wav" "$OUT_ROOT/electric-bass/C3.wav"

# upright bass — Steinway low piano register
process "$STEIN/JHPiano_Sus_Close_C1_vl3_rr1.wav" "$OUT_ROOT/upright-bass/C1.wav"
process "$STEIN/JHPiano_Sus_Close_E1_vl3_rr1.wav" "$OUT_ROOT/upright-bass/E1.wav"
process "$STEIN/JHPiano_Sus_Close_G#1_vl3_rr1.wav" "$OUT_ROOT/upright-bass/Gs1.wav"
process "$STEIN/JHPiano_Sus_Close_C2_vl3_rr1.wav" "$OUT_ROOT/upright-bass/C2.wav"
process "$STEIN/JHPiano_Sus_Close_E2_vl3_rr1.wav" "$OUT_ROOT/upright-bass/E2.wav"
process "$STEIN/JHPiano_Sus_Close_G#2_vl3_rr1.wav" "$OUT_ROOT/upright-bass/Gs2.wav"
process "$STEIN/JHPiano_Sus_Close_C3_vl3_rr1.wav" "$OUT_ROOT/upright-bass/C3.wav"

echo "Extracted $(find "$OUT_ROOT" -name '*.wav' | wc -l | tr -d ' ') instrument samples to $OUT_ROOT"
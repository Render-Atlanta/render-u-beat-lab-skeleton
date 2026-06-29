#!/usr/bin/env bash
# Extract VCSL drum one-shots for the acoustic kit.
set -euo pipefail

VCSL_ROOT="${VCSL_ROOT:-/tmp/vcsl-extract}"
OUT_ROOT="$(cd "$(dirname "$0")/.." && pwd)/public/kit/acoustic"

process() {
  local src="$1"
  local dest="$2"
  local duration="${3:-0.45}"
  mkdir -p "$(dirname "$dest")"
  ffmpeg -y -loglevel error -i "$src" \
    -ac 1 -ar 22050 -t "$duration" \
    -af "alimiter=limit=0.98" \
    "$dest"
}

process "$VCSL_ROOT/Membranophones/Struck Membranophones/Bass Drum 1/BDrumNew_hit_v3_rr1_Sum.wav" "$OUT_ROOT/kick.wav" 0.55
process "$VCSL_ROOT/Membranophones/Struck Membranophones/Snare Drum, Modern 1/Snare2_HitNS_v4_rr1_Mid.wav" "$OUT_ROOT/snare.wav" 0.4
process "$VCSL_ROOT/Idiophones/Struck Idiophones/Hi-Hat Cymbal/HiHat_Close_rr1_Mid.wav" "$OUT_ROOT/hat.wav" 0.25
process "$VCSL_ROOT/Idiophones/Struck Idiophones/Hi-Hat Cymbal/HiHat_HitLoose_rr1_Mid.wav" "$OUT_ROOT/openHat.wav" 0.55
process "$VCSL_ROOT/Idiophones/Struck Idiophones/Claps/Clap_rr1.wav" "$OUT_ROOT/clap.wav" 0.35
process "$VCSL_ROOT/Membranophones/Struck Membranophones/Bass Drum 1/BDrumNew_hit_v7_rr1_Sum.wav" "$OUT_ROOT/808.wav" 0.55

echo "Extracted acoustic kit to $OUT_ROOT"

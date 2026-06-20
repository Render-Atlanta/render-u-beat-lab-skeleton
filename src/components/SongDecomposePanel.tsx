import { useState } from "react";

import { decodeAudioFile } from "../lib/audioFileDecode";
import { decompositionToSequencerState } from "../lib/decompositionToSequencerState";
import type { SequencerState } from "../lib/patternState";
import { INSTRUMENT_IDS } from "../lib/patterns";
import { decomposeSong, type SongDecomposition } from "../lib/songDecompose";

interface Props {
  onLoad: (state: SequencerState) => void;
}

const IDLE_STATUS = "Drop an audio file to analyze (dev spike — nothing uploads).";

/**
 * Throwaway dev harness (Phase A spike) for PR-39. Gated behind `?songlab=1`.
 * Decodes an uploaded file, decomposes it into an estimated BPM + one-bar
 * pattern, and lets the user load the result onto the grid for auditioning.
 */
export function SongDecomposePanel({ onLoad }: Props) {
  const [decomp, setDecomp] = useState<SongDecomposition | null>(null);
  const [status, setStatus] = useState<string>(IDLE_STATUS);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    setStatus(`Analyzing ${file.name}…`);
    try {
      const decoded = await decodeAudioFile(file);
      const result = decomposeSong(decoded);
      setDecomp(result);
      setStatus(
        `~${result.bpm} BPM · confidence ${(result.overallConfidence * 100).toFixed(0)}%` +
          ` · window @ ${(result.window.startMs / 1000).toFixed(2)}s`,
      );
    } catch (error) {
      setDecomp(null);
      setStatus(`Could not analyze this file: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-label="Song decompose (dev spike)"
      style={{
        border: "1px dashed #888",
        borderRadius: 8,
        padding: 12,
        margin: "8px 0",
        fontSize: 13,
      }}
    >
      <strong>Song decompose (spike)</strong>
      <div style={{ marginTop: 6 }}>
        <input
          type="file"
          accept="audio/*"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </div>
      <p style={{ margin: "6px 0" }}>{status}</p>
      {decomp && (
        <>
          <pre style={{ fontSize: 11, lineHeight: 1.4, overflowX: "auto" }}>
            {INSTRUMENT_IDS.map(
              (lane) =>
                `${lane.padEnd(7)} ${decomp.pattern[lane]
                  .map((step) => (step ? "x" : "."))
                  .join("")}`,
            ).join("\n")}
          </pre>
          <button
            type="button"
            onClick={() => onLoad(decompositionToSequencerState(decomp))}
          >
            Load into grid
          </button>
        </>
      )}
    </section>
  );
}

import { useMemo, useState } from "react";

import { decodeAudioFile } from "../lib/audioFileDecode";
import { decompositionToSequencerState } from "../lib/decompositionToSequencerState";
import type { SequencerState } from "../lib/patternState";
import { INSTRUMENT_IDS } from "../lib/patterns";
import { createSongLabPreview } from "../lib/songLabPreview";
import { decomposeSong, type SongDecomposition } from "../lib/songDecompose";
import type { DecodedAudio } from "../lib/wav";

interface Props {
  onLoad: (state: SequencerState) => void;
}

const IDLE_STATUS = "Drop an audio file to analyze (dev spike — nothing uploads).";
const DEFAULT_SENSITIVITY = 0.55;

/**
 * Throwaway dev harness (Phase A spike) for PR-39. Gated behind `?songlab=1`.
 * Decodes an uploaded file, decomposes it into an estimated BPM + one-bar
 * pattern, and lets the user load the result onto the grid for auditioning.
 */
export function SongDecomposePanel({ onLoad }: Props) {
  const [decoded, setDecoded] = useState<DecodedAudio | null>(null);
  const [decomp, setDecomp] = useState<SongDecomposition | null>(null);
  const [status, setStatus] = useState<string>(IDLE_STATUS);
  const [busy, setBusy] = useState(false);
  const [sensitivity, setSensitivity] = useState(DEFAULT_SENSITIVITY);
  const [bpmCorrection, setBpmCorrection] = useState(120);
  const [windowStartSec, setWindowStartSec] = useState(0);
  const preview = useMemo(
    () => (decoded && decomp ? createSongLabPreview(decoded, decomp) : null),
    [decoded, decomp],
  );

  async function handleFile(file: File) {
    setBusy(true);
    setStatus(`Analyzing ${file.name}…`);
    try {
      const nextDecoded = await decodeAudioFile(file);
      setDecoded(nextDecoded);
      analyzeDecoded(nextDecoded, { useCorrections: false });
    } catch (error) {
      setDecoded(null);
      setDecomp(null);
      setStatus(`Could not analyze this file: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  function analyzeDecoded(
    audio: DecodedAudio,
    options: { useCorrections: boolean },
  ) {
    const result = decomposeSong(audio, {
      sensitivity,
      bpmOverride: options.useCorrections ? bpmCorrection : undefined,
      windowStartMs: options.useCorrections ? windowStartSec * 1000 : undefined,
    });
    setDecomp(result);
    setBpmCorrection(result.bpm);
    setWindowStartSec(roundSeconds(result.window.startMs / 1000));
    setStatus(formatStatus(result));
  }

  function reanalyze() {
    if (!decoded) {
      return;
    }

    setBusy(true);
    try {
      analyzeDecoded(decoded, { useCorrections: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel songlab-panel" aria-label="Song decompose spike">
      <div className="songlab-panel__head">
        <div>
          <p className="eyebrow">Song lab</p>
          <strong>Upload and rebuild</strong>
        </div>
        <span>Client-side spike</span>
      </div>
      <label className="songlab-file">
        <span className="eyebrow">Audio file</span>
        <input
          type="file"
          accept="audio/*"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </label>
      <p className="status-copy">{status}</p>
      {decomp && (
        <>
          <div className="songlab-corrections" aria-label="Song analysis corrections">
            <label>
              <span className="eyebrow">Sensitivity</span>
              <input
                type="range"
                min="0.2"
                max="0.9"
                step="0.05"
                value={sensitivity}
                disabled={busy}
                onChange={(event) => setSensitivity(Number(event.target.value))}
              />
              <small>{Math.round(sensitivity * 100)}%</small>
            </label>
            <label>
              <span className="eyebrow">BPM</span>
              <input
                type="number"
                min="60"
                max="180"
                value={bpmCorrection}
                disabled={busy}
                onChange={(event) => setBpmCorrection(Number(event.target.value))}
              />
            </label>
            <label>
              <span className="eyebrow">Start sec</span>
              <input
                type="number"
                min="0"
                step="0.05"
                value={windowStartSec}
                disabled={busy}
                onChange={(event) => setWindowStartSec(Number(event.target.value))}
              />
            </label>
            <button
              className="button secondary compact"
              type="button"
              disabled={busy || !decoded}
              onClick={reanalyze}
            >
              Re-analyze
            </button>
          </div>
          {preview ? (
            <div className="songlab-preview">
              <div
                className="songlab-waveform"
                aria-label="Waveform preview with onset markers"
              >
                <span
                  className="songlab-window"
                  style={{
                    left: `${preview.windowStartPercent}%`,
                    width: `${preview.windowWidthPercent}%`,
                  }}
                />
                {preview.bars.map((bar) => (
                  <span
                    className={`songlab-waveform__bar ${bar.inWindow ? "active" : ""}`}
                    key={`${bar.atMs}-${bar.leftPercent}`}
                    style={{
                      height: `${bar.heightPercent}%`,
                      left: `${bar.leftPercent}%`,
                    }}
                  />
                ))}
                {preview.markers.map((marker) => (
                  <span
                    className={`songlab-marker ${marker.needsCorrection ? "warn" : ""}`}
                    key={marker.id}
                    style={{ left: `${marker.leftPercent}%` }}
                    title={`${marker.instrument} step ${marker.stepNumber} · ${marker.confidencePercent}%`}
                  >
                    {marker.stepNumber}
                  </span>
                ))}
              </div>
              <div className="songlab-marker-list" aria-label="Classified onsets">
                {preview.markers.length > 0 ? (
                  preview.markers.slice(0, 12).map((marker) => (
                    <span key={marker.id}>
                      {marker.stepNumber}. {marker.instrument} · {marker.confidencePercent}%
                    </span>
                  ))
                ) : (
                  <span>No onsets detected</span>
                )}
              </div>
            </div>
          ) : null}
          <div className="songlab-metrics">
            <span>
              <strong>{decomp.bpm}</strong>
              BPM
            </span>
            <span>
              <strong>{(decomp.bpmConfidence * 100).toFixed(0)}%</strong>
              tempo
            </span>
            <span>
              <strong>{(decomp.overallConfidence * 100).toFixed(0)}%</strong>
              overall
            </span>
          </div>
          {decomp.tempoCandidates.length > 0 ? (
            <p className="songlab-candidates">
              Candidates: {decomp.tempoCandidates
                .map((candidate) => `${candidate.bpm} BPM (${candidate.weight})`)
                .join(", ")}
            </p>
          ) : null}
          <pre className="songlab-pattern">
            {INSTRUMENT_IDS.map(
              (lane) =>
                `${lane.padEnd(7)} ${decomp.pattern[lane]
                  .map((step) => (step ? "x" : "."))
                  .join("")}`,
            ).join("\n")}
          </pre>
          <button
            className="star-button compact"
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

function formatStatus(result: SongDecomposition): string {
  return `~${result.bpm} BPM · confidence ${(result.overallConfidence * 100).toFixed(0)}%` +
    ` · window @ ${(result.window.startMs / 1000).toFixed(2)}s`;
}

function roundSeconds(value: number): number {
  return Math.round(value * 100) / 100;
}

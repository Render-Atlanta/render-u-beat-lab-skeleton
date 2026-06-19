import { useEffect, useMemo, useRef, useState } from "react";
import {
  createBeatEngine,
  type AudioEngineKind,
  type BeatEngine,
} from "./audio/beatEngine";
import type { ProducerTagSample } from "./audio/audioEngine";
import { getKitSampleUrls } from "./audio/sampleKit";
import { ArrangementPanel } from "./components/ArrangementPanel";
import { BeatCoachPanel } from "./components/BeatCoachPanel";
import { CapturePanel } from "./components/CapturePanel";
import { ProducerTagControls, type RecordedState } from "./components/ProducerTagControls";
import { SequencerPanel } from "./components/SequencerPanel";
import { StyleSelector } from "./components/StyleSelector";
import {
  createBeatLabProject,
  createDefaultArrangement,
  exportProjectJson,
  toggleSectionLaneMute,
  type Arrangement,
  type ArrangementSectionId,
} from "./lib/arrangement";
import { BEAT_STYLES, type BeatStyleId } from "./lib/beatStyles";
import {
  classifiedHitsToPattern,
  moveBeatboxHitToLane,
  preserveManualBeatboxCorrections,
} from "./lib/beatboxClassifier";
import {
  createCaptureAnalysis,
  getMicCaptureErrorMessage,
  type MicCaptureState,
} from "./lib/captureAnalysis";
import {
  getStyleCoach,
  summarizePatternChange,
} from "./lib/beatCoach";
import {
  captureMicrophoneSample,
  getMicCaptureSupport,
} from "./lib/micCapture";
import {
  createDefaultSequencerState,
  readSequencerStateFromParams,
  togglePatternStep,
  writeSequencerStateToParams,
  type SequencerState,
} from "./lib/patternState";
import { countActiveSteps, type InstrumentId } from "./lib/patterns";
import {
  DEFAULT_PRODUCER_TAG_TEXT,
  normalizeProducerTagConfig,
  type ProducerTagSource,
  type ProducerTagTrigger,
} from "./lib/producerTag";
import { decodeProducerTagSample } from "./lib/producerTagSample";
import { renderBeatWav } from "./lib/exportBeat";
import {
  createPlayableStyle,
  getSequencerLoopDurationMs,
  getSwingPercent,
  resetSequencerLaneVolume,
  updateSequencerBassStepPitch,
  updateSequencerBpm,
  updateSequencerLaneVolume,
  updateSequencerMelodyStepPitch,
  updateSequencerSwing,
} from "./lib/sequencerDomain";
import { getStyleReferences } from "./lib/styleReferences";
import { getInKeyPalette, getMelodyPalette } from "./lib/stepPitch";
import { StyleFidelityMeter } from "./components/StyleFidelityMeter";
import { EqVisualizer } from "./components/EqVisualizer";
import type { DecodedKit } from "./lib/styleRender";
import { loadKitFromUrls } from "./lib/loadKit.browser";
import { GuidedModeBanner } from "./components/GuidedModeBanner";
import { INSTRUMENTS } from "./lib/instruments";
import {
  advanceGuidedStep,
  exitGuided,
  getGuidedSequence,
  getRevealedLaneIds,
  isLastGuidedStep,
  maskPatternToLanes,
  skipGuided,
  startGuidedState,
  type GuidedModeState,
} from "./lib/guidedMode";
import { readGuidedPref, writeGuidedPref } from "./lib/guidedModePrefs";

/**
 * Playable style whose pattern is the *audible* one: while guided mode is active
 * the pattern is masked to the revealed lanes; otherwise it is the full pattern.
 * Pure — it closes over nothing, so callers always pass fresh state/guided values.
 */
function audibleStyle(state: SequencerState, guided: GuidedModeState) {
  const pattern = guided.active
    ? maskPatternToLanes(state.pattern, getRevealedLaneIds(guided))
    : state.pattern;
  return createPlayableStyle({ ...state, pattern });
}

export function App() {
  const [sequencer, setSequencer] = useState<SequencerState>(() =>
    readSequencerStateFromParams(new URLSearchParams(window.location.search)),
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [producerTagText, setProducerTagText] = useState(DEFAULT_PRODUCER_TAG_TEXT);
  const [producerTagEnabled, setProducerTagEnabled] = useState(true);
  const [producerTagTrigger, setProducerTagTrigger] =
    useState<ProducerTagTrigger>("manual");
  const [producerTagRate, setProducerTagRate] = useState(0.86);
  const [producerTagPitch, setProducerTagPitch] = useState(0.72);
  const [producerTagSource, setProducerTagSource] = useState<ProducerTagSource>("text");
  const [recordedPcm, setRecordedPcm] = useState<ProducerTagSample | null>(null);
  const [recordedState, setRecordedState] = useState<RecordedState>("none");
  const [arrangement, setArrangement] = useState<Arrangement>(() =>
    createDefaultArrangement(),
  );
  const [captureSensitivity, setCaptureSensitivity] = useState(0.55);
  const [audioEngineKind, setAudioEngineKind] =
    useState<AudioEngineKind>("web-audio");
  const [projectJson, setProjectJson] = useState("");
  const [exportMessage, setExportMessage] = useState("");
  const [micState, setMicState] = useState<MicCaptureState>({ status: "idle" });
  const engineRef = useRef<BeatEngine | null>(null);
  const [kit, setKit] = useState<DecodedKit | null>(null);
  const [kitError, setKitError] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [guidedState, setGuidedState] = useState<GuidedModeState>(() =>
    readGuidedPref() === "guided"
      ? startGuidedState()
      : { active: false, stepIndex: getGuidedSequence().length - 1 },
  );

  const baseStyle = BEAT_STYLES[sequencer.styleId];
  const styleCoach = useMemo(
    () => getStyleCoach(sequencer.styleId),
    [sequencer.styleId],
  );
  const styleReferences = useMemo(
    () => getStyleReferences(sequencer.styleId),
    [sequencer.styleId],
  );
  const patternSummary = useMemo(
    () => summarizePatternChange(sequencer.styleId, sequencer.pattern),
    [sequencer.pattern, sequencer.styleId],
  );
  const producerTagConfig = useMemo(
    () =>
      normalizeProducerTagConfig({
        enabled: producerTagEnabled,
        text: producerTagText,
        trigger: producerTagTrigger,
        source: producerTagSource,
        effects: {
          rate: producerTagRate,
          pitch: producerTagPitch,
        },
      }),
    [producerTagEnabled, producerTagPitch, producerTagRate, producerTagText, producerTagTrigger, producerTagSource],
  );
  const micSupport = useMemo(() => getMicCaptureSupport(), []);
  const activeSteps = useMemo(
    () => countActiveSteps(sequencer.pattern),
    [sequencer.pattern],
  );
  const captureLoopDurationMs = useMemo(
    () => getSequencerLoopDurationMs(sequencer.bpm),
    [sequencer.bpm],
  );
  const revealedLaneIds = useMemo(
    () => getRevealedLaneIds(guidedState),
    [guidedState],
  );
  const visibleInstruments = useMemo(
    () => INSTRUMENTS.filter((instrument) => revealedLaneIds.includes(instrument.id)),
    [revealedLaneIds],
  );
  const guidedInstrument = INSTRUMENTS[guidedState.stepIndex] ?? INSTRUMENTS[0];
  const playableStyle = useMemo(
    () => audibleStyle(sequencer, guidedState),
    [sequencer, guidedState],
  );
  const bassPalette = useMemo(
    () => getInKeyPalette(baseStyle.musicalKey),
    [baseStyle.musicalKey],
  );
  const melodyPalette = useMemo(
    () => getMelodyPalette(baseStyle.musicalKey),
    [baseStyle.musicalKey],
  );

  useEffect(() => {
    const params = writeSequencerStateToParams(sequencer);
    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", nextUrl);
  }, [sequencer]);

  useEffect(
    () => () => {
      void engineRef.current?.dispose();
      engineRef.current = null;
    },
    [],
  );

  useEffect(() => {
    void loadKitFromUrls().then(setKit).catch(() => { setKit(null); setKitError(true); });
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      setActiveStep(null);
      return;
    }

    let frame = 0;
    let last: number | null = null;
    const tick = () => {
      const next = engineRef.current?.getActiveStep() ?? null;
      if (next !== last) {
        last = next;
        setActiveStep(next);
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [isPlaying]);

  useEffect(() => {
    setMicState((current) => {
      if (current.status !== "captured") {
        return current;
      }

      const nextAnalysis = createCaptureAnalysis(
        current.result,
        captureSensitivity,
        captureLoopDurationMs,
      );

      return {
        ...current,
        preview: nextAnalysis.preview,
        classifications: preserveManualBeatboxCorrections(
          nextAnalysis.classifications,
          current.classifications,
        ),
      };
    });
  }, [captureLoopDurationMs, captureSensitivity]);

  // Sync producer tag config to engine whenever it changes.
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setProducerTagConfig(producerTagConfig);
    }
  }, [producerTagConfig]);

  async function getEngine() {
    let engine = engineRef.current;
    let isNewEngine = false;
    if (!engine || engine.kind !== audioEngineKind) {
      void engine?.dispose();
      engine = createBeatEngine({
        kind: audioEngineKind,
        toneSampleUrls:
          audioEngineKind === "tone-sample"
            ? getKitSampleUrls(sequencer.styleId)
            : undefined,
      });
      engineRef.current = engine;
      isNewEngine = true;
    }
    await engine.ready();
    // The ref can be replaced or nulled while ready() is in flight (e.g. an
    // engine switch). If so, retry with the current selection.
    if (engineRef.current !== engine || engine.kind !== audioEngineKind) {
      return getEngine();
    }
    // Replay current producer-tag state onto a freshly-created engine so that
    // recorded sample + config are not lost after an engine switch.
    if (isNewEngine) {
      engine.setProducerTagSample(recordedPcm);
      engine.setProducerTagConfig(producerTagConfig);
    }
    return engine;
  }

  async function togglePlayback() {
    const engine = await getEngine();
    if (isPlaying) {
      engine.stop();
      setIsPlaying(false);
      return;
    }

    engine.start(playableStyle);
    setIsPlaying(true);

    if (producerTagConfig.enabled && producerTagConfig.trigger === "intro") {
      engine.playProducerTag(producerTagConfig);
    }
  }

  async function playProducerTag() {
    if (!producerTagConfig.enabled) {
      return;
    }

    const engine = await getEngine();
    engine.playProducerTag(producerTagConfig);
  }

  function applySequencerState(next: SequencerState) {
    setSequencer(next);
    if (isPlaying && engineRef.current) {
      engineRef.current.start(audibleStyle(next, guidedState));
    }
  }

  function resetToStyle(styleId = sequencer.styleId) {
    applySequencerState(createDefaultSequencerState(styleId));
  }

  function updateBpm(bpm: number) {
    applySequencerState(updateSequencerBpm(sequencer, bpm));
  }

  function updateSwing(swingPercent: number) {
    applySequencerState(updateSequencerSwing(sequencer, swingPercent));
  }

  function updateAudioEngineKind(kind: AudioEngineKind) {
    if (kind === audioEngineKind) {
      return;
    }

    engineRef.current?.stop();
    void engineRef.current?.dispose();
    engineRef.current = null;
    setIsPlaying(false);
    setAudioEngineKind(kind);
  }

  function toggleStep(instrument: InstrumentId, stepIndex: number) {
    applySequencerState({
      ...sequencer,
      pattern: togglePatternStep(sequencer.pattern, instrument, stepIndex),
    });
  }

  function updateLaneVolume(instrument: InstrumentId, volume: number) {
    applySequencerState(updateSequencerLaneVolume(sequencer, instrument, volume));
  }

  function resetLaneVolume(instrument: InstrumentId) {
    applySequencerState(resetSequencerLaneVolume(sequencer, instrument));
  }

  function updateBassStepPitch(stepIndex: number, degree: number) {
    applySequencerState(updateSequencerBassStepPitch(sequencer, stepIndex, degree));
  }

  function updateMelodyStepPitch(stepIndex: number, degree: number) {
    applySequencerState(updateSequencerMelodyStepPitch(sequencer, stepIndex, degree));
  }

  function changeGuidedState(next: GuidedModeState) {
    setGuidedState(next);
    writeGuidedPref(next.active ? "guided" : "free");
    if (isPlaying && engineRef.current) {
      engineRef.current.start(audibleStyle(sequencer, next));
    }
  }

  function handleGuidedNext() {
    changeGuidedState(advanceGuidedStep(guidedState));
  }

  function handleGuidedSkip() {
    changeGuidedState(skipGuided(guidedState));
  }

  function handleGuidedExit() {
    changeGuidedState(exitGuided(guidedState));
  }

  function handleGuidedStart() {
    changeGuidedState(startGuidedState());
  }

  async function captureMicSample() {
    if (!micSupport.supported) {
      setMicState({ status: "error", message: micSupport.message });
      return;
    }

    setMicState({ status: "recording" });

    try {
      const result = await captureMicrophoneSample();
      const analysis = createCaptureAnalysis(result, captureSensitivity, captureLoopDurationMs);
      setMicState({ status: "captured", result, ...analysis });
    } catch (error) {
      setMicState({
        status: "error",
        message: getMicCaptureErrorMessage(error),
      });
    }
  }

  async function recordTag() {
    if (!micSupport.supported) {
      setMicState({ status: "error", message: micSupport.message });
      return;
    }

    setRecordedState("recording");

    try {
      const result = await captureMicrophoneSample({ durationMs: 3000 });
      const pcm = await decodeProducerTagSample(result.blob);
      setRecordedPcm(pcm);
      setRecordedState("recorded");
      const engine = engineRef.current;
      if (engine) {
        engine.setProducerTagSample(pcm);
      }
    } catch (error) {
      setRecordedState("none");
      setRecordedPcm(null);
      engineRef.current?.setProducerTagSample(null);
      setMicState({
        status: "error",
        message: getMicCaptureErrorMessage(error),
      });
    }
  }

  function clearRecording() {
    setRecordedPcm(null);
    setRecordedState("none");
    engineRef.current?.setProducerTagSample(null);
  }

  function updateCapturedHitLane(hitId: string, instrument: InstrumentId) {
    setMicState((current) => {
      if (current.status !== "captured") {
        return current;
      }

      return {
        ...current,
        classifications: moveBeatboxHitToLane(current.classifications, hitId, instrument),
      };
    });
  }

  function applyClassifiedHitsToPattern() {
    if (micState.status !== "captured") {
      return;
    }

    applySequencerState({
      ...sequencer,
      pattern: classifiedHitsToPattern(micState.classifications),
    });
  }

  function exportProject() {
    const project = createBeatLabProject({
      sequencer,
      producerTag: producerTagConfig,
      arrangement,
    });
    setProjectJson(exportProjectJson(project));
    setExportMessage("Project JSON is ready.");
  }

  function downloadWav() {
    if (!kit) {
      setExportMessage("Kit is still loading — try again in a moment.");
      return;
    }

    try {
      const tag =
        producerTagEnabled && producerTagSource === "recorded" && recordedPcm
          ? { samples: recordedPcm.samples, trigger: producerTagTrigger }
          : undefined;

      const bytes = renderBeatWav({
        // Export always renders the full stored beat, never the guided-mode mask:
        // build the style from `sequencer` directly so `style.pattern` is unmasked too.
        pattern: sequencer.pattern,
        style: createPlayableStyle(sequencer),
        kit,
        loops: 2,
        tag,
      });

      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "render-u-beat.wav";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      setExportMessage("WAV download started.");
    } catch (error) {
      setExportMessage(
        error instanceof Error ? error.message : "WAV export failed.",
      );
    }
  }

  function toggleArrangementLaneMute(
    sectionId: ArrangementSectionId,
    instrument: InstrumentId,
  ) {
    setArrangement((current) =>
      toggleSectionLaneMute(current, sectionId, instrument),
    );
  }

  return (
    <main data-palette="atl" className="app-shell">
      <nav className="site-nav" aria-label="Primary">
        <a className="brand-lockup" href="#top">
          <span aria-hidden="true">★</span>
          Render U Beat Lab
        </a>
        <div className="nav-actions">
          <span className="eyebrow">Prototype 01</span>
        </div>
      </nav>

      <section id="top" className="hero">
        <p className="eyebrow">★ From vibe coding to AI engineering</p>
        <h1 className="display display-xl">
          Turn table taps into a <span className="underline-accent">beat</span>
        </h1>
        <p className="hero-copy">
          A workshop skeleton for learning reusable AI workflows through a real
          browser music toy: patterns first, capture next, producer polish after.
        </p>
        <div className="hero-actions">
          <button className="star-button" type="button" onClick={togglePlayback}>
            <span aria-hidden="true">★</span>
            {isPlaying ? "Stop loop" : "Run it"}
            <span aria-hidden="true">★</span>
          </button>
          <button className="button secondary" type="button" onClick={playProducerTag}>
            Producer tag
          </button>
        </div>
      </section>

      <section className="workbench" aria-label="Beat workbench">
        <StyleSelector
          styles={Object.values(BEAT_STYLES)}
          selectedStyleId={sequencer.styleId}
          onSelectStyle={resetToStyle}
        />

        {guidedState.active ? (
          <GuidedModeBanner
            instrument={guidedInstrument}
            stepIndex={guidedState.stepIndex}
            stepCount={getGuidedSequence().length}
            isLastStep={isLastGuidedStep(guidedState)}
            onNext={handleGuidedNext}
            onSkip={handleGuidedSkip}
            onExit={handleGuidedExit}
          />
        ) : (
          <div className="guided-reentry">
            <button
              className="button secondary compact"
              type="button"
              onClick={handleGuidedStart}
            >
              ▸ Start guided build
            </button>
          </div>
        )}
        <SequencerPanel
          styleName={baseStyle.name}
          activeSteps={activeSteps}
          bpm={sequencer.bpm}
          swingPercent={getSwingPercent(sequencer.swing)}
          audioEngineKind={audioEngineKind}
          pattern={sequencer.pattern}
          laneVolumes={sequencer.laneVolumes}
          bassStepPitches={sequencer.bassStepPitches}
          bassPalette={bassPalette}
          melodyStepPitches={sequencer.melodyStepPitches}
          melodyPalette={melodyPalette}
          activeStep={activeStep}
          onBpmChange={updateBpm}
          onSwingChange={updateSwing}
          onAudioEngineKindChange={updateAudioEngineKind}
          onLaneVolumeChange={updateLaneVolume}
          onLaneVolumeReset={resetLaneVolume}
          onReset={() => resetToStyle()}
          onToggleStep={toggleStep}
          onBassStepPitchChange={updateBassStepPitch}
          onMelodyStepPitchChange={updateMelodyStepPitch}
          visibleInstruments={visibleInstruments}
        />

        <StyleFidelityMeter style={playableStyle} kit={kit} kitError={kitError} />

        <EqVisualizer engine={engineRef.current} isPlaying={isPlaying} />

        <aside className="panel coach-panel">
          <BeatCoachPanel
            lesson={baseStyle.lesson}
            styleCoach={styleCoach}
            patternSummary={patternSummary}
            references={styleReferences}
          />
          <ProducerTagControls
            config={producerTagConfig}
            text={producerTagText}
            enabled={producerTagEnabled}
            trigger={producerTagTrigger}
            rate={producerTagRate}
            pitch={producerTagPitch}
            source={producerTagSource}
            recordedState={recordedState}
            onTextChange={setProducerTagText}
            onEnabledChange={setProducerTagEnabled}
            onTriggerChange={setProducerTagTrigger}
            onRateChange={setProducerTagRate}
            onPitchChange={setProducerTagPitch}
            onSourceChange={setProducerTagSource}
            onRecord={recordTag}
            onClearRecording={clearRecording}
          />
          <ArrangementPanel
            arrangement={arrangement}
            exportMessage={exportMessage}
            projectJson={projectJson}
            onToggleLaneMute={toggleArrangementLaneMute}
            onExportProject={exportProject}
            onDownloadWav={downloadWav}
          />
          <CapturePanel
            micState={micState}
            sensitivity={captureSensitivity}
            onSensitivityChange={setCaptureSensitivity}
            onCapture={captureMicSample}
            onHitLaneChange={updateCapturedHitLane}
            onSendLanes={applyClassifiedHitsToPattern}
          />
        </aside>
      </section>
    </main>
  );
}

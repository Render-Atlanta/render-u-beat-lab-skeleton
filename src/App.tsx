import { useEffect, useMemo, useRef, useState } from "react";
import { createBeatEngine, type BeatEngine } from "./audio/beatEngine";
import { ArrangementPanel } from "./components/ArrangementPanel";
import { BeatCoachPanel } from "./components/BeatCoachPanel";
import { CapturePanel } from "./components/CapturePanel";
import { ProducerTagControls } from "./components/ProducerTagControls";
import { SequencerPanel } from "./components/SequencerPanel";
import { StyleSelector } from "./components/StyleSelector";
import {
  createBeatLabProject,
  createDefaultArrangement,
  createUnsupportedWavExportResult,
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
  type ProducerTagTrigger,
} from "./lib/producerTag";
import {
  createPlayableStyle,
  getSequencerLoopDurationMs,
  getSwingPercent,
  updateSequencerBpm,
  updateSequencerSwing,
} from "./lib/sequencerDomain";
import { getStyleReferences } from "./lib/styleReferences";

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
  const [arrangement, setArrangement] = useState<Arrangement>(() =>
    createDefaultArrangement(),
  );
  const [captureSensitivity, setCaptureSensitivity] = useState(0.55);
  const [projectJson, setProjectJson] = useState("");
  const [exportMessage, setExportMessage] = useState("");
  const [micState, setMicState] = useState<MicCaptureState>({ status: "idle" });
  const engineRef = useRef<BeatEngine | null>(null);

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
        effects: {
          rate: producerTagRate,
          pitch: producerTagPitch,
        },
      }),
    [producerTagEnabled, producerTagPitch, producerTagRate, producerTagText, producerTagTrigger],
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
  const playableStyle = useMemo(
    () => createPlayableStyle(sequencer),
    [sequencer],
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

  async function getEngine() {
    if (!engineRef.current) {
      engineRef.current = createBeatEngine();
    }
    await engineRef.current.ready();
    return engineRef.current;
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
      engineRef.current.start(createPlayableStyle(next));
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

  function toggleStep(instrument: InstrumentId, stepIndex: number) {
    applySequencerState({
      ...sequencer,
      pattern: togglePatternStep(sequencer.pattern, instrument, stepIndex),
    });
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

  function showWavStretchMessage() {
    const result = createUnsupportedWavExportResult();
    setExportMessage(result.message);
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

        <SequencerPanel
          styleName={baseStyle.name}
          activeSteps={activeSteps}
          bpm={sequencer.bpm}
          swingPercent={getSwingPercent(sequencer.swing)}
          pattern={sequencer.pattern}
          onBpmChange={updateBpm}
          onSwingChange={updateSwing}
          onReset={() => resetToStyle()}
          onToggleStep={toggleStep}
        />

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
            onTextChange={setProducerTagText}
            onEnabledChange={setProducerTagEnabled}
            onTriggerChange={setProducerTagTrigger}
            onRateChange={setProducerTagRate}
            onPitchChange={setProducerTagPitch}
          />
          <ArrangementPanel
            arrangement={arrangement}
            exportMessage={exportMessage}
            projectJson={projectJson}
            onToggleLaneMute={toggleArrangementLaneMute}
            onExportProject={exportProject}
            onShowWavMessage={showWavStretchMessage}
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

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
import { CountInOverlay } from "./components/CountInOverlay";
import { usePracticeAids } from "./components/usePracticeAids";
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
  writeSequencerStateToParams,
  type SequencerState,
} from "./lib/patternState";
import {
  BEAT_SHARE_PARAM,
  createShareUrl,
  decodeBeatParam,
  readInitialSequencerStateFromSources,
  serializeBeat,
  writeAutosavedSequencerState,
} from "./lib/beatShare";
import { getHistoryShortcut } from "./lib/beatShortcuts";
import {
  createHistoryState,
  getHistorySnapshot,
  pushHistorySnapshot,
  redoHistory,
  restoreHistorySnapshot,
  undoHistory,
  type SequencerHistoryState,
} from "./lib/sequencerHistory";
import {
  countActiveSteps,
  INSTRUMENT_IDS,
  type InstrumentId,
  type Pattern,
} from "./lib/patterns";
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
  paintSequencerStep,
  updateSequencerBassStepPitch,
  updateSequencerBpm,
  updateSequencerLaneVolume,
  updateSequencerMelodyStepPitch,
  updateSequencerStep,
  updateSequencerSwing,
} from "./lib/sequencerDomain";
import { getStyleReferences } from "./lib/styleReferences";
import { getInKeyPalette, getMelodyPalette } from "./lib/stepPitch";
import { createDefaultStepVelocities } from "./lib/stepVelocity";
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

/**
 * Presentational layout modes from the redesign:
 * - rail: tool panel as a sticky right-hand sidebar (default)
 * - focus: tool panel as a bottom sheet over the transport
 * - pro: roomier desktop layout with a wider sidebar
 */
type LayoutMode = "rail" | "focus" | "pro";
/** Which tool occupies the tabbed tool panel on desktop. */
type ToolTab = "coach" | "tag" | "arrange" | "capture";
/** Mobile view selector — "make" shows the sequencer, the rest mirror the tools. */
type MobileTab = "make" | ToolTab;

const LAYOUT_MODES: { id: LayoutMode; label: string }[] = [
  { id: "rail", label: "Rail" },
  { id: "focus", label: "Focus" },
  { id: "pro", label: "Pro" },
];

const TOOL_TABS: { id: ToolTab; label: string }[] = [
  { id: "coach", label: "Coach" },
  { id: "tag", label: "Tag" },
  { id: "arrange", label: "Arrange" },
  { id: "capture", label: "Capture" },
];

const MOBILE_TABS: { id: MobileTab; label: string }[] = [
  { id: "make", label: "Make" },
  ...TOOL_TABS,
];

/** Viewport width at or below which the app switches to the single-column mobile shell. */
const MOBILE_BREAKPOINT = 760;

function getLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readInitialSequencerState(): SequencerState {
  return readInitialSequencerStateFromSources(
    new URLSearchParams(window.location.search),
    getLocalStorage(),
  );
}

export function App() {
  const [sequencer, setSequencer] = useState<SequencerState>(() =>
    readInitialSequencerState(),
  );
  const [history, setHistory] = useState<SequencerHistoryState>(() =>
    createHistoryState(),
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
  // Tag recording errors surface in the Tag tab itself — the CapturePanel that
  // renders micState lives on a different tab in the redesigned shell.
  const [tagRecordError, setTagRecordError] = useState<string | null>(null);
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
  // Presentational shell state (redesign): layout mode, active tool tab, and the
  // mobile view selector. None of this touches the beat — it only arranges UI.
  const [layout, setLayout] = useState<LayoutMode>("rail");
  const [tool, setTool] = useState<ToolTab>("coach");
  const [mobileTab, setMobileTab] = useState<MobileTab>("make");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1280 : window.innerWidth,
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
    const currentBeat = new URLSearchParams(window.location.search).get(
      BEAT_SHARE_PARAM,
    );
    if (currentBeat) {
      const decoded = decodeBeatParam(currentBeat);
      if (decoded && serializeBeat(decoded) === serializeBeat(sequencer)) {
        return;
      }
    }

    const params = writeSequencerStateToParams(sequencer);
    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", nextUrl);
  }, [sequencer]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      writeAutosavedSequencerState(getLocalStorage(), sequencer);
    }, 250);

    return () => window.clearTimeout(timer);
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
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const shortcut = getHistoryShortcut(event);
      if (shortcut === "undo" && history.undo.length > 0) {
        event.preventDefault();
        undoSequencer();
      }
      if (shortcut === "redo" && history.redo.length > 0) {
        event.preventDefault();
        redoSequencer();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [history, sequencer]);

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

  const playableStyleRef = useRef(playableStyle);
  playableStyleRef.current = playableStyle;
  const producerTagConfigRef = useRef(producerTagConfig);
  producerTagConfigRef.current = producerTagConfig;

  const practiceAids = usePracticeAids({
    bpm: sequencer.bpm,
    isPlaying,
    activeStep,
    getEngine,
    onStartPlayback: async (metronomeOn) => {
      const engine = await getEngine();
      engine.setMetronomeEnabled(metronomeOn);
      engine.start(playableStyleRef.current);
      setIsPlaying(true);

      const tagConfig = producerTagConfigRef.current;
      if (tagConfig.enabled && tagConfig.trigger === "intro") {
        engine.playProducerTag(tagConfig);
      }
    },
    onStopPlayback: () => {
      void getEngine().then((engine) => {
        engine.stop();
        engine.setMetronomeEnabled(false);
      });
      setIsPlaying(false);
    },
  });
  const transportActive = isPlaying || practiceAids.isCountingIn;

  async function togglePlayback() {
    await practiceAids.handlePlayRequest();
  }

  async function playProducerTag() {
    if (!producerTagConfig.enabled) {
      return;
    }

    const engine = await getEngine();
    engine.playProducerTag(producerTagConfig);
  }

  function applySequencerState(next: SequencerState, recordHistory = true) {
    if (recordHistory) {
      setHistory((current) => pushHistorySnapshot(current, sequencer, next));
    }
    setSequencer(next);
    if (isPlaying && engineRef.current) {
      engineRef.current.start(audibleStyle(next, guidedState));
    }
  }

  function applySequencerUpdate(
    updater: (current: SequencerState) => SequencerState,
    recordHistory = true,
  ) {
    setSequencer((current) => {
      const next = updater(current);
      if (next === current) {
        return current;
      }
      if (recordHistory) {
        setHistory((historyState) =>
          pushHistorySnapshot(historyState, current, next),
        );
      }
      if (isPlaying && engineRef.current) {
        engineRef.current.start(audibleStyle(next, guidedState));
      }
      return next;
    });
  }

  function resetToStyle(styleId = sequencer.styleId) {
    applySequencerState(createDefaultSequencerState(styleId));
  }

  // Clear empties every step while keeping the current BPM, swing, and mix —
  // distinct from Reset, which restores the style's starter pattern.
  function clearPattern() {
    const emptyPattern = INSTRUMENT_IDS.reduce((pattern, id) => {
      pattern[id] = Array.from({ length: 16 }, () => false);
      return pattern;
    }, {} as Pattern);
    applySequencerState({
      ...sequencer,
      pattern: emptyPattern,
      stepVelocities: createDefaultStepVelocities(),
    });
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
    applySequencerState(updateSequencerStep(sequencer, instrument, stepIndex));
  }

  function paintStep(instrument: InstrumentId, stepIndex: number) {
    applySequencerUpdate((current) =>
      paintSequencerStep(current, instrument, stepIndex),
    );
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

  function restoreSequencerSnapshot(snapshot: ReturnType<typeof getHistorySnapshot>) {
    const next = restoreHistorySnapshot(sequencer, snapshot);
    setSequencer(next);
    if (isPlaying && engineRef.current) {
      engineRef.current.start(audibleStyle(next, guidedState));
    }
  }

  function undoSequencer() {
    const result = undoHistory(history, getHistorySnapshot(sequencer));
    setHistory(result.history);
    restoreSequencerSnapshot(result.snapshot);
  }

  function redoSequencer() {
    const result = redoHistory(history, getHistorySnapshot(sequencer));
    setHistory(result.history);
    restoreSequencerSnapshot(result.snapshot);
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
      setTagRecordError(micSupport.message);
      return;
    }

    setTagRecordError(null);
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
      setTagRecordError(getMicCaptureErrorMessage(error));
    }
  }

  function clearRecording() {
    setRecordedPcm(null);
    setRecordedState("none");
    setTagRecordError(null);
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
      stepVelocities: createDefaultStepVelocities(),
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

  async function shareBeat() {
    const url = createShareUrl(sequencer, window.location);
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard unavailable");
      }
      await navigator.clipboard.writeText(url);
      setExportMessage("Share link copied.");
    } catch {
      setProjectJson(url);
      setExportMessage("Share link is ready.");
    }
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

  function toggleGuided() {
    if (guidedState.active) {
      handleGuidedExit();
    } else {
      handleGuidedStart();
    }
  }

  const isMobile = viewportWidth <= MOBILE_BREAKPOINT;

  // Picking a tool tab also opens the Focus bottom sheet and keeps the mobile
  // selector in sync, so the same control works in every layout.
  function selectTool(next: ToolTab) {
    setTool(next);
    setMobileTab(next);
    if (layout === "focus") {
      setSheetOpen(true);
    }
  }

  // Selecting a mobile tab also syncs the desktop `tool` so the Tools-button
  // fallback and a resize back to desktop both reflect the last tool opened.
  function selectMobileTab(next: MobileTab) {
    setMobileTab(next);
    if (next !== "make") {
      setTool(next);
    }
  }

  // Transport "Tag" shortcut: jump straight to the Tag tool in any layout.
  function jumpToTag() {
    if (isMobile) {
      selectMobileTab("tag");
    } else {
      selectTool("tag");
    }
  }

  function toggleToolSheet() {
    if (isMobile) {
      setMobileTab((current) => (current === "make" ? tool : "make"));
    } else if (layout === "focus") {
      setSheetOpen((open) => !open);
    }
  }

  // On mobile the visible tool follows the tab bar; on desktop it follows `tool`.
  const activeTool: ToolTab =
    isMobile && mobileTab !== "make" ? mobileTab : tool;
  const showSequencer = !isMobile || mobileTab === "make";
  const showToolPanel = isMobile
    ? mobileTab !== "make"
    : layout === "focus"
      ? sheetOpen
      : true;
  // The Tools button only appears where the tool panel can be shown/hidden:
  // on mobile (toggles make ↔ tools) and in the Focus bottom-sheet layout.
  const showToolsButton = isMobile || layout === "focus";

  function renderActiveTool() {
    switch (activeTool) {
      case "tag":
        return (
          <div className="tool-body tag-tab">
            <div className="tool-tab-head">
              <p className="eyebrow">Producer tag</p>
              <button
                className="button secondary compact"
                type="button"
                onClick={playProducerTag}
              >
                ▶ Test tag
              </button>
            </div>
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
            {tagRecordError ? (
              <p className="status-copy" role="alert">
                {tagRecordError}
              </p>
            ) : null}
          </div>
        );
      case "arrange":
        return (
          <div className="tool-body">
            <ArrangementPanel
              arrangement={arrangement}
              exportMessage={exportMessage}
              projectJson={projectJson}
              onToggleLaneMute={toggleArrangementLaneMute}
              onExportProject={exportProject}
              onDownloadWav={downloadWav}
            />
          </div>
        );
      case "capture":
        return (
          <div className="tool-body">
            <CapturePanel
              micState={micState}
              sensitivity={captureSensitivity}
              onSensitivityChange={setCaptureSensitivity}
              onCapture={captureMicSample}
              onHitLaneChange={updateCapturedHitLane}
              onSendLanes={applyClassifiedHitsToPattern}
            />
          </div>
        );
      case "coach":
      default:
        return (
          <div className="tool-body coach-panel">
            <BeatCoachPanel
              lesson={baseStyle.lesson}
              styleCoach={styleCoach}
              patternSummary={patternSummary}
              references={styleReferences}
            />
          </div>
        );
    }
  }

  return (
    <main
      data-palette="atl"
      className="app-shell"
      data-layout={layout}
      data-mobile={isMobile}
    >
      <CountInOverlay beat={practiceAids.countInBeat} />
      <nav className="site-nav" aria-label="Primary">
        <a className="brand-lockup" href="#top">
          <span aria-hidden="true">★</span>
          Render U Beat Lab
        </a>
        <div className="nav-actions">
          {!isMobile ? (
            <div className="layout-switch" role="group" aria-label="Layout mode">
              {LAYOUT_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  className={`layout-switch__btn ${layout === mode.id ? "active" : ""}`}
                  aria-pressed={layout === mode.id}
                  onClick={() => {
                    setLayout(mode.id);
                    setSheetOpen(false);
                  }}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            className={`button compact ${guidedState.active ? "" : "secondary"}`}
            aria-pressed={guidedState.active}
            onClick={toggleGuided}
          >
            {guidedState.active ? "Exit guided" : "Start guided"}
          </button>
        </div>
      </nav>

      <header id="top" className="hero">
        <p className="eyebrow">★ Make a beat in minutes</p>
        <h1 className="display hero__title">
          Tap out a <span className="underline-accent">beat</span>
        </h1>
      </header>

      <StyleSelector
        styles={Object.values(BEAT_STYLES)}
        selectedStyleId={sequencer.styleId}
        onSelectStyle={resetToStyle}
      />

      <section className="work-area" aria-label="Beat workbench">
        {showSequencer ? (
          <div className="work-main">
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
            ) : null}
            <SequencerPanel
              styleName={baseStyle.name}
              activeSteps={activeSteps}
              bpm={sequencer.bpm}
              swingPercent={getSwingPercent(sequencer.swing)}
              audioEngineKind={audioEngineKind}
              pattern={sequencer.pattern}
              laneVolumes={sequencer.laneVolumes}
              stepVelocities={sequencer.stepVelocities}
              bassStepPitches={sequencer.bassStepPitches}
              bassPalette={bassPalette}
              melodyStepPitches={sequencer.melodyStepPitches}
              melodyPalette={melodyPalette}
              activeStep={activeStep}
              canUndo={history.undo.length > 0}
              canRedo={history.redo.length > 0}
              onBpmChange={updateBpm}
              onSwingChange={updateSwing}
              onAudioEngineKindChange={updateAudioEngineKind}
              onLaneVolumeChange={updateLaneVolume}
              onLaneVolumeReset={resetLaneVolume}
              onReset={() => resetToStyle()}
              onClear={clearPattern}
              onUndo={undoSequencer}
              onRedo={redoSequencer}
              onShare={shareBeat}
              countInEnabled={practiceAids.countInEnabled}
              metronomeEnabled={practiceAids.metronomeEnabled}
              onCountInToggle={practiceAids.toggleCountIn}
              onMetronomeToggle={practiceAids.toggleMetronome}
              onToggleStep={toggleStep}
              onPaintStep={paintStep}
              onBassStepPitchChange={updateBassStepPitch}
              onMelodyStepPitchChange={updateMelodyStepPitch}
              visibleInstruments={visibleInstruments}
            />
            <StyleFidelityMeter style={playableStyle} kit={kit} kitError={kitError} />
          </div>
        ) : null}

        {showToolPanel ? (
          <div className="tool-dock" data-sheet={!isMobile && layout === "focus"}>
            <div className="tool-panel">
              {!isMobile ? (
                <div className="tool-tabs" role="tablist" aria-label="Tools">
                  {TOOL_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={activeTool === tab.id}
                      className={`tool-tab ${activeTool === tab.id ? "active" : ""}`}
                      onClick={() => selectTool(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              ) : null}
              {renderActiveTool()}
            </div>
          </div>
        ) : null}
      </section>

      <div className="transport" role="region" aria-label="Transport">
        <div className="transport__inner">
          <button
            type="button"
            className="transport__play"
            aria-label={transportActive ? "Stop" : "Play"}
            aria-pressed={transportActive}
            onClick={togglePlayback}
          >
            {transportActive ? "❚❚" : "▶"}
          </button>
          <span
            className={`transport__metro ${practiceAids.metronomeEnabled && practiceAids.metroPulse ? "on" : ""}`}
            aria-hidden="true"
            title="Metronome"
          />
          <div className="transport__meter">
            <div className="transport__beats" aria-hidden="true">
              {Array.from({ length: 16 }, (_, index) => (
                <span
                  key={index}
                  className={[
                    "beat-dot",
                    index === activeStep ? "active" : "",
                    index % 4 === 0 ? "downbeat" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                />
              ))}
            </div>
            <EqVisualizer engine={engineRef.current} isPlaying={isPlaying} />
          </div>
          {showToolsButton ? (
            <button
              type="button"
              className="button secondary compact"
              onClick={toggleToolSheet}
            >
              Tools
            </button>
          ) : null}
          <button type="button" className="star-button compact" onClick={jumpToTag}>
            <span aria-hidden="true">★</span>
            Tag
          </button>
        </div>
      </div>

      {isMobile ? (
        <nav className="mobile-tabs" aria-label="Sections">
          {MOBILE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`mobile-tab ${mobileTab === tab.id ? "active" : ""}`}
              aria-pressed={mobileTab === tab.id}
              onClick={() => selectMobileTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      ) : null}
    </main>
  );
}

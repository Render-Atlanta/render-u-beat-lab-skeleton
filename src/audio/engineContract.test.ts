import type { AudioEngineKind } from "./audioEngine";
import { createAudioEngine } from "./audioEngine";
import type { AudioEngineContractHarness, AudioEngineProbe } from "./engineContract";
import { runAudioEngineContract } from "./engineContract";
import {
  createToneFakeRuntime,
  createWebAudioFakeRuntime,
} from "./engineContract.testHelpers";
import { createFakeAudioEngine } from "./fakeAudioEngine";

runAudioEngineContract("web-audio", "web-audio", makeWebAudioHarness);
runAudioEngineContract("tone-sample", "tone-sample", makeToneHarness);
runAudioEngineContract(
  "fake",
  "fake" as AudioEngineKind,
  makeFakeHarness,
);

function makeWebAudioHarness(): AudioEngineContractHarness {
  const runtime = createWebAudioFakeRuntime();
  const engine = createAudioEngine({ kind: "web-audio", runtime });
  let clickPlayCount = 0;
  runtime.onClickPlayed = () => {
    clickPlayCount += 1;
  };

  const probe: AudioEngineProbe = {
    readyCount: () => runtime.contexts[0].resumeCount,
    isScheduling: () => runtime.intervalCallbacks.size > 0,
    disposeCount: () => runtime.contexts[0].closeCount,
    fireSchedulerTick: () => {
      const before = runtime.totalVoiceStarts();
      for (const callback of runtime.intervalCallbacks.values()) {
        callback();
      }
      return runtime.totalVoiceStarts() - before;
    },
    scheduledHitCount: () => runtime.totalVoiceStarts(),
    producerTagPlayCount: () => runtime.totalVoiceStarts(),
    clickPlayCount: () => clickPlayCount,
  };

  return { engine, probe };
}

function makeToneHarness(): AudioEngineContractHarness {
  const runtime = createToneFakeRuntime();
  const engine = createAudioEngine({ kind: "tone-sample", toneRuntime: runtime });
  let clickPlayCount = 0;
  runtime.onClickPlayed = () => {
    clickPlayCount += 1;
  };

  const probe: AudioEngineProbe = {
    readyCount: () => runtime.startCount,
    isScheduling: () => runtime.transport.started && runtime.transport.callback !== null,
    disposeCount: () =>
      Object.values(runtime.voices).every((voice) => voice.disposed) ? 1 : 0,
    fireSchedulerTick: () => {
      const before = runtime.totalVoiceTriggers();
      runtime.transport.run(0);
      return runtime.totalVoiceTriggers() - before;
    },
    scheduledHitCount: () => runtime.totalVoiceTriggers(),
    producerTagPlayCount: () => runtime.totalVoiceTriggers(),
    clickPlayCount: () => clickPlayCount,
  };

  return { engine, probe };
}

function makeFakeHarness(): AudioEngineContractHarness {
  const engine = createFakeAudioEngine();

  const probe: AudioEngineProbe = {
    readyCount: () => engine.readyCount,
    isScheduling: () => engine.running,
    disposeCount: () => (engine.disposed ? 1 : 0),
    fireSchedulerTick: () => (engine.running ? 1 : 0),
    scheduledHitCount: () => engine.startedStyles.length,
    producerTagPlayCount: () => engine.producerTags.length,
    clickPlayCount: () => engine.clickCalls.length,
  };

  return { engine, probe };
}

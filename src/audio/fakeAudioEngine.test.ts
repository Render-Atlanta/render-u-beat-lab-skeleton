import { describe, expect, it } from "vitest";
import { BEAT_STYLES } from "../lib/beatStyles";
import { createFakeAudioEngine } from "./fakeAudioEngine";

describe("fake audio engine (UI test stand-in)", () => {
  it("records the lifecycle without producing audio", async () => {
    const engine = createFakeAudioEngine();

    expect(engine.running).toBe(false);
    expect(engine.disposed).toBe(false);
    expect(engine.lastStyle).toBeNull();

    await engine.ready();
    engine.start(BEAT_STYLES.trap);

    expect(engine.readyCount).toBe(1);
    expect(engine.running).toBe(true);
    expect(engine.lastStyle).toBe(BEAT_STYLES.trap);

    engine.stop();
    expect(engine.running).toBe(false);
  });

  it("records every started style in order", () => {
    const engine = createFakeAudioEngine();

    engine.start(BEAT_STYLES.trap);
    engine.start(BEAT_STYLES.pop);

    expect(engine.startedStyles).toEqual([BEAT_STYLES.trap, BEAT_STYLES.pop]);
    expect(engine.lastStyle).toBe(BEAT_STYLES.pop);
  });

  it("records producer tags so UI tests can assert playback", () => {
    const engine = createFakeAudioEngine();

    engine.playProducerTag("Render U made this");
    engine.playProducerTag({ text: "Custom", trigger: "intro" });

    expect(engine.producerTags).toEqual([
      "Render U made this",
      { text: "Custom", trigger: "intro" },
    ]);
  });

  it("marks itself disposed and stopped on dispose()", () => {
    const engine = createFakeAudioEngine();

    engine.start(BEAT_STYLES.crunk);
    engine.dispose();

    expect(engine.running).toBe(false);
    expect(engine.disposed).toBe(true);
  });
});

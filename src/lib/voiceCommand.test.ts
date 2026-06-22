import { describe, expect, it } from "vitest";
import {
  createSpeechRecognition,
  getSpeechRecognitionCtor,
  getVoiceCommandErrorMessage,
  readVoiceTranscript,
  type SpeechRecognitionLike,
} from "./voiceCommand";

class FakeRecognition implements SpeechRecognitionLike {
  continuous = true;
  interimResults = false;
  lang = "";
  onend = null;
  onerror = null;
  onresult = null;
  abort() {}
  start() {}
  stop() {}
}

function result(transcript: string, isFinal: boolean) {
  return {
    isFinal,
    length: 1,
    item: () => ({ transcript }),
  };
}

describe("voice command helpers", () => {
  it("detects standard or webkit speech recognition constructors", () => {
    expect(getSpeechRecognitionCtor({ SpeechRecognition: FakeRecognition })).toBe(
      FakeRecognition,
    );
    expect(getSpeechRecognitionCtor({ webkitSpeechRecognition: FakeRecognition })).toBe(
      FakeRecognition,
    );
    expect(getSpeechRecognitionCtor({})).toBeNull();
  });

  it("creates a one-shot English recognition session", () => {
    const recognition = createSpeechRecognition(FakeRecognition);

    expect(recognition).not.toBeNull();
    expect(recognition?.continuous).toBe(false);
    expect(recognition?.interimResults).toBe(true);
    expect(recognition?.lang).toBe("en-US");
  });

  it("reads final and interim transcripts from an event", () => {
    const transcript = readVoiceTranscript({
      resultIndex: 0,
      results: {
        length: 2,
        item: (index) =>
          index === 0 ? result(" more swing ", false) : result(" make it trap ", true),
      },
    });

    expect(transcript).toEqual({
      finalTranscript: "make it trap",
      interimTranscript: "more swing",
    });
  });

  it("maps common speech errors to workshop-friendly copy", () => {
    expect(getVoiceCommandErrorMessage({ error: "not-allowed" })).toContain(
      "permission",
    );
    expect(getVoiceCommandErrorMessage({ error: "no-speech" })).toContain(
      "did not hear",
    );
    expect(getVoiceCommandErrorMessage({ error: "audio-capture" })).toContain(
      "No microphone",
    );
  });
});

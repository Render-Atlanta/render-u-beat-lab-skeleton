export interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

export interface SpeechRecognitionResultLike {
  isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternativeLike;
}

export interface SpeechRecognitionResultListLike {
  readonly length: number;
  item(index: number): SpeechRecognitionResultLike;
}

export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}

export interface SpeechRecognitionErrorEventLike {
  error?: string;
}

export interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  abort(): void;
  start(): void;
  stop(): void;
}

export type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface SpeechRecognitionWindow {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
}

export interface VoiceTranscript {
  finalTranscript: string;
  interimTranscript: string;
}

export function getSpeechRecognitionCtor(
  runtime: unknown = globalThis,
): SpeechRecognitionCtor | null {
  const candidate = runtime as SpeechRecognitionWindow;
  return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition ?? null;
}

export function createSpeechRecognition(
  ctor = getSpeechRecognitionCtor(),
): SpeechRecognitionLike | null {
  if (!ctor) {
    return null;
  }

  const recognition = new ctor();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = "en-US";
  return recognition;
}

export function readVoiceTranscript(
  event: SpeechRecognitionEventLike,
): VoiceTranscript {
  let finalTranscript = "";
  let interimTranscript = "";

  for (let i = event.resultIndex; i < event.results.length; i += 1) {
    const result = event.results.item(i);
    const alternative = result.length > 0 ? result.item(0) : null;
    const transcript = alternative?.transcript.trim() ?? "";
    if (!transcript) {
      continue;
    }

    if (result.isFinal) {
      finalTranscript = [finalTranscript, transcript].filter(Boolean).join(" ");
    } else {
      interimTranscript = [interimTranscript, transcript].filter(Boolean).join(" ");
    }
  }

  return { finalTranscript, interimTranscript };
}

export function getVoiceCommandErrorMessage(
  event: SpeechRecognitionErrorEventLike,
): string {
  if (event.error === "not-allowed" || event.error === "service-not-allowed") {
    return "Voice permission was denied. Type the command instead.";
  }
  if (event.error === "no-speech") {
    return "I did not hear a command. Try again or type it.";
  }
  if (event.error === "audio-capture") {
    return "No microphone was available. Type the command instead.";
  }
  return "Voice input stopped. Type the command instead.";
}

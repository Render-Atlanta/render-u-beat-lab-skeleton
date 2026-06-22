import { useEffect, useRef, useState } from "react";
import {
  createSpeechRecognition,
  getSpeechRecognitionCtor,
  getVoiceCommandErrorMessage,
  readVoiceTranscript,
  type SpeechRecognitionLike,
} from "../lib/voiceCommand";

export interface VoiceCommandState {
  listening: boolean;
  message: string | null;
  supported: boolean;
  toggle: () => void;
}

export function useVoiceCommand(onCommand: (text: string) => void): VoiceCommandState {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const supported =
    typeof window !== "undefined" &&
    getSpeechRecognitionCtor(window) !== null;

  useEffect(
    () => () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    },
    [],
  );

  function stop() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }

  function start() {
    const recognition = createSpeechRecognition();
    if (!recognition) {
      setMessage("Voice input is not available in this browser.");
      return;
    }

    recognition.onresult = (event) => {
      const transcript = readVoiceTranscript(event);
      if (transcript.interimTranscript) {
        setMessage(`Listening: ${transcript.interimTranscript}`);
      }
      if (transcript.finalTranscript) {
        setMessage(`Heard: ${transcript.finalTranscript}`);
        onCommand(transcript.finalTranscript);
      }
    };
    recognition.onerror = (event) => {
      setMessage(getVoiceCommandErrorMessage(event));
      setListening(false);
      recognitionRef.current = null;
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setMessage("Listening...");
    setListening(true);

    try {
      recognition.start();
    } catch {
      setListening(false);
      recognitionRef.current = null;
      setMessage("Voice input could not start. Type the command instead.");
    }
  }

  function toggle() {
    if (listening) {
      stop();
      return;
    }
    start();
  }

  return { listening, message, supported, toggle };
}

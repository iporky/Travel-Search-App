import { useCallback, useRef, useState } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

export interface VoiceRecognitionState {
  isListening: boolean;
  /** Live transcript: finalized segments + the current interim, joined. */
  partialText: string;
  /** Only set once recognition is finalized (after silence / stop). */
  finalText: string;
  error: string | null;
}

export interface VoiceRecognitionOptions {
  /** Milliseconds of silence after speech before we auto-submit. */
  silenceMs?: number;
  /** Called once with the full transcript after `silenceMs` of silence. */
  onResult?: (text: string) => void;
}

/**
 * Speech-to-text hook backed by `expo-speech-recognition` (Android's native
 * Google SpeechRecognizer / iOS SFSpeechRecognizer). Chosen over
 * @react-native-voice/voice because that library's native module does not
 * register under the New Architecture, so its `start()` threw immediately.
 *
 * Behaviour:
 *  - Runs in `continuous` mode so the mic stays open across short pauses.
 *  - Accumulates every finalized segment into one running transcript.
 *  - After `silenceMs` (default 2000ms) with no new speech, it finalizes:
 *    stops the recognizer and fires `onResult(transcript)`.
 *
 * `locale` follows BCP-47 (e.g. 'en-US', 'ko-KR') and comes from the selected
 * app language so recognition matches the user's language.
 */
export function useVoiceRecognition(
  locale = 'en-US',
  options: VoiceRecognitionOptions = {},
) {
  const { silenceMs = 2000, onResult } = options;

  const [state, setState] = useState<VoiceRecognitionState>({
    isListening: false,
    partialText: '',
    finalText: '',
    error: null,
  });

  const localeRef = useRef(locale);
  localeRef.current = locale;
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const silenceMsRef = useRef(silenceMs);
  silenceMsRef.current = silenceMs;

  // Text finalized from previous recognizer segments (before current interim).
  const finalizedRef = useRef('');
  const partialRef = useRef('');
  const stoppedRef = useRef(false);
  const submittedRef = useRef(false);
  const hasSpeechRef = useRef(false);
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const composed = useCallback(() => {
    return [finalizedRef.current, partialRef.current]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(' ')
      .trim();
  }, []);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }
  }, []);

  // Finalize: stop the recognizer and hand the transcript back once.
  const finalize = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    stoppedRef.current = true;
    clearSilenceTimer();
    const text = composed();
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // ignore
    }
    setState((s) => ({ ...s, isListening: false, finalText: text, partialText: text }));
    if (text) onResultRef.current?.(text);
  }, [clearSilenceTimer, composed]);

  const armSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimer.current = setTimeout(() => {
      if (hasSpeechRef.current && composed()) finalize();
    }, silenceMsRef.current);
  }, [clearSilenceTimer, composed, finalize]);

  // ── Recognizer events ──────────────────────────────────────────────────────
  useSpeechRecognitionEvent('start', () => {
    setState((s) => ({ ...s, isListening: true, error: null }));
  });

  useSpeechRecognitionEvent('result', (e) => {
    const transcript = e.results?.[0]?.transcript ?? '';
    if (e.isFinal) {
      if (transcript) {
        finalizedRef.current = [finalizedRef.current, transcript]
          .map((s) => s.trim())
          .filter(Boolean)
          .join(' ')
          .trim();
      }
      partialRef.current = '';
    } else {
      partialRef.current = transcript;
    }
    if (transcript) hasSpeechRef.current = true;
    setState((s) => ({ ...s, partialText: composed() }));
    // Reset the 2s window on every scrap of speech.
    if (transcript) armSilenceTimer();
  });

  useSpeechRecognitionEvent('end', () => {
    // If the recognizer ended on its own but we have speech, submit it;
    // otherwise just mark not-listening.
    if (!submittedRef.current && !stoppedRef.current && hasSpeechRef.current && composed()) {
      finalize();
    } else {
      setState((s) => ({ ...s, isListening: false }));
    }
  });

  useSpeechRecognitionEvent('error', (e) => {
    // 'no-speech' just means silence so far — keep the mic open and wait.
    if (e.error === 'no-speech') return;
    clearSilenceTimer();
    stoppedRef.current = true;
    setState((s) => ({ ...s, isListening: false, error: e.message || String(e.error) }));
  });

  // ── Controls ────────────────────────────────────────────────────────────────
  const start = useCallback(async () => {
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      setState((s) => ({ ...s, isListening: false, error: 'Microphone permission denied' }));
      return false;
    }
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      setState((s) => ({
        ...s,
        isListening: false,
        error: 'Speech recognition is not available on this device',
      }));
      return false;
    }

    finalizedRef.current = '';
    partialRef.current = '';
    stoppedRef.current = false;
    submittedRef.current = false;
    hasSpeechRef.current = false;
    clearSilenceTimer();
    setState({ isListening: true, partialText: '', finalText: '', error: null });

    try {
      ExpoSpeechRecognitionModule.start({
        lang: localeRef.current,
        interimResults: true,
        continuous: true,
        addsPunctuation: true,
      });
      return true;
    } catch (e: any) {
      setState((s) => ({ ...s, isListening: false, error: String(e?.message ?? e) }));
      return false;
    }
  }, [clearSilenceTimer]);

  const stop = useCallback(async () => {
    stoppedRef.current = true;
    clearSilenceTimer();
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // ignore
    }
    setState((s) => ({ ...s, isListening: false }));
  }, [clearSilenceTimer]);

  const cancel = useCallback(async () => {
    stoppedRef.current = true;
    submittedRef.current = true;
    clearSilenceTimer();
    finalizedRef.current = '';
    partialRef.current = '';
    hasSpeechRef.current = false;
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch {
      // ignore
    }
    setState({ isListening: false, partialText: '', finalText: '', error: null });
  }, [clearSilenceTimer]);

  return { ...state, start, stop, cancel };
}

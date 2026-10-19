import { useCallback, useEffect, useRef, useState } from 'react';

export function microphoneErrorMessage(error: unknown): string {
  const name =
    error && typeof error === 'object' && 'name' in error
      ? String(error.name)
      : '';
  switch (name) {
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No microphone was found. Connect or enable a microphone in your system sound input settings, then try again. The browser cannot ask for permission until an input device is available.';
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'Microphone access is blocked. Allow the microphone for this site using the icon beside the address bar, and check your system microphone privacy settings. Then try again.';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'The microphone could not be opened. Check that it is connected and enabled, close other apps using it, then try again.';
    case 'OverconstrainedError':
      return 'The selected microphone is unavailable. Choose another input or System default microphone, then try again.';
    case 'AbortError':
      return 'Microphone access was interrupted. Check your input device and try again.';
    default:
      return 'Unable to record from the microphone. Check your browser and system microphone settings, or upload an audio file instead.';
  }
}

export function useMicrophoneRecorder(
  enabled: boolean,
  onError: (message: string) => void,
) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const generation = useRef(0);
  const pending = useRef(false);
  const clearTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);
  const release = useCallback(() => {
    clearTimer();
    const recorder = recorderRef.current;
    if (recorder) {
      recorder.onstop = null;
      recorder.ondataavailable = null;
      recorder.onerror = null;
      if (recorder.state !== 'inactive') recorder.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    pending.current = false;
  }, [clearTimer]);
  useEffect(() => {
    if (!enabled) {
      setIsRecording(false);
      setIsRequesting(false);
      setIsStopping(false);
    }
    return () => {
      generation.current++;
      release();
    };
  }, [enabled, release]);
  useEffect(
    () => () => {
      if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
    },
    [recordedAudioUrl],
  );
  useEffect(() => {
    if (!enabled || !navigator.mediaDevices?.enumerateDevices) return;
    let disposed = false;
    const refresh = async () => {
      try {
        const inputs = (await navigator.mediaDevices.enumerateDevices()).filter(
          (device) => device.kind === 'audioinput',
        );
        if (!disposed) setDevices(inputs);
      } catch {
        /* A failed device listing must not prevent a permission request. */
      }
    };
    void refresh();
    navigator.mediaDevices.addEventListener('devicechange', refresh);
    return () => {
      disposed = true;
      navigator.mediaDevices.removeEventListener('devicechange', refresh);
    };
  }, [enabled]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    setIsStopping(true);
    setIsRecording(false);
    clearTimer();
    recorder.stop();
  }, [clearTimer]);

  const startRecording = async () => {
    if (!enabled || pending.current || recorderRef.current) return;
    onError('');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      onError(
        'Microphone recording requires HTTPS or localhost. Open the app using a secure address, or upload an audio file instead.',
      );
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      onError(
        'This browser does not support microphone recording. Use a current browser or upload an audio file.',
      );
      return;
    }
    const current = ++generation.current;
    pending.current = true;
    setIsRequesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId } }
          : true,
      });
      if (current !== generation.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/ogg',
      ].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      recorderRef.current = recorder;
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (current !== generation.current) return;
        clearTimer();
        recorderRef.current = null;
        streamRef.current = null;
        setIsRecording(false);
        setIsStopping(false);
        const blob = new Blob(chunks, {
          type: recorder.mimeType || chunks[0]?.type || 'audio/webm',
        });
        if (!blob.size) {
          onError(
            'No audio was captured. Check your microphone and try recording again.',
          );
          return;
        }
        setRecordedBlob(blob);
        setRecordedAudioUrl(URL.createObjectURL(blob));
      };
      recorder.onerror = () => {
        if (current !== generation.current) return;
        generation.current++;
        release();
        setIsRecording(false);
        setIsRequesting(false);
        setIsStopping(false);
        onError(
          'Microphone recording was interrupted. Check the selected input and try again.',
        );
      };
      stream
        .getAudioTracks()
        .forEach((track) =>
          track.addEventListener('ended', stopRecording, { once: true }),
        );
      recorder.start();
      setRecordedBlob(null);
      setRecordedAudioUrl(null);
      setRecordingSeconds(0);
      setIsRecording(true);
      timerRef.current = setInterval(
        () => setRecordingSeconds((seconds) => seconds + 1),
        1000,
      );
      void navigator.mediaDevices
        .enumerateDevices()
        .then((list) => {
          if (current === generation.current)
            setDevices(list.filter((device) => device.kind === 'audioinput'));
        })
        .catch(() => {});
    } catch (error) {
      if (current !== generation.current) return;
      release();
      setIsRecording(false);
      setIsStopping(false);
      onError(microphoneErrorMessage(error));
    } finally {
      if (current === generation.current) {
        pending.current = false;
        setIsRequesting(false);
      }
    }
  };
  return {
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    isRecording,
    isRequesting,
    isStopping,
    recordingSeconds,
    recordedBlob,
    recordedAudioUrl,
    startRecording,
    stopRecording,
  };
}

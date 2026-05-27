// src/lib/audio/recorder.ts

export interface RecorderHandle {
  start(): Promise<void>;
  stop(): void;
  getRmsLevel(): number; // 0–1, poll each animation frame
  dispose(): void;
  onStop?: (blob: Blob) => void;
}

export function createRecorder(opts: { expectedDurationMs: number }): RecorderHandle {
  const hardCapMs = Math.max(8000, opts.expectedDurationMs * 2.5);

  let audioCtx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let mediaRecorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let chunks: BlobPart[] = [];
  let rmsLevel = 0;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let hardCapTimer: ReturnType<typeof setTimeout> | null = null;
  let speechDetected = false;
  let silentTicks = 0;
  let stopped = false;

  const handle: RecorderHandle = {
    onStop: undefined,

    async start() {
      stopped = false;
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioCtx = new AudioContext();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      audioCtx.createMediaStreamSource(stream).connect(analyser);

      // Calibrate noise floor over 500ms (5 × 100ms samples)
      const noiseSamples: number[] = [];
      await new Promise<void>((resolve) => {
        let n = 0;
        const cal = setInterval(() => {
          const buf = new Float32Array(analyser!.fftSize);
          analyser!.getFloatTimeDomainData(buf);
          noiseSamples.push(Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length));
          if (++n >= 5) { clearInterval(cal); resolve(); }
        }, 100);
      });
      const noiseRms = noiseSamples.reduce((s, v) => s + v, 0) / noiseSamples.length;
      const threshold = noiseRms * 4; // 12 dB ≈ ×4 linear

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      chunks = [];
      mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        handle.onStop?.(blob);
      };
      mediaRecorder.start(100);

      speechDetected = false;
      silentTicks = 0;

      hardCapTimer = setTimeout(() => handle.stop(), hardCapMs);

      const buf = new Float32Array(analyser.fftSize);
      pollTimer = setInterval(() => {
        if (!analyser) return;
        analyser.getFloatTimeDomainData(buf);
        const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length);
        // Normalize to 0–1 relative to 2× threshold for visualizer
        rmsLevel = Math.min(1, rms / (threshold * 2 || 0.001));

        if (rms > threshold) {
          speechDetected = true;
          silentTicks = 0;
        } else if (speechDetected) {
          if (++silentTicks >= 30) handle.stop(); // 30 × 100ms = 3000ms silence
        }
      }, 100);
    },

    stop() {
      if (stopped) return;
      stopped = true;
      if (pollTimer)    { clearInterval(pollTimer);   pollTimer = null; }
      if (hardCapTimer) { clearTimeout(hardCapTimer);  hardCapTimer = null; }
      if (mediaRecorder?.state !== "inactive") mediaRecorder?.stop();
    },

    getRmsLevel() { return rmsLevel; },

    dispose() {
      handle.stop();
      stream?.getTracks().forEach((t) => t.stop());
      audioCtx?.close();
      audioCtx = null; analyser = null; stream = null; mediaRecorder = null;
    },
  };

  return handle;
}

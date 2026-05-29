// src/lib/audio/recorder.ts

export interface RecorderHandle {
  start(): Promise<void>;
  stop(): void;
  getRmsLevel(): number; // 0–1, poll each animation frame
  dispose(): void;
  onStop?: (blob: Blob) => void;
}

// Voice-activity tuning. Hysteresis: starting speech needs a clear jump above the
// noise floor (ONSET_MULT), but *staying* in speech only needs to clear a much
// lower release floor — so the naturally-quiet tail of a sentence isn't cut off.
const CALIB_TICKS = 5;          // 500ms of noise-floor calibration (runs while already recording)
const ONSET_MULT = 4;           // speech onset ≈ 12 dB above the noise floor
const MIN_ONSET = 0.015;        // absolute floor so a dead-silent room still needs real speech
const RELEASE_MULT = 1.8;       // release floor sits just above the noise floor (keeps soft tails)
const SILENCE_RATIO = 0.08;     // ...or 8% of your peak speech level, whichever is higher
const SILENCE_TICKS = 10;       // ~1000ms below the release floor → you've stopped

export function createRecorder(opts: {
  expectedDurationMs: number;
  /** Reuse an already-open mic stream so capture starts instantly (no per-turn getUserMedia cold start that clips the first words). */
  stream?: MediaStream;
}): RecorderHandle {
  const hardCapMs = Math.max(8000, opts.expectedDurationMs * 2.5);

  let audioCtx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let mediaRecorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let ownsStream = false;
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
      if (opts.stream) {
        stream = opts.stream;
        ownsStream = false;
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        ownsStream = true;
      }
      audioCtx = new AudioContext();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      audioCtx.createMediaStreamSource(stream).connect(analyser);

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
      // Capture starts immediately — no 500ms wait — so the first word isn't clipped
      // and the UI can flip to "recording" right away. Calibration runs in parallel.
      mediaRecorder.start(100);

      speechDetected = false;
      silentTicks = 0;
      hardCapTimer = setTimeout(() => handle.stop(), hardCapMs);

      const buf = new Float32Array(analyser.fftSize);
      const noiseSamples: number[] = [];
      let threshold = Infinity; // disables the VAD stop until calibration completes
      let peakRms = 0;

      pollTimer = setInterval(() => {
        if (!analyser) return;
        analyser.getFloatTimeDomainData(buf);
        const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length);
        rmsLevel = Math.min(1, rms / 0.15); // 0–1 for the visualizer

        // Rolling 500ms noise-floor calibration before VAD kicks in.
        if (noiseSamples.length < CALIB_TICKS) {
          noiseSamples.push(rms);
          if (noiseSamples.length === CALIB_TICKS) {
            const noiseRms = noiseSamples.reduce((s, v) => s + v, 0) / noiseSamples.length;
            threshold = Math.max(noiseRms * ONSET_MULT, MIN_ONSET);
          }
          return;
        }

        if (!speechDetected) {
          if (rms > threshold) { speechDetected = true; peakRms = rms; silentTicks = 0; }
          return;
        }
        // Track the loudest speech, then treat anything well below it (fan, hum,
        // keyboard) as silence — not just anything below the static noise floor.
        if (rms > peakRms) peakRms = rms;
        const silenceFloor = Math.max(threshold, peakRms * SILENCE_RATIO);
        if (rms < silenceFloor) {
          if (++silentTicks >= SILENCE_TICKS) handle.stop();
        } else {
          silentTicks = 0;
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
      // Only stop tracks we acquired ourselves; a shared session stream is owned by the caller.
      if (ownsStream) stream?.getTracks().forEach((t) => t.stop());
      audioCtx?.close();
      audioCtx = null; analyser = null; stream = null; mediaRecorder = null;
    },
  };

  return handle;
}

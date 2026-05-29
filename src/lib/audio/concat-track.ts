// Builds ONE gapless audio track from a lesson's per-sentence mp3s so "Play all"
// plays a single continuous file instead of swapping <audio> src per sentence
// (which caused audible gaps + a jumping scrubber). Decodes each clip to PCM,
// concatenates, and re-encodes to a 16-bit mono WAV. Per-sentence start offsets
// are computed from ACTUAL decoded durations so highlighting never drifts.

export type ConcatTrack = {
  blob: Blob;
  /** Start time (ms) of each sentence within the concatenated track. */
  offsetsMs: number[];
  /** Total track duration (ms). */
  totalMs: number;
};

const SAMPLE_RATE = 44100;

export async function buildConcatTrack(
  cdnBase: string,
  sentenceIds: string[],
  manifestVersion: number,
): Promise<ConcatTrack> {
  if (sentenceIds.length === 0) throw new Error("buildConcatTrack: no sentences");

  const AudioCtx: typeof AudioContext =
    window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ac = new AudioCtx({ sampleRate: SAMPLE_RATE });

  try {
    const buffers = await Promise.all(
      sentenceIds.map(async (id) => {
        const res = await fetch(`${cdnBase}/${id}.mp3?v=${manifestVersion}`);
        if (!res.ok) throw new Error(`fetch ${id} failed: ${res.status}`);
        return ac.decodeAudioData(await res.arrayBuffer());
      }),
    );

    const lengths = buffers.map((b) => b.length);
    const totalSamples = lengths.reduce((s, n) => s + n, 0);
    const pcm = new Float32Array(totalSamples);
    const offsetsMs: number[] = [];

    let offset = 0;
    for (const buf of buffers) {
      offsetsMs.push(Math.round((offset / SAMPLE_RATE) * 1000));
      // Downmix to mono.
      const mono = new Float32Array(buf.length);
      for (let ch = 0; ch < buf.numberOfChannels; ch++) {
        const data = buf.getChannelData(ch);
        for (let j = 0; j < data.length; j++) mono[j] += data[j] / buf.numberOfChannels;
      }
      pcm.set(mono, offset);
      offset += buf.length;
    }

    const totalMs = Math.round((totalSamples / SAMPLE_RATE) * 1000);
    const blob = new Blob([encodeWav(pcm, SAMPLE_RATE)], { type: "audio/wav" });
    return { blob, offsetsMs, totalMs };
  } finally {
    await ac.close();
  }
}

/** Encode mono Float32 PCM to a 16-bit WAV ArrayBuffer — no dependencies. */
function encodeWav(pcm: Float32Array, sampleRate: number): ArrayBuffer {
  const dataBytes = pcm.length * 2;
  const buf = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buf);
  const str = (off: number, s: string) =>
    [...s].forEach((c, i) => view.setUint8(off + i, c.charCodeAt(0)));

  str(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  str(8, "WAVE");
  str(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  str(36, "data");
  view.setUint32(40, dataBytes, true);

  let off = 44;
  for (let i = 0; i < pcm.length; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    off += 2;
  }
  return buf;
}

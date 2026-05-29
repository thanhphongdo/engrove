export type MixChunk = { kind: "system" | "user"; blob: Blob };

const SAMPLE_RATE = 44100;
const GAP_SAMPLES = Math.round(0.3 * SAMPLE_RATE); // 300ms silence

export async function mixToMp3(chunks: MixChunk[]): Promise<Blob> {
  if (chunks.length === 0) throw new Error("mixToMp3: no chunks provided");

  const ac = new AudioContext({ sampleRate: SAMPLE_RATE });
  const buffers: AudioBuffer[] = await Promise.all(
    chunks.map(async (c, i) => {
      try {
        return await ac.decodeAudioData(await c.blob.arrayBuffer());
      } catch (err) {
        throw new Error(`Failed to decode ${c.kind} audio chunk ${i}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }),
  );
  await ac.close();

  const totalSamples =
    buffers.reduce((s, b) => s + b.length, 0) + GAP_SAMPLES * (buffers.length - 1);
  const pcm = new Float32Array(totalSamples);

  let offset = 0;
  for (let i = 0; i < buffers.length; i++) {
    const buf = buffers[i];
    const mono = new Float32Array(buf.length);
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const data = buf.getChannelData(ch);
      for (let j = 0; j < data.length; j++) mono[j] += data[j] / buf.numberOfChannels;
    }
    pcm.set(mono, offset);
    offset += mono.length;
    if (i < buffers.length - 1) offset += GAP_SAMPLES;
  }

  // Yield so the "Mixing…" overlay renders before the sync WAV encode blocks.
  await new Promise((r) => setTimeout(r, 0));

  return new Blob([encodeWav(pcm, SAMPLE_RATE)], { type: "audio/wav" });
}

/** Encode mono Float32 PCM to a 16-bit WAV ArrayBuffer — no dependencies. */
function encodeWav(pcm: Float32Array, sampleRate: number): ArrayBuffer {
  const dataBytes = pcm.length * 2; // 16-bit = 2 bytes per sample
  const buf = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buf);

  const str = (off: number, s: string) =>
    [...s].forEach((c, i) => view.setUint8(off + i, c.charCodeAt(0)));

  str(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  str(8, "WAVE");
  str(12, "fmt ");
  view.setUint32(16, 16, true);       // fmt chunk size
  view.setUint16(20, 1, true);        // PCM
  view.setUint16(22, 1, true);        // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byteRate = sampleRate × 1ch × 2bytes
  view.setUint16(32, 2, true);        // blockAlign
  view.setUint16(34, 16, true);       // bitsPerSample
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

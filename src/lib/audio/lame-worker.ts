/// <reference lib="webworker" />
import { Mp3Encoder } from "lamejs";

const BLOCK_SIZE = 1152;

self.onmessage = (e: MessageEvent<{ pcm: Float32Array; sampleRate: number }>) => {
  const { pcm, sampleRate } = e.data;
  const encoder = new Mp3Encoder(1, sampleRate, 128);

  // Convert Float32 (−1..1) → Int16 (−32768..32767)
  const int16 = new Int16Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) {
    int16[i] = Math.max(-32768, Math.min(32767, Math.round(pcm[i] * 32767)));
  }

  const mp3Chunks: Uint8Array[] = [];
  for (let i = 0; i < int16.length; i += BLOCK_SIZE) {
    const chunk = int16.subarray(i, Math.min(i + BLOCK_SIZE, int16.length));
    const encoded = encoder.encodeBuffer(chunk);
    if (encoded.length > 0) mp3Chunks.push(new Uint8Array(encoded));
  }
  const flushed = encoder.flush();
  if (flushed.length > 0) mp3Chunks.push(new Uint8Array(flushed));

  const total = mp3Chunks.reduce((s, c) => s + c.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of mp3Chunks) { result.set(chunk, offset); offset += chunk.length; }

  self.postMessage({ mp3: result }, [result.buffer]);
};

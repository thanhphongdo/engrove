export type MixChunk = { kind: "system" | "user"; blob: Blob };

export async function mixToMp3(chunks: MixChunk[]): Promise<Blob> {
  if (chunks.length === 0) throw new Error("mixToMp3: no chunks provided");

  // Decode all blobs at 44100 Hz (AudioContext resamples automatically)
  const ac = new AudioContext({ sampleRate: 44100 });
  const buffers: AudioBuffer[] = await Promise.all(
    chunks.map(async (c) => {
      const ab = await c.blob.arrayBuffer();
      return ac.decodeAudioData(ab);
    }),
  );
  await ac.close();

  const GAP = Math.round(0.3 * 44100); // 300ms silence
  const totalSamples = buffers.reduce((s, b) => s + b.length, 0) + GAP * (buffers.length - 1);
  const output = new Float32Array(totalSamples); // zero-filled = silence

  let offset = 0;
  for (let i = 0; i < buffers.length; i++) {
    const buf = buffers[i];
    // Downmix to mono
    const mono = new Float32Array(buf.length);
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const data = buf.getChannelData(ch);
      for (let j = 0; j < data.length; j++) mono[j] += data[j] / buf.numberOfChannels;
    }
    output.set(mono, offset);
    offset += mono.length;
    if (i < buffers.length - 1) offset += GAP; // silence gap (already zeroed)
  }

  const mp3Buffer = await encodeWithWorker(output, 44100);
  return new Blob([mp3Buffer], { type: "audio/mpeg" });
}

function encodeWithWorker(pcm: Float32Array, sampleRate: number): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./lame-worker.ts", import.meta.url));
    worker.onmessage = (e: MessageEvent<{ mp3: Uint8Array }>) => {
      resolve(e.data.mp3.buffer as ArrayBuffer);
      worker.terminate();
    };
    worker.onerror = (e) => {
      reject(new Error(e.message ?? "lame-worker error"));
      worker.terminate();
    };
    worker.postMessage({ pcm, sampleRate }, [pcm.buffer]);
  });
}

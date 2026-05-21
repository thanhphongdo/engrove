import "server-only";
import { Redis } from "@upstash/redis";

/**
 * Vercel KV / Upstash Redis client.
 *
 * In production on Vercel, the env vars `KV_REST_API_URL` + `KV_REST_API_TOKEN`
 * (or the older `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`) are
 * auto-injected when a KV / Upstash integration is provisioned. The KV state
 * lives outside the serverless function instances, so it survives deploys —
 * a pending writing session created right before a redeploy is still readable
 * after the redeploy finishes, and any LLM POST that lands during/after the
 * redeploy writes to the same store.
 *
 * In local development (no env vars), we fall back to a process-local in-memory
 * map. This is single-process only — fine for `next dev`, useless across
 * serverless instances. It keeps the dev story zero-config.
 */

type KvClient = {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown, opts?: { ex?: number }): Promise<void>;
  del(key: string): Promise<void>;
};

function makeMemoryClient(): KvClient {
  type Entry = { value: unknown; expiresAt: number };
  const store = new Map<string, Entry>();
  function cleanup() {
    const now = Date.now();
    for (const [k, e] of store) if (e.expiresAt < now) store.delete(k);
  }
  return {
    async get(key) {
      cleanup();
      const e = store.get(key);
      return e ? (e.value as never) : null;
    },
    async set(key, value, opts) {
      const ttlSeconds = opts?.ex ?? 24 * 60 * 60;
      store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    },
    async del(key) {
      store.delete(key);
    },
  };
}

function makeRedisClient(url: string, token: string): KvClient {
  const redis = new Redis({ url, token });
  return {
    async get(key) {
      return (await redis.get(key)) as never;
    },
    async set(key, value, opts) {
      const ttl = opts?.ex ?? 24 * 60 * 60;
      await redis.set(key, value, { ex: ttl });
    },
    async del(key) {
      await redis.del(key);
    },
  };
}

const url =
  process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token =
  process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

export const kv: KvClient =
  url && token ? makeRedisClient(url, token) : makeMemoryClient();

export const KV_BACKEND: "redis" | "memory" = url && token ? "redis" : "memory";

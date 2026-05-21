import { NextResponse } from "next/server";
import { kv } from "@/lib/kv";
import { writingLLMResultSchema } from "@/lib/writing/result-schema";
import { sessionKey, type WritingSessionDoc } from "@/lib/writing/session-doc";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Client polls this endpoint to learn the session's state. Returns the full
 * result payload once `status === "ready"` so the client only needs one
 * polling endpoint.
 *
 * 404 means the session is gone (either it was never created, or the 24h
 * TTL expired). The client should treat 404 as an expired session.
 *
 * Polling is safe across server redeploys: KV state is external, and a
 * redeploy mid-poll just causes one HTTP request to fail — the next
 * interval retries against the new deploy.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const session = await kv.get<WritingSessionDoc>(sessionKey(token));
  if (!session) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: CORS_HEADERS },
    );
  }
  return NextResponse.json(
    {
      status: session.status,
      receivedAt: session.receivedAt,
      expiresAt: session.expiresAt,
      result: session.status === "ready" ? session.result : null,
    },
    { status: 200, headers: CORS_HEADERS },
  );
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json" },
      { status: 400, headers: CORS_HEADERS },
    );
  }
  const parsed = writingLLMResultSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", details: parsed.error.flatten() },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const key = sessionKey(token);
  const session = await kv.get<WritingSessionDoc>(key);
  if (!session) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: CORS_HEADERS },
    );
  }
  if (session.expiresAt < Date.now()) {
    return NextResponse.json(
      { error: "expired" },
      { status: 409, headers: CORS_HEADERS },
    );
  }
  if (session.status !== "pending") {
    return NextResponse.json(
      { error: "already_received" },
      { status: 409, headers: CORS_HEADERS },
    );
  }

  // We do not gate on a CAS / Lua transaction here because the writing flow
  // is single-writer per token: only one LLM is asked to POST per token, so
  // the realistic concurrent-write risk is null. If two POSTs race, the second
  // sees status="ready" on its read and 409s — but in the (rare) interleaving
  // where both reads see "pending", the last writer wins, which is acceptable.
  const ttlRemaining = Math.max(60, Math.floor((session.expiresAt - Date.now()) / 1000));
  await kv.set(
    key,
    {
      ...session,
      status: "ready" as const,
      result: parsed.data,
      receivedAt: Date.now(),
    },
    { ex: ttlRemaining },
  );

  return NextResponse.json(
    { ok: true, message: "Feedback received. The learner will see it now." },
    { status: 200, headers: CORS_HEADERS },
  );
}

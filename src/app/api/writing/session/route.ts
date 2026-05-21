import { NextResponse } from "next/server";
import { z } from "zod";
import { kv } from "@/lib/kv";
import { sessionKey, TTL_SECONDS, type WritingSessionDoc } from "@/lib/writing/session-doc";

const bodySchema = z.object({
  lessonId: z.string().min(1),
  profileId: z.string().min(1).optional(),
});

const ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789"; // crockford-ish base32

function makeToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

function callbackUrlFor(token: string, req: Request): string {
  const envOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN;
  const origin = envOrigin ?? deriveOriginFromRequest(req);
  return `${origin.replace(/\/$/, "")}/api/writing/result/${token}`;
}

function deriveOriginFromRequest(req: Request): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host) throw new Error("cannot derive origin: missing host header");
  const fallbackProto = /^(localhost|127\.|\[::1\])/.test(host) ? "http" : "https";
  const proto = req.headers.get("x-forwarded-proto") ?? fallbackProto;
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const token = makeToken();
  const now = Date.now();
  const session: WritingSessionDoc = {
    token,
    lessonId: parsed.data.lessonId,
    profileId: parsed.data.profileId ?? null,
    status: "pending",
    createdAt: now,
    expiresAt: now + TTL_SECONDS * 1000,
    receivedAt: null,
    result: null,
  };

  await kv.set(sessionKey(token), session, { ex: TTL_SECONDS });

  return NextResponse.json({
    token,
    callbackUrl: callbackUrlFor(token, req),
    expiresAt: session.expiresAt,
  });
}

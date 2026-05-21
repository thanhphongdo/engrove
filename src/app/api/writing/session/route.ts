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

function callbackUrlFor(token: string): string {
  const origin = process.env.NEXT_PUBLIC_APP_ORIGIN;
  if (!origin) throw new Error("NEXT_PUBLIC_APP_ORIGIN is not set");
  return `${origin.replace(/\/$/, "")}/api/writing/result/${token}`;
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
    callbackUrl: callbackUrlFor(token),
    expiresAt: session.expiresAt,
  });
}

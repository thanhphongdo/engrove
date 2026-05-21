import { NextResponse } from "next/server";
import { z } from "zod";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";

const bodySchema = z.object({
  lessonId: z.string().min(1),
  profileId: z.string().min(1).optional(),
});

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789"; // crockford-ish base32, no I/L/O/U/0/1

function makeToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

function callbackUrlFor(token: string): string {
  const origin = process.env.NEXT_PUBLIC_APP_ORIGIN;
  if (!origin) {
    throw new Error("NEXT_PUBLIC_APP_ORIGIN is not set");
  }
  return `${origin.replace(/\/$/, "")}/api/writing/result/${token}`;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const token = makeToken();
  const now = Date.now();
  const expiresAt = now + TTL_MS;

  const db = getAdminDb();
  await db.collection("writingSessions").doc(token).set({
    token,
    lessonId: parsed.data.lessonId,
    profileId: parsed.data.profileId ?? null,
    status: "pending",
    createdAt: Timestamp.fromMillis(now),
    expiresAt: Timestamp.fromMillis(expiresAt),
    receivedAt: null,
    result: null,
    serverCreatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({
    token,
    callbackUrl: callbackUrlFor(token),
    expiresAt,
  });
}

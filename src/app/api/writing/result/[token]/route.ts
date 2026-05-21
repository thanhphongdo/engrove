import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { writingLLMResultSchema } from "@/lib/writing/result-schema";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const db = getAdminDb();
  const snap = await db.collection("writingSessions").doc(token).get();
  if (!snap.exists) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: CORS_HEADERS },
    );
  }
  const data = snap.data() ?? {};
  return NextResponse.json(
    {
      status: data.status,
      receivedAt: data.receivedAt ? (data.receivedAt as Timestamp).toMillis() : null,
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

  const db = getAdminDb();
  const ref = db.collection("writingSessions").doc(token);
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { code: 404 as const };
    const data = snap.data() ?? {};
    const expiresAt = data.expiresAt as Timestamp | undefined;
    if (expiresAt && expiresAt.toMillis() < Date.now()) {
      return { code: 409 as const, reason: "expired" };
    }
    if (data.status !== "pending") {
      return { code: 409 as const, reason: "already_received" };
    }
    tx.update(ref, {
      status: "ready",
      result: parsed.data,
      receivedAt: Timestamp.fromMillis(Date.now()),
    });
    return { code: 200 as const };
  });

  if (result.code === 200) {
    return NextResponse.json(
      { ok: true, message: "Feedback received. The learner will see it now." },
      { status: 200, headers: CORS_HEADERS },
    );
  }
  if (result.code === 404) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: CORS_HEADERS },
    );
  }
  return NextResponse.json(
    { error: result.reason ?? "conflict" },
    { status: 409, headers: CORS_HEADERS },
  );
}

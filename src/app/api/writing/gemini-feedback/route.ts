import { NextResponse } from "next/server";
import { z } from "zod";
import { writingLLMResultSchema } from "@/lib/writing/result-schema";

const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 60_000;
const IS_PROD = process.env.NODE_ENV === "production";

const bodySchema = z.object({
  prompt: z.string().min(1),
  provider: z.enum(["gemini", "chatgpt", "groq"]).default("groq"),
});

function getIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "unknown";
}

function isReasoningModel(model: string): boolean {
  return /r1|qwq|deepseek-r|qwen3/i.test(model);
}

function extractJson(raw: string): string {
  let text = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first >= 0 && last > first) return text.slice(first, last + 1);
  return text;
}

type ApiResult = { text: string; model: string };
type ApiError = Error & { statusCode: number };

function makeApiError(statusCode: number, message: string): ApiError {
  const e = new Error(message) as ApiError;
  e.statusCode = statusCode;
  return e;
}

async function callGemini(apiKey: string, prompt: string): Promise<ApiResult> {
  const model = "gemini-2.0-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error(`[ai-feedback] gemini ${res.status}:`, JSON.stringify(err));
    throw makeApiError(res.status, "gemini_error");
  }
  const data = await res.json();
  return { text: data.candidates?.[0]?.content?.parts?.[0]?.text ?? "", model };
}

async function callOpenAICompat(
  baseUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
): Promise<ApiResult> {
  const reasoning = isReasoningModel(model);
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      ...(!reasoning && { response_format: { type: "json_object" } }),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error(`[ai-feedback] ${baseUrl} ${res.status}:`, JSON.stringify(err));
    throw makeApiError(res.status, "api_error");
  }
  const data = await res.json();
  return { text: data.choices?.[0]?.message?.content ?? "", model };
}

export async function POST(req: Request) {
  const appKey = process.env.GROQ_API_KEY;
  const groqModel = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

  const userKey = req.headers.get("x-ai-key") || null;

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { prompt, provider } = body;

  // User key takes priority; app key only available for groq provider
  const effectiveKey = userKey ?? (provider === "groq" ? appKey : null);
  if (!effectiveKey) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  // Rate limit: only when using app key AND in production
  const ip = (!userKey && IS_PROD) ? getIp(req) : null;
  const prevTimestamp = ip ? (rateLimitMap.get(ip) ?? 0) : 0;

  if (ip) {
    const now = Date.now();
    if (now - prevTimestamp < RATE_LIMIT_MS) {
      const retryAfter = Math.ceil((RATE_LIMIT_MS - (now - prevTimestamp)) / 1000);
      return NextResponse.json({ error: "rate_limited", retryAfter }, { status: 429 });
    }
    rateLimitMap.set(ip, now);
  }

  let apiResult: ApiResult;
  try {
    if (provider === "gemini") {
      apiResult = await callGemini(effectiveKey, prompt);
    } else if (provider === "chatgpt") {
      apiResult = await callOpenAICompat(
        "https://api.openai.com/v1",
        effectiveKey,
        "gpt-4o-mini",
        prompt,
      );
    } else {
      apiResult = await callOpenAICompat(
        "https://api.groq.com/openai/v1",
        effectiveKey,
        groqModel,
        prompt,
      );
    }
  } catch (err) {
    if (ip) rateLimitMap.set(ip, prevTimestamp);
    const statusCode = (err as ApiError).statusCode ?? 500;
    if (statusCode === 401 || statusCode === 403 || statusCode === 400) {
      return NextResponse.json({ error: "invalid_key" }, { status: 401 });
    }
    if (statusCode === 429) {
      return NextResponse.json({ error: "quota_exceeded" }, { status: 429 });
    }
    return NextResponse.json({ error: "api_error" }, { status: 502 });
  }

  const text = extractJson(apiResult.text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error("[ai-feedback] parse_error, raw:", apiResult.text.slice(0, 500));
    return NextResponse.json({ error: "parse_error" }, { status: 502 });
  }

  const result = writingLLMResultSchema.safeParse(parsed);
  if (!result.success) {
    console.error("[ai-feedback] schema_error:", JSON.stringify(result.error));
    return NextResponse.json({ error: "schema_error" }, { status: 502 });
  }

  return NextResponse.json({ result: { ...result.data, model: apiResult.model } });
}

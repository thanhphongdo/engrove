import { writingLLMResultSchema } from "./result-schema";
import type { WritingLLMResult } from "@/lib/db/types";

/** Call Gemini directly from the browser using the user's own API key. */
export async function callGeminiDirect(
  prompt: string,
  apiKey: string,
): Promise<WritingLLMResult> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    },
  );

  if (res.status === 400) throw new GeminiKeyError("Invalid API key.");
  if (res.status === 403) throw new GeminiKeyError("API key does not have permission.");
  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);

  const data = await res.json();
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const parsed = JSON.parse(text);
  const result = writingLLMResultSchema.parse(parsed);
  return { ...result, model: "gemini-2.0-flash" };
}

export class GeminiKeyError extends Error {}

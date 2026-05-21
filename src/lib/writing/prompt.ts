import type { CefrLevel } from "@/lib/lessons/types";

type PromptInput = {
  lesson: { level: CefrLevel; topic: string; prompt: string };
  userText: string;
  callbackUrl: string;
};

const RESULT_SHAPE = `{
  "scores": { "task": 0-10, "grammar": 0-10, "vocabulary": 0-10, "coherence": 0-10, "overall": 0-10 },
  "corrections": [ { "original": "...", "fixed": "...", "explanation": "..." } ],
  "suggestions": ["..."],
  "rewritten": "A polished version of the learner's text at this CEFR level."
}`;

export function buildLLMPrompt({ lesson, userText, callbackUrl }: PromptInput): string {
  return `You are an English teacher giving feedback to a CEFR ${lesson.level} learner.

Topic: ${lesson.topic}
Task: ${lesson.prompt}

The learner's writing is between <text> tags below.

Please grade and respond by calling this HTTP endpoint exactly once:

POST ${callbackUrl}
Content-Type: application/json
Body (JSON):
${RESULT_SHAPE}

Be kind, specific, and concrete. Keep the rewritten version close to the learner's voice.

<text>
${userText}
</text>`;
}

export function buildPasteBackPrompt({
  lesson,
  userText,
}: {
  lesson: { level: CefrLevel; topic: string; prompt: string };
  userText: string;
}): string {
  return `You are an English teacher giving feedback to a CEFR ${lesson.level} learner.

Topic: ${lesson.topic}
Task: ${lesson.prompt}

Please grade and respond ONLY with a fenced \`\`\`json block matching this exact shape (the learner will paste it back into the app):
${RESULT_SHAPE}

Be kind, specific, and concrete. Keep the rewritten version close to the learner's voice.

<text>
${userText}
</text>`;
}

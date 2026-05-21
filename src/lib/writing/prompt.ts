import type { CefrLevel } from "@/lib/lessons/types";

const RESULT_SHAPE = `{
  "scores": { "task": 0-10, "grammar": 0-10, "vocabulary": 0-10, "coherence": 0-10, "overall": 0-10 },
  "corrections": [ { "original": "exact phrase from text", "fixed": "corrected version", "explanation": "why" } ],
  "suggestions": ["specific, actionable suggestion 1", "..."],
  "rewritten": "Polished version at this CEFR level, keeping the learner's voice."
}`;

const CEFR_EXPECTATIONS: Record<string, string> = {
  A1: "very simple sentences, basic present tense, survival vocabulary (~500 words). A score of 8–10 means flawless simple sentences — rare for true A1 learners.",
  A2: "short simple sentences, basic past/present tense, everyday vocabulary (~1000 words). A score of 8–10 means near-perfect basic English — exceptional for A2.",
  B1: "connected paragraphs, some complex sentences, moderate vocabulary (~2000 words). Most competent B1 texts score 6–7.",
  B2: "fluent paragraphs, varied grammar, good range of vocabulary (~3500 words). A strong B2 text scores 7–8.",
  C1: "flexible, precise, nuanced language. A 9–10 requires near-native fluency with minimal errors.",
};

function cefrExpectation(level: string): string {
  return CEFR_EXPECTATIONS[level] ?? "appropriate for the stated CEFR level";
}

const SCORING_RUBRIC = `SCORING RUBRIC — score absolute English quality, NOT relative to CEFR level:
- 9–10: Near-native, very few or no errors, reads naturally
- 7–8: Good overall, some noticeable errors or unnatural phrasing
- 5–6: Understandable, but several errors affect clarity or flow
- 3–4: Frequent errors, hard to follow in places
- 1–2: Very limited, many errors, meaning often unclear

A typical A2 learner's text should score 4–6. A 7+ means genuinely strong English, not just "good for the level".`;

const INSTRUCTIONS = `CORRECTIONS: List only REAL errors — grammar mistakes, genuinely unnatural phrasing, wrong word choices. Do NOT invent corrections to fill space: if the text has no errors, return an empty array. Do NOT flag style choices as errors, do NOT suggest synonyms unless the original word is wrong, do NOT flag British vs American English differences.
SUGGESTIONS: Give 3–5 specific, actionable suggestions calibrated to the learner's CEFR level. Read the text carefully — do not suggest something the learner already does well.
REWRITTEN: Fix only real errors while preserving the learner's style, voice, and vocabulary level.`;

export function buildPasteBackPrompt({
  lesson,
  userText,
}: {
  lesson: { level: CefrLevel; topic: string; prompt: string };
  userText: string;
}): string {
  return `You are an experienced English examiner scoring a CEFR ${lesson.level} learner's writing.

Topic: ${lesson.topic}
Task: ${lesson.prompt}

${SCORING_RUBRIC}

${INSTRUCTIONS}

Respond ONLY with a fenced \`\`\`json block matching this exact shape (the learner will paste it back into the app):
${RESULT_SHAPE}

<text>
${userText}
</text>`;
}

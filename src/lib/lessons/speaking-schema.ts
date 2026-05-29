import { z } from "zod";

const speakingVoiceSchema = z.object({
  sex: z.enum(["female", "male"]),
  age: z.enum(["child", "teen", "adult", "senior"]),
  accent: z.literal("en-US"),
  edgeVoice: z.string().min(1),
});

const speakingSentenceSchema = z.object({
  id: z.string(),
  speaker: z.string().min(1),
  text: z.string().min(1),
  translationVi: z.string().min(1).optional(), // populated by backfill; required for new lessons
  durationMs: z.number().int().positive().optional(),
});

const hintStarterSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
});

const hintVocabSchema = z.object({
  id: z.string(),
  phrase: z.string().min(1),
  meaningVi: z.string().min(1),
  pronunciation: z.string().min(1),
});

function normalizeForCompare(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export const speakingLessonSchema = z
  .object({
    id: z.string().regex(/^speaking-(a1|a2|b1|b2|c1)-\d{3}$/),
    level: z.enum(["A1", "A2", "B1", "B2", "C1"]),
    title: z.string().min(1),
    summary: z.string().min(1),
    topic: z.string().min(1),
    tags: z.array(z.string().min(1)).min(1),
    characters: z.tuple([z.string().min(1), z.string().min(1)]),
    voices: z.record(z.string().min(1), speakingVoiceSchema),
    body: z.array(z.object({ speaker: z.string().min(1), text: z.string().min(1) })).min(2),
    sentences: z.array(speakingSentenceSchema).min(2),
    hintStarters: z.array(hintStarterSchema).min(1),
    hintVocab: z.array(hintVocabSchema).min(1),
    annotations: z.array(
      z.object({
        phrase: z.string().min(1),
        meaningVi: z.string().min(1),
        pronunciation: z.string().min(1),
        exampleEn: z.string().optional(),
      }),
    ),
    grammarNotes: z.array(
      z.object({ title: z.string().min(1), bodyVi: z.string().min(1), bodyEn: z.string().min(1) }),
    ),
    translationVi: z.string().min(1),
    criticalThinkingQuestion: z.string().min(1),
    audio: z.object({
      cdnBase: z.string().url(),
      manifestVersion: z.number().int().positive(),
    }),
    totalDurationMs: z.number().int().positive().optional(),
    accents: z.tuple([z.literal("en-US")]),
  })
  .superRefine((data, ctx) => {
    const voiceKeys = new Set(Object.keys(data.voices));

    // Invariant 1: characters are keys in voices
    for (const char of data.characters) {
      if (!voiceKeys.has(char)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Character "${char}" not found in voices`,
          path: ["voices"],
        });
      }
    }

    // Invariant 2: sentence speakers exist in voices
    for (let i = 0; i < data.sentences.length; i++) {
      if (!voiceKeys.has(data.sentences[i].speaker)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `sentences[${i}].speaker "${data.sentences[i].speaker}" not in voices`,
          path: ["sentences", i, "speaker"],
        });
      }
    }

    // Invariant 3: sentence ids contiguous s1..sN
    for (let i = 0; i < data.sentences.length; i++) {
      if (data.sentences[i].id !== `s${i + 1}`) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Expected sentences[${i}].id "s${i + 1}", got "${data.sentences[i].id}"`,
          path: ["sentences", i, "id"],
        });
        break;
      }
    }

    // Invariant 4: grouped sentences match body turns (same grouping logic as listeningLessonSchema)
    type Group = { speaker: string; text: string };
    const groups: Group[] = [];
    for (const s of data.sentences) {
      const last = groups[groups.length - 1];
      if (last && last.speaker === s.speaker) {
        last.text = normalizeForCompare(last.text + " " + s.text);
      } else {
        groups.push({ speaker: s.speaker, text: normalizeForCompare(s.text) });
      }
    }
    if (groups.length !== data.body.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Dialogue sentence groups (${groups.length}) do not match number of turns (${data.body.length})`,
        path: ["sentences"],
      });
    } else {
      for (let i = 0; i < groups.length; i++) {
        const turn = data.body[i];
        if (groups[i].speaker !== turn.speaker || groups[i].text !== normalizeForCompare(turn.text)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `body[${i}] "${turn.text}" does not match its sentence group`,
            path: ["body", i],
          });
        }
      }
    }

    // Invariant 5: hintStarters ids h1..hK
    for (let i = 0; i < data.hintStarters.length; i++) {
      if (data.hintStarters[i].id !== `h${i + 1}`) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Expected hintStarters[${i}].id "h${i + 1}", got "${data.hintStarters[i].id}"`,
          path: ["hintStarters", i, "id"],
        });
      }
    }

    // Invariant 6: hintVocab ids v1..vM
    for (let i = 0; i < data.hintVocab.length; i++) {
      if (data.hintVocab[i].id !== `v${i + 1}`) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Expected hintVocab[${i}].id "v${i + 1}", got "${data.hintVocab[i].id}"`,
          path: ["hintVocab", i, "id"],
        });
      }
    }
  });

export const speakingLessonMetaSchema = z.object({
  id: z.string(),
  level: z.enum(["A1", "A2", "B1", "B2", "C1"]),
  title: z.string().min(1),
  summary: z.string().min(1),
  topic: z.string().min(1),
  tags: z.array(z.string().min(1)),
  characters: z.tuple([z.string().min(1), z.string().min(1)]),
  totalDurationMs: z.number().int().positive().optional(),
  sentenceCount: z.number().int().nonnegative(),
  turnCount: z.number().int().positive(),
});

export const speakingLessonsIndexSchema = z.array(speakingLessonMetaSchema);

export type SpeakingLesson     = z.infer<typeof speakingLessonSchema>;
export type SpeakingLessonMeta = z.infer<typeof speakingLessonMetaSchema>;
export type SpeakingVoice      = z.infer<typeof speakingVoiceSchema>;
export type SpeakingSentence   = z.infer<typeof speakingSentenceSchema>;
export type HintStarter        = z.infer<typeof hintStarterSchema>;
export type HintVocab          = z.infer<typeof hintVocabSchema>;

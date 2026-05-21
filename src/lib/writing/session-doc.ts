import "server-only";
import type { WritingLLMResultParsed } from "./result-schema";

export const TTL_SECONDS = 24 * 60 * 60;

export type WritingSessionDoc = {
  token: string;
  lessonId: string;
  profileId: string | null;
  status: "pending" | "ready";
  createdAt: number;
  expiresAt: number;
  receivedAt: number | null;
  result: WritingLLMResultParsed | null;
};

export function sessionKey(token: string): string {
  return `writing:session:${token}`;
}

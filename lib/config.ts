export const SKILLS = [
  { id: "skill_013bS3UrB9m56xT7FvPy8MLE", name: "E-Rechnung Expert", short: "e-rechnung" },
  { id: "skill_0171xYggujXVgtev83j3EWs7", name: "EasyFirma Support", short: "support" },
] as const;

export const MODELS = [
  { id: "claude-opus-4-6", name: "Opus 4.6" },
  { id: "claude-sonnet-4-6", name: "Sonnet 4.6" },
  { id: "claude-haiku-4-5-20251001", name: "Haiku 4.5" },
] as const;

export const VALID_SKILL_IDS = SKILLS.map((s) => s.id);
export const VALID_MODEL_IDS = MODELS.map((m) => m.id);

export interface LogEntry {
  id: string;
  timestamp: string;
  skill: string;
  skillId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  responseTimeMs: number;
  userMessage: string;
  assistantMessage: string;
  rawResponse: Record<string, unknown>;
  error?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

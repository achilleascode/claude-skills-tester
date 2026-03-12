export const SKILLS = [
  { id: "skill_013bS3UrB9m56xT7FvPy8MLE", name: "E-Rechnung Expert", short: "e-rechnung" },
  { id: "skill_0171xYggujXVgtev83j3EWs7", name: "EasyFirma Support", short: "support" },
] as const;

// Pricing per 1M tokens (USD) - source: platform.claude.com/docs/en/about-claude/pricing
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-4-6": { input: 5, output: 25 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-4-5-20251001": { input: 1, output: 5 },
};

export function calcCost(modelId: string, inputTokens: number, outputTokens: number): number {
  const p = MODEL_PRICING[modelId];
  if (!p) return 0;
  return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
}

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
  cost: number;
  rawResponse: Record<string, unknown>;
  error?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

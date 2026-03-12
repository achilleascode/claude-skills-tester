import { VALID_MODEL_IDS, SKILLS } from "@/lib/config";

const ALL_SKILLS = SKILLS.map((s) => ({ type: "custom" as const, skill_id: s.id }));

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const { model, messages } = await req.json();

    if (!VALID_MODEL_IDS.includes(model)) {
      return Response.json({ error: "Invalid model" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "API key not configured" }, { status: 500 });
    }

    const startTime = Date.now();

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "code-execution-2025-08-25,skills-2025-10-02",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        container: {
          skills: ALL_SKILLS,
        },
        messages,
        tools: [{ type: "code_execution_20250825", name: "code_execution" }],
      }),
    });

    const data = await response.json();
    const elapsed = Date.now() - startTime;

    if (!response.ok) {
      return Response.json(
        {
          error: data.error?.message || "Anthropic API error",
          details: data,
          _meta: {
            response_time_ms: elapsed,
            model_used: model,
            skills: "all (2)",
            timestamp: new Date().toISOString(),
          },
        },
        { status: response.status }
      );
    }

    return Response.json({
      ...data,
      _meta: {
        response_time_ms: elapsed,
        model_used: model,
        skills: "all (2)",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

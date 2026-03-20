import OpenAI from "openai";

// ─── share the prompt builder with the frontend ───────────────────────────

function buildSprintPrompt(context, parsedDuration) {
  const { goal, startingPoint, hoursPerWeek, milestones, constraints, sprintTitle } = context;
  const { count, label } = parsedDuration;

  return `You are an expert sprint planner and performance coach. Generate a highly personalised sprint plan.

USER PROFILE:
- Goal: ${goal}
- Current level: ${startingPoint || "Not specified"}
- Sprint: ${count} ${label}s (${count} blocks, one block per ${label.toLowerCase()})
- Time available: ${hoursPerWeek || "10 hours"} per week
- Success milestones: ${milestones || "Not specified"}
- Constraints: ${constraints || "None"}
- Sprint name: "${sprintTitle || "My Sprint"}"

INSTRUCTIONS:
1. Create exactly ${count} period objects (one per ${label.toLowerCase()}).
2. Each period has 3 tracks. Each track has exactly 3 tasks.
3. Tasks MUST be specific to this user's exact goal — reference their specific tools, platforms, industry, and current level. No generic advice.
4. Milestones should be measurable and build progressively toward the user's stated goals.
5. Track names, colors, and icons should reflect the goal's domain.
6. Phase titles should feel compelling and sequential (Foundation → Build → Execute → Launch etc.)

TRACK COLOR PALETTE — choose 3 distinct colors from:
"#6c5ce7" (purple), "#00b894" (green), "#0984e3" (blue), "#e17055" (orange), "#fd79a8" (pink), "#fdcb6e" (yellow), "#00cec9" (teal), "#d63031" (red)

RETURN ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "category": "career|health|creative|business|education|custom",
  "tracks": {
    "track1": { "label": "Track Name", "color": "#hexcolor", "icon": "single emoji" },
    "track2": { "label": "Track Name", "color": "#hexcolor", "icon": "single emoji" },
    "track3": { "label": "Track Name", "color": "#hexcolor", "icon": "single emoji" }
  },
  "periods": [
    {
      "period": 1,
      "title": "Short phase name (3-5 words)",
      "subtitle": "One sentence describing the period focus",
      "milestone": "Specific and measurable outcome by end of this period",
      "tracks": {
        "track1": ["Task 1 specific to the user", "Task 2", "Task 3"],
        "track2": ["Task 1", "Task 2", "Task 3"],
        "track3": ["Task 1", "Task 2", "Task 3"]
      }
    }
  ]
}`;
}

// ─── Vercel serverless handler ────────────────────────────────────────────

export default async function handler(req, res) {
  // CORS headers (allows localhost dev to hit this function via vercel dev)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { context, parsedDuration, maxTokens = 3000 } = req.body || {};

  if (!context?.goal) {
    return res.status(400).json({ error: "Missing required field: context.goal" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY not configured on server" });
  }

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: buildSprintPrompt(context, parsedDuration) }],
      response_format: { type: "json_object" },
      temperature: 0.75,
      max_tokens: Math.min(maxTokens, 8000),
    });

    const raw = JSON.parse(response.choices[0].message.content);

    // Basic validation before returning
    if (!raw.tracks?.track1 || !Array.isArray(raw.periods) || raw.periods.length === 0) {
      return res.status(422).json({ error: "GPT returned malformed plan structure" });
    }

    return res.status(200).json(raw);
  } catch (err) {
    const isAuthError = err?.status === 401;
    const isRateLimit = err?.status === 429;
    return res.status(err?.status || 500).json({
      error: isAuthError ? "Invalid OpenAI API key" : isRateLimit ? "Rate limited — try again shortly" : err.message,
    });
  }
}

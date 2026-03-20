// AI service — dev uses VITE_OPENAI_API_KEY directly (browser)
// production routes through /api/generate-sprint (Vercel serverless, key hidden)

import { generatePlanFallback } from "../ai/sprintBuilder";

const DEV_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const IS_DEV = import.meta.env.DEV;

/** Build the GPT prompt from user context */
export function buildSprintPrompt(context, parsedDuration) {
  const { goal, startingPoint, hoursPerWeek, milestones, constraints, sprintTitle } = context;
  const { count, label, unit } = parsedDuration;

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
      "subtitle": "One sentence describing the period's focus",
      "milestone": "Specific and measurable outcome by end of period 1",
      "tracks": {
        "track1": ["Specific task 1 with context", "Specific task 2", "Specific task 3"],
        "track2": ["Specific task 1", "Specific task 2", "Specific task 3"],
        "track3": ["Specific task 1", "Specific task 2", "Specific task 3"]
      }
    }
  ]
}`;
}

/** Validate the GPT response has the required structure */
function validatePlanResponse(data) {
  if (!data || typeof data !== "object") throw new Error("INVALID_JSON");
  if (!data.tracks?.track1?.label) throw new Error("MISSING_TRACKS");
  if (!Array.isArray(data.periods) || data.periods.length === 0) throw new Error("MISSING_PERIODS");
  const p = data.periods[0];
  if (!p.tracks?.track1 || !Array.isArray(p.tracks.track1)) throw new Error("MISSING_PERIOD_TRACKS");
  return data;
}

/** Merge GPT response fields onto the base sprint object */
export function mergePlanResponse(baseSprint, aiResponse) {
  return {
    ...baseSprint,
    category: aiResponse.category || baseSprint.category,
    tracks: aiResponse.tracks || baseSprint.tracks,
    periods: aiResponse.periods.map((p, i) => ({
      ...p,
      period: i + 1, // ensure sequential
    })),
    // rebuild checked map from actual returned periods
    checked: buildCheckedMap(aiResponse.periods),
  };
}

function buildCheckedMap(periods) {
  const checked = {};
  periods.forEach((p, i) => {
    ["track1", "track2", "track3"].forEach((tr) => {
      (p.tracks[tr] || []).forEach((_, idx) => {
        checked[`${i + 1}-${tr}-${idx}`] = false;
      });
    });
  });
  return checked;
}

// ─── Main entry point ────────────────────────────────────────────────────

export async function generateSprintWithAI(context, parsedDuration) {
  const maxTokens = Math.max(2000, parsedDuration.count * 350); // scale tokens with sprint length

  try {
    if (IS_DEV && DEV_KEY) {
      // ── Dev: call OpenAI directly from the browser ──────────────────
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey: DEV_KEY, dangerouslyAllowBrowser: true });

      const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: buildSprintPrompt(context, parsedDuration) }],
        response_format: { type: "json_object" },
        temperature: 0.75,
        max_tokens: maxTokens,
      });

      const raw = JSON.parse(response.choices[0].message.content);
      return { data: validatePlanResponse(raw), source: "openai" };
    } else {
      // ── Production: call Vercel serverless function ─────────────────
      const res = await fetch("/api/generate-sprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, parsedDuration, maxTokens }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const raw = await res.json();
      return { data: validatePlanResponse(raw), source: "openai" };
    }
  } catch (err) {
    // ── Fallback: rule-based engine ─────────────────────────────────
    console.warn("[aiService] OpenAI failed, using fallback:", err.message);
    return { data: generatePlanFallback(context, parsedDuration), source: "fallback", error: err.message };
  }
}

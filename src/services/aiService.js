// AI service — dev uses VITE_OPENAI_API_KEY directly (browser)
// production routes through /api/* (Vercel serverless, key hidden)

import { generatePlanFallback } from "../ai/sprintBuilder";

const DEV_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const IS_DEV = import.meta.env.DEV;

// ─── GPT availability ─────────────────────────────────────────────────────

/** True when a real GPT-4o call can be made (key present in dev, always true in prod) */
export function isGPTAvailable() {
  return IS_DEV ? !!DEV_KEY : true;
}

// ─── Chat system prompt ───────────────────────────────────────────────────

const CHAT_SYSTEM_PROMPT = `You are a sprint planning coach embedded in a goal-tracking app. Your job is to understand a user's situation well enough to build a great, structured sprint plan — through conversation and listening, not interrogation.

THE APP YOU'RE BUILDING FOR:
The sprint plan has this structure:
- A title and primary goal
- A duration broken into equal time blocks (e.g. 12 weeks → 12 weekly blocks, 6 months → 6 monthly blocks, 90 days → 90 daily blocks)
- 3 parallel tracks (workstreams running throughout the sprint, e.g. "Learning", "Building", "Networking")
- Each block has 9 tasks (3 per track) that are specific to the user's goal and context
- Each block has a milestone — a concrete, measurable outcome to hit by the end of that block
- Blocks progress through phases: Foundation → Skill-Building → First Actions → Momentum → Execution → Delivery

TO BUILD A QUALITY PLAN, YOU NEED TO UNDERSTAND:
1. The specific goal and desired outcome
2. Where they're starting from (experience level, baseline, current situation)
3. Sprint duration and preferred time unit (weeks, months, days, quarters)
4. Time commitment per week
5. What success looks like — in concrete terms
6. Constraints that affect the plan (budget, equipment, schedule, solo or team, location)
7. A name for the sprint that captures the ambition

HOW TO INTERACT — THIS IS CRITICAL:
- Listen and extract from what they share — never run through a checklist
- If they upload a document that clearly answers most of these questions, read it carefully and ONLY ask about genuine gaps — do not repeat back what they've already told you
- If they tell you something in passing ("I work full time", "I have no budget"), treat that as data — don't ask about it again
- Ask at most ONE focused follow-up question per turn when you need clarity
- Be direct and intelligent — react to their specific situation, not a template
- Infer sensible defaults when context is clear (e.g. if they say "I run 2 miles already", infer intermediate level)
- When you have enough context to build a quality plan, don't keep asking — instead, briefly confirm your understanding

DURATION — ALWAYS CLARIFY THE UNIT:
If the user gives a total duration without specifying the block unit (e.g. "1 year", "6 months", "90 days"), you MUST ask how they want to break it into blocks — for example:
"Got it — do you want to track that as weekly sprints, monthly milestones, or quarterly phases?"
Never assume daily, weekly, monthly, or quarterly. This is always required.

CONFIRMING BEFORE COMMITTING:
When you have enough context, naturally summarise what you've understood in 2-3 lines — e.g.:
"So you want to [goal], starting from [starting point], over [duration] with [hours] per week. Sound right?"

If they confirm (or correct you and you incorporate the fix), THEN output READY on a new line:

READY: {"goal":"...","startingPoint":"...","duration":"...","hoursPerWeek":"...","milestones":"...","constraints":"...","sprintTitle":"..."}

The JSON must be on a single line immediately after READY:. Fill in reasonable inferred values where the user hasn't specified — don't leave fields empty just because they weren't asked explicitly. A confident plan from good inference beats an endless questionnaire.`;

// ─── Chat completion ──────────────────────────────────────────────────────

/** Send the full conversation history to GPT-4o and get the next reply */
export async function sendChatMessage(conversationHistory) {
  try {
    if (IS_DEV && DEV_KEY) {
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey: DEV_KEY, dangerouslyAllowBrowser: true });

      const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: CHAT_SYSTEM_PROMPT },
          ...conversationHistory,
        ],
        temperature: 0.85,
        max_tokens: 500,
      });

      return { content: response.choices[0].message.content, source: "openai" };
    } else {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: conversationHistory }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { content: data.content, source: "openai" };
    }
  } catch (err) {
    return { content: null, source: "fallback", error: err.message };
  }
}



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

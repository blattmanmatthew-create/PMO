/**
 * API route for the project intake form.
 * Receives structured form data, sends it to Claude to generate
 * a full project plan with tasks, milestones, and RAID items.
 * All Claude API calls happen server-side so the API key stays secret.
 */
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// System prompt that tells Claude how to turn form data into a full project plan
const GENERATE_PROMPT = `You are a PMO assistant. The user has filled out a project intake form. Your job is to take their structured input and generate a comprehensive project plan as JSON.

## WHAT TO GENERATE

Based on the form data provided, generate:

1. **Tasks** — 3-5 realistic tasks per workstream with sensible start/end dates, owners, and dependencies.
2. **Milestones** — 1-2 milestones per workstream at key checkpoints.
3. **RAID items** — Pre-seed 2-4 risks/issues based on the project type and any risks the user mentioned.
4. **Stakeholders** — Parse any stakeholder names/roles the user listed into structured records.
5. **Meetings** — Create meeting records from the cadence the user selected.
6. **Decisions** — Leave as empty array.
7. **Rollout pipeline** — Leave as empty array unless the project clearly involves product rollouts.

## RULES

- Use the names, dates, and details the user provided exactly.
- Generate realistic task durations and dates relative to today's date.
- Task IDs: T-101, T-102, etc. Milestone IDs: MS-101, etc. RAID IDs: R-001, etc.
- Workstream IDs: WS-001, WS-002, etc.
- Set all task statuses to "not_started" and 0% complete.
- Set all workstream and program statuses to "on_track".
- If the user left fields empty, use sensible defaults (don't leave required fields blank).

## OUTPUT

Return ONLY valid JSON matching the ProgramData schema. No markdown, no explanation, just the JSON object.`;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "your-anthropic-api-key-here") {
      return NextResponse.json(
        { error: "Anthropic API key is not configured. Add it to .env.local" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { formData } = body;

    if (!formData || !formData.projectName) {
      return NextResponse.json(
        { error: "Form data with projectName is required" },
        { status: 400 }
      );
    }

    // Build a clear user message from the structured form data
    const userMessage = `Here is the project intake form data:

**Project Name:** ${formData.projectName}
**Description:** ${formData.description}
**Timeline:** ${formData.isOngoing ? "Ongoing program" : `Target end date: ${formData.targetEndDate || "Not set"}`}
**Today's Date:** ${new Date().toISOString().slice(0, 10)}

**Owner:**
- Name: ${formData.ownerName}
- Role: ${formData.ownerRole || "Not specified"}
- Email: ${formData.ownerEmail || "Not specified"}

**Workstreams:**
${formData.workstreams
  .map(
    (ws: { name: string; leadName: string; description: string }, i: number) =>
      `${i + 1}. ${ws.name}${ws.leadName ? ` — Led by ${ws.leadName}` : ""}${ws.description ? ` (${ws.description})` : ""}`
  )
  .join("\n")}

**Key Stakeholders:**
${formData.stakeholders || "None specified"}

**Meeting Cadence:**
${formData.meetingCadence?.length > 0 ? formData.meetingCadence.join(", ") : "None specified"}

**Known Risks:**
${formData.risks || "None specified"}

**In-Flight Items:**
${formData.inFlight || "None specified"}

Generate the full ProgramData JSON.`;

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: GENERATE_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json(
        { error: "No text content in response" },
        { status: 500 }
      );
    }

    // Claude should return raw JSON, but strip code fences if present
    let jsonText = textContent.text.trim();
    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonText = fenceMatch[1].trim();
    }

    // Validate it's parseable JSON
    const parsed = JSON.parse(jsonText);

    return NextResponse.json({ projectData: parsed });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Failed to parse generated project plan. Please try again." },
        { status: 500 }
      );
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "Invalid API key. Check your ANTHROPIC_API_KEY in .env.local" },
        { status: 401 }
      );
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Rate limit reached. Please wait a moment and try again." },
        { status: 429 }
      );
    }
    if (err instanceof Anthropic.APIConnectionError) {
      return NextResponse.json(
        { error: "Connection error. Please check your internet and try again." },
        { status: 503 }
      );
    }

    console.error("Intake API error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

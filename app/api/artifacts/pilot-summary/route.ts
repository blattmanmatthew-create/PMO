/**
 * API route to generate a pilot results summary.
 * Takes a project ID, a pilot (rollout pipeline) ID, and user-entered
 * results text. Uses Claude to generate a structured decision summary.
 */
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";
import { getPilotSummaryPrompt } from "@/lib/prompts/pilotSummary";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "your-anthropic-api-key-here") {
      return NextResponse.json(
        { error: "Anthropic API key is not configured" },
        { status: 500 }
      );
    }

    const { projectId, pilotId, resultsText } = await request.json();

    if (!pilotId || !resultsText) {
      return NextResponse.json(
        { error: "Pilot ID and results text are required" },
        { status: 400 }
      );
    }

    const { data: program, error } = await supabase
      .from("programs")
      .select("*")
      .eq("id", projectId)
      .single();

    if (error || !program) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const prompt = getPilotSummaryPrompt(program.data, pilotId, resultsText);
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: prompt.system,
      messages: [{ role: "user", content: prompt.user }],
    });

    const textContent = response.content.find((b) => b.type === "text");
    return NextResponse.json({
      content: textContent && textContent.type === "text" ? textContent.text : "",
    });
  } catch (err) {
    console.error("Pilot summary generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate pilot summary" },
      { status: 500 }
    );
  }
}

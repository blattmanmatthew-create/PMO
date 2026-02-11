/**
 * API route to generate a weekly sync agenda.
 * Fetches the project, sends it to Claude with the agenda prompt,
 * and returns the generated agenda text.
 */
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";
import { getAgendaPrompt } from "@/lib/prompts/agenda";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "your-anthropic-api-key-here") {
      return NextResponse.json(
        { error: "Anthropic API key is not configured" },
        { status: 500 }
      );
    }

    const { projectId } = await request.json();

    // Fetch project from Supabase
    const { data: program, error } = await supabase
      .from("programs")
      .select("*")
      .eq("id", projectId)
      .single();

    if (error || !program) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const prompt = getAgendaPrompt(program.data);
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
    console.error("Agenda generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate agenda" },
      { status: 500 }
    );
  }
}

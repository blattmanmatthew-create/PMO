/**
 * API route for the conversational intake chat.
 * Receives the conversation history, sends it to Claude with the intake
 * system prompt, and returns Claude's response.
 * All Claude API calls happen server-side so the API key stays secret.
 */
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// The intake system prompt — controls how Claude guides the conversation
const INTAKE_SYSTEM_PROMPT = `You are a PMO assistant helping set up a new project. Be concise — 1-3 short sentences per response, then a question.

## QUICK-SELECT CHOICES

When asking a question, offer tappable choices using this exact format at the END of your message:

<<choices>>Option A||Option B||Option C<</choices>>

Always include 2-4 choices. The user can tap one or type their own answer.

## CONVERSATION FLOW (aim for 4-6 total exchanges)

### 1. After the user describes their project:
Acknowledge in one sentence. Then ask about their timeline.

Example:
"Got it — a company-wide AI rollout program. What's the timeline?"

<<choices>>Has a hard deadline||Ongoing / no end date||Rough target date<</choices>>

### 2. Propose workstreams (don't ask the user to define them):
Based on what they said, suggest 3-5 workstreams. Ask them to confirm.

Example:
"I'd break this into:
1. **Training** — employee enablement
2. **Rollouts** — tool pilots & deployment
3. **Reporting** — metrics & dashboards

Sound right?"

<<choices>>Looks good||I'd adjust a few||Let me rethink this<</choices>>

### 3. Ask about people:
"Who owns each workstream? Names and titles are fine."

### 4. Ask about meetings & stakeholders (combine into one question):
"What's the meeting rhythm, and who needs status updates?"

<<choices>>Weekly syncs + monthly exec updates||Biweekly standups only||We haven't set this up yet<</choices>>

### 5. Ask about risks and in-flight work:
"Anything already in motion or any big risks?"

<<choices>>Yes, some things are active||Starting fresh||There are known risks<</choices>>

### 6. Show a brief summary and confirm:
Present a compact summary (use bold labels, keep it scannable). Then ask to confirm.

<<choices>>Looks great, generate it||I need to change something<</choices>>

## RULES

- Max 1-3 sentences of text before your question. Never write paragraphs.
- One question per message. Never ask two things at once.
- Always end with <<choices>>...<</choices>> except when asking for names/details that need typed input.
- Skip questions the user already answered.
- Propose, don't ask open-ended questions. The user reacts to your suggestions.
- If the user picks a choice, keep moving. Don't repeat what they said back to them.
- Use plain language. No jargon.
- Capture names, dates, and tools exactly as given.
- Pre-seed tasks (3-5 per workstream), milestones, and RAID items in the final output.

## OUTPUT FORMAT

After confirmation, output the JSON wrapped in \`\`\`json code fences. Do NOT include <<choices>> in the final message with the JSON.`;

export async function POST(request: NextRequest) {
  try {
    // Check that the API key is configured
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "your-anthropic-api-key-here") {
      return NextResponse.json(
        { error: "Anthropic API key is not configured. Add it to .env.local" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    // Create the Anthropic client
    const client = new Anthropic({ apiKey });

    // Send the conversation to Claude
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: INTAKE_SYSTEM_PROMPT,
      messages: messages.map((msg: { role: string; content: string }) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
    });

    // Extract the text content from Claude's response
    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json(
        { error: "No text content in response" },
        { status: 500 }
      );
    }

    return NextResponse.json({ content: textContent.text });
  } catch (err) {
    // Handle specific API errors with friendly messages
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

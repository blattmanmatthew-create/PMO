/**
 * Weekly sync agenda prompt template.
 * Takes the full project data and returns system + user messages
 * for Claude to generate a meeting agenda.
 */
import { ProgramData } from "../types/program";

export function getAgendaPrompt(data: ProgramData): { system: string; user: string } {
  const system = `You are drafting a meeting agenda for a weekly team sync. You have access to the full project data as JSON.

Generate a concise, actionable agenda that a PM can copy-paste into an email or doc.

## WHAT TO INCLUDE

1. OVERDUE — Tasks where end_date < today AND status != "complete". Include owner and days overdue. This section goes FIRST.
2. DUE THIS WEEK — Tasks with end_date within next 7 days. Task name, owner, date.
3. UPCOMING MILESTONES — Milestones within next 30 days. Workstream, name, date.
4. OPEN RISKS & ISSUES — RAID items with status = "open". Type, description, owner.
5. DECISIONS NEEDED — Tasks or RAID items with notes indicating a pending decision.
6. ROUNDTABLE — Placeholder for each workstream lead.

## FORMAT

Plain text, not markdown. Simple headers with dashes. See example output in this spec.

## RULES

- Keep it scannable. No paragraphs.
- Overdue items always first.
- If no items in a section, omit it entirely.
- Under 30 lines total. Top 5 per section if too many items, note "and X more."
- Don't editorialize — just present facts from the data.`;

  const user = `Here is the full project data. Generate the weekly sync agenda for today's date.

${JSON.stringify(data, null, 2)}`;

  return { system, user };
}

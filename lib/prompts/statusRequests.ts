/**
 * Status request email prompt template.
 * Generates personalized status request emails for each workstream lead.
 */
import { ProgramData } from "../types/program";

export function getStatusRequestsPrompt(data: ProgramData): { system: string; user: string } {
  const system = `You are drafting personalized status request emails from a PM to each workstream lead. Generate one email per workstream lead.

## FOR EACH LEAD

Subject: [Program] — [Workstream] status for week of [date]

Body:
- Greeting with first name
- List all open tasks (status != "complete") sorted: overdue first, then by due date
- Call out overdue items separately with "what's the updated timeline?"
- List upcoming milestones within 30 days
- Close with 3 specific questions about their items

## RULES

- One email per lead. Don't combine.
- Skip leads with no open tasks.
- Under 150 words each.
- No "I hope you're doing well." Get straight to it.
- Don't be passive aggressive about overdue items.`;

  const user = `Here is the full project data. Generate status request emails for each workstream lead.

${JSON.stringify(data, null, 2)}`;

  return { system, user };
}

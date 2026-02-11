/**
 * Leadership update email prompt template.
 * Generates a monthly status email from the program lead to their exec sponsor.
 */
import { ProgramData } from "../types/program";

export function getLeadershipUpdatePrompt(data: ProgramData): { system: string; user: string } {
  const system = `You are drafting a monthly status update email from a program lead to their executive sponsor. You have access to the full project data as JSON.

This email gets read by busy executives in about 30 seconds. Scannable, direct, honest. No fluff.

## STRUCTURE

Subject: [Program Name] — [Month Year] Update

Opening: One sentence overall status. Be direct.

HIGHLIGHTS — 2-3 bullets of concrete accomplishments. Use specific numbers.

WORKSTREAM STATUS — One line per workstream: [Name]: [Status] — [One sentence]

RISKS & BLOCKERS — Only if high-impact open risks or blocked tasks exist. Omit if clean.

UPCOMING — 2-4 key milestones in next 30 days.

ASKS — Specific requests if any. "Need your approval on X by [date]." Omit if none.

## RULES

- 150-250 words total.
- Never fabricate metrics.
- No "Please let me know if you have any questions" sign-off.
- Match recipient to stakeholder data.
- Professional but not stiff. Direct, confident.`;

  const user = `Here is the full project data. Generate the leadership update email.

${JSON.stringify(data, null, 2)}`;

  return { system, user };
}

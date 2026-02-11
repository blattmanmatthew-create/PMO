/**
 * Pilot results summary prompt template.
 * Takes project data plus user-entered pilot results to generate a decision summary.
 */
import { ProgramData } from "../types/program";

export function getPilotSummaryPrompt(
  data: ProgramData,
  pilotId: string,
  resultsText: string
): { system: string; user: string } {
  // Find the specific rollout item
  const pilot = data.rollout_pipeline.find((r) => r.id === pilotId);

  const system = `You are generating a pilot results summary for decision-making. You have the rollout pipeline entry and user-provided results.

## OUTPUT STRUCTURE

PILOT RESULTS SUMMARY — [Product Name] — [Business Line] Pilot

OVERVIEW — Period, users, objective (one sentence)

SUCCESS CRITERIA vs. ACTUALS — Table format: Criterion | Target | Actual | Met?

KEY FINDINGS — 3-5 specific bullets. Include positives and negatives.

ISSUES & CONCERNS — What went wrong or raised flags.

APPROVAL STATUS — From rollout pipeline: Compliance, Security, Legal, Procurement status.

RECOMMENDATION — Pick ONE:
1. Proceed to full rollout (if criteria met and approvals clear)
2. Expand pilot (if promising but inconclusive)
3. Discontinue (if criteria not met)

Take a position. Don't hedge.

NEXT STEPS — 3-5 action items with owners.

## RULES

- Never fabricate data. Say "Data not provided" if missing.
- 300-400 words total.
- Don't recommend full rollout if any approval is pending.`;

  const user = `Here is the rollout pipeline entry for this pilot:
${JSON.stringify(pilot, null, 2)}

Here is the full project data for context:
${JSON.stringify(data, null, 2)}

Here are the user-provided pilot results:
${resultsText}

Generate the pilot results summary.`;

  return { system, user };
}

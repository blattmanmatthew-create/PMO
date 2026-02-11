/**
 * TypeScript interfaces for the PMO Assistant data schema.
 * These types match the JSON structure defined in REFERENCE.md.
 * All project data flows through these types — intake populates them,
 * Excel reads them, dashboards render them, and prompts consume them.
 */

// Shared type for a person (used for owners, leads, stakeholders)
export interface Person {
  name: string;
  role: string;
  email: string;
}

// Top-level program info
export interface Program {
  id: string;
  name: string;
  description: string;
  status: "on_track" | "at_risk" | "behind" | "on_hold";
  created_date: string; // YYYY-MM-DD
  target_end_date: string | null;
  is_ongoing: boolean;
  owner: Person;
}

// A single task within a workstream
export interface Task {
  id: string; // T-101 format
  workstream_id: string;
  name: string;
  owner: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  duration_days: number;
  predecessor: string | null; // task ID or null
  status: "not_started" | "in_progress" | "complete" | "at_risk" | "blocked";
  percent_complete: number; // 0-100
  priority: "high" | "medium" | "low";
  notes: string;
}

// A milestone within a workstream
export interface Milestone {
  id: string; // MS-101 format
  workstream_id: string;
  name: string;
  date: string; // YYYY-MM-DD
  status: "upcoming" | "complete" | "at_risk" | "missed";
  dependencies: string[]; // task or milestone IDs
  owner: string;
}

// A workstream (major track of work) with its tasks and milestones
export interface Workstream {
  id: string;
  name: string;
  lead: Person;
  status: "on_track" | "at_risk" | "behind" | "on_hold";
  description: string;
  tasks: Task[];
  milestones: Milestone[];
}

// How a stakeholder receives communications
export interface Communication {
  type: string;
  frequency: "weekly" | "biweekly" | "monthly" | "quarterly" | "as_needed";
  format: "email" | "presentation";
  detail_level: "summary" | "detailed" | "tailored" | "strategic";
}

// A stakeholder (someone who needs to be informed or can approve/block)
export interface Stakeholder {
  id: string;
  name: string;
  role: string;
  organization: string;
  email: string;
  interest_level: "high" | "medium" | "low";
  influence_level: "high" | "medium" | "low";
  communications: Communication[];
  notes: string;
}

// A recurring meeting
export interface Meeting {
  id: string;
  name: string;
  frequency: "weekly" | "biweekly" | "monthly" | "quarterly";
  day: string;
  time: string;
  attendees: string[];
  purpose: string;
  generates: string[]; // artifact types this meeting produces
}

// A RAID log item (Risk, Assumption, Issue, or Dependency)
export interface RaidItem {
  id: string; // R-001, A-001, I-001, D-001 format
  type: "risk" | "assumption" | "issue" | "dependency";
  description: string;
  workstream_id: string;
  impact: "high" | "medium" | "low";
  probability: "high" | "medium" | "low" | null;
  owner: string;
  mitigation: string;
  status: "open" | "mitigated" | "closed";
  date_raised: string; // YYYY-MM-DD
  target_resolution_date: string | null;
}

// A recorded decision
export interface Decision {
  id: string; // DEC-001 format
  date: string; // YYYY-MM-DD
  description: string;
  options_considered: string[];
  decision: string;
  decided_by: string;
  rationale: string;
  workstream_id: string;
}

// Approval status for a product in the rollout pipeline
export interface ApprovalStatus {
  compliance: "approved" | "in_review" | "pending" | "not_submitted" | "not_applicable";
  security: "approved" | "in_review" | "pending" | "not_submitted" | "not_applicable";
  legal: "approved" | "in_review" | "pending" | "not_submitted" | "not_applicable";
  procurement: "approved" | "in_review" | "pending" | "not_submitted" | "not_applicable";
}

// A product in the rollout pipeline
export interface RolloutItem {
  id: string;
  product_name: string;
  stage: "evaluation" | "pilot" | "approval" | "rollout" | "live";
  business_line: string;
  pilot_start: string | null;
  pilot_end: string | null;
  pilot_users: number | null;
  success_criteria: string | null;
  approval_status: ApprovalStatus;
  workstream_id: string;
}

// The complete project data structure — this is what gets stored in Supabase
// and used by every feature in the app
export interface ProgramData {
  program: Program;
  workstreams: Workstream[];
  stakeholders: Stakeholder[];
  meetings: Meeting[];
  raid_log: RaidItem[];
  decisions: Decision[];
  rollout_pipeline: RolloutItem[];
}

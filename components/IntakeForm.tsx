/**
 * Multi-step intake form for setting up a new project.
 * Collects structured input across 4 steps, then sends it to Claude
 * to generate the full project plan with tasks, milestones, and RAID items.
 */
"use client";

import { useState } from "react";

// Form data collected across all steps
export interface IntakeFormData {
  projectName: string;
  description: string;
  isOngoing: boolean;
  targetEndDate: string;
  ownerName: string;
  ownerRole: string;
  ownerEmail: string;
  workstreams: { name: string; leadName: string; description: string }[];
  stakeholders: string;
  meetingCadence: string[];
  risks: string;
  inFlight: string;
}

interface IntakeFormProps {
  onSubmit: (data: IntakeFormData) => void;
  isSubmitting: boolean;
}

const STEP_LABELS = ["Project Basics", "Your Team", "Context", "Review"];

const MEETING_OPTIONS = [
  "Weekly team sync",
  "Biweekly standup",
  "Monthly leadership update",
  "Quarterly business review",
];

export function IntakeForm({ onSubmit, isSubmitting }: IntakeFormProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<IntakeFormData>({
    projectName: "",
    description: "",
    isOngoing: false,
    targetEndDate: "",
    ownerName: "",
    ownerRole: "",
    ownerEmail: "",
    workstreams: [{ name: "", leadName: "", description: "" }],
    stakeholders: "",
    meetingCadence: [],
    risks: "",
    inFlight: "",
  });

  function update(fields: Partial<IntakeFormData>) {
    setForm((prev) => ({ ...prev, ...fields }));
  }

  function addWorkstream() {
    update({
      workstreams: [...form.workstreams, { name: "", leadName: "", description: "" }],
    });
  }

  function removeWorkstream(index: number) {
    if (form.workstreams.length <= 1) return;
    update({ workstreams: form.workstreams.filter((_, i) => i !== index) });
  }

  function updateWorkstream(index: number, field: string, value: string) {
    const updated = form.workstreams.map((ws, i) =>
      i === index ? { ...ws, [field]: value } : ws
    );
    update({ workstreams: updated });
  }

  function toggleMeeting(option: string) {
    const current = form.meetingCadence;
    if (current.includes(option)) {
      update({ meetingCadence: current.filter((m) => m !== option) });
    } else {
      update({ meetingCadence: [...current, option] });
    }
  }

  // Validation per step
  function canAdvance(): boolean {
    if (step === 0) {
      return form.projectName.trim().length > 0 && form.description.trim().length > 0;
    }
    if (step === 1) {
      return (
        form.ownerName.trim().length > 0 &&
        form.workstreams.every((ws) => ws.name.trim().length > 0)
      );
    }
    return true; // Steps 2 and 3 are optional / review
  }

  function handleNext() {
    if (step < STEP_LABELS.length - 1) setStep(step + 1);
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  function handleSubmit() {
    onSubmit(form);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-8">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  i < step
                    ? "bg-[#1F3864] text-white"
                    : i === step
                      ? "bg-[#1F3864] text-white ring-4 ring-blue-100"
                      : "bg-gray-200 text-gray-500"
                }`}
              >
                {i < step ? "\u2713" : i + 1}
              </div>
              <span
                className={`text-xs mt-1 ${i <= step ? "text-[#1F3864] font-medium" : "text-gray-400"}`}
              >
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-2 mb-5 ${i < step ? "bg-[#1F3864]" : "bg-gray-200"}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Project Basics */}
      {step === 0 && (
        <div className="space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">Project Basics</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.projectName}
              onChange={(e) => update({ projectName: e.target.value })}
              placeholder="e.g., Enterprise AI Rollout Program"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3864]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="What is this project about? What are the key goals?"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3864]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timeline
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!form.isOngoing}
                  onChange={() => update({ isOngoing: false })}
                  className="accent-[#1F3864]"
                />
                <span className="text-sm text-gray-700">Has an end date</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={form.isOngoing}
                  onChange={() => update({ isOngoing: true, targetEndDate: "" })}
                  className="accent-[#1F3864]"
                />
                <span className="text-sm text-gray-700">Ongoing program</span>
              </label>
            </div>
          </div>

          {!form.isOngoing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target End Date
              </label>
              <input
                type="date"
                value={form.targetEndDate}
                onChange={(e) => update({ targetEndDate: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3864]"
              />
            </div>
          )}
        </div>
      )}

      {/* Step 1: Your Team */}
      {step === 1 && (
        <div className="space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">Your Team</h2>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-gray-700">
              Project Owner <span className="text-red-400">*</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={form.ownerName}
                onChange={(e) => update({ ownerName: e.target.value })}
                placeholder="Name"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3864]"
              />
              <input
                type="text"
                value={form.ownerRole}
                onChange={(e) => update({ ownerRole: e.target.value })}
                placeholder="Role / Title"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3864]"
              />
            </div>
            <input
              type="email"
              value={form.ownerEmail}
              onChange={(e) => update({ ownerEmail: e.target.value })}
              placeholder="Email (optional)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3864]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">
                Workstreams <span className="text-red-400">*</span>
              </p>
              <button
                onClick={addWorkstream}
                className="text-xs text-[#1F3864] hover:underline"
              >
                + Add workstream
              </button>
            </div>
            <div className="space-y-3">
              {form.workstreams.map((ws, i) => (
                <div
                  key={i}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">
                      Workstream {i + 1}
                    </span>
                    {form.workstreams.length > 1 && (
                      <button
                        onClick={() => removeWorkstream(i)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={ws.name}
                    onChange={(e) => updateWorkstream(i, "name", e.target.value)}
                    placeholder="Workstream name (e.g., Training & Enablement)"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3864]"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={ws.leadName}
                      onChange={(e) => updateWorkstream(i, "leadName", e.target.value)}
                      placeholder="Lead name (optional)"
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3864]"
                    />
                    <input
                      type="text"
                      value={ws.description}
                      onChange={(e) => updateWorkstream(i, "description", e.target.value)}
                      placeholder="Brief description (optional)"
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3864]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Context (optional) */}
      {step === 2 && (
        <div className="space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">Context</h2>
          <p className="text-sm text-gray-500 -mt-3">
            All fields optional — add what you have now.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Key Stakeholders
            </label>
            <textarea
              value={form.stakeholders}
              onChange={(e) => update({ stakeholders: e.target.value })}
              placeholder="Names and roles, one per line&#10;e.g., Sarah Chen, VP Engineering&#10;Mike Ross, CISO"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3864]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meeting Cadence
            </label>
            <div className="flex flex-wrap gap-2">
              {MEETING_OPTIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => toggleMeeting(option)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    form.meetingCadence.includes(option)
                      ? "bg-[#1F3864] text-white border-[#1F3864]"
                      : "border-gray-300 text-gray-600 hover:border-gray-400"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Known Risks or Concerns
            </label>
            <textarea
              value={form.risks}
              onChange={(e) => update({ risks: e.target.value })}
              placeholder="Anything that could go sideways..."
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3864]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Anything Already In Flight
            </label>
            <textarea
              value={form.inFlight}
              onChange={(e) => update({ inFlight: e.target.value })}
              placeholder="Active pilots, committed deadlines, scheduled training..."
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3864]"
            />
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Review & Generate</h2>
          <p className="text-sm text-gray-500 -mt-2">
            Confirm your details below. Claude will generate tasks, milestones, and a
            risk log based on this.
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3 text-sm">
            <div>
              <span className="font-medium text-gray-700">Project: </span>
              <span className="text-gray-900">{form.projectName}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Description: </span>
              <span className="text-gray-600">{form.description}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Timeline: </span>
              <span className="text-gray-600">
                {form.isOngoing
                  ? "Ongoing"
                  : form.targetEndDate || "No end date set"}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Owner: </span>
              <span className="text-gray-600">
                {form.ownerName}
                {form.ownerRole ? `, ${form.ownerRole}` : ""}
              </span>
            </div>

            <hr className="border-gray-200" />

            <div>
              <span className="font-medium text-gray-700">Workstreams:</span>
              <ul className="mt-1 space-y-1 ml-4">
                {form.workstreams.map((ws, i) => (
                  <li key={i} className="text-gray-600">
                    <span className="font-medium">{ws.name}</span>
                    {ws.leadName ? ` — ${ws.leadName}` : ""}
                    {ws.description ? ` (${ws.description})` : ""}
                  </li>
                ))}
              </ul>
            </div>

            {form.stakeholders && (
              <div>
                <span className="font-medium text-gray-700">Stakeholders: </span>
                <span className="text-gray-600">{form.stakeholders}</span>
              </div>
            )}

            {form.meetingCadence.length > 0 && (
              <div>
                <span className="font-medium text-gray-700">Meetings: </span>
                <span className="text-gray-600">
                  {form.meetingCadence.join(", ")}
                </span>
              </div>
            )}

            {form.risks && (
              <div>
                <span className="font-medium text-gray-700">Risks: </span>
                <span className="text-gray-600">{form.risks}</span>
              </div>
            )}

            {form.inFlight && (
              <div>
                <span className="font-medium text-gray-700">In flight: </span>
                <span className="text-gray-600">{form.inFlight}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between mt-8">
        <button
          onClick={handleBack}
          disabled={step === 0}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-0 transition-colors"
        >
          Back
        </button>

        {step < STEP_LABELS.length - 1 ? (
          <button
            onClick={handleNext}
            disabled={!canAdvance()}
            className="px-6 py-2 text-sm bg-[#1F3864] text-white rounded-lg hover:bg-[#2a4a7f] disabled:opacity-50 transition-colors"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 text-sm bg-[#1F3864] text-white rounded-lg hover:bg-[#2a4a7f] disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? "Generating project plan..." : "Generate Project Plan"}
          </button>
        )}
      </div>
    </div>
  );
}

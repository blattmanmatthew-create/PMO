/**
 * Intake page — the multi-step form for setting up a new project.
 * User fills in structured fields, then Claude generates the full
 * project plan and it gets saved to Supabase.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IntakeForm, IntakeFormData } from "@/components/IntakeForm";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

export default function IntakePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: IntakeFormData) {
    setIsSubmitting(true);
    setError(null);

    try {
      // Send form data to the API for Claude to generate the project plan
      const response = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to generate project plan");
      }

      const { projectData } = await response.json();

      // Apply safe defaults
      const safeData = {
        program: {
          id: uuidv4(),
          name: formData.projectName,
          description: formData.description,
          status: "on_track",
          created_date: new Date().toISOString().slice(0, 10),
          target_end_date: formData.isOngoing ? null : formData.targetEndDate || null,
          is_ongoing: formData.isOngoing,
          owner: {
            name: formData.ownerName,
            role: formData.ownerRole || "",
            email: formData.ownerEmail || "",
          },
          ...projectData?.program,
        },
        workstreams: projectData?.workstreams || [],
        stakeholders: projectData?.stakeholders || [],
        meetings: projectData?.meetings || [],
        raid_log: projectData?.raid_log || [],
        decisions: projectData?.decisions || [],
        rollout_pipeline: projectData?.rollout_pipeline || [],
      };

      // Ensure program ID exists
      if (!safeData.program.id) {
        safeData.program.id = uuidv4();
      }

      const rowId = uuidv4();

      const { error: dbError } = await supabase.from("programs").insert({
        id: rowId,
        name: safeData.program.name,
        data: safeData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (dbError) {
        throw new Error(dbError.message);
      }

      router.push(`/project/${rowId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save project";
      setError(message);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] relative">
      {/* Generating overlay */}
      {isSubmitting && (
        <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-2 border-[#1F3864] border-t-transparent rounded-full animate-spin mb-3" />
            <div className="text-lg font-medium text-gray-700">
              Generating your project plan...
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Creating tasks, milestones, and risk items
            </div>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3 text-center">
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-sm text-red-500 underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      <IntakeForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}

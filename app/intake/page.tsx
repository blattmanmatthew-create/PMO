/**
 * Intake page — the conversational project setup flow.
 * Shows a chat interface where the user describes their project,
 * Claude asks follow-up questions, and at the end the project
 * gets saved to Supabase and the user is redirected to the project page.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChatInterface } from "@/components/ChatInterface";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

export default function IntakePage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Called when the ChatInterface detects valid JSON in Claude's response
  async function handleProjectComplete(jsonString: string) {
    setIsSaving(true);
    setSaveError(null);

    try {
      // Parse the JSON from Claude's response
      const projectData = JSON.parse(jsonString);

      // Make sure the program has an ID
      if (!projectData.program.id) {
        projectData.program.id = uuidv4();
      }

      // Generate a unique row ID for the Supabase record
      const rowId = uuidv4();

      // Save to Supabase
      const { error } = await supabase.from("programs").insert({
        id: rowId,
        name: projectData.program.name,
        data: projectData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) {
        throw new Error(error.message);
      }

      // Redirect to the new project page
      router.push(`/project/${rowId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save project";
      setSaveError(message);
      setIsSaving(false);
    }
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Saving overlay */}
      {isSaving && (
        <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-medium text-gray-700">
              Saving your project...
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Setting up your project plan
            </div>
          </div>
        </div>
      )}

      {/* Save error message */}
      {saveError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3 text-center">
          <p className="text-red-600 text-sm">{saveError}</p>
          <button
            onClick={() => setSaveError(null)}
            className="text-sm text-red-500 underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* The chat interface takes up the full remaining height */}
      <ChatInterface onProjectComplete={handleProjectComplete} />
    </div>
  );
}

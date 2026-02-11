/**
 * Project detail page — shows a single project's details and action buttons.
 * Displays the program header, workstreams, milestones, and provides
 * buttons to generate artifacts (agenda, leadership update, status requests,
 * pilot summary) and download the Excel plan.
 */
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ProgramData, Milestone, RolloutItem } from "@/lib/types/program";
import { ArtifactDisplay } from "@/components/ArtifactDisplay";

// Status badge colors
const statusColors: Record<string, string> = {
  on_track: "bg-green-100 text-green-700",
  at_risk: "bg-yellow-100 text-yellow-700",
  behind: "bg-red-100 text-red-700",
  on_hold: "bg-gray-100 text-gray-600",
};

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [data, setData] = useState<ProgramData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Artifact states
  const [activeArtifact, setActiveArtifact] = useState<string | null>(null);
  const [artifactContent, setArtifactContent] = useState("");
  const [artifactLoading, setArtifactLoading] = useState(false);
  const [artifactTitle, setArtifactTitle] = useState("");

  // Pilot summary form state
  const [showPilotForm, setShowPilotForm] = useState(false);
  const [selectedPilotId, setSelectedPilotId] = useState("");
  const [pilotResults, setPilotResults] = useState("");

  // Excel download state
  const [isDownloading, setIsDownloading] = useState(false);

  // Fetch project data on mount
  useEffect(() => {
    async function fetchProject() {
      try {
        const { data: program, error } = await supabase
          .from("programs")
          .select("*")
          .eq("id", projectId)
          .single();

        if (error || !program) {
          throw new Error("Project not found");
        }

        // Apply safe defaults for any fields Claude may not have generated
        const raw = program.data as Partial<ProgramData>;
        const safeData: ProgramData = {
          program: {
            id: "",
            name: "Untitled Project",
            description: "",
            status: "on_track",
            created_date: new Date().toISOString().slice(0, 10),
            target_end_date: null,
            is_ongoing: false,
            owner: { name: "Unknown", role: "", email: "" },
            ...raw.program,
          },
          workstreams: (raw.workstreams || []).map((ws) => ({
            ...ws,
            lead: ws.lead || { name: "Unassigned", role: "", email: "" },
            tasks: ws.tasks || [],
            milestones: ws.milestones || [],
            status: ws.status || "on_track",
          })),
          stakeholders: raw.stakeholders || [],
          meetings: raw.meetings || [],
          raid_log: raw.raid_log || [],
          decisions: raw.decisions || [],
          rollout_pipeline: raw.rollout_pipeline || [],
        };
        setData(safeData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load project");
      } finally {
        setIsLoading(false);
      }
    }

    fetchProject();
  }, [projectId]);

  // Get upcoming milestones (next 30 days)
  function getUpcomingMilestones(): (Milestone & { workstreamName: string })[] {
    if (!data) return [];
    const today = new Date();
    const thirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const milestones: (Milestone & { workstreamName: string })[] = [];
    data.workstreams.forEach((ws) => {
      ws.milestones.forEach((ms) => {
        const msDate = new Date(ms.date);
        if (msDate >= today && msDate <= thirtyDays) {
          milestones.push({ ...ms, workstreamName: ws.name });
        }
      });
    });

    return milestones.sort((a, b) => a.date.localeCompare(b.date));
  }

  // Generate an artifact by calling the appropriate API route
  async function generateArtifact(type: string) {
    setActiveArtifact(type);
    setArtifactContent("");
    setArtifactLoading(true);

    const titleMap: Record<string, string> = {
      agenda: "Weekly Sync Agenda",
      "leadership-update": "Leadership Update Email",
      "status-requests": "Status Request Emails",
      "pilot-summary": "Pilot Results Summary",
    };
    setArtifactTitle(titleMap[type] || "Generated Content");

    try {
      const body: Record<string, string> = { projectId };
      if (type === "pilot-summary") {
        body.pilotId = selectedPilotId;
        body.resultsText = pilotResults;
      }

      const response = await fetch(`/api/artifacts/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Generation failed");
      }

      const result = await response.json();
      setArtifactContent(result.content);
    } catch (err) {
      setArtifactContent(
        `Error: ${err instanceof Error ? err.message : "Something went wrong"}`
      );
    } finally {
      setArtifactLoading(false);
    }
  }

  // Download the Excel file
  async function handleDownload() {
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/excel/${projectId}`);
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Get filename from Content-Disposition header or use default
      const disposition = response.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="(.+)"/);
      a.download = match ? match[1] : "Project_Plan.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Download failed");
    } finally {
      setIsDownloading(false);
    }
  }

  // Get pilots that are in the "pilot" stage for the pilot summary form
  function getPilots(): RolloutItem[] {
    if (!data) return [];
    return data.rollout_pipeline.filter((r) => r.stage === "pilot");
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Loading project...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
          Project not found
        </h2>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <Link href="/dashboard" className="text-[#1F3864] underline text-sm">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const upcomingMilestones = getUpcomingMilestones();
  const pilots = getPilots();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="text-sm text-[#1F3864] hover:underline mb-6 inline-block"
      >
        &larr; Back to Dashboard
      </Link>

      {/* Program header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
          <h1 className="text-2xl font-bold text-gray-900">
            {data.program.name}
          </h1>
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusColors[data.program.status] || statusColors.on_track}`}
          >
            {data.program.status.replace("_", " ").toUpperCase()}
          </span>
        </div>
        <p className="text-sm text-gray-500">
          Owner: {data.program.owner.name}, {data.program.owner.role}
        </p>
        <p className="text-sm text-gray-600 mt-2">{data.program.description}</p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 mb-8">
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="px-4 py-2 text-sm bg-[#1F3864] text-white rounded-lg hover:bg-[#2a4a7f] disabled:opacity-50 transition-colors"
        >
          {isDownloading ? "Generating..." : "Download Excel"}
        </button>
        <button
          onClick={() => generateArtifact("agenda")}
          className="px-4 py-2 text-sm border border-[#1F3864] text-[#1F3864] rounded-lg hover:bg-blue-50 transition-colors"
        >
          Generate Agenda
        </button>
        <button
          onClick={() => generateArtifact("leadership-update")}
          className="px-4 py-2 text-sm border border-[#1F3864] text-[#1F3864] rounded-lg hover:bg-blue-50 transition-colors"
        >
          Generate Leadership Update
        </button>
        <button
          onClick={() => generateArtifact("status-requests")}
          className="px-4 py-2 text-sm border border-[#1F3864] text-[#1F3864] rounded-lg hover:bg-blue-50 transition-colors"
        >
          Generate Status Requests
        </button>
        <button
          onClick={() => setShowPilotForm(!showPilotForm)}
          className="px-4 py-2 text-sm border border-[#1F3864] text-[#1F3864] rounded-lg hover:bg-blue-50 transition-colors"
        >
          Generate Pilot Summary
        </button>
      </div>

      {/* Pilot summary form — shown when the button is clicked */}
      {showPilotForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-8">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Pilot Results Summary
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Select Pilot
              </label>
              <select
                value={selectedPilotId}
                onChange={(e) => setSelectedPilotId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3864]"
              >
                <option value="">Choose a pilot...</option>
                {pilots.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.product_name} — {p.business_line}
                  </option>
                ))}
                {pilots.length === 0 && (
                  <option disabled>No active pilots</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Pilot Results (usage numbers, feedback, issues)
              </label>
              <textarea
                value={pilotResults}
                onChange={(e) => setPilotResults(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F3864]"
                placeholder="e.g., 72% weekly active usage, 88% positive feedback, 35% time savings..."
              />
            </div>
            <button
              onClick={() => {
                if (selectedPilotId && pilotResults.trim()) {
                  generateArtifact("pilot-summary");
                  setShowPilotForm(false);
                }
              }}
              disabled={!selectedPilotId || !pilotResults.trim()}
              className="px-4 py-2 text-sm bg-[#1F3864] text-white rounded-lg hover:bg-[#2a4a7f] disabled:opacity-50 transition-colors"
            >
              Generate Summary
            </button>
          </div>
        </div>
      )}

      {/* Artifact display — shown after generating any artifact */}
      {activeArtifact && (
        <div className="mb-8">
          <ArtifactDisplay
            content={artifactContent}
            isLoading={artifactLoading}
            onRegenerate={() => generateArtifact(activeArtifact)}
            title={artifactTitle}
          />
        </div>
      )}

      {/* Workstreams */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Workstreams
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {data.workstreams.map((ws) => {
            const openTasks = ws.tasks.filter((t) => t.status !== "complete").length;
            const totalTasks = ws.tasks.length;
            return (
              <div
                key={ws.id}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{ws.name}</h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[ws.status] || statusColors.on_track}`}
                  >
                    {ws.status.replace("_", " ").toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  Lead: {ws.lead.name}
                </p>
                <p className="text-xs text-gray-400">
                  {openTasks} open / {totalTasks} total tasks
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Upcoming milestones */}
      {upcomingMilestones.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Upcoming Milestones (Next 30 Days)
          </h2>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-2 font-medium text-gray-600">
                    Milestone
                  </th>
                  <th className="px-4 py-2 font-medium text-gray-600">
                    Workstream
                  </th>
                  <th className="px-4 py-2 font-medium text-gray-600">Date</th>
                  <th className="px-4 py-2 font-medium text-gray-600">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {upcomingMilestones.map((ms) => (
                  <tr key={ms.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-800">{ms.name}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {ms.workstreamName}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{ms.date}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[ms.status] || "bg-blue-100 text-blue-700"}`}
                      >
                        {ms.status.replace("_", " ").toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

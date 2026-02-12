/**
 * Project detail page — the interactive project tracker.
 * Tabbed layout: Overview, Tasks, Milestones, RAID Log, Stakeholders.
 * All changes auto-save to Supabase after a short debounce.
 * Excel export available at any time.
 */
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ProgramData, Workstream, RaidItem, Stakeholder } from "@/lib/types/program";
import { ArtifactDisplay } from "@/components/ArtifactDisplay";
import { TaskTable } from "@/components/TaskTable";
import { MilestoneTable } from "@/components/MilestoneTable";
import { RaidLog } from "@/components/RaidLog";
import { StakeholderTable } from "@/components/StakeholderTable";

// Status badge colors
const statusColors: Record<string, string> = {
  on_track: "bg-green-100 text-green-700",
  at_risk: "bg-yellow-100 text-yellow-700",
  behind: "bg-red-100 text-red-700",
  on_hold: "bg-gray-100 text-gray-600",
};

const STATUS_OPTIONS = ["on_track", "at_risk", "behind", "on_hold"];

type Tab = "overview" | "tasks" | "milestones" | "raid" | "stakeholders";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "tasks", label: "Tasks" },
  { key: "milestones", label: "Milestones" },
  { key: "raid", label: "RAID Log" },
  { key: "stakeholders", label: "Stakeholders" },
];

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [data, setData] = useState<ProgramData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [isEditingHeader, setIsEditingHeader] = useState(false);

  // Artifact states
  const [activeArtifact, setActiveArtifact] = useState<string | null>(null);
  const [artifactContent, setArtifactContent] = useState("");
  const [artifactLoading, setArtifactLoading] = useState(false);
  const [artifactTitle, setArtifactTitle] = useState("");

  // Excel download state
  const [isDownloading, setIsDownloading] = useState(false);

  // Debounce timer for auto-save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist data to Supabase
  const persistToSupabase = useCallback(
    async (newData: ProgramData) => {
      setSaveStatus("saving");
      try {
        const { error: dbError } = await supabase
          .from("programs")
          .update({
            name: newData.program.name,
            data: newData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", projectId);

        if (dbError) throw dbError;
        setSaveStatus("saved");
      } catch {
        setSaveStatus("unsaved");
      }
    },
    [projectId]
  );

  // Update data and schedule auto-save
  function updateData(newData: ProgramData) {
    setData(newData);
    setSaveStatus("unsaved");

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      persistToSupabase(newData);
    }, 1000);
  }

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

  // Cleanup save timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Generate an artifact
  async function generateArtifact(type: string) {
    setActiveArtifact(type);
    setArtifactContent("");
    setArtifactLoading(true);

    const titleMap: Record<string, string> = {
      agenda: "Weekly Sync Agenda",
      "leadership-update": "Leadership Update Email",
      "status-requests": "Status Request Emails",
    };
    setArtifactTitle(titleMap[type] || "Generated Content");

    try {
      const body: Record<string, string> = { projectId };
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

  // Download Excel
  async function handleDownload() {
    // Flush pending saves first
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      if (data) await persistToSupabase(data);
    }

    setIsDownloading(true);
    try {
      const response = await fetch(`/api/excel/${projectId}`);
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
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

  // Handler helpers
  function handleWorkstreamUpdate(workstreams: Workstream[]) {
    if (!data) return;
    updateData({ ...data, workstreams });
  }

  function handleRaidUpdate(raid_log: RaidItem[]) {
    if (!data) return;
    updateData({ ...data, raid_log });
  }

  function handleStakeholderUpdate(stakeholders: Stakeholder[]) {
    if (!data) return;
    updateData({ ...data, stakeholders });
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Loading project...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Project not found</h2>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <Link href="/dashboard" className="text-[#1F3864] underline text-sm">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  // Overview stats
  const totalTasks = data.workstreams.reduce((n, ws) => n + ws.tasks.length, 0);
  const completedTasks = data.workstreams.reduce(
    (n, ws) => n + ws.tasks.filter((t) => t.status === "complete").length,
    0
  );
  const atRiskTasks = data.workstreams.reduce(
    (n, ws) => n + ws.tasks.filter((t) => t.status === "at_risk" || t.status === "blocked").length,
    0
  );
  const openRaids = data.raid_log.filter((r) => r.status === "open").length;
  const wsLookup = data.workstreams.map((ws) => ({ id: ws.id, name: ws.name }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Top bar: back + save status + export */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/dashboard"
          className="text-sm text-[#1F3864] hover:underline"
        >
          &larr; Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            {saveStatus === "saved"
              ? "All changes saved"
              : saveStatus === "saving"
                ? "Saving..."
                : "Unsaved changes"}
          </span>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="px-3 py-1.5 text-xs bg-[#1F3864] text-white rounded-lg hover:bg-[#2a4a7f] disabled:opacity-50 transition-colors"
          >
            {isDownloading ? "Exporting..." : "Export Excel"}
          </button>
        </div>
      </div>

      {/* Editable project header */}
      <div className="mb-6">
        <div className="flex items-start gap-3 mb-2">
          {isEditingHeader ? (
            <input
              type="text"
              value={data.program.name}
              onChange={(e) =>
                updateData({
                  ...data,
                  program: { ...data.program, name: e.target.value },
                })
              }
              onBlur={() => setIsEditingHeader(false)}
              onKeyDown={(e) => e.key === "Enter" && setIsEditingHeader(false)}
              autoFocus
              className="text-2xl font-bold text-gray-900 border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#1F3864] flex-1"
            />
          ) : (
            <h1
              onClick={() => setIsEditingHeader(true)}
              className="text-2xl font-bold text-gray-900 cursor-pointer hover:text-[#1F3864] transition-colors"
              title="Click to edit"
            >
              {data.program.name}
            </h1>
          )}
          <select
            value={data.program.status}
            onChange={(e) =>
              updateData({
                ...data,
                program: {
                  ...data.program,
                  status: e.target.value as ProgramData["program"]["status"],
                },
              })
            }
            className={`text-xs rounded-full px-3 py-1 font-medium border-0 cursor-pointer ${statusColors[data.program.status] || statusColors.on_track}`}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ").toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        <p className="text-sm text-gray-500">
          {data.program.owner.name}
          {data.program.owner.role ? `, ${data.program.owner.role}` : ""}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-0 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-[#1F3864] text-[#1F3864]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
              {tab.key === "tasks" && totalTasks > 0 && (
                <span className="ml-1.5 text-xs text-gray-400">({totalTasks})</span>
              )}
              {tab.key === "raid" && openRaids > 0 && (
                <span className="ml-1.5 text-xs text-red-400">({openRaids})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}

      {/* Overview tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{totalTasks}</div>
              <div className="text-xs text-gray-500 mt-1">Total Tasks</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{completedTasks}</div>
              <div className="text-xs text-gray-500 mt-1">Completed</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{atRiskTasks}</div>
              <div className="text-xs text-gray-500 mt-1">At Risk / Blocked</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{openRaids}</div>
              <div className="text-xs text-gray-500 mt-1">Open RAID Items</div>
            </div>
          </div>

          {/* Progress bar */}
          {totalTasks > 0 && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Overall Progress</span>
                <span>{totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1F3864] rounded-full transition-all"
                  style={{ width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Workstream cards */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Workstreams</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {data.workstreams.map((ws) => {
                const wsTasks = ws.tasks.length;
                const wsDone = ws.tasks.filter((t) => t.status === "complete").length;
                const pct = wsTasks > 0 ? Math.round((wsDone / wsTasks) * 100) : 0;
                return (
                  <div
                    key={ws.id}
                    className="bg-white border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900 text-sm">{ws.name}</h3>
                      <select
                        value={ws.status}
                        onChange={(e) => {
                          const updated = data.workstreams.map((w) =>
                            w.id === ws.id
                              ? { ...w, status: e.target.value as Workstream["status"] }
                              : w
                          );
                          updateData({ ...data, workstreams: updated });
                        }}
                        className={`text-xs rounded-full px-2 py-0.5 font-medium border-0 cursor-pointer ${statusColors[ws.status] || statusColors.on_track}`}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s.replace(/_/g, " ").toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">
                      Lead: {ws.lead.name} &middot; {wsDone}/{wsTasks} tasks done
                    </p>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1F3864] rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick actions */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Generate Artifacts</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => generateArtifact("agenda")}
                className="px-3 py-1.5 text-xs border border-[#1F3864] text-[#1F3864] rounded-lg hover:bg-blue-50 transition-colors"
              >
                Weekly Agenda
              </button>
              <button
                onClick={() => generateArtifact("leadership-update")}
                className="px-3 py-1.5 text-xs border border-[#1F3864] text-[#1F3864] rounded-lg hover:bg-blue-50 transition-colors"
              >
                Leadership Update
              </button>
              <button
                onClick={() => generateArtifact("status-requests")}
                className="px-3 py-1.5 text-xs border border-[#1F3864] text-[#1F3864] rounded-lg hover:bg-blue-50 transition-colors"
              >
                Status Requests
              </button>
            </div>
          </div>

          {/* Artifact display */}
          {activeArtifact && (
            <ArtifactDisplay
              content={artifactContent}
              isLoading={artifactLoading}
              onRegenerate={() => generateArtifact(activeArtifact)}
              title={artifactTitle}
            />
          )}
        </div>
      )}

      {/* Tasks tab */}
      {activeTab === "tasks" && (
        <TaskTable
          workstreams={data.workstreams}
          onUpdate={handleWorkstreamUpdate}
        />
      )}

      {/* Milestones tab */}
      {activeTab === "milestones" && (
        <MilestoneTable
          workstreams={data.workstreams}
          onUpdate={handleWorkstreamUpdate}
        />
      )}

      {/* RAID Log tab */}
      {activeTab === "raid" && (
        <RaidLog
          items={data.raid_log}
          workstreamIds={wsLookup}
          onUpdate={handleRaidUpdate}
        />
      )}

      {/* Stakeholders tab */}
      {activeTab === "stakeholders" && (
        <StakeholderTable
          stakeholders={data.stakeholders}
          onUpdate={handleStakeholderUpdate}
        />
      )}
    </div>
  );
}

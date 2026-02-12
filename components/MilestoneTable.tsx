/**
 * Interactive milestone table.
 * Shows all milestones across workstreams with inline editing.
 */
"use client";

import { Workstream, Milestone } from "@/lib/types/program";

interface MilestoneTableProps {
  workstreams: Workstream[];
  onUpdate: (workstreams: Workstream[]) => void;
}

const STATUS_OPTIONS: Milestone["status"][] = [
  "upcoming",
  "complete",
  "at_risk",
  "missed",
];

const statusColors: Record<string, string> = {
  upcoming: "bg-blue-100 text-blue-700",
  complete: "bg-green-100 text-green-700",
  at_risk: "bg-yellow-100 text-yellow-700",
  missed: "bg-red-100 text-red-700",
};

function formatLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function MilestoneTable({ workstreams, onUpdate }: MilestoneTableProps) {
  // Flatten milestones with workstream context
  const allMilestones = workstreams.flatMap((ws) =>
    ws.milestones.map((ms) => ({ ...ms, workstreamName: ws.name, workstreamId: ws.id }))
  );

  // Sort by date
  const sorted = [...allMilestones].sort((a, b) => a.date.localeCompare(b.date));

  function updateMilestone(wsId: string, msId: string, fields: Partial<Milestone>) {
    const updated = workstreams.map((ws) => {
      if (ws.id !== wsId) return ws;
      return {
        ...ws,
        milestones: ws.milestones.map((ms) =>
          ms.id === msId ? { ...ms, ...fields } : ms
        ),
      };
    });
    onUpdate(updated);
  }

  function addMilestone(wsId: string) {
    const msNum = allMilestones.length + 1;
    const newMs: Milestone = {
      id: `MS-${String(msNum).padStart(3, "0")}`,
      workstream_id: wsId,
      name: "",
      date: new Date().toISOString().slice(0, 10),
      status: "upcoming",
      dependencies: [],
      owner: "",
    };
    const updated = workstreams.map((ws) => {
      if (ws.id !== wsId) return ws;
      return { ...ws, milestones: [...ws.milestones, newMs] };
    });
    onUpdate(updated);
  }

  function deleteMilestone(wsId: string, msId: string) {
    const updated = workstreams.map((ws) => {
      if (ws.id !== wsId) return ws;
      return { ...ws, milestones: ws.milestones.filter((ms) => ms.id !== msId) };
    });
    onUpdate(updated);
  }

  return (
    <div>
      {/* Add milestone dropdown */}
      <div className="flex justify-end mb-3">
        <select
          onChange={(e) => {
            if (e.target.value) addMilestone(e.target.value);
            e.target.value = "";
          }}
          className="text-xs text-[#1F3864] border border-[#1F3864] rounded-lg px-3 py-1.5 cursor-pointer"
          defaultValue=""
        >
          <option value="" disabled>
            + Add milestone to...
          </option>
          {workstreams.map((ws) => (
            <option key={ws.id} value={ws.id}>
              {ws.name}
            </option>
          ))}
        </select>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">
          No milestones yet. Add one using the button above.
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500 border-b">
                <th className="px-3 py-2 font-medium">Milestone</th>
                <th className="px-3 py-2 font-medium">Workstream</th>
                <th className="px-3 py-2 font-medium">Owner</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium w-[40px]"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((ms) => {
                const isPast = new Date(ms.date) < new Date() && ms.status !== "complete";
                return (
                  <tr key={ms.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={ms.name}
                        onChange={(e) =>
                          updateMilestone(ms.workstreamId, ms.id, { name: e.target.value })
                        }
                        placeholder="Milestone name"
                        className="w-full bg-transparent border-0 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#1F3864] rounded px-1 py-0.5"
                      />
                    </td>
                    <td className="px-3 py-2 text-gray-500 text-xs">{ms.workstreamName}</td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={ms.owner}
                        onChange={(e) =>
                          updateMilestone(ms.workstreamId, ms.id, { owner: e.target.value })
                        }
                        placeholder="—"
                        className="w-full bg-transparent border-0 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#1F3864] rounded px-1 py-0.5"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        value={ms.date}
                        onChange={(e) =>
                          updateMilestone(ms.workstreamId, ms.id, { date: e.target.value })
                        }
                        className={`bg-transparent border-0 text-sm focus:outline-none focus:ring-1 focus:ring-[#1F3864] rounded ${isPast ? "text-red-600 font-medium" : "text-gray-600"}`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={ms.status}
                        onChange={(e) =>
                          updateMilestone(ms.workstreamId, ms.id, {
                            status: e.target.value as Milestone["status"],
                          })
                        }
                        className={`text-xs rounded-full px-2 py-1 font-medium border-0 cursor-pointer ${statusColors[ms.status]}`}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {formatLabel(s)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => deleteMilestone(ms.workstreamId, ms.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                        title="Delete milestone"
                      >
                        &times;
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

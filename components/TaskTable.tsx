/**
 * Interactive task table grouped by workstream.
 * Supports inline editing of status, % complete, priority, owner, and dates.
 * Also supports adding new tasks and deleting existing ones.
 */
"use client";

import { useState } from "react";
import { Workstream, Task } from "@/lib/types/program";

interface TaskTableProps {
  workstreams: Workstream[];
  onUpdate: (workstreams: Workstream[]) => void;
}

const STATUS_OPTIONS: Task["status"][] = [
  "not_started",
  "in_progress",
  "complete",
  "at_risk",
  "blocked",
];

const PRIORITY_OPTIONS: Task["priority"][] = ["high", "medium", "low"];

const statusColors: Record<string, string> = {
  not_started: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-700",
  complete: "bg-green-100 text-green-700",
  at_risk: "bg-yellow-100 text-yellow-700",
  blocked: "bg-red-100 text-red-700",
};

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
};

function formatLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TaskTable({ workstreams, onUpdate }: TaskTableProps) {
  const [expandedWs, setExpandedWs] = useState<Set<string>>(
    new Set(workstreams.map((ws) => ws.id))
  );
  const [editingTask, setEditingTask] = useState<string | null>(null);

  function toggleWs(wsId: string) {
    setExpandedWs((prev) => {
      const next = new Set(prev);
      if (next.has(wsId)) next.delete(wsId);
      else next.add(wsId);
      return next;
    });
  }

  function updateTask(wsId: string, taskId: string, fields: Partial<Task>) {
    const updated = workstreams.map((ws) => {
      if (ws.id !== wsId) return ws;
      return {
        ...ws,
        tasks: ws.tasks.map((t) =>
          t.id === taskId ? { ...t, ...fields } : t
        ),
      };
    });
    onUpdate(updated);
  }

  function addTask(wsId: string) {
    const taskNum = workstreams.reduce((n, ws) => n + ws.tasks.length, 0) + 1;
    const newTask: Task = {
      id: `T-${String(taskNum).padStart(3, "0")}`,
      workstream_id: wsId,
      name: "",
      owner: "",
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date().toISOString().slice(0, 10),
      duration_days: 0,
      predecessor: null,
      status: "not_started",
      percent_complete: 0,
      priority: "medium",
      notes: "",
    };
    const updated = workstreams.map((ws) => {
      if (ws.id !== wsId) return ws;
      return { ...ws, tasks: [...ws.tasks, newTask] };
    });
    onUpdate(updated);
    setEditingTask(newTask.id);
    setExpandedWs((prev) => {
      const next = new Set(prev);
      next.add(wsId);
      return next;
    });
  }

  function deleteTask(wsId: string, taskId: string) {
    const updated = workstreams.map((ws) => {
      if (ws.id !== wsId) return ws;
      return { ...ws, tasks: ws.tasks.filter((t) => t.id !== taskId) };
    });
    onUpdate(updated);
  }

  return (
    <div className="space-y-4">
      {workstreams.map((ws) => {
        const isExpanded = expandedWs.has(ws.id);
        const completedCount = ws.tasks.filter((t) => t.status === "complete").length;

        return (
          <div key={ws.id} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Workstream header */}
            <button
              onClick={() => toggleWs(ws.id)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-xs">{isExpanded ? "\u25BC" : "\u25B6"}</span>
                <span className="font-medium text-gray-900">{ws.name}</span>
                <span className="text-xs text-gray-500">
                  {completedCount}/{ws.tasks.length} done
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addTask(ws.id);
                }}
                className="text-xs text-[#1F3864] hover:underline"
              >
                + Add task
              </button>
            </button>

            {/* Tasks table */}
            {isExpanded && ws.tasks.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white border-b text-left text-xs text-gray-500">
                      <th className="px-3 py-2 font-medium w-[240px]">Task</th>
                      <th className="px-3 py-2 font-medium w-[120px]">Owner</th>
                      <th className="px-3 py-2 font-medium w-[100px]">Status</th>
                      <th className="px-3 py-2 font-medium w-[60px]">%</th>
                      <th className="px-3 py-2 font-medium w-[80px]">Priority</th>
                      <th className="px-3 py-2 font-medium w-[110px]">Start</th>
                      <th className="px-3 py-2 font-medium w-[110px]">End</th>
                      <th className="px-3 py-2 font-medium w-[40px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ws.tasks.map((task) => {
                      const isEditing = editingTask === task.id;
                      return (
                        <tr
                          key={task.id}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="px-3 py-2">
                            {isEditing ? (
                              <input
                                type="text"
                                value={task.name}
                                onChange={(e) =>
                                  updateTask(ws.id, task.id, { name: e.target.value })
                                }
                                onBlur={() => setEditingTask(null)}
                                onKeyDown={(e) => e.key === "Enter" && setEditingTask(null)}
                                autoFocus
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-[#1F3864]"
                              />
                            ) : (
                              <span
                                onClick={() => setEditingTask(task.id)}
                                className="cursor-pointer hover:text-[#1F3864] block truncate"
                                title={task.name || "Click to name this task"}
                              >
                                {task.name || <span className="text-gray-400 italic">Untitled task</span>}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={task.owner}
                              onChange={(e) =>
                                updateTask(ws.id, task.id, { owner: e.target.value })
                              }
                              className="w-full bg-transparent border-0 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#1F3864] rounded px-1 py-0.5"
                              placeholder="—"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={task.status}
                              onChange={(e) =>
                                updateTask(ws.id, task.id, {
                                  status: e.target.value as Task["status"],
                                  percent_complete:
                                    e.target.value === "complete" ? 100 : task.percent_complete,
                                })
                              }
                              className={`text-xs rounded-full px-2 py-1 font-medium border-0 cursor-pointer ${statusColors[task.status]}`}
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>
                                  {formatLabel(s)}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={task.percent_complete}
                              onChange={(e) => {
                                const val = Math.max(0, Math.min(100, Number(e.target.value)));
                                updateTask(ws.id, task.id, {
                                  percent_complete: val,
                                  status: val === 100 ? "complete" : task.status === "complete" ? "in_progress" : task.status,
                                });
                              }}
                              className="w-12 bg-transparent border-0 text-sm text-gray-700 text-center focus:outline-none focus:ring-1 focus:ring-[#1F3864] rounded"
                              min={0}
                              max={100}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={task.priority}
                              onChange={(e) =>
                                updateTask(ws.id, task.id, {
                                  priority: e.target.value as Task["priority"],
                                })
                              }
                              className={`text-xs rounded-full px-2 py-1 font-medium border-0 cursor-pointer ${priorityColors[task.priority]}`}
                            >
                              {PRIORITY_OPTIONS.map((p) => (
                                <option key={p} value={p}>
                                  {formatLabel(p)}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="date"
                              value={task.start_date}
                              onChange={(e) =>
                                updateTask(ws.id, task.id, { start_date: e.target.value })
                              }
                              className="bg-transparent border-0 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#1F3864] rounded"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="date"
                              value={task.end_date}
                              onChange={(e) =>
                                updateTask(ws.id, task.id, { end_date: e.target.value })
                              }
                              className="bg-transparent border-0 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#1F3864] rounded"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => deleteTask(ws.id, task.id)}
                              className="text-gray-300 hover:text-red-500 transition-colors"
                              title="Delete task"
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

            {isExpanded && ws.tasks.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-gray-400">
                No tasks yet.{" "}
                <button
                  onClick={() => addTask(ws.id)}
                  className="text-[#1F3864] hover:underline"
                >
                  Add one
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

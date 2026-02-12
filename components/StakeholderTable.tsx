/**
 * Interactive stakeholder table.
 * Displays stakeholders with inline editing for name, role, and influence/interest.
 */
"use client";

import { Stakeholder } from "@/lib/types/program";
import { v4 as uuidv4 } from "uuid";

interface StakeholderTableProps {
  stakeholders: Stakeholder[];
  onUpdate: (stakeholders: Stakeholder[]) => void;
}

const LEVELS: ("high" | "medium" | "low")[] = ["high", "medium", "low"];

const levelColors: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
};

function formatLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StakeholderTable({ stakeholders, onUpdate }: StakeholderTableProps) {
  function updateStakeholder(id: string, fields: Partial<Stakeholder>) {
    onUpdate(stakeholders.map((s) => (s.id === id ? { ...s, ...fields } : s)));
  }

  function addStakeholder() {
    const newSh: Stakeholder = {
      id: uuidv4(),
      name: "",
      role: "",
      organization: "",
      email: "",
      interest_level: "medium",
      influence_level: "medium",
      communications: [],
      notes: "",
    };
    onUpdate([...stakeholders, newSh]);
  }

  function deleteStakeholder(id: string) {
    onUpdate(stakeholders.filter((s) => s.id !== id));
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button
          onClick={addStakeholder}
          className="text-xs text-[#1F3864] border border-[#1F3864] rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors"
        >
          + Add stakeholder
        </button>
      </div>

      {stakeholders.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">
          No stakeholders yet.{" "}
          <button onClick={addStakeholder} className="text-[#1F3864] hover:underline">
            Add one
          </button>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500 border-b">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Organization</th>
                <th className="px-3 py-2 font-medium">Interest</th>
                <th className="px-3 py-2 font-medium">Influence</th>
                <th className="px-3 py-2 font-medium">Notes</th>
                <th className="px-3 py-2 font-medium w-[40px]"></th>
              </tr>
            </thead>
            <tbody>
              {stakeholders.map((sh) => (
                <tr key={sh.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={sh.name}
                      onChange={(e) => updateStakeholder(sh.id, { name: e.target.value })}
                      placeholder="Name"
                      className="w-full bg-transparent border-0 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#1F3864] rounded px-1 py-0.5"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={sh.role}
                      onChange={(e) => updateStakeholder(sh.id, { role: e.target.value })}
                      placeholder="Role"
                      className="w-full bg-transparent border-0 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#1F3864] rounded px-1 py-0.5"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={sh.organization}
                      onChange={(e) => updateStakeholder(sh.id, { organization: e.target.value })}
                      placeholder="Org"
                      className="w-full bg-transparent border-0 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#1F3864] rounded px-1 py-0.5"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={sh.interest_level}
                      onChange={(e) =>
                        updateStakeholder(sh.id, {
                          interest_level: e.target.value as "high" | "medium" | "low",
                        })
                      }
                      className={`text-xs rounded-full px-2 py-0.5 font-medium border-0 cursor-pointer ${levelColors[sh.interest_level]}`}
                    >
                      {LEVELS.map((l) => (
                        <option key={l} value={l}>{formatLabel(l)}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={sh.influence_level}
                      onChange={(e) =>
                        updateStakeholder(sh.id, {
                          influence_level: e.target.value as "high" | "medium" | "low",
                        })
                      }
                      className={`text-xs rounded-full px-2 py-0.5 font-medium border-0 cursor-pointer ${levelColors[sh.influence_level]}`}
                    >
                      {LEVELS.map((l) => (
                        <option key={l} value={l}>{formatLabel(l)}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={sh.notes}
                      onChange={(e) => updateStakeholder(sh.id, { notes: e.target.value })}
                      placeholder="Notes"
                      className="w-full bg-transparent border-0 text-sm text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#1F3864] rounded px-1 py-0.5"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => deleteStakeholder(sh.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      &times;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

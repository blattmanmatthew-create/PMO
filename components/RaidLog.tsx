/**
 * Interactive RAID log (Risks, Assumptions, Issues, Dependencies).
 * Supports filtering by type, inline editing, and adding new items.
 */
"use client";

import { useState } from "react";
import { RaidItem } from "@/lib/types/program";

interface RaidLogProps {
  items: RaidItem[];
  workstreamIds: { id: string; name: string }[];
  onUpdate: (items: RaidItem[]) => void;
}

const TYPES: RaidItem["type"][] = ["risk", "assumption", "issue", "dependency"];
const IMPACTS: RaidItem["impact"][] = ["high", "medium", "low"];
const STATUSES: RaidItem["status"][] = ["open", "mitigated", "closed"];

const typeColors: Record<string, string> = {
  risk: "bg-red-100 text-red-700",
  assumption: "bg-blue-100 text-blue-700",
  issue: "bg-orange-100 text-orange-700",
  dependency: "bg-purple-100 text-purple-700",
};

const impactColors: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  mitigated: "bg-yellow-100 text-yellow-700",
  closed: "bg-gray-100 text-gray-500",
};

const typePrefix: Record<string, string> = {
  risk: "R",
  assumption: "A",
  issue: "I",
  dependency: "D",
};

function formatLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function RaidLog({ items, workstreamIds, onUpdate }: RaidLogProps) {
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = typeFilter === "all" ? items : items.filter((i) => i.type === typeFilter);
  const sorted = [...filtered].sort((a, b) => {
    const statusOrder = { open: 0, mitigated: 1, closed: 2 };
    return (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0);
  });

  function updateItem(id: string, fields: Partial<RaidItem>) {
    onUpdate(items.map((i) => (i.id === id ? { ...i, ...fields } : i)));
  }

  function addItem(type: RaidItem["type"]) {
    const prefix = typePrefix[type];
    const existing = items.filter((i) => i.type === type).length;
    const newItem: RaidItem = {
      id: `${prefix}-${String(existing + 1).padStart(3, "0")}`,
      type,
      description: "",
      workstream_id: workstreamIds[0]?.id || "",
      impact: "medium",
      probability: type === "risk" ? "medium" : null,
      owner: "",
      mitigation: "",
      status: "open",
      date_raised: new Date().toISOString().slice(0, 10),
      target_resolution_date: null,
    };
    onUpdate([...items, newItem]);
  }

  function deleteItem(id: string) {
    onUpdate(items.filter((i) => i.id !== id));
  }

  return (
    <div>
      {/* Filter bar + add buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex gap-1">
          <button
            onClick={() => setTypeFilter("all")}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              typeFilter === "all"
                ? "bg-[#1F3864] text-white border-[#1F3864]"
                : "border-gray-300 text-gray-600 hover:border-gray-400"
            }`}
          >
            All ({items.length})
          </button>
          {TYPES.map((type) => {
            const count = items.filter((i) => i.type === type).length;
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  typeFilter === type
                    ? "bg-[#1F3864] text-white border-[#1F3864]"
                    : "border-gray-300 text-gray-600 hover:border-gray-400"
                }`}
              >
                {formatLabel(type)}s ({count})
              </button>
            );
          })}
        </div>
        <select
          onChange={(e) => {
            if (e.target.value) addItem(e.target.value as RaidItem["type"]);
            e.target.value = "";
          }}
          className="text-xs text-[#1F3864] border border-[#1F3864] rounded-lg px-3 py-1.5 cursor-pointer"
          defaultValue=""
        >
          <option value="" disabled>
            + Add item...
          </option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {formatLabel(t)}
            </option>
          ))}
        </select>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">
          No RAID items{typeFilter !== "all" ? ` of type "${typeFilter}"` : ""}. Add one above.
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((item) => (
            <div
              key={item.id}
              className={`border border-gray-200 rounded-lg p-3 ${item.status === "closed" ? "opacity-60" : ""}`}
            >
              <div className="flex items-start gap-3">
                {/* Type badge */}
                <span className={`text-xs rounded-full px-2 py-0.5 font-medium whitespace-nowrap mt-0.5 ${typeColors[item.type]}`}>
                  {item.id}
                </span>

                {/* Main content */}
                <div className="flex-1 min-w-0 space-y-2">
                  <textarea
                    value={item.description}
                    onChange={(e) => updateItem(item.id, { description: e.target.value })}
                    placeholder="Describe this item..."
                    rows={1}
                    className="w-full bg-transparent border-0 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#1F3864] rounded resize-none"
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={item.impact}
                      onChange={(e) => updateItem(item.id, { impact: e.target.value as RaidItem["impact"] })}
                      className={`text-xs rounded-full px-2 py-0.5 font-medium border-0 cursor-pointer ${impactColors[item.impact]}`}
                    >
                      {IMPACTS.map((i) => (
                        <option key={i} value={i}>{formatLabel(i)} Impact</option>
                      ))}
                    </select>

                    <select
                      value={item.status}
                      onChange={(e) => updateItem(item.id, { status: e.target.value as RaidItem["status"] })}
                      className={`text-xs rounded-full px-2 py-0.5 font-medium border-0 cursor-pointer ${statusColors[item.status]}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{formatLabel(s)}</option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={item.owner}
                      onChange={(e) => updateItem(item.id, { owner: e.target.value })}
                      placeholder="Owner"
                      className="text-xs bg-transparent border border-gray-200 rounded px-2 py-0.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#1F3864] w-28"
                    />

                    {workstreamIds.length > 0 && (
                      <select
                        value={item.workstream_id}
                        onChange={(e) => updateItem(item.id, { workstream_id: e.target.value })}
                        className="text-xs bg-transparent border border-gray-200 rounded px-2 py-0.5 text-gray-500 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1F3864]"
                      >
                        {workstreamIds.map((ws) => (
                          <option key={ws.id} value={ws.id}>{ws.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {(item.type === "risk" || item.mitigation) && (
                    <input
                      type="text"
                      value={item.mitigation}
                      onChange={(e) => updateItem(item.id, { mitigation: e.target.value })}
                      placeholder="Mitigation / response plan"
                      className="w-full text-xs bg-transparent border border-gray-200 rounded px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#1F3864]"
                    />
                  )}
                </div>

                {/* Delete */}
                <button
                  onClick={() => deleteItem(item.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors mt-0.5"
                  title="Delete"
                >
                  &times;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Dashboard page — the landing page showing all projects.
 * Lists projects as cards with name, status, owner, and workstream count.
 * Has a "New Project" button and a "Load Demo Project" button.
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ProgramData } from "@/lib/types/program";
import { v4 as uuidv4 } from "uuid";

// The shape of a row from the Supabase "programs" table
interface ProgramRow {
  id: string;
  name: string;
  data: ProgramData;
  created_at: string;
  updated_at: string;
}

// Color mapping for status badges
const statusColors: Record<string, string> = {
  on_track: "bg-green-100 text-green-700",
  at_risk: "bg-yellow-100 text-yellow-700",
  behind: "bg-red-100 text-red-700",
  on_hold: "bg-gray-100 text-gray-600",
};

export default function DashboardPage() {
  const router = useRouter();
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);

  // Fetch all projects on page load
  useEffect(() => {
    async function fetchPrograms() {
      try {
        const { data, error } = await supabase
          .from("programs")
          .select("*")
          .order("updated_at", { ascending: false });

        if (error) throw new Error(error.message);
        setPrograms(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load projects");
      } finally {
        setIsLoading(false);
      }
    }

    fetchPrograms();
  }, []);

  // Load the demo project from sample_data.json
  async function handleLoadDemo() {
    setIsLoadingDemo(true);
    try {
      // Fetch the sample data from the public folder
      const response = await fetch("/api/demo");
      if (!response.ok) throw new Error("Failed to load demo data");
      const sampleData = await response.json();

      const rowId = uuidv4();
      const { error } = await supabase.from("programs").insert({
        id: rowId,
        name: sampleData.program.name,
        data: sampleData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) throw new Error(error.message);
      router.push(`/project/${rowId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load demo project");
      setIsLoadingDemo(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your programs and project plans
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleLoadDemo}
            disabled={isLoadingDemo}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {isLoadingDemo ? "Loading..." : "Load Demo Project"}
          </button>
          <Link
            href="/intake"
            className="px-4 py-2 text-sm bg-[#1F3864] text-white rounded-lg hover:bg-[#2a4a7f] transition-colors"
          >
            New Project
          </Link>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-16">
          <p className="text-gray-500">Loading projects...</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && programs.length === 0 && (
        <div className="text-center py-16 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <h2 className="text-lg font-medium text-gray-600 mb-2">
            No projects yet
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Create your first one or load the demo project to explore.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleLoadDemo}
              disabled={isLoadingDemo}
              className="px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Load Demo Project
            </button>
            <Link
              href="/intake"
              className="px-4 py-2 text-sm bg-[#1F3864] text-white rounded-lg hover:bg-[#2a4a7f]"
            >
              New Project
            </Link>
          </div>
        </div>
      )}

      {/* Project cards */}
      <div className="grid gap-4">
        {programs.map((prog) => {
          const status = prog.data?.program?.status || "on_track";
          const statusLabel = status.replace("_", " ").toUpperCase();
          const ownerName = prog.data?.program?.owner?.name || "Unknown";
          const wsCount = prog.data?.workstreams?.length || 0;

          return (
            <Link
              key={prog.id}
              href={`/project/${prog.id}`}
              className="block bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {prog.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Owner: {ownerName} &middot; {wsCount} workstream{wsCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusColors[status] || statusColors.on_track}`}
                >
                  {statusLabel}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

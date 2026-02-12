/**
 * API route for downloading a project's Excel plan.
 * Fetches the project from Supabase by ID, generates the Excel file
 * using the template + data injection, and returns it as a download.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateExcel } from "@/lib/excel/generateExcel";
import { ProgramData } from "@/lib/types/program";

/** Ensure all top-level arrays exist so generateExcel never crashes on undefined. */
function withDefaults(raw: Partial<ProgramData>): ProgramData {
  return {
    program: raw.program ?? {
      id: "",
      name: "Untitled",
      description: "",
      status: "on_track",
      created_date: new Date().toISOString().slice(0, 10),
      target_end_date: null,
      is_ongoing: false,
      owner: { name: "", role: "", email: "" },
    },
    workstreams: (raw.workstreams ?? []).map((ws) => ({
      ...ws,
      tasks: ws.tasks ?? [],
      milestones: ws.milestones ?? [],
    })),
    stakeholders: raw.stakeholders ?? [],
    meetings: raw.meetings ?? [],
    raid_log: raw.raid_log ?? [],
    decisions: raw.decisions ?? [],
    rollout_pipeline: raw.rollout_pipeline ?? [],
  } as ProgramData;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Fetch the project from Supabase
    const { data: program, error } = await supabase
      .from("programs")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !program) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // The project data is stored in the "data" column as JSONB
    const projectData = withDefaults(program.data ?? {});

    // Generate the Excel file
    const buffer = await generateExcel(projectData);

    // Create a clean filename from the program name
    const cleanName = projectData.program.name
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+/g, "_");
    const filename = `${cleanName}_Project_Plan.xlsx`;

    // Return the file as a download (convert Buffer to Uint8Array for NextResponse)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("Excel generation error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to generate Excel file: ${message}` },
      { status: 500 }
    );
  }
}

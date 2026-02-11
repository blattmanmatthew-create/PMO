/**
 * API route for downloading a project's Excel plan.
 * Fetches the project from Supabase by ID, generates the Excel file
 * using the template + data injection, and returns it as a download.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateExcel } from "@/lib/excel/generateExcel";
import { ProgramData } from "@/lib/types/program";

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
    const projectData: ProgramData = program.data;

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
    return NextResponse.json(
      { error: "Failed to generate Excel file" },
      { status: 500 }
    );
  }
}

/**
 * API route that returns the sample project data.
 * Used by the "Load Demo Project" button on the dashboard.
 * Reads from /specs/sample_data.json and returns it as JSON.
 */
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "specs", "sample_data.json");
    const fileContents = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(fileContents);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Failed to read sample data:", err);
    return NextResponse.json(
      { error: "Failed to load demo data" },
      { status: 500 }
    );
  }
}

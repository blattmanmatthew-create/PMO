/**
 * Excel data injection function.
 * Opens the pre-built pmo_template.xlsx template, writes project data
 * into the correct cells on each tab, and returns a Buffer for download.
 * NEVER rebuilds formatting — only injects data into the existing template.
 */
import ExcelJS from "exceljs";
import path from "path";
import { ProgramData } from "../types/program";

// Helper to turn "YYYY-MM-DD" strings into JS Date objects for Excel
function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  return new Date(dateStr + "T00:00:00");
}

// Helper to find the workstream name from its ID
function getWorkstreamName(data: ProgramData, wsId: string): string {
  const ws = data.workstreams.find((w) => w.id === wsId);
  return ws ? ws.name : wsId;
}

export async function generateExcel(data: ProgramData): Promise<Buffer> {
  // Load the pre-built template — try multiple paths for compatibility with
  // different deployment environments (local dev, Vercel serverless, etc.)
  const workbook = new ExcelJS.Workbook();
  const candidates = [
    path.join(process.cwd(), "lib", "excel", "pmo_template.xlsx"),
    path.join(__dirname, "pmo_template.xlsx"),
    path.resolve("lib", "excel", "pmo_template.xlsx"),
  ];

  let loaded = false;
  for (const candidate of candidates) {
    try {
      await workbook.xlsx.readFile(candidate);
      loaded = true;
      break;
    } catch {
      // try next path
    }
  }

  if (!loaded) {
    // If no template found, create sheets from scratch
    const sheetNames = [
      "Program Overview", "Task Plan", "Milestones", "RAID Log",
      "Stakeholders", "Decision Log", "Meeting Cadence",
    ];
    for (const name of sheetNames) {
      workbook.addWorksheet(name);
    }
  }

  // ========== Tab 1: Program Overview ==========
  const overview = workbook.getWorksheet("Program Overview");
  if (overview) {
    // Header section (rows 1-8)
    overview.getCell("A1").value = data.program.name;
    const owner = data.program.owner || { name: "", role: "" };
    overview.getCell("B3").value = owner.role ? `${owner.name}, ${owner.role}` : owner.name;
    overview.getCell("E3").value = data.program.status.replace("_", " ").toUpperCase();
    overview.getCell("B4").value = data.program.is_ongoing ? "Ongoing Program" : "Time-bound Project";
    overview.getCell("E4").value = data.program.target_end_date || "Ongoing";
    overview.getCell("B5").value = data.program.created_date;
    overview.getCell("A8").value = data.program.description;

    // Workstream summary rows starting at row 12
    data.workstreams.forEach((ws, i) => {
      const row = overview.getRow(12 + i);
      const today = new Date();

      // Count open tasks (not complete)
      const openTasks = ws.tasks.filter((t) => t.status !== "complete").length;
      // Count overdue tasks (end_date < today and not complete)
      const overdueTasks = ws.tasks.filter((t) => {
        const endDate = parseDate(t.end_date);
        return endDate && endDate < today && t.status !== "complete";
      }).length;

      // Find next upcoming milestone
      const upcomingMilestones = ws.milestones
        .filter((m) => m.status !== "complete")
        .sort((a, b) => a.date.localeCompare(b.date));
      const nextMilestone = upcomingMilestones[0];

      row.getCell(1).value = ws.name;
      row.getCell(2).value = ws.lead.name;
      row.getCell(3).value = ws.status.replace("_", " ").toUpperCase();
      row.getCell(4).value = openTasks;
      row.getCell(5).value = overdueTasks;
      row.getCell(6).value = nextMilestone ? nextMilestone.name : "—";
      row.getCell(7).value = nextMilestone ? parseDate(nextMilestone.date) : null;
      if (row.getCell(7).value instanceof Date) {
        row.getCell(7).numFmt = "MM/DD/YY";
      }

      // Apply body font to data rows
      for (let c = 1; c <= 7; c++) {
        row.getCell(c).font = { name: "Calibri", size: 10 };
        row.getCell(c).border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
        // Alternating row colors
        if (i % 2 === 1) {
          row.getCell(c).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "F2F2F2" },
          };
        }
      }
    });
  }

  // ========== Tab 2: Task Plan ==========
  const taskPlan = workbook.getWorksheet("Task Plan");
  if (taskPlan) {
    let rowNum = 2; // Row 1 is the header
    data.workstreams.forEach((ws) => {
      ws.tasks.forEach((task) => {
        const row = taskPlan.getRow(rowNum);
        row.getCell(1).value = task.id;
        row.getCell(2).value = ws.name;
        row.getCell(3).value = task.name;
        row.getCell(3).alignment = { wrapText: true };
        row.getCell(4).value = task.owner;
        row.getCell(5).value = parseDate(task.start_date);
        if (row.getCell(5).value) row.getCell(5).numFmt = "MM/DD/YY";
        row.getCell(6).value = parseDate(task.end_date);
        if (row.getCell(6).value) row.getCell(6).numFmt = "MM/DD/YY";
        row.getCell(7).value = task.status.replace("_", " ").toUpperCase();
        row.getCell(8).value = task.percent_complete / 100;
        row.getCell(8).numFmt = "0%";
        row.getCell(9).value = task.priority.toUpperCase();
        row.getCell(10).value = task.predecessor || "";
        row.getCell(11).value = task.notes;
        row.getCell(11).alignment = { wrapText: true };

        // Apply body styling
        for (let c = 1; c <= 11; c++) {
          row.getCell(c).font = { name: "Calibri", size: 10 };
          row.getCell(c).border = {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
          };
          if ((rowNum - 2) % 2 === 1) {
            row.getCell(c).fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "F2F2F2" },
            };
          }
        }

        // Color the status cell based on value
        const statusColors: Record<string, string> = {
          complete: "92D050",
          in_progress: "5B9BD5",
          not_started: "BFBFBF",
          at_risk: "FFD966",
          blocked: "FF6B6B",
        };
        const statusColor = statusColors[task.status] || "BFBFBF";
        row.getCell(7).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: statusColor },
        };

        // Color priority cell
        const priorityColors: Record<string, string> = {
          high: "FF6B6B",
          medium: "FFD966",
          low: "92D050",
        };
        const prioColor = priorityColors[task.priority] || "BFBFBF";
        row.getCell(9).font = {
          name: "Calibri",
          size: 10,
          bold: task.priority === "high",
          color: { argb: task.priority === "high" ? "FF0000" : "000000" },
        };
        row.getCell(9).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: prioColor },
        };

        // Red text on overdue end dates
        const endDate = parseDate(task.end_date);
        if (endDate && endDate < new Date() && task.status !== "complete") {
          row.getCell(6).font = {
            name: "Calibri",
            size: 10,
            color: { argb: "FF0000" },
            bold: true,
          };
        }

        rowNum++;
      });
    });
  }

  // ========== Tab 3: Milestones ==========
  const milestones = workbook.getWorksheet("Milestones");
  if (milestones) {
    let rowNum = 2;
    data.workstreams.forEach((ws) => {
      ws.milestones.forEach((ms) => {
        const row = milestones.getRow(rowNum);
        row.getCell(1).value = ms.id;
        row.getCell(2).value = ws.name;
        row.getCell(3).value = ms.name;
        row.getCell(4).value = parseDate(ms.date);
        if (row.getCell(4).value) row.getCell(4).numFmt = "MM/DD/YY";
        row.getCell(5).value = ms.status.replace("_", " ").toUpperCase();
        row.getCell(6).value = (ms.dependencies || []).join(", ");
        row.getCell(7).value = ms.owner;
        row.getCell(8).value = "";

        // Style
        const statusColors: Record<string, string> = {
          upcoming: "5B9BD5",
          complete: "92D050",
          at_risk: "FFD966",
          missed: "FF6B6B",
        };
        for (let c = 1; c <= 8; c++) {
          row.getCell(c).font = { name: "Calibri", size: 10 };
          row.getCell(c).border = {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
          };
          if ((rowNum - 2) % 2 === 1) {
            row.getCell(c).fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "F2F2F2" },
            };
          }
        }
        row.getCell(5).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: statusColors[ms.status] || "BFBFBF" },
        };

        rowNum++;
      });
    });
  }

  // ========== Tab 4: RAID Log ==========
  const raid = workbook.getWorksheet("RAID Log");
  if (raid) {
    data.raid_log.forEach((item, i) => {
      const row = raid.getRow(i + 2);
      row.getCell(1).value = item.id;
      row.getCell(2).value = item.type.toUpperCase();
      row.getCell(3).value = getWorkstreamName(data, item.workstream_id);
      row.getCell(4).value = item.description;
      row.getCell(4).alignment = { wrapText: true };
      row.getCell(5).value = item.impact.toUpperCase();
      row.getCell(6).value = item.probability ? item.probability.toUpperCase() : "N/A";
      row.getCell(7).value = item.owner;
      row.getCell(8).value = item.mitigation;
      row.getCell(8).alignment = { wrapText: true };
      row.getCell(9).value = item.status.toUpperCase();
      row.getCell(10).value = parseDate(item.date_raised);
      if (row.getCell(10).value) row.getCell(10).numFmt = "MM/DD/YY";
      row.getCell(11).value = parseDate(item.target_resolution_date);
      if (row.getCell(11).value) row.getCell(11).numFmt = "MM/DD/YY";

      // Type colors
      const typeColors: Record<string, string> = {
        risk: "FF6B6B",
        assumption: "5B9BD5",
        issue: "ED7D31",
        dependency: "7030A0",
      };
      // Status colors
      const statusColors: Record<string, string> = {
        open: "FF6B6B",
        mitigated: "FFD966",
        closed: "92D050",
      };

      for (let c = 1; c <= 11; c++) {
        row.getCell(c).font = { name: "Calibri", size: 10 };
        row.getCell(c).border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
        if (i % 2 === 1) {
          row.getCell(c).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "F2F2F2" },
          };
        }
      }
      row.getCell(2).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: typeColors[item.type] || "BFBFBF" },
      };
      row.getCell(2).font = { name: "Calibri", size: 10, color: { argb: "FFFFFF" }, bold: true };
      row.getCell(9).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: statusColors[item.status] || "BFBFBF" },
      };
    });
  }

  // ========== Tab 5: Stakeholders ==========
  const stakeholders = workbook.getWorksheet("Stakeholders");
  if (stakeholders) {
    data.stakeholders.forEach((sh, i) => {
      const row = stakeholders.getRow(i + 2);
      row.getCell(1).value = sh.name;
      row.getCell(2).value = sh.role;
      row.getCell(3).value = sh.organization;
      row.getCell(4).value = sh.email;
      row.getCell(5).value = sh.interest_level.toUpperCase();
      row.getCell(6).value = sh.influence_level.toUpperCase();
      // Summarize communications as a readable string
      row.getCell(7).value = (sh.communications || [])
        .map((c) => `${c.type} (${c.frequency}, ${c.format})`)
        .join("; ");
      row.getCell(7).alignment = { wrapText: true };
      row.getCell(8).value = sh.notes;
      row.getCell(8).alignment = { wrapText: true };

      for (let c = 1; c <= 8; c++) {
        row.getCell(c).font = { name: "Calibri", size: 10 };
        row.getCell(c).border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
        if (i % 2 === 1) {
          row.getCell(c).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "F2F2F2" },
          };
        }
      }
    });
  }

  // ========== Tab 6: Decision Log ==========
  const decisions = workbook.getWorksheet("Decision Log");
  if (decisions) {
    data.decisions.forEach((dec, i) => {
      const row = decisions.getRow(i + 2);
      row.getCell(1).value = dec.id;
      row.getCell(2).value = parseDate(dec.date);
      if (row.getCell(2).value) row.getCell(2).numFmt = "MM/DD/YY";
      row.getCell(3).value = dec.description;
      row.getCell(3).alignment = { wrapText: true };
      row.getCell(4).value = (dec.options_considered || []).join("; ");
      row.getCell(4).alignment = { wrapText: true };
      row.getCell(5).value = dec.decided_by;
      row.getCell(6).value = dec.rationale;
      row.getCell(6).alignment = { wrapText: true };
      row.getCell(7).value = getWorkstreamName(data, dec.workstream_id);

      for (let c = 1; c <= 7; c++) {
        row.getCell(c).font = { name: "Calibri", size: 10 };
        row.getCell(c).border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
        if (i % 2 === 1) {
          row.getCell(c).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "F2F2F2" },
          };
        }
      }
    });
  }

  // ========== Tab 7: Meeting Cadence ==========
  const meetingSheet = workbook.getWorksheet("Meeting Cadence");
  if (meetingSheet) {
    data.meetings.forEach((mtg, i) => {
      const row = meetingSheet.getRow(i + 2);
      row.getCell(1).value = mtg.name;
      row.getCell(2).value = (mtg.frequency || "").toUpperCase();
      row.getCell(3).value = `${mtg.day || ""}, ${mtg.time || ""}`.replace(/^, |, $/, "");
      row.getCell(4).value = (mtg.attendees || []).join(", ");
      row.getCell(4).alignment = { wrapText: true };
      row.getCell(5).value = mtg.purpose || "";
      row.getCell(5).alignment = { wrapText: true };
      row.getCell(6).value = (mtg.generates || []).join(", ");

      for (let c = 1; c <= 6; c++) {
        row.getCell(c).font = { name: "Calibri", size: 10 };
        row.getCell(c).border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
        if (i % 2 === 1) {
          row.getCell(c).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "F2F2F2" },
          };
        }
      }
    });
  }

  // Tab 8: Change Log is left empty as expected

  // Write to a buffer and return it
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

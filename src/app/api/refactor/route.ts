import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { resumeService } from "@/lib/db/services";
import { refactorResume } from "@/lib/ai";
import { RefactorDataRequestSchema } from "@/types/resume";

// POST /api/refactor - Refactor resume for a job description
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();

    const parsed = RefactorDataRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.format() },
        { status: 400 }
      );
    }

    // Get master resume
    const masterResume = await resumeService.getMasterResumeData(userId);

    if (!masterResume || !masterResume.data) {
      return NextResponse.json(
        { error: "No master resume found. Please create one first." },
        { status: 400 }
      );
    }

    // Refactor resume using AI
    const result = await refactorResume(masterResume.data, parsed.data);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error refactoring resume:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { resumeService } from "@/lib/db/services";
import { UpdateResumeDataSchema } from "@/types/resume";

// GET /api/resumes/master - Get master resume
export async function GET() {
  try {
    const userId = await requireAuth();
    const resume = await resumeService.getMasterResumeData(userId);

    return NextResponse.json(resume);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching master resume:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/resumes/master - Update master resume
export async function PUT(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();

    const parsed = UpdateResumeDataSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const resume = await resumeService.upsertMasterResumeData(parsed.data, userId);

    return NextResponse.json(resume);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error updating master resume:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


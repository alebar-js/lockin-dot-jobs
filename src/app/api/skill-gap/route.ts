import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { analyzeSkillGaps } from "@/lib/ai";
import { SkillGapAnalysisRequestSchema } from "@/types/resume";

// POST /api/skill-gap - Analyze skill gaps
export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();

    const parsed = SkillGapAnalysisRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.format() },
        { status: 400 }
      );
    }

    // Analyze skill gaps using AI
    const result = await analyzeSkillGaps(parsed.data);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error analyzing skill gaps:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


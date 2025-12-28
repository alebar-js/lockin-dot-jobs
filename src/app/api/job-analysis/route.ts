import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { analyzeJobPosting } from "@/lib/ai";
import { jobAnalysisService } from "@/lib/db/services";
import { z } from "zod";

const AnalyzeRequestSchema = z.object({
  jobPostingId: z.string().uuid(),
  jobDescription: z.string().min(1, "Job description is required"),
});

// GET /api/job-analysis?jobPostingId=xxx - Get cached analysis only
export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const jobPostingId = request.nextUrl.searchParams.get("jobPostingId");

    if (!jobPostingId) {
      return NextResponse.json(
        { error: "jobPostingId is required" },
        { status: 400 }
      );
    }

    const cached = await jobAnalysisService.getCachedAnalysis(jobPostingId, userId);

    if (!cached) {
      return NextResponse.json({ cached: false, analysis: null });
    }

    return NextResponse.json({
      cached: true,
      cachedAt: cached.createdAt,
      analysis: cached.analysis,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching cached job analysis:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/job-analysis - Analyze job posting (with caching)
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();

    const parsed = AnalyzeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { jobPostingId, jobDescription } = parsed.data;

    // Check cache first
    const cached = await jobAnalysisService.getCachedAnalysis(jobPostingId, userId);
    if (cached) {
      return NextResponse.json({
        ...cached.analysis,
        cached: true,
        cachedAt: cached.createdAt,
      });
    }

    // Call LLM if no cache
    const result = await analyzeJobPosting(jobDescription);

    // Save to cache
    await jobAnalysisService.saveAnalysis(jobPostingId, userId, result);

    return NextResponse.json({
      ...result,
      cached: false,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error analyzing job posting:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

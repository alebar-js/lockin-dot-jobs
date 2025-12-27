import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { jobPostingService } from "@/lib/db/services";
import { CreateJobPostingDataSchema } from "@/types/resume";

// GET /api/job-postings - List all job postings
export async function GET() {
  try {
    const userId = await requireAuth();
    const jobPostings = await jobPostingService.getJobPostingsData(userId);

    return NextResponse.json(jobPostings);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching job postings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/job-postings - Create a new job posting
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();

    const parsed = CreateJobPostingDataSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const jobPosting = await jobPostingService.createJobPostingData(
      parsed.data,
      userId
    );

    return NextResponse.json(jobPosting, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating job posting:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


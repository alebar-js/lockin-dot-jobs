import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { jobPostingService } from "@/lib/db/services";
import { UpdateJobPostingDataSchema } from "@/types/resume";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/job-postings/[id] - Get a specific job posting
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuth();
    const { id } = await params;

    const jobPosting = await jobPostingService.getJobPostingDataById(id, userId);

    if (!jobPosting) {
      return NextResponse.json({ error: "Job posting not found" }, { status: 404 });
    }

    return NextResponse.json(jobPosting);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching job posting:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/job-postings/[id] - Update a job posting
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const parsed = UpdateJobPostingDataSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const jobPosting = await jobPostingService.updateJobPostingData(
      id,
      parsed.data,
      userId
    );

    if (!jobPosting) {
      return NextResponse.json({ error: "Job posting not found" }, { status: 404 });
    }

    return NextResponse.json(jobPosting);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error updating job posting:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/job-postings/[id] - Delete a job posting
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuth();
    const { id } = await params;

    const deleted = await jobPostingService.deleteJobPosting(id, userId);

    if (!deleted) {
      return NextResponse.json({ error: "Job posting not found" }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error deleting job posting:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


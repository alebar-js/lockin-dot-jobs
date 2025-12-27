import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getCurrentUserId } from "@/lib/auth";
import { jobPostingService } from "@/lib/db/services";

// DELETE /api/job-postings/folder/[...path] - Delete all job postings in a folder
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { path: pathSegments } = await params;

    // Reconstruct the full folder path from the path segments
    // e.g., ["tech", "startups"] -> "/tech/startups"
    const folderPath = "/" + (pathSegments?.join("/") || "");

    const deletedCount = await jobPostingService.deleteJobPostingsByFolderPath(
      folderPath,
      userId
    );

    return NextResponse.json({ deletedCount });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error deleting folder:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

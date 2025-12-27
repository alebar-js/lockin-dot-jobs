import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { parseText, parseFile } from "@/lib/ai";
import { IngestTextRequestSchema } from "@/types/resume";

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed MIME types for resume files
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// POST /api/ingest - Parse resume text or file
export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const contentType = request.headers.get("content-type") || "";

    // Handle JSON text input
    if (contentType.includes("application/json")) {
      const body = await request.json();

      const parsed = IngestTextRequestSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid request body", details: parsed.error.format() },
          { status: 400 }
        );
      }

      const result = await parseText(parsed.data.text);
      return NextResponse.json(result);
    }

    // Handle file upload (multipart/form-data)
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 }
        );
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "File size exceeds 10MB limit" },
          { status: 400 }
        );
      }

      // Validate file type
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: "Invalid file type. Only PDF and DOCX files are supported." },
          { status: 400 }
        );
      }

      // Convert File to Buffer for LlamaParse
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Parse using LlamaParse
      const result = await parseFile(buffer, file.name);

      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Unsupported content type" },
      { status: 415 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error ingesting resume:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

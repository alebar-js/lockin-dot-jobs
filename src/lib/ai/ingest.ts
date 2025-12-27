import { GoogleGenAI } from "@google/genai";
import { randomUUID } from "crypto";
import type { ResumeProfile, IngestResponse } from "@/types/resume";
import { ResumeProfileSchema } from "@/types/resume";
import { stripMarkdownCodeBlocks } from "./utils";

const GEMINI_MODEL = "gemini-2.5-flash";
const LLAMA_PARSE_API_URL = "https://api.cloud.llamaindex.ai/api/parsing";

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUIDFormat(id: unknown): boolean {
  return typeof id === "string" && UUID_REGEX.test(id);
}

/**
 * Sanitize the parsed profile data to handle null values and ensure valid UUIDs
 */
function sanitizeProfile(parsed: Record<string, unknown>): Record<string, unknown> {
  // Ensure main ID is a valid UUID
  if (!isValidUUIDFormat(parsed.id)) {
    parsed.id = randomUUID();
  }

  // Sanitize work entries
  if (Array.isArray(parsed.work)) {
    parsed.work = parsed.work.map((job: Record<string, unknown>) => ({
      ...job,
      id: isValidUUIDFormat(job.id) ? job.id : randomUUID(),
      // Convert null endDate to undefined (for current positions)
      endDate: job.endDate === null ? undefined : job.endDate,
      highlights: Array.isArray(job.highlights) ? job.highlights : [],
    }));
  }

  // Sanitize education entries
  if (Array.isArray(parsed.education)) {
    parsed.education = parsed.education.map((edu: Record<string, unknown>) => ({
      ...edu,
      // Convert null endDate to undefined
      endDate: edu.endDate === null ? undefined : edu.endDate,
    }));
  }

  // Sanitize projects
  if (Array.isArray(parsed.projects)) {
    parsed.projects = parsed.projects.map((project: Record<string, unknown>) => {
      // Handle null url - convert to undefined or empty string
      const url = project.url === null ? undefined : project.url;
      return {
        ...project,
        url,
        highlights: Array.isArray(project.highlights) ? project.highlights : [],
      };
    });
  }

  // Sanitize basics
  if (parsed.basics && typeof parsed.basics === "object") {
    const basics = parsed.basics as Record<string, unknown>;
    // Handle null url in basics
    if (basics.url === null) {
      basics.url = undefined;
    }
  }

  // Ensure arrays exist
  if (!Array.isArray(parsed.work)) parsed.work = [];
  if (!Array.isArray(parsed.education)) parsed.education = [];
  if (!Array.isArray(parsed.skills)) parsed.skills = [];
  if (!Array.isArray(parsed.projects)) parsed.projects = [];

  return parsed;
}

function getGeminiApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }
  return apiKey;
}

function getLlamaCloudApiKey(): string {
  const apiKey = process.env.LLAMA_CLOUD_API_KEY;
  if (!apiKey) {
    throw new Error("LLAMA_CLOUD_API_KEY environment variable is not set");
  }
  return apiKey;
}

const SYSTEM_PROMPT = `You are a Resume Parser Agent. Your task is to convert resume content (in Markdown format) into a structured JSON object.

**Output Schema (ResumeProfile):**
{
  "id": "string (UUID)",
  "basics": {
    "name": "string",
    "label": "string (job title/professional headline)",
    "email": "string",
    "phone": "string",
    "url": "string (optional, personal website/portfolio)",
    "location": {
      "city": "string",
      "region": "string"
    }
  },
  "work": [
    {
      "id": "string (UUID)",
      "company": "string",
      "position": "string",
      "startDate": "string (YYYY-MM format)",
      "endDate": "string (YYYY-MM format, or omit for current)",
      "highlights": ["string (bullet point accomplishments)"]
    }
  ],
  "education": [
    {
      "institution": "string",
      "area": "string (field of study)",
      "studyType": "string (degree type, e.g., Bachelor's, Master's)",
      "startDate": "string (YYYY-MM format)",
      "endDate": "string (YYYY-MM format, optional)"
    }
  ],
  "skills": [
    {
      "name": "string (category, e.g., 'Programming Languages', 'Frameworks')",
      "keywords": ["string (individual skills)"]
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "highlights": ["string"],
      "url": "string (optional)"
    }
  ]
}

**Rules:**
1. Extract ALL information from the resume content accurately.
2. Generate UUIDs for the main "id" field and each work experience "id".
3. Parse dates to YYYY-MM format when possible. If only year is provided, use YYYY-01.
4. Group skills into logical categories (e.g., "Programming Languages", "Frameworks", "Tools", "Soft Skills").
5. Preserve the exact wording of bullet points in highlights.
6. If a field cannot be determined, use an empty string or empty array.
7. Return ONLY valid JSON. No explanations, no markdown code blocks, no preamble.`;

/**
 * Convert markdown/text content to ResumeProfile using Gemini
 */
export async function convertToProfile(content: string): Promise<ResumeProfile> {
  const userPrompt = `${SYSTEM_PROMPT}

## Resume Content
\`\`\`
${content}
\`\`\`

Parse the above resume and return a valid JSON object matching the ResumeProfile schema.`;

  const apiKey = getGeminiApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: userPrompt,
    config: {
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  });

  const rawContent = response.text || "";

  // Parse and validate the JSON response
  let profile: ResumeProfile;
  try {
    const cleaned = stripMarkdownCodeBlocks(rawContent);
    let parsed = JSON.parse(cleaned);

    // Sanitize the parsed data to handle null values and ensure valid UUIDs
    parsed = sanitizeProfile(parsed);

    // Validate against schema
    profile = ResumeProfileSchema.parse(parsed);
  } catch (error) {
    // Try to extract JSON from the response if initial parsing fails
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      let parsed = JSON.parse(jsonMatch[0]);

      // Sanitize the parsed data
      parsed = sanitizeProfile(parsed);

      profile = ResumeProfileSchema.parse(parsed);
    } else {
      throw new Error(
        "Failed to parse AI response as valid ResumeProfile JSON. Response: " +
          rawContent.substring(0, 200)
      );
    }
  }

  return profile;
}

/**
 * Parse raw text resume content and convert to structured JSON
 */
export async function parseText(text: string): Promise<IngestResponse> {
  const profile = await convertToProfile(text);

  return {
    markdown: text,
    profile,
  };
}

/**
 * Upload a file to LlamaParse and get the job ID
 */
async function uploadToLlamaParse(
  fileBuffer: Buffer,
  filename: string,
  apiKey: string
): Promise<string> {
  const formData = new FormData();
  // Convert Buffer to Uint8Array for Blob compatibility
  const uint8Array = new Uint8Array(fileBuffer);
  const blob = new Blob([uint8Array]);
  formData.append("file", blob, filename);

  const response = await fetch(`${LLAMA_PARSE_API_URL}/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LlamaParse upload failed (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  return result.id;
}

/**
 * Poll LlamaParse job status until complete
 */
async function pollJobStatus(
  jobId: string,
  apiKey: string,
  maxAttempts = 60,
  delayMs = 2000
): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`${LLAMA_PARSE_API_URL}/job/${jobId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to check job status: ${response.status}`);
    }

    const result = await response.json();

    if (result.status === "SUCCESS") {
      return;
    }

    if (result.status === "ERROR") {
      throw new Error(`LlamaParse job failed: ${result.error || "Unknown error"}`);
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error("LlamaParse job timed out");
}

/**
 * Get the parsed result from LlamaParse
 */
async function getJobResult(jobId: string, apiKey: string): Promise<string> {
  const response = await fetch(
    `${LLAMA_PARSE_API_URL}/job/${jobId}/result/markdown`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get job result: ${response.status}`);
  }

  const result = await response.json();
  return result.markdown;
}

/**
 * Parse a resume file (PDF or DOCX) using LlamaParse REST API and convert to structured JSON
 */
export async function parseFile(
  fileBuffer: Buffer,
  filename: string
): Promise<IngestResponse> {
  const apiKey = getLlamaCloudApiKey();

  try {
    // Step 1: Upload file to LlamaParse
    console.log("Uploading file to LlamaParse...");
    const jobId = await uploadToLlamaParse(fileBuffer, filename, apiKey);
    console.log(`LlamaParse job created: ${jobId}`);

    // Step 2: Poll until complete
    console.log("Waiting for parsing to complete...");
    await pollJobStatus(jobId, apiKey);

    // Step 3: Get the markdown result
    console.log("Fetching parsed result...");
    const markdown = await getJobResult(jobId, apiKey);

    if (!markdown || markdown.trim().length === 0) {
      throw new Error("LlamaParse returned empty content");
    }

    // Step 4: Convert markdown to structured JSON using Gemini
    console.log("Converting to structured profile...");
    const profile = await convertToProfile(markdown);

    return {
      markdown,
      profile,
    };
  } catch (error) {
    console.error("File parsing error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse file: ${errorMessage}`);
  }
}

export const ingestService = {
  parseText,
  parseFile,
  convertToProfile,
};

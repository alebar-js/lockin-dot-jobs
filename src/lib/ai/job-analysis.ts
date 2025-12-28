import { GoogleGenAI } from "@google/genai";
import type { JobAnalysisResponse } from "@/types/resume";
import { JobAnalysisResponseSchema } from "@/types/resume";
import {
  stripMarkdownCodeBlocks,
  extractJsonObject,
  transformNullToUndefined,
} from "./utils";

const GEMINI_MODEL = "gemini-2.5-flash";

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }
  return apiKey;
}

/**
 * Analyze a job posting and extract structured information
 */
export async function analyzeJobPosting(
  jobDescription: string
): Promise<JobAnalysisResponse> {
  const SYSTEM_PROMPT = `You are a Job Description Analyzer. Parse the job posting and extract structured information.

**Output Format (JSON):**
{
  "hardSkills": ["React", "TypeScript", "AWS", "Docker", ...],
  "domainKnowledge": ["Fintech", "E-commerce", "Microservices", ...],
  "yearsOfExperience": "2-5",
  "jobTitle": "Senior Software Engineer",
  "keyResponsibilities": [
    "Lead frontend architecture decisions",
    "Mentor junior developers",
    "Drive technical roadmap",
    ...
  ],
  "companyName": "Cloudflare",
  "location": "Austin, TX; Lisbon, Portugal; Bengaluru, India"
}

**Extraction Rules:**
1. **hardSkills**: Extract ALL technical skills - programming languages, frameworks, libraries, tools, platforms, databases, cloud services. Be comprehensive.
2. **domainKnowledge**: Extract industry/domain expertise - business domains (fintech, e-commerce), methodologies (agile, scrum), architectural patterns (microservices, distributed systems).
3. **yearsOfExperience**: Extract ONLY the years of experience required (e.g., "2-5 years", "5+ years", "3-7 years"). If not explicitly mentioned, infer from seniority level.
4. **jobTitle**: Extract the explicit job title from the posting. If not found, infer it from the description (e.g., "Senior Software Engineer", "Staff Engineer", "Engineering Manager").
5. **keyResponsibilities**: Extract 5-10 main job duties in order of importance. Use concise action-oriented statements.
6. **companyName**: Extract the company name only. Do not include descriptions.
7. **location**: Extract ONLY location names (cities, countries, regions). Remove prefixes like "Available in" or "Based in". Use semicolon-separated format for multiple locations.

**Important:**
- Extract skills as individual items, not combined (e.g., "React" and "TypeScript" separately, not "React/TypeScript")
- If information is not available in the job description, use an empty string or empty array
- Be comprehensive with skills - extract everything mentioned
- For location, strip any descriptive text and only include actual place names
- Return ONLY valid JSON. No explanations, no markdown code blocks.`;

  const userPrompt = `${SYSTEM_PROMPT}

## Job Description
\`\`\`
${jobDescription}
\`\`\`

Analyze this job posting and return the JSON report.`;

  const apiKey = getApiKey();
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

  // Try to parse JSON, handling potential code blocks
  let analysisResult: JobAnalysisResponse;
  try {
    const cleaned = stripMarkdownCodeBlocks(rawContent);
    const parsed = JSON.parse(cleaned);
    const transformed = transformNullToUndefined(parsed);
    analysisResult = JobAnalysisResponseSchema.parse(transformed);
  } catch {
    // If parsing fails, try to extract JSON from the response
    const jsonText = extractJsonObject(rawContent);

    if (jsonText) {
      try {
        const parsed = JSON.parse(jsonText);
        const transformed = transformNullToUndefined(parsed);
        analysisResult = JobAnalysisResponseSchema.parse(transformed);
      } catch (parseError) {
        const errorMessage =
          parseError instanceof Error ? parseError.message : String(parseError);
        throw new Error(
          `Failed to parse AI response as valid JSON. Parse error: ${errorMessage}. Response length: ${rawContent.length}`
        );
      }
    } else {
      throw new Error(
        `Failed to extract JSON object from AI response. Response length: ${rawContent.length}. First 500 chars: ${rawContent.substring(0, 500)}`
      );
    }
  }

  // Ensure all arrays exist with defaults
  return {
    hardSkills: analysisResult.hardSkills || [],
    domainKnowledge: analysisResult.domainKnowledge || [],
    yearsOfExperience: analysisResult.yearsOfExperience || "",
    jobTitle: analysisResult.jobTitle || "",
    keyResponsibilities: analysisResult.keyResponsibilities || [],
    companyName: analysisResult.companyName || "",
    location: analysisResult.location || "",
  };
}

export const jobAnalysisService = {
  analyzeJobPosting,
};

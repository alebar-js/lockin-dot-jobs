import { GoogleGenAI } from "@google/genai";
import type {
  SkillGapAnalysisRequest,
  SkillGapAnalysisResponse,
} from "@/types/resume";
import { SkillGapAnalysisResponseSchema } from "@/types/resume";
import {
  stripMarkdownCodeBlocks,
  extractJsonObject,
  transformNullToUndefined,
} from "./utils";

const GEMINI_MODEL = "gemini-2.5-flash";

/**
 * Attempt to repair truncated JSON by closing open structures
 */
function repairTruncatedJson(json: string): string {
  let repaired = json.trim();

  // Count unclosed brackets and braces
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escapeNext = false;

  for (const char of repaired) {
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') openBraces++;
      else if (char === '}') openBraces--;
      else if (char === '[') openBrackets++;
      else if (char === ']') openBrackets--;
    }
  }

  // If we're in a string, close it
  if (inString) {
    repaired += '"';
  }

  // Close any open brackets/braces
  for (let i = 0; i < openBrackets; i++) {
    repaired += ']';
  }
  for (let i = 0; i < openBraces; i++) {
    repaired += '}';
  }

  return repaired;
}

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }
  return apiKey;
}

/**
 * Analyze skill gaps between a resume and job description
 */
export async function analyzeSkillGaps(
  request: SkillGapAnalysisRequest
): Promise<SkillGapAnalysisResponse> {
  const SYSTEM_PROMPT = `You are a Resume Auditor Agent. Your task is to analyze a resume against a job description and identify skill gaps.

**Input:**
1. \`ResumeProfile\` (JSON object following ResumeProfile schema)
2. \`JobDescription\` (Text)

**Analysis Criteria:**
1. **Hard Skills:** Programming languages, frameworks, tools, technologies (e.g., React, Python, AWS, Docker)
2. **Domain Knowledge:** Industry-specific knowledge, business domains (e.g., Fintech, E-commerce, Healthcare, Scalability, Microservices)
3. **Seniority:** Years of experience, leadership signals, scope of responsibility (e.g., "5+ years", "lead", "architect", "drive")

**Task:**
Analyze the resume and job description to categorize each skill/keyword from the JD into one of three statuses:
- **matched**: The skill is clearly present in the resume with strong evidence
- **missing**: The skill is required in the JD but not found in the resume
- **partial**: The skill is mentioned or implied but not clearly demonstrated (e.g., related technology but not exact match)

**Output Format:**
Return a JSON object with this structure:
{
  "matched": [
    {
      "skill": "React",
      "category": "hard_skills",
      "status": "matched",
      "evidence": "Built React component library consumed by 8 applications",
      "recommendation": null
    }
  ],
  "missing": [
    {
      "skill": "GraphQL",
      "category": "hard_skills",
      "status": "missing",
      "evidence": null,
      "recommendation": "Consider highlighting any API design experience or adding GraphQL to your skills"
    }
  ],
  "partial": [
    {
      "skill": "Microservices",
      "category": "domain_knowledge",
      "status": "partial",
      "evidence": "Mentioned decoupling code but not explicitly microservices",
      "recommendation": "Explicitly mention microservices architecture if applicable"
    }
  ],
  "summary": {
    "totalSkills": 15,
    "matchedCount": 8,
    "missingCount": 4,
    "partialCount": 3,
    "matchPercentage": 53.3
  }
}

**Rules:**
1. Be thorough - extract ALL significant skills/keywords from the JD
2. Be accurate - only mark as "matched" if there's clear evidence
3. Be helpful - provide actionable recommendations for missing/partial skills
4. Include evidence quotes from the resume when available
5. Calculate matchPercentage as: ((matchedCount + partialCount * 0.5) / totalSkills) * 100

**Output:**
Return ONLY a valid JSON object. No explanations, no markdown code blocks, no preamble.`;

  const userPrompt = `${SYSTEM_PROMPT}

## Resume Profile (JSON)
\`\`\`json
${JSON.stringify(request.resume, null, 2)}
\`\`\`

## Job Description
\`\`\`
${request.jobDescription}
\`\`\`

Analyze the skill gaps and return the JSON report.`;

  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: userPrompt,
    config: {
      maxOutputTokens: 16384,
      responseMimeType: "application/json",
    },
  });

  const rawContent = response.text || "";

  // Helper function to try parsing JSON with repair fallback
  const tryParseJson = (jsonStr: string): unknown => {
    try {
      return JSON.parse(jsonStr);
    } catch {
      // Try repairing truncated JSON
      const repaired = repairTruncatedJson(jsonStr);
      return JSON.parse(repaired);
    }
  };

  // Try to parse JSON, handling potential code blocks
  let analysisResult: SkillGapAnalysisResponse;
  try {
    const cleaned = stripMarkdownCodeBlocks(rawContent);
    const parsed = tryParseJson(cleaned);
    const transformed = transformNullToUndefined(parsed);
    analysisResult = SkillGapAnalysisResponseSchema.parse(transformed);
  } catch {
    // If parsing fails, try to extract JSON from the response
    const jsonText = extractJsonObject(rawContent);

    if (jsonText) {
      try {
        const parsed = tryParseJson(jsonText);
        const transformed = transformNullToUndefined(parsed);
        analysisResult = SkillGapAnalysisResponseSchema.parse(transformed);
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

  // Ensure all arrays exist and recalculate match percentage
  const matched = analysisResult.matched || [];
  const missing = analysisResult.missing || [];
  const partial = analysisResult.partial || [];
  const matchedCount = matched.length;
  const missingCount = missing.length;
  const partialCount = partial.length;
  const totalSkills = matchedCount + missingCount + partialCount;

  // Calculate match percentage: matched = 1.0, partial = 0.5, missing = 0.0
  const matchPercentage =
    totalSkills > 0
      ? ((matchedCount + partialCount * 0.5) / totalSkills) * 100
      : 0;

  return {
    matched,
    missing,
    partial,
    summary: {
      totalSkills,
      matchedCount,
      missingCount,
      partialCount,
      matchPercentage: Math.round(matchPercentage * 100) / 100,
    },
  };
}

export const skillGapService = {
  analyzeSkillGaps,
};


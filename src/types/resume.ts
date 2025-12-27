import { z } from "zod";

// ============================================================================
// JOB POSTING STATUS
// ============================================================================

export const JOB_POSTING_STATUS = {
  IN_PROGRESS: "IN_PROGRESS",
  READY: "READY",
  EXPORTED: "EXPORTED",
  APPLIED: "APPLIED",
  OFFER: "OFFER",
  REJECTED: "REJECTED",
} as const;

export const JobPostingStatusSchema = z.enum([
  "IN_PROGRESS",
  "READY",
  "EXPORTED",
  "APPLIED",
  "OFFER",
  "REJECTED",
]);
export type JobPostingStatus = z.infer<typeof JobPostingStatusSchema>;

// ============================================================================
// MODULAR RESUME SCHEMA (Structured JSON)
// Based on .cursor/MODULAR_RESUME.md
// ============================================================================

export const LocationSchema = z
  .object({
    city: z.string(),
    region: z.string(),
  })
  .optional();

export type Location = z.infer<typeof LocationSchema>;

export const BasicsSchema = z.object({
  name: z.string().default(""),
  label: z.string().default(""), // e.g. "Senior Fullstack Engineer"
  email: z.string().email().or(z.literal("")).default(""),
  phone: z.string().default(""),
  url: z.string().url().optional().or(z.literal("")),
  location: LocationSchema,
});

export type Basics = z.infer<typeof BasicsSchema>;

export const JobSchema = z.object({
  id: z.string().uuid(),
  company: z.string().default(""),
  position: z.string().default(""),
  startDate: z.string().default(""), // ISO or "YYYY-MM"
  endDate: z.string().optional(), // "Present" if null
  highlights: z.array(z.string()).default([]),
});

export type Job = z.infer<typeof JobSchema>;

export const EducationSchema = z.object({
  institution: z.string().default(""),
  area: z.string().default(""),
  studyType: z.string().default(""),
  startDate: z.string().default(""),
  endDate: z.string().optional(),
});

export type Education = z.infer<typeof EducationSchema>;

export const ProjectSchema = z
  .object({
    name: z.string().default(""),
    description: z.string().default(""),
    highlights: z.array(z.string()).default([]),
    url: z.string().url().optional().or(z.literal("")),
  })
  .optional();

export type Project = z.infer<typeof ProjectSchema>;

export const SkillSchema = z.object({
  name: z.string().default(""), // e.g. "Frontend"
  keywords: z.array(z.string()).default([]), // e.g. ["React", "TypeScript", "Tailwind"]
});

export type Skill = z.infer<typeof SkillSchema>;

export const ResumeProfileSchema = z.object({
  id: z.string().uuid(),
  basics: BasicsSchema,
  work: z.array(JobSchema),
  education: z.array(EducationSchema),
  skills: z.array(SkillSchema),
  projects: z.array(ProjectSchema).optional(),
});

export type ResumeProfile = z.infer<typeof ResumeProfileSchema>;

// ============================================================================
// RESUME DATA SCHEMAS
// ============================================================================

export const ResumeDataSchema = z.object({
  id: z.string().uuid(),
  data: ResumeProfileSchema,
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
});

export type ResumeData = z.infer<typeof ResumeDataSchema>;

export const UpdateResumeDataSchema = z.object({
  data: ResumeProfileSchema,
});

export type UpdateResumeData = z.infer<typeof UpdateResumeDataSchema>;

// ============================================================================
// JOB POSTING SCHEMAS
// ============================================================================

export const JobPostingDataSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  companyName: z.string().nullable().optional(),
  jobDescription: z.string(),
  postingUrl: z.string().url().nullable().optional(),
  path: z.string().nullable().optional(),
  data: ResumeProfileSchema.nullable(),
  status: JobPostingStatusSchema,
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
});

export type JobPostingData = z.infer<typeof JobPostingDataSchema>;

export const CreateJobPostingDataSchema = z.object({
  title: z.string(),
  companyName: z.string().optional(),
  jobDescription: z.string().min(1, "Job description is required"),
  postingUrl: z.string().url().optional().or(z.literal("")),
  path: z.string().optional(),
  data: ResumeProfileSchema.optional(),
});

export type CreateJobPostingData = z.infer<typeof CreateJobPostingDataSchema>;

export const UpdateJobPostingDataSchema = z.object({
  title: z.string().optional(),
  companyName: z.string().optional(),
  jobDescription: z.string().optional(),
  postingUrl: z.string().url().optional().or(z.literal("")),
  path: z.string().nullable().optional(),
  data: ResumeProfileSchema.optional(),
  status: JobPostingStatusSchema.optional(),
});

export type UpdateJobPostingData = z.infer<typeof UpdateJobPostingDataSchema>;

// ============================================================================
// REFACTOR SCHEMAS
// ============================================================================

export const RefactorDataRequestSchema = z.object({
  jobDescription: z.string().min(1, "Job description is required"),
});

export type RefactorDataRequest = z.infer<typeof RefactorDataRequestSchema>;

export const RefactorDataResponseSchema = z.object({
  original: ResumeProfileSchema,
  refactored: ResumeProfileSchema,
});

export type RefactorDataResponse = z.infer<typeof RefactorDataResponseSchema>;

// ============================================================================
// SKILL GAP ANALYSIS SCHEMAS
// ============================================================================

export const SkillGapCategorySchema = z.enum([
  "hard_skills",
  "domain_knowledge",
  "seniority",
]);
export type SkillGapCategory = z.infer<typeof SkillGapCategorySchema>;

export const SkillGapStatusSchema = z.enum(["matched", "missing", "partial"]);
export type SkillGapStatus = z.infer<typeof SkillGapStatusSchema>;

export const SkillGapItemSchema = z.object({
  skill: z.string(),
  category: SkillGapCategorySchema,
  status: SkillGapStatusSchema,
  evidence: z.string().nullish(),
  recommendation: z.string().nullish(),
});

export type SkillGapItem = z.infer<typeof SkillGapItemSchema>;

export const SkillGapAnalysisRequestSchema = z.object({
  jobDescription: z.string().min(1, "Job description is required"),
  resume: ResumeProfileSchema,
});

export type SkillGapAnalysisRequest = z.infer<
  typeof SkillGapAnalysisRequestSchema
>;

export const SkillGapAnalysisResponseSchema = z.object({
  matched: z.array(SkillGapItemSchema),
  missing: z.array(SkillGapItemSchema),
  partial: z.array(SkillGapItemSchema),
  summary: z.object({
    totalSkills: z.number(),
    matchedCount: z.number(),
    missingCount: z.number(),
    partialCount: z.number(),
    matchPercentage: z.number(),
  }),
});

export type SkillGapAnalysisResponse = z.infer<
  typeof SkillGapAnalysisResponseSchema
>;

// ============================================================================
// INGEST (RESUME PARSING) SCHEMAS
// ============================================================================

export const IngestTextRequestSchema = z.object({
  text: z.string().min(1, "Resume text is required"),
});

export type IngestTextRequest = z.infer<typeof IngestTextRequestSchema>;

export const IngestResponseSchema = z.object({
  markdown: z.string(),
  profile: ResumeProfileSchema,
});

export type IngestResponse = z.infer<typeof IngestResponseSchema>;


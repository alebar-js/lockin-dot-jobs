import { pgTable, uuid, varchar, timestamp, text, pgEnum, jsonb, boolean, integer, real } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { ResumeProfile } from '@/types/resume';

// Users table (updated for OAuth2.0 support)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }), // Optional
  picture: varchar('picture', { length: 500 }), // From Google/GitHub profile
  // OAuth Provider IDs
  googleId: varchar('google_id', { length: 255 }).unique(),
  githubId: varchar('github_id', { length: 255 }).unique(),
  linkedinId: varchar('linkedin_id', { length: 255 }).unique(),
  facebookId: varchar('facebook_id', { length: 255 }).unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type DbUser = typeof users.$inferSelect;
export type NewDbUser = typeof users.$inferInsert;

// Resumes table (supports both master and forks)
export const resumes = pgTable('resumes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id), // Nullable until auth is implemented
  isMaster: boolean('is_master').notNull().default(false),
  data: jsonb('data').$type<ResumeProfile>(), // The ResumeProfile JSON object (nullable for backward compatibility)
  targetJobId: uuid('target_job_id').references(() => jobPostings.id), // Null for Master, Link to job_postings for forks
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type DbResume = typeof resumes.$inferSelect;
export type NewDbResume = typeof resumes.$inferInsert;

export const jobPostingStatusEnum = pgEnum('job_posting_status', ['IN_PROGRESS', 'READY', 'EXPORTED', 'APPLIED', 'OFFER', 'REJECTED']);

// Job Postings table (stores job applications/descriptions)
export const jobPostings = pgTable('job_postings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id), // Nullable until auth is implemented
  companyName: varchar('company_name', { length: 255 }), // e.g., "Meta" (nullable for backward compatibility)
  title: varchar('title', { length: 255 }).notNull(), // e.g., "Meta - Sr. Engineer"
  jobDescription: text('job_description').notNull(), // The raw input text
  postingUrl: text('posting_url'),
  path: text('path'), // Virtualized folder path (e.g., "/folder1/subfolder"), null for root
  status: jobPostingStatusEnum('status').notNull().default('IN_PROGRESS'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type DbJobPosting = typeof jobPostings.$inferSelect;
export type NewDbJobPosting = typeof jobPostings.$inferInsert;

// Job posting status type
export type JobPostingStatus = 'IN_PROGRESS' | 'READY' | 'EXPORTED' | 'APPLIED' | 'OFFER' | 'REJECTED';

// Skill Gap Analysis enums
export const skillGapCategoryEnum = pgEnum('skill_gap_category', [
  'hard_skills', 'soft_skills', 'domain_knowledge', 'seniority'
]);
export const skillGapStatusEnum = pgEnum('skill_gap_status', [
  'matched', 'missing', 'partial'
]);

// Skill Gap Analysis types
export type SkillGapCategory = 'hard_skills' | 'soft_skills' | 'domain_knowledge' | 'seniority';
export type SkillGapStatus = 'matched' | 'missing' | 'partial';

// Skill Gap Analyses table (caches LLM analysis results - parent table)
export const skillGapAnalyses = pgTable('skill_gap_analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobPostingId: uuid('job_posting_id')
    .notNull()
    .references(() => jobPostings.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  // Summary fields
  totalSkills: integer('total_skills').notNull(),
  matchedCount: integer('matched_count').notNull(),
  missingCount: integer('missing_count').notNull(),
  partialCount: integer('partial_count').notNull(),
  matchPercentage: real('match_percentage').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type DbSkillGapAnalysis = typeof skillGapAnalyses.$inferSelect;
export type NewDbSkillGapAnalysis = typeof skillGapAnalyses.$inferInsert;

// Skill Gap Items table (individual skill items - child table)
export const skillGapItems = pgTable('skill_gap_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  analysisId: uuid('analysis_id')
    .notNull()
    .references(() => skillGapAnalyses.id, { onDelete: 'cascade' }),
  skill: varchar('skill', { length: 255 }).notNull(),
  category: skillGapCategoryEnum('category').notNull(),
  status: skillGapStatusEnum('status').notNull(),
  evidence: text('evidence'),
  recommendation: text('recommendation'),
});

export type DbSkillGapItem = typeof skillGapItems.$inferSelect;
export type NewDbSkillGapItem = typeof skillGapItems.$inferInsert;

// Relations
export const resumesRelations = relations(resumes, ({ one }) => ({
  user: one(users, {
    fields: [resumes.userId],
    references: [users.id],
  }),
  targetJob: one(jobPostings, {
    fields: [resumes.targetJobId],
    references: [jobPostings.id],
  }),
}));

export const jobPostingsRelations = relations(jobPostings, ({ one, many }) => ({
  user: one(users, {
    fields: [jobPostings.userId],
    references: [users.id],
  }),
  resumes: many(resumes),
  skillGapAnalyses: many(skillGapAnalyses),
  jobAnalyses: many(jobAnalyses),
}));

export const skillGapAnalysesRelations = relations(skillGapAnalyses, ({ one, many }) => ({
  jobPosting: one(jobPostings, {
    fields: [skillGapAnalyses.jobPostingId],
    references: [jobPostings.id],
  }),
  user: one(users, {
    fields: [skillGapAnalyses.userId],
    references: [users.id],
  }),
  items: many(skillGapItems),
}));

export const skillGapItemsRelations = relations(skillGapItems, ({ one }) => ({
  analysis: one(skillGapAnalyses, {
    fields: [skillGapItems.analysisId],
    references: [skillGapAnalyses.id],
  }),
}));

// Job Analysis enums
export const jobAnalysisSkillCategoryEnum = pgEnum('job_analysis_skill_category', [
  'hard', 'domain'
]);

export type JobAnalysisSkillCategory = 'hard' | 'domain';

// Job Analyses table (caches LLM analysis of job postings - parent table)
export const jobAnalyses = pgTable('job_analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobPostingId: uuid('job_posting_id')
    .notNull()
    .references(() => jobPostings.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  yearsOfExperience: text('years_of_experience'),
  jobTitle: text('job_title'),
  location: text('location'),
  companyName: text('company_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type DbJobAnalysis = typeof jobAnalyses.$inferSelect;
export type NewDbJobAnalysis = typeof jobAnalyses.$inferInsert;

// Job Analysis Skills table (extracted skills - child table)
export const jobAnalysisSkills = pgTable('job_analysis_skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  analysisId: uuid('analysis_id')
    .notNull()
    .references(() => jobAnalyses.id, { onDelete: 'cascade' }),
  skill: varchar('skill', { length: 255 }).notNull(),
  category: jobAnalysisSkillCategoryEnum('category').notNull(),
});

export type DbJobAnalysisSkill = typeof jobAnalysisSkills.$inferSelect;
export type NewDbJobAnalysisSkill = typeof jobAnalysisSkills.$inferInsert;

// Job Analysis Responsibilities table (key responsibilities - child table)
export const jobAnalysisResponsibilities = pgTable('job_analysis_responsibilities', {
  id: uuid('id').primaryKey().defaultRandom(),
  analysisId: uuid('analysis_id')
    .notNull()
    .references(() => jobAnalyses.id, { onDelete: 'cascade' }),
  responsibility: text('responsibility').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

export type DbJobAnalysisResponsibility = typeof jobAnalysisResponsibilities.$inferSelect;
export type NewDbJobAnalysisResponsibility = typeof jobAnalysisResponsibilities.$inferInsert;

// Job Analysis Relations
export const jobAnalysesRelations = relations(jobAnalyses, ({ one, many }) => ({
  jobPosting: one(jobPostings, {
    fields: [jobAnalyses.jobPostingId],
    references: [jobPostings.id],
  }),
  user: one(users, {
    fields: [jobAnalyses.userId],
    references: [users.id],
  }),
  skills: many(jobAnalysisSkills),
  responsibilities: many(jobAnalysisResponsibilities),
}));

export const jobAnalysisSkillsRelations = relations(jobAnalysisSkills, ({ one }) => ({
  analysis: one(jobAnalyses, {
    fields: [jobAnalysisSkills.analysisId],
    references: [jobAnalyses.id],
  }),
}));

export const jobAnalysisResponsibilitiesRelations = relations(jobAnalysisResponsibilities, ({ one }) => ({
  analysis: one(jobAnalyses, {
    fields: [jobAnalysisResponsibilities.analysisId],
    references: [jobAnalyses.id],
  }),
}));

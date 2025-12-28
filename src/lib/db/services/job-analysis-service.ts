import { db } from "../index";
import { jobAnalyses, jobAnalysisSkills, jobAnalysisResponsibilities } from "../schema";
import { eq, and, asc } from "drizzle-orm";
import type { JobAnalysisResponse } from "@/types/resume";

export interface CachedJobAnalysis {
  id: string;
  jobPostingId: string;
  analysis: JobAnalysisResponse;
  createdAt: Date;
}

export const jobAnalysisService = {
  /**
   * Get cached job analysis for a job posting
   * Reconstructs the JobAnalysisResponse from normalized tables
   */
  async getCachedAnalysis(
    jobPostingId: string,
    userId: string
  ): Promise<CachedJobAnalysis | null> {
    // Get the analysis record
    const [analysisRecord] = await db
      .select()
      .from(jobAnalyses)
      .where(
        and(
          eq(jobAnalyses.jobPostingId, jobPostingId),
          eq(jobAnalyses.userId, userId)
        )
      )
      .limit(1);

    if (!analysisRecord) return null;

    // Get skills and responsibilities in parallel
    const [skills, responsibilities] = await Promise.all([
      db
        .select()
        .from(jobAnalysisSkills)
        .where(eq(jobAnalysisSkills.analysisId, analysisRecord.id)),
      db
        .select()
        .from(jobAnalysisResponsibilities)
        .where(eq(jobAnalysisResponsibilities.analysisId, analysisRecord.id))
        .orderBy(asc(jobAnalysisResponsibilities.sortOrder)),
    ]);

    // Group skills by category
    const hardSkills: string[] = [];
    const domainKnowledge: string[] = [];

    for (const skill of skills) {
      switch (skill.category) {
        case "hard":
          hardSkills.push(skill.skill);
          break;
        case "domain":
          domainKnowledge.push(skill.skill);
          break;
      }
    }

    // Reconstruct the full response
    const analysis: JobAnalysisResponse = {
      hardSkills,
      domainKnowledge,
      yearsOfExperience: analysisRecord.yearsOfExperience || "",
      jobTitle: analysisRecord.jobTitle || "",
      keyResponsibilities: responsibilities.map((r) => r.responsibility),
      companyName: analysisRecord.companyName || "",
      location: analysisRecord.location || "",
    };

    return {
      id: analysisRecord.id,
      jobPostingId: analysisRecord.jobPostingId,
      analysis,
      createdAt: analysisRecord.createdAt,
    };
  },

  /**
   * Save job analysis to the database
   * Deletes any existing analysis for this job posting first (upsert pattern)
   */
  async saveAnalysis(
    jobPostingId: string,
    userId: string,
    analysis: JobAnalysisResponse
  ): Promise<CachedJobAnalysis> {
    // Delete existing analysis (cascade will delete skills and responsibilities)
    await db
      .delete(jobAnalyses)
      .where(
        and(
          eq(jobAnalyses.jobPostingId, jobPostingId),
          eq(jobAnalyses.userId, userId)
        )
      );

    // Insert the analysis record
    const [created] = await db
      .insert(jobAnalyses)
      .values({
        jobPostingId,
        userId,
        yearsOfExperience: analysis.yearsOfExperience,
        jobTitle: analysis.jobTitle,
        companyName: analysis.companyName,
        location: analysis.location,
      })
      .returning();

    // Prepare skills for batch insert
    const skillItems = [
      ...analysis.hardSkills.map((s) => ({
        analysisId: created.id,
        skill: s,
        category: "hard" as const,
      })),
      ...analysis.domainKnowledge.map((s) => ({
        analysisId: created.id,
        skill: s,
        category: "domain" as const,
      })),
    ];

    // Batch insert skills
    if (skillItems.length > 0) {
      await db.insert(jobAnalysisSkills).values(skillItems);
    }

    // Prepare responsibilities for batch insert
    const responsibilityItems = analysis.keyResponsibilities.map((r, i) => ({
      analysisId: created.id,
      responsibility: r,
      sortOrder: i,
    }));

    // Batch insert responsibilities
    if (responsibilityItems.length > 0) {
      await db.insert(jobAnalysisResponsibilities).values(responsibilityItems);
    }

    return {
      id: created.id,
      jobPostingId: created.jobPostingId,
      analysis,
      createdAt: created.createdAt,
    };
  },

  /**
   * Check if a cached analysis exists for a job posting
   */
  async hasAnalysis(jobPostingId: string, userId: string): Promise<boolean> {
    const [result] = await db
      .select({ id: jobAnalyses.id })
      .from(jobAnalyses)
      .where(
        and(
          eq(jobAnalyses.jobPostingId, jobPostingId),
          eq(jobAnalyses.userId, userId)
        )
      )
      .limit(1);

    return !!result;
  },

  /**
   * Delete cached analysis for a job posting (cache invalidation)
   * Skills and responsibilities are automatically deleted via cascade
   */
  async deleteAnalysis(jobPostingId: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(jobAnalyses)
      .where(
        and(
          eq(jobAnalyses.jobPostingId, jobPostingId),
          eq(jobAnalyses.userId, userId)
        )
      )
      .returning({ id: jobAnalyses.id });

    return result.length > 0;
  },
};

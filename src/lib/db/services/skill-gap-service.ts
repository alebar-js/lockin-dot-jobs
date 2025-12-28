import { db } from "../index";
import { skillGapAnalyses, skillGapItems } from "../schema";
import { eq, and } from "drizzle-orm";
import type { SkillGapAnalysisResponse, SkillGapItem } from "@/types/resume";

export interface CachedSkillGapAnalysis {
  id: string;
  jobPostingId: string;
  analysis: SkillGapAnalysisResponse;
  createdAt: Date;
}

export const skillGapService = {
  /**
   * Get cached skill gap analysis for a job posting
   * Reconstructs the SkillGapAnalysisResponse from normalized tables
   */
  async getCachedAnalysis(
    jobPostingId: string,
    userId: string
  ): Promise<CachedSkillGapAnalysis | null> {
    // Get the analysis record
    const [analysisRecord] = await db
      .select()
      .from(skillGapAnalyses)
      .where(
        and(
          eq(skillGapAnalyses.jobPostingId, jobPostingId),
          eq(skillGapAnalyses.userId, userId)
        )
      )
      .limit(1);

    if (!analysisRecord) return null;

    // Get all items for this analysis
    const items = await db
      .select()
      .from(skillGapItems)
      .where(eq(skillGapItems.analysisId, analysisRecord.id));

    // Group items by status
    const matched: SkillGapItem[] = [];
    const missing: SkillGapItem[] = [];
    const partial: SkillGapItem[] = [];

    for (const item of items) {
      const skillGapItem: SkillGapItem = {
        skill: item.skill,
        category: item.category,
        status: item.status,
        evidence: item.evidence ?? undefined,
        recommendation: item.recommendation ?? undefined,
      };

      switch (item.status) {
        case "matched":
          matched.push(skillGapItem);
          break;
        case "missing":
          missing.push(skillGapItem);
          break;
        case "partial":
          partial.push(skillGapItem);
          break;
      }
    }

    // Reconstruct the full response
    const analysis: SkillGapAnalysisResponse = {
      matched,
      missing,
      partial,
      summary: {
        totalSkills: analysisRecord.totalSkills,
        matchedCount: analysisRecord.matchedCount,
        missingCount: analysisRecord.missingCount,
        partialCount: analysisRecord.partialCount,
        matchPercentage: analysisRecord.matchPercentage,
      },
    };

    return {
      id: analysisRecord.id,
      jobPostingId: analysisRecord.jobPostingId,
      analysis,
      createdAt: analysisRecord.createdAt,
    };
  },

  /**
   * Save skill gap analysis to the database
   * Deletes any existing analysis for this job posting first (upsert pattern)
   */
  async saveAnalysis(
    jobPostingId: string,
    userId: string,
    analysis: SkillGapAnalysisResponse
  ): Promise<CachedSkillGapAnalysis> {
    // Delete existing analysis (cascade will delete items)
    await db
      .delete(skillGapAnalyses)
      .where(
        and(
          eq(skillGapAnalyses.jobPostingId, jobPostingId),
          eq(skillGapAnalyses.userId, userId)
        )
      );

    // Insert the analysis record
    const [created] = await db
      .insert(skillGapAnalyses)
      .values({
        jobPostingId,
        userId,
        totalSkills: analysis.summary.totalSkills,
        matchedCount: analysis.summary.matchedCount,
        missingCount: analysis.summary.missingCount,
        partialCount: analysis.summary.partialCount,
        matchPercentage: analysis.summary.matchPercentage,
      })
      .returning();

    // Prepare all items for batch insert
    const allItems = [
      ...analysis.matched.map((item) => ({
        analysisId: created.id,
        skill: item.skill,
        category: item.category,
        status: "matched" as const,
        evidence: item.evidence ?? null,
        recommendation: item.recommendation ?? null,
      })),
      ...analysis.missing.map((item) => ({
        analysisId: created.id,
        skill: item.skill,
        category: item.category,
        status: "missing" as const,
        evidence: item.evidence ?? null,
        recommendation: item.recommendation ?? null,
      })),
      ...analysis.partial.map((item) => ({
        analysisId: created.id,
        skill: item.skill,
        category: item.category,
        status: "partial" as const,
        evidence: item.evidence ?? null,
        recommendation: item.recommendation ?? null,
      })),
    ];

    // Batch insert all items
    if (allItems.length > 0) {
      await db.insert(skillGapItems).values(allItems);
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
      .select({ id: skillGapAnalyses.id })
      .from(skillGapAnalyses)
      .where(
        and(
          eq(skillGapAnalyses.jobPostingId, jobPostingId),
          eq(skillGapAnalyses.userId, userId)
        )
      )
      .limit(1);

    return !!result;
  },

  /**
   * Delete cached analysis for a job posting (cache invalidation)
   * Items are automatically deleted via cascade
   */
  async deleteAnalysis(jobPostingId: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(skillGapAnalyses)
      .where(
        and(
          eq(skillGapAnalyses.jobPostingId, jobPostingId),
          eq(skillGapAnalyses.userId, userId)
        )
      )
      .returning({ id: skillGapAnalyses.id });

    return result.length > 0;
  },
};

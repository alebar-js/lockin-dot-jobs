import { db } from "../index";
import { jobPostings, resumes } from "../schema";
import { eq, desc, isNotNull, or, like, inArray, and } from "drizzle-orm";
import type {
  JobPostingData,
  CreateJobPostingData,
  UpdateJobPostingData,
} from "@/types/resume";
import { resumeService } from "./resume-service";
import { skillGapService } from "./skill-gap-service";
import { jobAnalysisService } from "./job-analysis-service";

export const jobPostingService = {
  async deleteJobPosting(id: string, userId: string): Promise<boolean> {
    // Must delete dependent resumes first (FK: resumes.targetJobId -> job_postings.id)
    await db
      .delete(resumes)
      .where(and(eq(resumes.targetJobId, id), eq(resumes.userId, userId)));

    const result = await db
      .delete(jobPostings)
      .where(and(eq(jobPostings.id, id), eq(jobPostings.userId, userId)))
      .returning({ id: jobPostings.id });

    return result.length > 0;
  },

  async deleteJobPostingsByFolderPath(
    folderPath: string,
    userId: string
  ): Promise<number> {
    const whereFolder = and(
      eq(jobPostings.userId, userId),
      or(eq(jobPostings.path, folderPath), like(jobPostings.path, `${folderPath}/%`))
    );

    const ids = await db
      .select({ id: jobPostings.id })
      .from(jobPostings)
      .where(whereFolder);
    const jobPostingIds = ids.map((r) => r.id);

    if (jobPostingIds.length === 0) return 0;

    await db
      .delete(resumes)
      .where(
        and(eq(resumes.userId, userId), inArray(resumes.targetJobId, jobPostingIds))
      );

    const deleted = await db
      .delete(jobPostings)
      .where(whereFolder)
      .returning({ id: jobPostings.id });

    return deleted.length;
  },

  async getJobPostingsData(userId: string): Promise<JobPostingData[]> {
    const results = await db
      .select()
      .from(jobPostings)
      .where(eq(jobPostings.userId, userId))
      .orderBy(desc(jobPostings.updatedAt));

    // Fetch resume data and check for analyses for each job posting
    const resultsWithData = await Promise.all(
      results.map(async (row) => {
        const [resumeData, hasSkillGap, hasJobAnalysisResult] = await Promise.all([
          resumeService.getResumeByJobPostingId(row.id, userId),
          skillGapService.hasAnalysis(row.id, userId),
          jobAnalysisService.hasAnalysis(row.id, userId),
        ]);
        return {
          id: row.id,
          title: row.title,
          jobDescription: row.jobDescription,
          postingUrl: row.postingUrl,
          path: row.path || null,
          data: resumeData?.data || null,
          status: row.status,
          hasSkillGapAnalysis: hasSkillGap,
          hasJobAnalysis: hasJobAnalysisResult,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        };
      })
    );

    return resultsWithData;
  },

  async getJobPostingDataById(
    id: string,
    userId: string
  ): Promise<JobPostingData | null> {
    const [jobPosting] = await db
      .select()
      .from(jobPostings)
      .where(and(eq(jobPostings.id, id), eq(jobPostings.userId, userId)))
      .limit(1);

    if (!jobPosting) return null;

    const [resumeData, hasSkillGap, hasJobAnalysisResult] = await Promise.all([
      resumeService.getResumeByJobPostingId(id, userId),
      skillGapService.hasAnalysis(id, userId),
      jobAnalysisService.hasAnalysis(id, userId),
    ]);

    return {
      id: jobPosting.id,
      title: jobPosting.title,
      jobDescription: jobPosting.jobDescription,
      postingUrl: jobPosting.postingUrl || null,
      path: jobPosting.path || null,
      data: resumeData?.data || null,
      status: jobPosting.status,
      hasSkillGapAnalysis: hasSkillGap,
      hasJobAnalysis: hasJobAnalysisResult,
      createdAt: jobPosting.createdAt,
      updatedAt: jobPosting.updatedAt,
    };
  },

  async createJobPostingData(
    data: CreateJobPostingData,
    userId: string
  ): Promise<JobPostingData> {
    const companyName = data.title ? data.title.split(" - ")[0] || data.title : null;

    const [created] = await db
      .insert(jobPostings)
      .values({
        userId,
        title: data.title,
        companyName: companyName,
        jobDescription: data.jobDescription,
        postingUrl:
          data.postingUrl && data.postingUrl.trim() !== "" ? data.postingUrl : null,
        path: data.path && data.path.trim() !== "" ? data.path : null,
        status: "IN_PROGRESS",
      })
      .returning();

    // Create linked resume only when a personalized resume is provided
    if (data.data) {
      await resumeService.createResumeForJobPosting(created.id, data.data, userId);
    }

    const result = await this.getJobPostingDataById(created.id, userId);
    if (!result) {
      throw new Error("Failed to create job posting");
    }

    return result;
  },

  async updateJobPostingData(
    id: string,
    data: UpdateJobPostingData,
    userId: string
  ): Promise<JobPostingData | null> {
    const existing = await this.getJobPostingDataById(id, userId);
    if (!existing) return null;

    // Build update fields
    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.title) {
      updateFields.title = data.title;
      updateFields.companyName = data.title.split(" - ")[0] || data.title;
    }

    if (data.jobDescription !== undefined) {
      updateFields.jobDescription = data.jobDescription;
      // Invalidate job analysis cache when job description changes
      await jobAnalysisService.deleteAnalysis(id, userId);
    }

    if (data.postingUrl !== undefined) {
      updateFields.postingUrl =
        data.postingUrl && data.postingUrl.trim() !== "" ? data.postingUrl : null;
    }

    if (data.path !== undefined) {
      updateFields.path = data.path && data.path.trim() !== "" ? data.path : null;
    }

    if (data.status) {
      updateFields.status = data.status;
    }

    await db
      .update(jobPostings)
      .set(updateFields)
      .where(and(eq(jobPostings.id, id), eq(jobPostings.userId, userId)));

    // Update linked resume if data is provided
    if (data.data) {
      await resumeService.updateResumeForJobPosting(id, data.data, userId);
      // Invalidate skill gap cache when resume is updated
      await skillGapService.deleteAnalysis(id, userId);
    }

    return this.getJobPostingDataById(id, userId);
  },

  async getAvailableFolders(userId: string): Promise<string[]> {
    const results = await db
      .select({ path: jobPostings.path })
      .from(jobPostings)
      .where(and(eq(jobPostings.userId, userId), isNotNull(jobPostings.path)));

    const folderSet = new Set<string>();

    for (const row of results) {
      if (row.path) {
        folderSet.add(row.path);

        // Also add all parent folder paths
        const segments = row.path.split("/").filter(Boolean);
        let currentPath = "";
        for (const segment of segments) {
          currentPath = currentPath ? `${currentPath}/${segment}` : `/${segment}`;
          folderSet.add(currentPath);
        }
      }
    }

    return Array.from(folderSet).sort();
  },
};


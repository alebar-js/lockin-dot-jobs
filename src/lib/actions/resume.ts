"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { resumeService, jobPostingService } from "@/lib/db/services";
import { refactorResume, parseText } from "@/lib/ai";
import type {
  ResumeProfile,
  UpdateResumeData,
  RefactorDataResponse,
  IngestResponse,
} from "@/types/resume";

// ============================================================================
// Master Resume Actions
// ============================================================================

export async function getMasterResume() {
  const userId = await requireAuth();
  return resumeService.getMasterResumeData(userId);
}

export async function updateMasterResume(data: UpdateResumeData) {
  const userId = await requireAuth();
  const result = await resumeService.upsertMasterResumeData(data, userId);
  revalidatePath("/");
  return result;
}

// ============================================================================
// Job Posting Resume Actions
// ============================================================================

export async function getResumeForJobPosting(jobPostingId: string) {
  const userId = await requireAuth();
  return resumeService.getResumeByJobPostingId(jobPostingId, userId);
}

export async function updateResumeForJobPosting(
  jobPostingId: string,
  data: ResumeProfile
) {
  const userId = await requireAuth();
  const result = await resumeService.updateResumeForJobPosting(
    jobPostingId,
    data,
    userId
  );
  revalidatePath(`/job-posting/${jobPostingId}`);
  return result;
}

// ============================================================================
// AI-Powered Actions
// ============================================================================

export async function refactorResumeForJob(
  jobDescription: string
): Promise<RefactorDataResponse> {
  const userId = await requireAuth();
  const masterResume = await resumeService.getMasterResumeData(userId);

  if (!masterResume || !masterResume.data) {
    throw new Error("No master resume found. Please create one first.");
  }

  return refactorResume(masterResume.data, { jobDescription });
}

export async function ingestResumeText(text: string): Promise<IngestResponse> {
  await requireAuth();
  return parseText(text);
}

// ============================================================================
// Job Posting Actions
// ============================================================================

export async function getJobPostings() {
  const userId = await requireAuth();
  return jobPostingService.getJobPostingsData(userId);
}

export async function getJobPosting(id: string) {
  const userId = await requireAuth();
  return jobPostingService.getJobPostingDataById(id, userId);
}

export async function createJobPosting(data: {
  title: string;
  jobDescription: string;
  postingUrl?: string;
  path?: string;
}) {
  const userId = await requireAuth();
  const result = await jobPostingService.createJobPostingData(data, userId);
  revalidatePath("/job-postings");
  return result;
}

export async function updateJobPosting(
  id: string,
  data: {
    title?: string;
    jobDescription?: string;
    postingUrl?: string;
    path?: string | null;
    data?: ResumeProfile;
    status?: "IN_PROGRESS" | "READY" | "EXPORTED" | "APPLIED" | "OFFER" | "REJECTED";
  }
) {
  const userId = await requireAuth();
  const result = await jobPostingService.updateJobPostingData(id, data, userId);
  revalidatePath(`/job-posting/${id}`);
  revalidatePath("/job-postings");
  return result;
}

export async function deleteJobPosting(id: string) {
  const userId = await requireAuth();
  const result = await jobPostingService.deleteJobPosting(id, userId);
  revalidatePath("/job-postings");
  return result;
}


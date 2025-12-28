"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  resumeApi,
  jobPostingsApi,
  refactorApi,
  skillGapApi,
  jobAnalysisApi,
  ingestApi,
} from "./api";
import type { ResumeProfile, JobPostingData, JobPostingStatus } from "@/types";

// Query Keys
export const queryKeys = {
  masterResume: ["masterResume"] as const,
  jobPostings: ["jobPostings"] as const,
  jobPosting: (id: string) => ["jobPosting", id] as const,
  skillGapAnalysis: (jobPostingId: string) =>
    ["skillGapAnalysis", jobPostingId] as const,
  jobAnalysis: (jobPostingId: string) =>
    ["jobAnalysis", jobPostingId] as const,
};

// Master Resume Queries
export function useMasterResumeData() {
  return useQuery({
    queryKey: queryKeys.masterResume,
    queryFn: resumeApi.getMaster,
  });
}

export function useUpdateMasterResumeData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { data: ResumeProfile }) =>
      resumeApi.updateMaster(params.data),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKeys.masterResume, result);
    },
  });
}

// Job Postings Queries
export function useJobPostings() {
  return useQuery({
    queryKey: queryKeys.jobPostings,
    queryFn: jobPostingsApi.list,
  });
}

export function useJobPostingData(id: string | null) {
  return useQuery({
    queryKey: queryKeys.jobPosting(id ?? ""),
    queryFn: () => jobPostingsApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateJobPosting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: jobPostingsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobPostings });
    },
  });
}

export function useUpdateJobPostingData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      id: string;
      data: Partial<{
        title: string;
        companyName: string;
        jobDescription: string;
        postingUrl: string;
        path: string;
        data: ResumeProfile;
        status: JobPostingStatus;
      }>;
    }) => jobPostingsApi.update(params.id, params.data),
    onSuccess: (result, variables) => {
      queryClient.setQueryData(queryKeys.jobPosting(result.id), result);
      queryClient.invalidateQueries({ queryKey: queryKeys.jobPostings });
      // Invalidate skill gap cache when resume data is updated
      if (variables.data.data) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.skillGapAnalysis(result.id),
        });
      }
    },
  });
}

export function useDeleteJobPosting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: jobPostingsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobPostings });
    },
  });
}

export function useDeleteJobPostingFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: jobPostingsApi.deleteFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobPostings });
    },
  });
}

// Refactor Mutation
export function useRefactorData() {
  return useMutation({
    mutationFn: (params: { jobDescription: string }) =>
      refactorApi.refactor(params.jobDescription),
  });
}

// Skill Gap Analysis Query and Mutation
export function useSkillGapAnalysis(jobPostingId: string | null) {
  return useQuery({
    queryKey: queryKeys.skillGapAnalysis(jobPostingId ?? ""),
    queryFn: () => skillGapApi.getCached(jobPostingId!),
    enabled: !!jobPostingId,
  });
}

export function useAnalyzeSkillGaps() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      jobPostingId: string;
      resume: ResumeProfile;
      jobDescription: string;
    }) =>
      skillGapApi.analyze(
        params.jobPostingId,
        params.resume,
        params.jobDescription
      ),
    onSuccess: (_result, variables) => {
      // Invalidate job posting query to refresh with new skill gap data
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobPosting(variables.jobPostingId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.skillGapAnalysis(variables.jobPostingId),
      });
    },
  });
}

// Job Analysis Query and Mutation
export function useJobAnalysis(jobPostingId: string | null) {
  return useQuery({
    queryKey: queryKeys.jobAnalysis(jobPostingId ?? ""),
    queryFn: () => jobAnalysisApi.getCached(jobPostingId!),
    enabled: !!jobPostingId,
  });
}

export function useAnalyzeJobPosting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { jobPostingId: string; jobDescription: string }) =>
      jobAnalysisApi.analyze(params.jobPostingId, params.jobDescription),
    onSuccess: (_result, variables) => {
      // Invalidate job posting query to refresh with new job analysis data
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobPosting(variables.jobPostingId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.jobAnalysis(variables.jobPostingId),
      });
    },
  });
}

// Ingest Mutations
export function useIngestFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ingestApi.ingestFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.masterResume });
    },
  });
}

export function useIngestText() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ingestApi.ingestText,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.masterResume });
    },
  });
}


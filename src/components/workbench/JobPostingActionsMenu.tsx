"use client";

import { Loader2, Sparkles, TrendingUp, CheckCircle2, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import {
  useRefactorData,
  useAnalyzeSkillGaps,
  useMasterResumeData,
  useJobPostingData,
  useSkillGapAnalysis,
} from "@/lib/queries";

/**
 * JobPostingActionsMenu - Action menu for job posting workspace
 */
export function JobPostingActionsMenu() {
  const activeJobPostingId = useAppStore((state) => state.activeJobPostingId);
  const startDiffReviewData = useAppStore((state) => state.startDiffReviewData);
  const setJobPostingView = useAppStore((state) => state.setJobPostingView);
  const setJobDescription = useAppStore((state) => state.setJobDescription);
  const setSkillGapData = useAppStore((state) => state.setSkillGapData);
  const { data: jobPostingData } = useJobPostingData(activeJobPostingId ?? "");
  const { data: masterResumeData } = useMasterResumeData();
  const { data: cachedSkillGap, refetch: fetchSkillGap } = useSkillGapAnalysis(activeJobPostingId);
  const refactorMutation = useRefactorData();
  const skillGapMutation = useAnalyzeSkillGaps();

  const handleAdaptResume = async () => {
    // If resume already exists, just navigate to it
    if (jobPostingData?.data) {
      setJobPostingView("resume");
      return;
    }

    if (!jobPostingData?.jobDescription?.trim()) {
      return;
    }

    try {
      setJobDescription(jobPostingData.jobDescription);
      const result = await refactorMutation.mutateAsync({
        jobDescription: jobPostingData.jobDescription,
      });
      startDiffReviewData(result.original, result.refactored);
      setJobPostingView("resume");
    } catch (error) {
      console.error("Adapt failed:", error);
    }
  };

  const hasExistingResume = !!jobPostingData?.data;
  const hasCachedSkillGaps = !!jobPostingData?.hasSkillGapAnalysis;

  const getSkillGapButtonText = () => {
    if (skillGapMutation.isPending) return "Analyzing...";
    if (hasCachedSkillGaps) return "View Skill Gaps";
    return "Analyze Skill Gaps";
  };

  const handleAnalyzeSkillGaps = async () => {
    if (!jobPostingData?.jobDescription?.trim() || !activeJobPostingId) {
      return;
    }

    setJobDescription(jobPostingData.jobDescription);

    // Fetch cached analysis if available
    if (hasCachedSkillGaps) {
      // If we already have the data in cache, use it directly
      if (cachedSkillGap?.cached && cachedSkillGap.analysis) {
        setSkillGapData(cachedSkillGap.analysis);
        setJobPostingView("skillGaps");
        return;
      }
      // Otherwise fetch it
      const { data } = await fetchSkillGap();
      if (data?.cached && data.analysis) {
        setSkillGapData(data.analysis);
        setJobPostingView("skillGaps");
        return;
      }
    }

    // No cache - run the analysis
    const resumeToAnalyze = jobPostingData?.data || masterResumeData?.data;
    if (!resumeToAnalyze) {
      return;
    }

    try {
      const result = await skillGapMutation.mutateAsync({
        jobPostingId: activeJobPostingId,
        jobDescription: jobPostingData.jobDescription,
        resume: resumeToAnalyze,
      });
      setSkillGapData(result);
      setJobPostingView("skillGaps");
    } catch (error) {
      console.error("Skill gap analysis failed:", error);
    }
  };

  const handleExportResume = () => {
    if (hasExistingResume || masterResumeData?.data) {
      setJobPostingView("export");
    }
  };

  const handleMarkAsApplied = () => {
    console.log("Mark as Applied - Coming soon");
  };

  return (
    <div className="h-full flex items-center justify-center p-8 bg-panel-elevated">
      <div className="flex flex-col gap-4 w-full max-w-md">
        <div className="text-center mb-4">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Job Posting Actions
          </h2>
          <p className="text-sm text-muted-foreground">
            Choose an action to work with this job posting
          </p>
        </div>

        <Button
          onClick={handleAdaptResume}
          disabled={
            hasExistingResume
              ? false
              : !jobPostingData?.jobDescription?.trim() || refactorMutation.isPending
          }
          size="lg"
          className="w-full justify-start gap-3 h-12"
        >
          {refactorMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Adapting...
            </>
          ) : (
            <>
              {hasExistingResume ? (
                <>
                  <FileText className="w-5 h-5" />
                  View Personalized Resume
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Adapt Your Resume
                </>
              )}
            </>
          )}
        </Button>

        <Button
          onClick={handleAnalyzeSkillGaps}
          disabled={
            !jobPostingData?.jobDescription?.trim() ||
            (!jobPostingData?.data && !masterResumeData?.data) ||
            skillGapMutation.isPending
          }
          variant="outline"
          size="lg"
          className="w-full justify-start gap-3 h-12"
        >
          {skillGapMutation.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <TrendingUp className="w-5 h-5" />
          )}
          {getSkillGapButtonText()}
        </Button>

        <Button
          onClick={handleExportResume}
          variant="outline"
          size="lg"
          className="w-full justify-start gap-3 h-12"
          disabled={!hasExistingResume}
        >
          <Download className="w-5 h-5" />
          Export Resume
        </Button>

        <Button
          onClick={handleMarkAsApplied}
          variant="outline"
          size="lg"
          className="w-full justify-start gap-3 h-12"
          disabled
        >
          <CheckCircle2 className="w-5 h-5" />
          Mark as Applied
          <span className="ml-auto text-xs text-muted-foreground">Coming soon</span>
        </Button>

        {(refactorMutation.isError || skillGapMutation.isError) && (
          <div className="mt-4 p-3 rounded-md bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive font-medium mb-1">
              {refactorMutation.isError
                ? "Failed to adapt resume"
                : "Failed to analyze skill gaps"}
            </p>
            <p className="text-xs text-destructive/80">
              {(refactorMutation.error || skillGapMutation.error) instanceof Error
                ? (refactorMutation.error || skillGapMutation.error)?.message
                : "An unexpected error occurred. Please try again."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


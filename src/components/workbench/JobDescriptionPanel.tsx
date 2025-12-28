"use client";

import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore } from "@/lib/store";
import {
  useJobPostingData,
  useUpdateJobPostingData,
  useJobAnalysis,
  useAnalyzeJobPosting,
} from "@/lib/queries";
import { Loader2, ExternalLink, Save, Sparkles, Briefcase } from "lucide-react";
import { JobAnalysisSummary } from "./JobAnalysisSummary";
import { getCareerIcon } from "@/lib/career-icons";

/**
 * JobDescriptionPanel - Left pane for displaying and editing job description
 * Features tabs for Summary (analyzed) and Raw (editable) views
 */
export function JobDescriptionPanel() {
  const activeJobPostingId = useAppStore((state) => state.activeJobPostingId);
  const { data: jobPostingData, isLoading } =
    useJobPostingData(activeJobPostingId);
  const updateJobPostingMutation = useUpdateJobPostingData();
  const analyzeJobPostingMutation = useAnalyzeJobPosting();
  const { data: jobAnalysisData, isLoading: isAnalysisLoading } =
    useJobAnalysis(activeJobPostingId);

  const [localJobDescription, setLocalJobDescription] = useState("");
  const [localPostingUrl, setLocalPostingUrl] = useState("");
  const [activeTab, setActiveTab] = useState<"summary" | "raw">("summary");
  const previousJobPostingIdRef = useRef<string | null>(null);

  // Determine if there are unsaved changes
  const hasUnsavedChanges =
    localJobDescription !== (jobPostingData?.jobDescription ?? "") ||
    localPostingUrl !== (jobPostingData?.postingUrl ?? "");

  // Initialize local state from fetched data
  useEffect(() => {
    if (previousJobPostingIdRef.current !== activeJobPostingId) {
      previousJobPostingIdRef.current = activeJobPostingId;
    }

    if (jobPostingData) {
      setLocalJobDescription(jobPostingData.jobDescription ?? "");
      setLocalPostingUrl(jobPostingData.postingUrl ?? "");

      // Default to summary tab if analysis exists, otherwise raw
      if (jobPostingData.hasJobAnalysis && jobAnalysisData?.analysis) {
        setActiveTab("summary");
      } else if (!jobPostingData.jobDescription) {
        setActiveTab("raw");
      }
    }
  }, [
    jobPostingData?.id,
    jobPostingData?.jobDescription,
    jobPostingData?.postingUrl,
    jobPostingData?.hasJobAnalysis,
    activeJobPostingId,
    jobAnalysisData?.analysis,
  ]);

  const handleSave = async () => {
    if (!activeJobPostingId) return;

    // Save the job posting
    await updateJobPostingMutation.mutateAsync({
      id: activeJobPostingId,
      data: {
        jobDescription: localJobDescription,
        postingUrl: localPostingUrl.trim() || undefined,
      },
    });

    // Trigger analysis if job description is present
    if (localJobDescription.trim()) {
      await analyzeJobPostingMutation.mutateAsync({
        jobPostingId: activeJobPostingId,
        jobDescription: localJobDescription,
      });
      setActiveTab("summary");
    }
  };

  const isSaving =
    updateJobPostingMutation.isPending || analyzeJobPostingMutation.isPending;

  if (!activeJobPostingId) {
    return (
      <div className="h-full flex flex-col bg-card border-r border-border">
        <div className="flex-shrink-0 p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            Job Description
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-muted-foreground">No job posting selected</p>
        </div>
      </div>
    );
  }

  if (isLoading || !jobPostingData) {
    return (
      <div className="h-full flex flex-col bg-card border-r border-border">
        <div className="flex-shrink-0 p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            Job Description
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const hasAnalysis = jobAnalysisData?.cached && jobAnalysisData?.analysis;

  return (
    <div className="h-full flex flex-col bg-card border-r border-border">
      {/* Header with Tabs */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {(() => {
              const CareerIcon = jobAnalysisData?.analysis?.jobTitle 
                ? getCareerIcon(jobAnalysisData.analysis.jobTitle) 
                : Briefcase;
              return (
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CareerIcon className="w-4 h-4 text-primary" />
                </div>
              );
            })()}
            <h2 className="text-base font-semibold text-foreground truncate">
              {jobAnalysisData?.analysis?.jobTitle || jobPostingData.title || "Job Posting"}
            </h2>
          </div>
          {jobPostingData.postingUrl && (
            <a
              href={jobPostingData.postingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 flex-shrink-0"
              title="Open job posting"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "summary" | "raw")}
        >
          <TabsList className="w-full">
            <TabsTrigger value="summary" className="flex-1">
              Summary
            </TabsTrigger>
            <TabsTrigger value="raw" className="flex-1">
              Raw
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {activeTab === "summary" ? (
          <div className="flex-1 flex flex-col min-h-0">
            {isAnalysisLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : hasAnalysis ? (
              <JobAnalysisSummary analysis={jobAnalysisData.analysis!} />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
                <Sparkles className="w-10 h-10 text-muted-foreground/50" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    No analysis yet
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {jobPostingData.jobDescription
                      ? "Switch to Raw tab and save to analyze"
                      : "Add a job description in the Raw tab"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("raw")}
                >
                  Edit Job Description
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 p-4 gap-3">
            {/* URL Input */}
            <div className="flex-shrink-0">
              <label
                htmlFor="postingUrl"
                className="text-xs font-medium text-foreground mb-1 block"
              >
                Job Posting URL
              </label>
              <Input
                id="postingUrl"
                type="url"
                value={localPostingUrl}
                onChange={(e) => setLocalPostingUrl(e.target.value)}
                placeholder="https://example.com/job-posting"
                className="text-sm"
              />
            </div>

            {/* Job Description Textarea */}
            <div className="flex-1 flex flex-col min-h-0">
              <label
                htmlFor="jobDescription"
                className="text-xs font-medium text-foreground mb-1 block"
              >
                Job Description
              </label>
              <Textarea
                id="jobDescription"
                value={localJobDescription}
                onChange={(e) => setLocalJobDescription(e.target.value)}
                placeholder="Paste or type the job description here..."
                className="w-full resize-none font-mono text-sm flex-1 min-h-0"
              />
            </div>

            {/* Save Button */}
            <div className="flex-shrink-0 flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                {hasUnsavedChanges && "Unsaved changes"}
              </div>
              <Button
                onClick={handleSave}
                disabled={!hasUnsavedChanges || isSaving}
                size="sm"
                className="gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>

            {/* Error Message */}
            {(updateJobPostingMutation.isError ||
              analyzeJobPostingMutation.isError) && (
              <div className="flex-shrink-0 p-2 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-xs text-destructive">
                  {updateJobPostingMutation.error instanceof Error
                    ? updateJobPostingMutation.error.message
                    : analyzeJobPostingMutation.error instanceof Error
                      ? analyzeJobPostingMutation.error.message
                      : "Failed to save"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

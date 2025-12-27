"use client";

import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import { useJobPostingData, useUpdateJobPostingData } from "@/lib/queries";
import { useDebouncedValue } from "@/lib/hooks";
import { Loader2, ExternalLink } from "lucide-react";

/**
 * JobDescriptionPanel - Left pane for displaying and editing job description
 */
export function JobDescriptionPanel() {
  const activeJobPostingId = useAppStore((state) => state.activeJobPostingId);
  const { data: jobPostingData, isLoading } = useJobPostingData(activeJobPostingId);
  const updateJobPostingMutation = useUpdateJobPostingData();

  const [localJobDescription, setLocalJobDescription] = useState(
    jobPostingData?.jobDescription ?? ""
  );
  const [localPostingUrl, setLocalPostingUrl] = useState(
    jobPostingData?.postingUrl ?? ""
  );
  const [isJobDescriptionDirty, setIsJobDescriptionDirty] = useState(false);
  const [isPostingUrlDirty, setIsPostingUrlDirty] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const debouncedJobDescription = useDebouncedValue(localJobDescription, 2000);
  const debouncedPostingUrl = useDebouncedValue(localPostingUrl, 2000);
  const previousJobPostingIdRef = useRef<string | null>(null);
  const lastSubmittedJobDescriptionRef = useRef<string | null>(null);
  const lastSubmittedPostingUrlRef = useRef<string | null>(null);

  // Initialize local state from fetched data
  useEffect(() => {
    if (previousJobPostingIdRef.current !== activeJobPostingId) {
      previousJobPostingIdRef.current = activeJobPostingId;
      lastSubmittedJobDescriptionRef.current = null;
      lastSubmittedPostingUrlRef.current = null;
      setIsJobDescriptionDirty(false);
      setIsPostingUrlDirty(false);
      setIsInitialized(false);
    }

    if (jobPostingData?.jobDescription !== undefined && !isInitialized) {
      setLocalJobDescription(jobPostingData.jobDescription);
      setLocalPostingUrl(jobPostingData.postingUrl ?? "");
      setIsInitialized(true);
    }
  }, [jobPostingData?.jobDescription, jobPostingData?.postingUrl, activeJobPostingId, isInitialized]);

  // Auto-save job description
  useEffect(() => {
    if (
      !activeJobPostingId ||
      isLoading ||
      !isInitialized ||
      !jobPostingData ||
      !isJobDescriptionDirty
    ) {
      return;
    }

    const currentValue = jobPostingData.jobDescription ?? "";
    const newValue = debouncedJobDescription;

    if (currentValue === newValue) return;
    if (lastSubmittedJobDescriptionRef.current === newValue) return;
    if (!newValue && !currentValue) return;

    lastSubmittedJobDescriptionRef.current = newValue;
    updateJobPostingMutation.mutate({
      id: activeJobPostingId,
      data: { jobDescription: newValue },
    });
  }, [debouncedJobDescription, activeJobPostingId, isLoading, jobPostingData, updateJobPostingMutation, isInitialized, isJobDescriptionDirty]);

  // Auto-save posting URL
  useEffect(() => {
    if (
      !activeJobPostingId ||
      isLoading ||
      !isInitialized ||
      !jobPostingData ||
      !isPostingUrlDirty
    ) {
      return;
    }

    const currentValue = jobPostingData.postingUrl ?? "";
    const newValue = debouncedPostingUrl.trim();

    if (currentValue === newValue) return;
    if (lastSubmittedPostingUrlRef.current === newValue) return;
    if (!newValue && !currentValue) return;

    lastSubmittedPostingUrlRef.current = newValue;
    updateJobPostingMutation.mutate({
      id: activeJobPostingId,
      data: { postingUrl: newValue || undefined },
    });
  }, [debouncedPostingUrl, activeJobPostingId, isLoading, jobPostingData, updateJobPostingMutation, isInitialized, isPostingUrlDirty]);

  if (!activeJobPostingId) {
    return (
      <div className="h-full flex flex-col bg-card border-r border-border">
        <div className="flex-shrink-0 p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Job Description</h2>
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
          <h2 className="text-lg font-semibold text-foreground">Job Description</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card border-r border-border">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Job Description</h2>
      </div>

      {/* URL Input and Textarea */}
      <div className="flex-1 flex flex-col min-h-0 p-4 overflow-hidden gap-3">
        <div className="flex-shrink-0">
          <label
            htmlFor="postingUrl"
            className="text-xs font-medium text-foreground mb-1 block"
          >
            Job Posting URL
          </label>
          <div className="flex items-center gap-2">
            <Input
              id="postingUrl"
              type="url"
              value={localPostingUrl}
              onChange={(e) => {
                setLocalPostingUrl(e.target.value);
                setIsPostingUrlDirty(true);
              }}
              placeholder="https://example.com/job-posting"
              className="flex-1 text-sm"
            />
            {localPostingUrl && (
              <a
                href={localPostingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 flex-shrink-0"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
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
            onChange={(e) => {
              setLocalJobDescription(e.target.value);
              setIsJobDescriptionDirty(true);
            }}
            placeholder="Paste or type the job description here..."
            className="w-full resize-none font-mono text-sm flex-1 min-h-0"
          />
        </div>
        {updateJobPostingMutation.isError && (
          <div className="mt-2 p-2 rounded-md bg-destructive/10 border border-destructive/20 flex-shrink-0">
            <p className="text-xs text-destructive">
              {updateJobPostingMutation.error instanceof Error
                ? updateJobPostingMutation.error.message
                : "Failed to save job description"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


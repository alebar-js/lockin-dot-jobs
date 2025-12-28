"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, ArrowLeft, FileText, TrendingUp, Download } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useJobPostingData, useUpdateJobPostingData } from "@/lib/queries";
import { ResizablePane } from "@/components/ui/resizable";
import { JobDescriptionPanel } from "@/components/workbench/JobDescriptionPanel";
import { JobPostingActionsMenu } from "@/components/workbench/JobPostingActionsMenu";
import { SkillGapAnalysis } from "@/components/workbench/SkillGapAnalysis";
import { ExportResume } from "@/components/workbench/ExportResume";
import { ModularResumeEditor } from "@/components/workbench/ModularResumeEditor";
import { DiffEditor } from "@/components/workbench/DiffEditor";
import { FloatingActionBar } from "@/components/workbench/FloatingActionBar";
import { JobPostingNotFoundState } from "./JobPostingNotFoundState";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import type { ResumeProfile } from "@/types/resume";

interface JobPostingWorkspaceProps {
  jobPostingId: string;
}

export function JobPostingWorkspace({ jobPostingId }: JobPostingWorkspaceProps) {
  const setActiveJobPostingId = useAppStore((state) => state.setActiveJobPostingId);
  const setViewMode = useAppStore((state) => state.setViewMode);
  const setJobPostingView = useAppStore((state) => state.setJobPostingView);
  const jobPostingView = useAppStore((state) => state.jobPostingView);

  const { data, isLoading, isError, error } = useJobPostingData(jobPostingId);

  // Sync store state when job posting loads
  useEffect(() => {
    if (data?.id) {
      setActiveJobPostingId(data.id);
      setViewMode("jobPosting");
      // Default to actions menu
      if (!jobPostingView) {
        setJobPostingView("actions");
      }
    }
  }, [data?.id, setActiveJobPostingId, setViewMode, setJobPostingView, jobPostingView]);

  // Reset state when navigating away
  useEffect(() => {
    return () => {
      setActiveJobPostingId(null);
      setViewMode("master");
      setJobPostingView(null);
    };
  }, [setActiveJobPostingId, setViewMode, setJobPostingView]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError && error instanceof ApiError && error.status === 404) {
    return <JobPostingNotFoundState />;
  }

  if (isError) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive font-medium">Failed to load job posting</p>
          <p className="text-sm text-muted-foreground mt-1">
            {error instanceof Error ? error.message : "An error occurred"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <ResizablePane
      left={<JobDescriptionPanel />}
      right={<RightPanel />}
      defaultWidth={40}
      minWidth={25}
      maxWidth={60}
      storageKey="jd-panel-width"
      collapsible={true}
      defaultCollapsed={false}
      className="h-full"
    />
  );
}

function ResumeEditorView({ jobPostingData }: { jobPostingData?: { id: string; data: ResumeProfile | null } | null }) {
  const [data, setData] = useState<ResumeProfile | null>(jobPostingData?.data || null);
  const [isPending, startTransition] = useTransition();
  const activeJobPostingId = useAppStore((state) => state.activeJobPostingId);
  const updateJobPostingMutation = useUpdateJobPostingData();

  useEffect(() => {
    if (jobPostingData?.data) {
      setData(jobPostingData.data);
    }
  }, [jobPostingData?.data]);

  const handleSave = (newData: ResumeProfile) => {
    if (!activeJobPostingId) return;
    
    startTransition(async () => {
      try {
        await updateJobPostingMutation.mutateAsync({
          id: activeJobPostingId,
          data: {
            data: newData,
          },
        });
        setData(newData);
      } catch (error) {
        console.error("Failed to save resume:", error);
      }
    });
  };

  const handleCancel = () => {
    setData(jobPostingData?.data || null);
  };

  if (!data) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-muted-foreground">
            No resume data available. Use &quot;Adapt Your Resume&quot; to create one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ModularResumeEditor
      data={data}
      onSave={handleSave}
      onCancel={handleCancel}
      isSaving={isPending || updateJobPostingMutation.isPending}
      hideBasicsAndEducation={true}
    />
  );
}

interface ViewHeaderProps {
  title: string;
  icon: React.ReactNode;
  onBack: () => void;
}

function ViewHeader({ title, icon, onBack }: ViewHeaderProps) {
  return (
    <div className="flex-shrink-0 p-3 border-b border-border bg-card/50 flex items-center gap-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        {icon}
        {title}
      </div>
    </div>
  );
}

function RightPanel() {
  const jobPostingView = useAppStore((state) => state.jobPostingView);
  const setJobPostingView = useAppStore((state) => state.setJobPostingView);
  const activeJobPostingId = useAppStore((state) => state.activeJobPostingId);
  const skillGapData = useAppStore((state) => state.skillGapData);
  const diffData = useAppStore((state) => state.diffData);
  const { data: jobPostingData } = useJobPostingData(activeJobPostingId ?? "");

  const handleBackToActions = () => {
    setJobPostingView("actions");
  };

  // Show diff editor when reviewing changes
  if (diffData.isReviewing) {
    return (
      <div className="h-full flex flex-col bg-panel-elevated">
        <DiffEditor />
        <FloatingActionBar />
      </div>
    );
  }

  // Show skill gaps view
  if (jobPostingView === "skillGaps" && skillGapData) {
    return (
      <div className="h-full flex flex-col bg-panel-elevated">
        <ViewHeader
          title="Skill Gap Analysis"
          icon={<TrendingUp className="w-4 h-4" />}
          onBack={handleBackToActions}
        />
        <div className="flex-1 overflow-hidden">
          <SkillGapAnalysis data={skillGapData} />
        </div>
      </div>
    );
  }

  // Show export view
  if (jobPostingView === "export") {
    return (
      <div className="h-full flex flex-col bg-panel-elevated">
        <ViewHeader
          title="Export Resume"
          icon={<Download className="w-4 h-4" />}
          onBack={handleBackToActions}
        />
        <div className="flex-1 overflow-hidden">
          <ExportResume />
        </div>
      </div>
    );
  }

  // Show resume editor if resume exists
  if (jobPostingView === "resume") {
    return (
      <div className="h-full flex flex-col bg-panel-elevated">
        <ViewHeader
          title="Tailored Resume"
          icon={<FileText className="w-4 h-4" />}
          onBack={handleBackToActions}
        />
        <div className="flex-1 overflow-hidden">
          <ResumeEditorView jobPostingData={jobPostingData} />
        </div>
      </div>
    );
  }

  // Default: show actions menu
  return <JobPostingActionsMenu />;
}



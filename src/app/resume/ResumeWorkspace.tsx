"use client";

import { useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { ModularResumeEditor } from "@/components/workbench";
import { IngestDialog } from "@/components/ingestion";
import { updateMasterResume } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import type { ResumeData, ResumeProfile } from "@/types/resume";

interface ResumeWorkspaceProps {
  initialData: ResumeData | null;
}

const emptyResume: ResumeProfile = {
  id: crypto.randomUUID(),
  basics: {
    name: "",
    label: "",
    email: "",
    phone: "",
  },
  work: [],
  education: [],
  skills: [],
  projects: [],
};

export function ResumeWorkspace({ initialData }: ResumeWorkspaceProps) {
  const [data, setData] = useState<ResumeProfile>(initialData?.data || emptyResume);
  const [isPending, startTransition] = useTransition();
  const [isIngestDialogOpen, setIsIngestDialogOpen] = useState(false);

  const handleSave = (newData: ResumeProfile) => {
    startTransition(async () => {
      try {
        const result = await updateMasterResume({ data: newData });
        if (result?.data) {
          setData(result.data);
        }
      } catch (error) {
        console.error("Failed to save resume:", error);
      }
    });
  };

  const handleCancel = () => {
    setData(initialData?.data || emptyResume);
  };

  const handleIngestSuccess = (profile: ResumeProfile) => {
    setData(profile);
  };

  return (
    <>
      <div className="h-full flex flex-col bg-background overflow-hidden">
        {/* Upload Option Banner */}
        <div className="flex-shrink-0 p-3 border-b border-border bg-card/50 flex items-center justify-between gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground mb-1">
              Upload or Update Resume
            </p>
            <p className="text-xs text-muted-foreground">
              Upload a PDF or DOCX file to automatically parse and populate your resume fields
            </p>
          </div>
          <Button
            onClick={() => setIsIngestDialogOpen(true)}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload Resume
          </Button>
        </div>

        {/* Resume Editor - Takes full remaining height */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <ModularResumeEditor
            data={data}
            onSave={handleSave}
            onCancel={handleCancel}
            isSaving={isPending}
          />
        </div>
      </div>

      <IngestDialog
        open={isIngestDialogOpen}
        onOpenChange={setIsIngestDialogOpen}
        onSuccess={handleIngestSuccess}
      />
    </>
  );
}

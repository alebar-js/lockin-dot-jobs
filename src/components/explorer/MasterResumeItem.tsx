"use client";

import { useState } from "react";
import { FileText, Upload } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useMasterResumeData } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { IngestDialog } from "@/components/ingestion/IngestDialog";

export function MasterResumeItem() {
  const router = useRouter();
  const pathname = usePathname();
  const [isIngestDialogOpen, setIsIngestDialogOpen] = useState(false);
  const { data: masterResume } = useMasterResumeData();

  const isActive = pathname === "/resume";
  const hasResume = !!masterResume?.data;

  const handleClick = () => {
    router.push("/resume");
  };

  const handleUploadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsIngestDialogOpen(true);
  };

  return (
    <>
      <div className="space-y-2">
        {hasResume ? (
          <button
            onClick={handleClick}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-md text-foreground transition-colors text-left",
              isActive
                ? "bg-primary/20 border border-primary/30"
                : "hover:bg-accent/30"
            )}
          >
            <FileText
              className={cn(
                "w-4 h-4",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            />
            <span className="text-sm font-medium truncate">Main Resume</span>
          </button>
        ) : (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground px-3">
              No resume yet. Upload one to get started.
            </div>
            <Button
              onClick={handleUploadClick}
              className="w-full gap-2"
              variant="outline"
            >
              <Upload className="w-4 h-4" />
              Upload Resume
            </Button>
          </div>
        )}
      </div>

      <IngestDialog
        open={isIngestDialogOpen}
        onOpenChange={setIsIngestDialogOpen}
      />
    </>
  );
}


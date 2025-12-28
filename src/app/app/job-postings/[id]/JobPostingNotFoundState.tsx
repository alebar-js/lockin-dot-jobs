"use client";

import { useRouter } from "next/navigation";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export function JobPostingNotFoundState() {
  const router = useRouter();

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <FileQuestion className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Job Posting Not Found
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          The job posting you&apos;re looking for doesn&apos;t exist or has been deleted.
        </p>
        <Button onClick={() => router.push("/app/resume")}>
          Go to Main Resume
        </Button>
      </div>
    </div>
  );
}


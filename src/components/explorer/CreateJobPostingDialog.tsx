"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateJobPosting } from "@/lib/queries";
import { useAppStore } from "@/lib/store";

interface CreateJobPostingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateJobPostingDialog({
  open,
  onOpenChange,
}: CreateJobPostingDialogProps) {
  const router = useRouter();
  const setActiveJobPostingId = useAppStore((state) => state.setActiveJobPostingId);
  const createMutation = useCreateJobPosting();

  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [postingUrl, setPostingUrl] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !jobDescription.trim()) return;

    try {
      const result = await createMutation.mutateAsync({
        title: title.trim(),
        companyName: companyName.trim() || undefined,
        postingUrl: postingUrl.trim() || undefined,
        jobDescription: jobDescription.trim(),
      });

      // Reset form
      setTitle("");
      setCompanyName("");
      setPostingUrl("");
      setJobDescription("");

      // Close dialog
      onOpenChange(false);

      // Navigate to new job posting
      setActiveJobPostingId(result.id);
      router.push(`/app/job-postings/${result.id}`);
    } catch (error) {
      console.error("Failed to create job posting:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Job Posting</DialogTitle>
          <DialogDescription>
            Add a new job posting to track and tailor your resume.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Title <span className="text-destructive">*</span>
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Senior Software Engineer at Google"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="company" className="text-sm font-medium">
              Company Name
            </label>
            <Input
              id="company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g., Google"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="url" className="text-sm font-medium">
              Job Posting URL
            </label>
            <Input
              id="url"
              type="url"
              value={postingUrl}
              onChange={(e) => setPostingUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Job Description <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="description"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here..."
              className="min-h-[150px]"
              required
            />
          </div>

          {createMutation.isError && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">
                {createMutation.error instanceof Error
                  ? createMutation.error.message
                  : "Failed to create job posting"}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !title.trim() || !jobDescription.trim() || createMutation.isPending
              }
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


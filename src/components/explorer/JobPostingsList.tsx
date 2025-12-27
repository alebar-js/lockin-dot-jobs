"use client";

import { FolderKanban, Loader2, Plus } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/lib/store";
import { useJobPostings } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { JobPostingData } from "@/types";

interface JobPostingsListProps {
  onCreateClick?: () => void;
}

export function JobPostingsList({ onCreateClick }: JobPostingsListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: jobPostings, isLoading, error } = useJobPostings();
  const searchQuery = useAppStore((state) => state.searchQuery);
  const setActiveJobPostingId = useAppStore((state) => state.setActiveJobPostingId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-3 py-2">
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive font-medium mb-1">
            Failed to load job postings
          </p>
          <p className="text-xs text-destructive/80">
            {error instanceof Error ? error.message : "An unexpected error occurred"}
          </p>
        </div>
      </div>
    );
  }

  if (!jobPostings || jobPostings.length === 0) {
    return (
      <div className="px-3 py-2">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <FolderKanban className="w-8 h-8 text-muted-foreground mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground mb-1">
            {searchQuery ? "No matching job postings" : "No job postings yet"}
          </p>
          {!searchQuery && onCreateClick && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCreateClick}
              className="mt-3 gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Job Posting
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Filter by search query
  const filteredPostings = jobPostings.filter((posting: JobPostingData) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      posting.title.toLowerCase().includes(query) ||
      posting.companyName?.toLowerCase().includes(query) ||
      posting.jobDescription?.toLowerCase().includes(query)
    );
  });

  const handlePostingClick = (posting: JobPostingData) => {
    setActiveJobPostingId(posting.id);
    router.push(`/job-postings/${posting.id}`);
  };

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-1">
        {filteredPostings.map((posting: JobPostingData) => {
          const isActive = pathname === `/job-postings/${posting.id}`;
          return (
            <button
              key={posting.id}
              onClick={() => handlePostingClick(posting)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-md text-foreground transition-colors text-left",
                isActive
                  ? "bg-primary/20 border border-primary/30"
                  : "hover:bg-accent/30"
              )}
            >
              <FolderKanban
                className={cn(
                  "w-4 h-4 flex-shrink-0",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span className="text-sm font-medium truncate">{posting.title}</span>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}


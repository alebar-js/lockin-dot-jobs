"use client";

import { useState } from "react";
import { FileText, FolderKanban, Plus, LogOut } from "lucide-react";
import { SearchBar } from "./SearchBar";
import { MasterResumeItem } from "./MasterResumeItem";
import { JobPostingsList } from "./JobPostingsList";
import { CreateJobPostingDialog } from "./CreateJobPostingDialog";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { signOut } from "next-auth/react";

export function Explorer() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Logo / Brand */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">ResumAI</span>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-border">
          <SearchBar />
        </div>

        {/* Main Resume - Pinned */}
        <div className="p-3 border-b border-border">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Main Resume
          </div>
          <MasterResumeItem />
        </div>

        {/* Job Postings List */}
        <div className="flex-1 overflow-hidden flex flex-col p-3">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <FolderKanban className="w-3 h-3" />
              Job Postings
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsCreateDialogOpen(true)}
                title="Add new job posting"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <JobPostingsList onCreateClick={() => setIsCreateDialogOpen(true)} />
        </div>

        {/* Theme Switcher & Logout */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex-1 justify-start gap-2 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Logout</span>
            </Button>
            <ThemeSwitcher />
          </div>
        </div>
      </div>

      <CreateJobPostingDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </>
  );
}


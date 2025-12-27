"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, Loader2, X, ClipboardPaste } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useIngestFile, useIngestText, useUpdateMasterResumeData } from "@/lib/queries";
import type { ResumeProfile } from "@/types/resume";

interface IngestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (profile: ResumeProfile) => void;
}

export function IngestDialog({ open, onOpenChange, onSuccess }: IngestDialogProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState("");

  const ingestFileMutation = useIngestFile();
  const ingestTextMutation = useIngestText();
  const updateMasterMutation = useUpdateMasterResumeData();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (isValidFileType(file)) {
        setSelectedFile(file);
        setShowTextInput(false);
        setTextInput("");
      }
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setShowTextInput(false);
      setTextInput("");
    }
  }, []);

  const isValidFileType = (file: File) => {
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    return validTypes.includes(file.type);
  };

  const handleUploadFile = async () => {
    if (!selectedFile) return;

    try {
      const result = await ingestFileMutation.mutateAsync(selectedFile);
      // Update master resume with ingested profile
      await updateMasterMutation.mutateAsync({ data: result.profile });
      // Notify parent of success with the new profile
      onSuccess?.(result.profile);
      // Reset and close
      resetState();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to ingest file:", error);
    }
  };

  const handleParseText = async () => {
    if (!textInput.trim()) return;

    try {
      const result = await ingestTextMutation.mutateAsync(textInput.trim());
      // Update master resume with ingested profile
      await updateMasterMutation.mutateAsync({ data: result.profile });
      // Notify parent of success with the new profile
      onSuccess?.(result.profile);
      // Reset and close
      resetState();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to ingest text:", error);
    }
  };

  const resetState = () => {
    setSelectedFile(null);
    setShowTextInput(false);
    setTextInput("");
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const isPending =
    ingestFileMutation.isPending ||
    ingestTextMutation.isPending ||
    updateMasterMutation.isPending;

  const error =
    ingestFileMutation.error ||
    ingestTextMutation.error ||
    updateMasterMutation.error;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Resume</DialogTitle>
          <DialogDescription>
            Upload a PDF or DOCX file, or paste raw text to automatically parse
            and populate your resume fields.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!showTextInput ? (
            <>
              {/* Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`
                  relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
                  ${dragActive ? "border-primary bg-primary/5" : "border-border"}
                  ${selectedFile ? "border-green-500 bg-green-500/5" : ""}
                `}
              >
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isPending}
                />

                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-8 h-8 text-green-500" />
                    <div className="text-left">
                      <p className="font-medium text-foreground">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      disabled={isPending}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                    <p className="text-foreground font-medium mb-1">
                      Drop your resume here
                    </p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse (PDF or DOCX)
                    </p>
                  </>
                )}
              </div>

              {/* Text Input Toggle */}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowTextInput(true);
                  setSelectedFile(null);
                }}
                className="w-full"
                disabled={isPending}
              >
                <ClipboardPaste className="w-4 h-4 mr-2" />
                Or paste raw text instead
              </Button>
            </>
          ) : (
            <>
              {/* Text Input Area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Paste your resume content</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowTextInput(false);
                      setTextInput("");
                    }}
                    disabled={isPending}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </div>
                <Textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Paste your resume content here..."
                  className="min-h-[200px] resize-none"
                  disabled={isPending}
                />
              </div>
            </>
          )}

          {/* Error State */}
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">
                {error instanceof Error ? error.message : "Failed to process resume"}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            {showTextInput ? (
              <Button
                onClick={handleParseText}
                disabled={!textInput.trim() || isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Parse Resume"
                )}
              </Button>
            ) : (
              <Button
                onClick={handleUploadFile}
                disabled={!selectedFile || isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload & Parse
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

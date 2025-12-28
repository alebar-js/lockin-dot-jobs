"use client";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { JobAnalysisResponse } from "@/types";
import {
  MapPin,
  Building2,
  Wrench,
  BookOpen,
  ListChecks,
  Calendar,
} from "lucide-react";

interface JobAnalysisSummaryProps {
  analysis: JobAnalysisResponse;
}

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      {title}
    </h3>
  );
}

function SkillBadges({ skills }: { skills: string[] }) {
  if (skills.length === 0) return <p className="text-sm text-muted-foreground">None listed</p>;

  return (
    <div className="flex flex-wrap gap-1.5">
      {skills.map((skill, index) => (
        <Badge key={index} variant="secondary" className="text-xs">
          {skill}
        </Badge>
      ))}
    </div>
  );
}

export function JobAnalysisSummary({ analysis }: JobAnalysisSummaryProps) {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {/* Overview Section */}
        <div className="space-y-2">
          {/* Company */}
          {analysis.companyName && (
            <div className="flex items-center gap-1.5 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground font-medium">{analysis.companyName}</span>
            </div>
          )}

          {/* Years of Experience */}
          {analysis.yearsOfExperience && (
            <div className="flex items-center gap-1.5 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Experience:</span>
              <span className="text-foreground">{analysis.yearsOfExperience}</span>
            </div>
          )}

          {/* Location */}
          {analysis.location && (
            <div className="flex items-start gap-1.5 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <span className="text-foreground leading-relaxed">{analysis.location}</span>
            </div>
          )}
        </div>

        {/* Hard Skills Section */}
        <div className="space-y-2">
          <SectionHeader icon={Wrench} title="Technical Skills" />
          <SkillBadges skills={analysis.hardSkills} />
        </div>

        {/* Domain Knowledge Section */}
        <div className="space-y-2">
          <SectionHeader icon={BookOpen} title="Domain Knowledge" />
          <SkillBadges skills={analysis.domainKnowledge} />
        </div>

        {/* Key Responsibilities Section */}
        <div className="space-y-2">
          <SectionHeader icon={ListChecks} title="Key Responsibilities" />
          {analysis.keyResponsibilities.length > 0 ? (
            <ul className="space-y-2.5 text-sm text-muted-foreground leading-relaxed">
              {analysis.keyResponsibilities.map((responsibility, index) => (
                <li key={index} className="flex gap-2">
                  <span className="text-muted-foreground/60 select-none">•</span>
                  <span className="leading-relaxed">{responsibility}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">None listed</p>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}

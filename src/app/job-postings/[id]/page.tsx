import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout";
import { JobPostingWorkspace } from "./JobPostingWorkspace";

interface JobPostingPageProps {
  params: Promise<{ id: string }>;
}

export default async function JobPostingPage({ params }: JobPostingPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;

  return (
    <AppShell>
      <JobPostingWorkspace jobPostingId={id} />
    </AppShell>
  );
}


import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMasterResume } from "@/lib/actions";
import { ResumeWorkspace } from "./ResumeWorkspace";
import { AppShell } from "@/components/layout";

export default async function ResumePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const masterResume = await getMasterResume();

  return (
    <AppShell>
      <ResumeWorkspace initialData={masterResume} />
    </AppShell>
  );
}

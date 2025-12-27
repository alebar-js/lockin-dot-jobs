"use client";

import { Explorer } from "@/components/explorer";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Explorer Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-card border-r border-border flex flex-col">
        <Explorer />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}


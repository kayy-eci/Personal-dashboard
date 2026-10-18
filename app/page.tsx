"use client";

import { WorkspaceProvider } from "./_components/workspace-provider";
import { WorkspaceShell } from "./_components/workspace-shell";

export default function Home() {
  return (
    <WorkspaceProvider>
      <WorkspaceShell />
    </WorkspaceProvider>
  );
}

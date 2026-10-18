"use client";

import { PageView } from "./page-view";
import { Sidebar } from "./sidebar";
import { ErrorToasts } from "./toast";
import { TrashDialog } from "./trash-dialog";

export function WorkspaceShell() {
  return (
    <div className="workspace">
      <Sidebar />
      <PageView />
      <TrashDialog />
      <ErrorToasts />
    </div>
  );
}

export default WorkspaceShell;

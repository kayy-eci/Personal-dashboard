"use client";

import { PageView } from "./page-view";
import { ShortcutsDialog } from "./shortcuts-dialog";
import { Sidebar } from "./sidebar";
import { ErrorToasts } from "./toast";
import { TrashDialog } from "./trash-dialog";

export function WorkspaceShell() {
  return (
    <div className="workspace">
      <Sidebar />
      <PageView />
      <TrashDialog />
      <ShortcutsDialog />
      <ErrorToasts />
    </div>
  );
}

export default WorkspaceShell;

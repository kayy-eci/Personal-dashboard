"use client";

import { Fragment } from "react";
import { findNode, pathOf, truncateCrumbs } from "@/lib/page-tree";
import { getLifeOsApi } from "@/lib/pages-client";
import { PageDocEditor } from "./editor/doc-editor";
import { PageHeader } from "./page-header";
import { useWorkspace } from "./workspace-provider";

export function PageView() {
  if (!getLifeOsApi()) {
    return (
      <main className="page-view">
        <div className="page-empty-state">
          <p>LifeOS runs inside its desktop app. Open the app to load your workspace.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page-view">
      <Breadcrumbs />
      <PageHeader />
      <article className="page-body">
        <PagePlaceholder />
      </article>
    </main>
  );
}

function Breadcrumbs() {
  const workspace = useWorkspace();
  const path =
    workspace.tree && workspace.activePageId
      ? pathOf(workspace.tree, workspace.activePageId)
      : undefined;

  if (!path || path.length <= 1) {
    return null;
  }

  const { visible, omitted } = truncateCrumbs(path);

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {visible.map((pageId, index) => {
        const isCurrent = pageId === workspace.activePageId && index === visible.length - 1;
        const label = findNode(workspace.tree ?? [], pageId)?.title ?? "Untitled";
        return (
          <Fragment key={pageId}>
            {index === 0 && omitted > 0 ? (
              <span
                className="breadcrumb-sep breadcrumb-omitted"
                title={`${omitted} hidden levels`}
              >
                …
              </span>
            ) : null}
            {index > 0 ? (
              <span className="breadcrumb-sep" aria-hidden>
                /
              </span>
            ) : null}
            {isCurrent ? (
              <span className="breadcrumb-current" aria-current="page">
                {label}
              </span>
            ) : (
              <button
                type="button"
                className="breadcrumb-link"
                onClick={() => workspace.selectPage(pageId)}
              >
                {label}
              </button>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}

function PagePlaceholder() {
  const workspace = useWorkspace();

  if (!workspace.activePageId) {
    return (
      <div className="page-empty-state">
        <p>Select a page from the sidebar, or create a new page.</p>
        <button
          type="button"
          className="primary-button"
          onClick={() => void workspace.createPage()}
        >
          Create a page
        </button>
      </div>
    );
  }

  // The rich text editor (FR-1). Keyed by page id so switching pages flushes
  // the previous document and loads the next one into a fresh editor.
  return <PageDocEditor key={workspace.activePageId} pageId={workspace.activePageId} />;
}

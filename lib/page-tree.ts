import type { PageTreeNode } from "@/lib/pages-client";

export interface PagePath {
  /** Page ids ordered from the tree root to the page itself (inclusive). */
  ids: string[];
}

export function findNode(
  tree: readonly PageTreeNode[],
  pageId: string,
): PageTreeNode | undefined {
  for (const node of tree) {
    if (node.id === pageId) {
      return node;
    }
    const child = findNode(node.children, pageId);
    if (child) {
      return child;
    }
  }
  return undefined;
}

/** Returns the chain of ids from the root level to the given page (inclusive). */
export function pathOf(
  tree: readonly PageTreeNode[],
  pageId: string,
): string[] | undefined {
  const path: string[] = [];
  let current = findNode(tree, pageId);
  if (!current) {
    return undefined;
  }

  const nodesById = buildIndex(tree);
  while (current) {
    path.push(current.id);
    current = current.parentId
      ? nodesById.get(current.parentId)
      : undefined;
  }
  return path;
}

export function ancestorsOf(
  tree: readonly PageTreeNode[],
  pageId: string,
): string[] {
  const path = pathOf(tree, pageId);
  if (!path) {
    return [];
  }
  // Exclude the page itself; the chain ends at its parent.
  return path.slice(0, -1);
}

function buildIndex(
  nodes: readonly PageTreeNode[],
): Map<string, PageTreeNode> {
  const index = new Map<string, PageTreeNode>();
  const pending = [...nodes];
  while (pending.length > 0) {
    const node = pending.pop()!;
    index.set(node.id, node);
    pending.push(...node.children);
  }
  return index;
}

/**
 * True when the page cannot be moved under the candidate parent because the
 * candidate is the page itself or one of its descendants. This is a renderer
 * side guard used to show a rejection cue; the repository remains the single
 * source of truth and repeats the validation.
 */
export function isForbiddenMoveParent(
  tree: readonly PageTreeNode[],
  pageId: string,
  candidateParentId: string | null,
): boolean {
  if (candidateParentId === null) {
    return false;
  }
  const ancestors = ancestorsOf(tree, candidateParentId);
  return ancestors.includes(pageId);
}

/**
 * Breadcrumbs render at most the first crumb and the last two, with an
 * ellipsis in the middle for long paths (FR-2.7).
 */
export function truncateCrumbs(ids: readonly string[]): {
  visible: string[];
  omitted: number;
} {
  const maxVisible = 3;
  if (ids.length <= maxVisible + 1) {
    return { visible: [...ids], omitted: 0 };
  }
  return {
    visible: [ids[0], ...ids.slice(ids.length - 2)],
    omitted: ids.length - maxVisible,
  };
}

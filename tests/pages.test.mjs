import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { openDatabase } from "../dist-electron/electron/database/index.js";
import { uuidv7 } from "../dist-electron/electron/database/uuid.js";
import {
  isCreatePageArgs,
  isMovePageArgs,
  isPageIdArgs,
  isRenamePageArgs,
} from "../dist-electron/electron/ipc-contract.js";
import { PageRepository, PageRepositoryError } from "../dist-electron/electron/pages/repository.js";

async function withRepository(run) {
  const directory = mkdtempSync(path.join(os.tmpdir(), "lifeos-pages-"));
  let connection;

  try {
    connection = await openDatabase(directory);
    const device = connection.sqlite
      .prepare("SELECT id FROM devices LIMIT 1")
      .get();
    const repository = new PageRepository(
      connection.db,
      connection.sqlite,
      device.id,
    );
    await run({ repository, connection });
  } finally {
    connection?.sqlite.close();
    rmSync(directory, { recursive: true, force: true });
  }
}

test("creates pages with defaults and returns a nested active tree", async () => {
  await withRepository(({ repository, connection }) => {
    const parent = repository.createPage();
    const firstChild = repository.createPage({ parentId: parent.id });
    const secondChild = repository.createPage({ parentId: parent.id });
    const tree = repository.listTree();

    assert.equal(parent.title, "Untitled");
    assert.equal(parent.parentId, null);
    assert.equal(parent.contentJson, '{"type":"doc","content":[{"type":"paragraph"}]}');
    assert.equal(tree.length, 1);
    assert.deepEqual(
      tree[0].children.map(({ id }) => id),
      [firstChild.id, secondChild.id],
    );
    assert.equal(
      connection.sqlite.prepare("SELECT COUNT(*) AS count FROM change_log").get().count,
      3,
    );
  });
});

test("renames pages after trimming whitespace and rejects an empty title", async () => {
  await withRepository(({ repository }) => {
    const page = repository.createPage();

    assert.equal(repository.renamePage(page.id, "  Project notes  ").title, "Project notes");
    assert.throws(
      () => repository.renamePage(page.id, " \t "),
      (error) =>
        error instanceof PageRepositoryError && error.code === "INVALID_INPUT",
    );
    assert.equal(repository.listTree()[0].title, "Project notes");
  });
});

test("moves pages by fractional position and rejects descendant cycles", async () => {
  await withRepository(({ repository, connection }) => {
    const source = repository.createPage();
    const destination = repository.createPage();
    const anchor = repository.createPage();
    const before = repository.createPage({ parentId: destination.id });
    const after = repository.createPage({ parentId: destination.id });

    repository.movePage(source.id, { parentId: destination.id, beforeId: after.id });
    repository.movePage(anchor.id, { parentId: destination.id, afterId: before.id });

    const destinationNode = repository.listTree().find(({ id }) => id === destination.id);
    assert.deepEqual(
      destinationNode.children.map(({ id }) => id),
      [before.id, anchor.id, source.id, after.id],
    );

    const movedSource = destinationNode.children.find(({ id }) => id === source.id);
    assert.match(movedSource.position, /^[0-9a-f]{16}$/);
    assert.throws(
      () => repository.movePage(destination.id, { parentId: source.id }),
      (error) =>
        error instanceof PageRepositoryError && error.code === "CYCLE",
    );
    const rebalancedPage = repository.createPage();
    connection.sqlite
      .prepare("UPDATE pages SET position = ? WHERE id = ?")
      .run("0000000000000001", before.id);
    connection.sqlite
      .prepare("UPDATE pages SET position = ? WHERE id = ?")
      .run("0000000000000002", anchor.id);
    repository.movePage(rebalancedPage.id, {
      parentId: destination.id,
      beforeId: anchor.id,
    });
    assert.deepEqual(
      repository
        .listTree()
        .find(({ id }) => id === destination.id)
        .children.map(({ id }) => id),
      [before.id, rebalancedPage.id, anchor.id, source.id, after.id],
    );
    assert.equal(
      connection.sqlite
        .prepare("SELECT parent_id FROM pages WHERE id = ?")
        .get(destination.id).parent_id,
      null,
    );
  });
});

test("rejects missing pages and invalid move anchors without changing the tree", async () => {
  await withRepository(({ repository }) => {
    const page = repository.createPage();
    const another = repository.createPage();
    const child = repository.createPage({ parentId: another.id });

    assert.throws(
      () => repository.renamePage("00000000-0000-7000-8000-000000000000", "Missing"),
      (error) =>
        error instanceof PageRepositoryError && error.code === "NOT_FOUND",
    );
    assert.throws(
      () =>
        repository.movePage(page.id, {
          parentId: null,
          beforeId: child.id,
        }),
      (error) =>
        error instanceof PageRepositoryError && error.code === "INVALID_INPUT",
    );
    assert.equal(repository.listTree().length, 2);
  });
});

test("deletes and restores an entire subtree without losing sibling order", async () => {
  await withRepository(({ repository }) => {
    const before = repository.createPage();
    const parent = repository.createPage();
    const child = repository.createPage({ parentId: parent.id });
    const grandchild = repository.createPage({ parentId: child.id });
    const after = repository.createPage();

    repository.deletePage(parent.id);

    assert.deepEqual(repository.listTree().map(({ id }) => id), [before.id, after.id]);
    assert.deepEqual(repository.listTrash().map(({ id }) => id), [parent.id]);

    repository.restorePage(parent.id);

    assert.deepEqual(repository.listTree().map(({ id }) => id), [
      before.id,
      parent.id,
      after.id,
    ]);
    assert.deepEqual(
      repository.listTree()[1].children[0].children.map(({ id }) => id),
      [grandchild.id],
    );
    assert.deepEqual(repository.listTrash(), []);
  });
});

test("restores a page at the root when its original parent is still deleted", async () => {
  await withRepository(({ repository }) => {
    const existingRoot = repository.createPage();
    const parent = repository.createPage();
    repository.movePage(existingRoot.id, {
      parentId: null,
      afterId: parent.id,
    });
    const child = repository.createPage({ parentId: parent.id });
    repository.deletePage(parent.id);

    repository.restorePage(child.id);

    assert.deepEqual(repository.listTree().map(({ id }) => id), [
      existingRoot.id,
      child.id,
    ]);
    assert.deepEqual(repository.listTrash().map(({ id }) => id), [parent.id]);
  });
});

test("validates every page IPC input shape and rejects extra or malformed fields", () => {
  const pageId = uuidv7();
  const parentId = uuidv7();

  assert.equal(isCreatePageArgs([{}]), true);
  assert.equal(isCreatePageArgs([{ parentId, title: "Notes" }]), true);
  assert.equal(isCreatePageArgs([{ parentId: "not-an-id" }]), false);
  assert.equal(isCreatePageArgs([{ unexpected: true }]), false);

  assert.equal(isRenamePageArgs([{ pageId, title: " Notes " }]), true);
  assert.equal(isRenamePageArgs([{ pageId, title: " " }]), false);
  assert.equal(isRenamePageArgs([{ pageId, title: "Note", isFavorite: true }]), false);

  assert.equal(isMovePageArgs([{ pageId, parentId, beforeId: uuidv7() }]), true);
  assert.equal(
    isMovePageArgs([{ pageId, parentId, beforeId: uuidv7(), afterId: uuidv7() }]),
    false,
  );
  assert.equal(isMovePageArgs([{ pageId, parentId, beforeId: pageId }]), false);
  assert.equal(isMovePageArgs([{ pageId: "bad", parentId: null }]), false);

  assert.equal(isPageIdArgs([{ pageId }]), true);
  assert.equal(isPageIdArgs([{ pageId, extra: "rejected" }]), false);
});

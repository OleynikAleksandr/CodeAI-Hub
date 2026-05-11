import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { writeApplicationSkeletonAcceptance } from "./application-skeleton-acceptance-writer";

const WORKSPACE_SLUG = "demo-workspace";

const makeWorkspace = async (): Promise<string> => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "application-skeleton-acceptance-writer-")
  );
  await mkdir(
    path.join(root, ".codeai-hub", WORKSPACE_SLUG, "application_skeleton"),
    {
      recursive: true,
    }
  );
  return root;
};

const mapPathFor = (root: string): string =>
  path.join(
    root,
    ".codeai-hub",
    WORKSPACE_SLUG,
    "application_skeleton",
    "application-skeleton-map.json"
  );

const writeMap = async (root: string, content: unknown): Promise<void> => {
  await writeFile(
    mapPathFor(root),
    `${JSON.stringify(content, null, 2)}\n`,
    "utf8"
  );
};

const readMap = async (root: string): Promise<Record<string, unknown>> =>
  JSON.parse(await readFile(mapPathFor(root), "utf8")) as Record<
    string,
    unknown
  >;

test("writer patches draft map to accepted state", async () => {
  const workspaceRoot = await makeWorkspace();
  try {
    await writeMap(workspaceRoot, {
      schema: "codeai-application-skeleton-v1",
      reviewState: "draft",
      accepted: false,
      materialized: false,
      materializationState: "not_started",
      sourceRoot: "product-parts",
    });

    const result = await writeApplicationSkeletonAcceptance({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.status, "patched");
    const patched = await readMap(workspaceRoot);
    assert.equal(patched.accepted, true);
    assert.equal(patched.reviewState, "accepted");
    assert.equal(patched.schema, "codeai-application-skeleton-v1");
    assert.equal(patched.sourceRoot, "product-parts");
    assert.equal(patched.materialized, false);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("writer is idempotent when map already reports accepted", async () => {
  const workspaceRoot = await makeWorkspace();
  try {
    const original = {
      schema: "codeai-application-skeleton-v1",
      reviewState: "accepted",
      accepted: true,
      materialized: false,
      materializationState: "not_started",
      sourceRoot: "product-parts",
    };
    await writeMap(workspaceRoot, original);
    const originalText = await readFile(mapPathFor(workspaceRoot), "utf8");

    const result = await writeApplicationSkeletonAcceptance({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.status, "noop");
    assert.equal(
      await readFile(mapPathFor(workspaceRoot), "utf8"),
      originalText
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("writer is idempotent when map already reports materialized", async () => {
  const workspaceRoot = await makeWorkspace();
  try {
    const original = {
      schema: "codeai-application-skeleton-v1",
      reviewState: "materialized",
      accepted: true,
      materialized: true,
      materializationState: "materialized",
      sourceRoot: "product-parts",
    };
    await writeMap(workspaceRoot, original);
    const originalText = await readFile(mapPathFor(workspaceRoot), "utf8");

    const result = await writeApplicationSkeletonAcceptance({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.status, "noop");
    assert.equal(
      await readFile(mapPathFor(workspaceRoot), "utf8"),
      originalText
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("writer preserves materialized reviewState while accepted flag is patched", async () => {
  // Defensive: if some upstream sequence ever sets reviewState=materialized
  // without accepted=true (anomaly), the writer must not regress reviewState
  // back to "accepted" — it should still patch accepted and keep materialized.
  const workspaceRoot = await makeWorkspace();
  try {
    await writeMap(workspaceRoot, {
      schema: "codeai-application-skeleton-v1",
      reviewState: "materialized",
      accepted: false,
      materialized: false,
      materializationState: "not_started",
      sourceRoot: "product-parts",
    });

    const result = await writeApplicationSkeletonAcceptance({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.status, "patched");
    const patched = await readMap(workspaceRoot);
    assert.equal(patched.accepted, true);
    assert.equal(patched.reviewState, "materialized");
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("writer returns map_missing when the file does not exist", async () => {
  const workspaceRoot = await makeWorkspace();
  try {
    const result = await writeApplicationSkeletonAcceptance({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    assert.equal(result.status, "map_missing");
    assert.ok(result.mapPath?.endsWith("application-skeleton-map.json"));
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("writer returns invalid_json when the file is corrupt", async () => {
  const workspaceRoot = await makeWorkspace();
  try {
    await writeFile(mapPathFor(workspaceRoot), "{ broken json", "utf8");
    const result = await writeApplicationSkeletonAcceptance({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    assert.equal(result.status, "invalid_json");
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("writer returns path_unresolved on an invalid workspace slug", async () => {
  const workspaceRoot = await makeWorkspace();
  try {
    const result = await writeApplicationSkeletonAcceptance({
      workspaceRoot,
      workspaceSlug: "BAD SLUG",
    });
    assert.equal(result.status, "path_unresolved");
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

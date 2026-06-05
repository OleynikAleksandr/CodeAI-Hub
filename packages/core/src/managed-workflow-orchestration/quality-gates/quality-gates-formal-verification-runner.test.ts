import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { collectQualityGatesHookCommandDiagnostics } from "./quality-gates-formal-verification-runner";

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const writePackageJson = async (
  workspaceRoot: string,
  scripts: Record<string, string>
): Promise<void> =>
  writeWorkspaceFile(
    workspaceRoot,
    "package.json",
    `${JSON.stringify({ scripts }, null, 2)}\n`
  );

const buildContract = (): Record<string, unknown> => ({
  requiredBeforeCommit: ["qg-secret-scan"],
  requiredBeforePush: ["qg:max-file-lines"],
});

test("Quality Gates formal verification runner accepts matching hook scripts", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "quality-gates-hook-valid-")
  );
  try {
    await writePackageJson(workspaceRoot, {
      "qg:max-file-lines": "node scripts/quality-gates/max-file-lines.mjs",
      "qg:secret-scan": "node scripts/quality-gates/secret-scan.mjs",
    });
    await writeWorkspaceFile(
      workspaceRoot,
      ".husky/pre-commit",
      "#!/bin/sh\nset -e\nnpm run qg:secret-scan\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      ".husky/pre-push",
      "#!/bin/sh\nset -e\nnpm run --silent qg:max-file-lines\n"
    );

    const diagnostics = await collectQualityGatesHookCommandDiagnostics({
      contract: buildContract(),
      workspaceRoot,
    });

    assert.deepEqual(diagnostics, []);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("Quality Gates formal verification runner rejects hook npm scripts missing from package.json", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "quality-gates-hook-missing-script-")
  );
  try {
    await writePackageJson(workspaceRoot, {
      "qg:secret-scan": "node scripts/quality-gates/secret-scan.mjs",
    });
    await writeWorkspaceFile(
      workspaceRoot,
      ".husky/pre-commit",
      "#!/bin/sh\nset -e\nnpm run qg:secret-scan\nnpm run qg:ghost\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      ".husky/pre-push",
      "#!/bin/sh\nset -e\nnpm run qg:max-file-lines\n"
    );

    const diagnostics = await collectQualityGatesHookCommandDiagnostics({
      contract: buildContract(),
      workspaceRoot,
    });

    assert.ok(
      diagnostics.includes(
        "missing_hook_package_script:.husky/pre-commit:qg:ghost"
      )
    );
    assert.ok(diagnostics.includes("missing_package_script:qg:max-file-lines"));
    assert.ok(
      diagnostics.includes(
        "missing_hook_package_script:.husky/pre-push:qg:max-file-lines"
      )
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

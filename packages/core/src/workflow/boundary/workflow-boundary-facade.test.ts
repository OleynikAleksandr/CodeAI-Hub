import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { resolveWorkspaceRuntimeCapsule } from "../runtime/workspace-runtime-capsule";
import { WORKSPACE_RUNTIME_CAPSULE_GITIGNORE_CONTENT } from "../runtime/workspace-runtime-capsule-gitignore";
import { WorkflowBoundaryFacade } from "./workflow-boundary-facade";
import { WorkflowBoundaryGit } from "./workflow-boundary-git";
import { WorkflowBoundaryRegistryStore } from "./workflow-boundary-registry";
import { WorkflowRollbackCoordinator } from "./workflow-rollback-coordinator";

const execFileAsync = promisify(execFile);
const WORKSPACE_SLUG = "demo-workspace";
const PRE_STEP_ROLLBACK_ANCHOR_RE = /pre-step rollback anchor/u;
const DESCRIPTION_BOUNDARY_STAGE = "description";
const SETTINGS_RELATIVE_RE =
  /\.codeai-hub\/demo-workspace\/runtime\/settings\/settings\.json/u;
const LOCALIZATION_RELATIVE_RE =
  /\.codeai-hub\/demo-workspace\/runtime\/localization\/cache\/browser-runtime-bootstrap\.json/u;
const PROVIDER_SESSION_RELATIVE_RE =
  /\.codeai-hub\/demo-workspace\/runtime\/providers\/codex\/home\/sessions\/2026\/05\/25\/native-session\.jsonl/u;

const createWorkspace = async (): Promise<string> =>
  await mkdtemp(path.join(tmpdir(), "codeai-boundary-"));

const writeText = async (filePath: string, content: string): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
};

const runGit = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<string> => {
  const { stdout } = await execFileAsync("git", args, { cwd: workspaceRoot });
  return stdout.trim();
};

test("WorkflowBoundaryFacade restores selected stage boundary and prunes downstream registry", async () => {
  const workspaceRoot = await createWorkspace();
  try {
    const facade = new WorkflowBoundaryFacade({
      clock: () => "2026-05-25T00:00:00.000Z",
    });
    const git = new WorkflowBoundaryGit();
    const descriptionBoundary = await facade.ensureBoundary({
      stage: "description",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    await writeFile(
      path.join(workspaceRoot, "description.md"),
      "description\n"
    );
    await git.commit({
      commitMessage: "codeai-step: Description accepted",
      paths: [".codeai-hub", "description.md"],
      workspaceRoot,
    });
    const virtualBoundary = await facade.ensureBoundary({
      stage: "virtual_simulation",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    await writeFile(path.join(workspaceRoot, "virtual.md"), "virtual\n");
    await git.commit({
      commitMessage: "codeai-step: Virtual Simulation accepted",
      paths: [".codeai-hub", "virtual.md"],
      workspaceRoot,
    });
    await facade.ensureBoundary({
      stage: "diagram_modules",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    await writeFile(path.join(workspaceRoot, "diagram.md"), "diagram\n");
    await writeText(
      path.join(workspaceRoot, "scratch", "nested", "temp.txt"),
      "untracked\n"
    );

    const restored = await facade.restoreBoundary({
      stage: "diagram_modules",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.notEqual(virtualBoundary.boundaryHash, restored.boundaryHash);
    assert.deepEqual(restored.prunedStages, ["diagram_modules"]);
    assert.equal(
      await readFile(path.join(workspaceRoot, "description.md"), "utf8"),
      "description\n"
    );
    assert.equal(
      await readFile(path.join(workspaceRoot, "virtual.md"), "utf8"),
      "virtual\n"
    );
    await assert.rejects(
      readFile(path.join(workspaceRoot, "diagram.md"), "utf8")
    );
    await assert.rejects(
      readFile(
        path.join(workspaceRoot, "scratch", "nested", "temp.txt"),
        "utf8"
      )
    );
    assert.deepEqual(await git.statusPorcelain(workspaceRoot), []);
    const registryJson = JSON.parse(
      await readFile(descriptionBoundary.registryPath, "utf8")
    );
    assert.deepEqual(
      registryJson.entries.map(
        (entry: { readonly stage: string }) => entry.stage
      ),
      ["description", "virtual_simulation"]
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("WorkflowRollbackCoordinator quiesces before Git rollback and asserts clean tree", async () => {
  const workspaceRoot = await createWorkspace();
  try {
    const git = new WorkflowBoundaryGit();
    const registryStore = new WorkflowBoundaryRegistryStore();
    const facade = new WorkflowBoundaryFacade({
      clock: () => "2026-05-25T00:00:00.000Z",
      git,
      registryStore,
    });
    await facade.ensureBoundary({
      stage: "description",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    await writeText(path.join(workspaceRoot, "description.md"), "done\n");
    await git.commit({
      commitMessage: "codeai-step: Description accepted",
      paths: ["description.md"],
      workspaceRoot,
    });
    await facade.ensureBoundary({
      stage: "virtual_simulation",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    await writeText(path.join(workspaceRoot, "virtual.md"), "virtual\n");

    const target = await git.findBoundaryCommit({
      stage: "virtual_simulation",
      workspaceRoot,
    });
    assert.ok(target);
    const events: string[] = [];
    const coordinator = new WorkflowRollbackCoordinator({
      git,
      quiesce: async () => {
        assert.equal(
          await readFile(path.join(workspaceRoot, "virtual.md"), "utf8"),
          "virtual\n"
        );
        events.push("quiesce");
      },
      registryStore,
    });
    const result = await coordinator.rollback({
      prunedStages: ["virtual_simulation"],
      stage: "virtual_simulation",
      target,
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.deepEqual(events, ["quiesce"]);
    assert.equal(result.boundaryHash, target.boundaryHash);
    assert.deepEqual(result.prunedStages, ["virtual_simulation"]);
    await assert.rejects(
      readFile(path.join(workspaceRoot, "virtual.md"), "utf8")
    );
    assert.deepEqual(await git.statusPorcelain(workspaceRoot), []);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("WorkflowRollbackCoordinator preserves mutable runtime outside Clear rollback", async () => {
  const workspaceRoot = await createWorkspace();
  try {
    const capsule = resolveWorkspaceRuntimeCapsule({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    const git = new WorkflowBoundaryGit();
    await writeText(
      capsule.gitignoreFile.absolutePath,
      "# legacy runtime capsule\n"
    );
    await writeText(
      capsule.settingsFile.absolutePath,
      '{"general":{"localization":{"defaultLanguage":"en"}}}\n'
    );
    const legacyLocalizationCachePath = path.join(
      capsule.localizationRoot.absolutePath,
      "cache/browser-runtime-bootstrap.json"
    );
    const legacyProviderSessionPath = path.join(
      capsule.providerHomes.codex.absolutePath,
      "sessions/2026/05/25/native-session.jsonl"
    );
    await writeText(legacyLocalizationCachePath, '{"language":"en"}\n');
    await writeText(legacyProviderSessionPath, "legacy native session\n");
    const boundaryCommit = await git.commit({
      commitMessage: "codeai-boundary: Virtual Simulation",
      paths: [capsule.workspaceCapsuleRoot.relativePath],
      workspaceRoot,
    });
    const currentSettings =
      '{"general":{"localization":{"defaultLanguage":"ru"}}}\n';
    await writeText(capsule.settingsFile.absolutePath, currentSettings);
    await writeText(path.join(workspaceRoot, "virtual.md"), "downstream\n");

    await new WorkflowRollbackCoordinator({ git }).rollback({
      prunedStages: ["virtual_simulation"],
      stage: "virtual_simulation",
      target: {
        boundaryHash: boundaryCommit.hash,
        commitMessage: "codeai-boundary: Virtual Simulation",
        stage: "virtual_simulation",
        stageLabel: "Virtual Simulation",
      },
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(
      await readFile(capsule.settingsFile.absolutePath, "utf8"),
      currentSettings
    );
    assert.equal(
      await readFile(capsule.gitignoreFile.absolutePath, "utf8"),
      WORKSPACE_RUNTIME_CAPSULE_GITIGNORE_CONTENT
    );
    await assert.rejects(
      readFile(path.join(workspaceRoot, "virtual.md"), "utf8")
    );
    assert.deepEqual(await git.statusPorcelain(workspaceRoot), []);
    const trackedFiles = await runGit(workspaceRoot, ["ls-files"]);
    assert.doesNotMatch(trackedFiles, SETTINGS_RELATIVE_RE);
    assert.doesNotMatch(trackedFiles, LOCALIZATION_RELATIVE_RE);
    assert.doesNotMatch(trackedFiles, PROVIDER_SESSION_RELATIVE_RE);
    const headTreeFiles = await runGit(workspaceRoot, [
      "ls-tree",
      "-r",
      "--name-only",
      "HEAD",
    ]);
    assert.doesNotMatch(headTreeFiles, SETTINGS_RELATIVE_RE);
    assert.doesNotMatch(headTreeFiles, LOCALIZATION_RELATIVE_RE);
    assert.doesNotMatch(headTreeFiles, PROVIDER_SESSION_RELATIVE_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("WorkflowBoundaryFacade refuses to create a boundary on a dirty tree", async () => {
  const workspaceRoot = await createWorkspace();
  try {
    const facade = new WorkflowBoundaryFacade({
      clock: () => "2026-05-25T00:00:00.000Z",
    });
    await facade.ensureBoundary({
      stage: "description",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    await writeText(
      path.join(workspaceRoot, "doc", "TODO", "stages", "diagram.md"),
      "stage bootstrap\n"
    );

    await assert.rejects(
      facade.ensureBoundary({
        stage: "diagram_modules",
        workspaceRoot,
        workspaceSlug: WORKSPACE_SLUG,
      }),
      PRE_STEP_ROLLBACK_ANCHOR_RE
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("WorkflowBoundaryFacade serializes concurrent Description boundary startup", async () => {
  const workspaceRoot = await createWorkspace();
  try {
    await writeText(path.join(workspaceRoot, ".DS_Store"), "metadata\n");
    const [first, second] = await Promise.all([
      new WorkflowBoundaryFacade({
        clock: () => "2026-05-25T00:00:00.000Z",
      }).ensureBoundary({
        stage: DESCRIPTION_BOUNDARY_STAGE,
        workspaceRoot,
        workspaceSlug: WORKSPACE_SLUG,
      }),
      new WorkflowBoundaryFacade({
        clock: () => "2026-05-25T00:00:00.000Z",
      }).ensureBoundary({
        stage: DESCRIPTION_BOUNDARY_STAGE,
        workspaceRoot,
        workspaceSlug: WORKSPACE_SLUG,
      }),
    ]);

    assert.equal([first, second].filter((result) => result.created).length, 1);
    assert.equal(first.boundaryHash, second.boundaryHash);
    assert.deepEqual(
      await new WorkflowBoundaryGit().statusPorcelain(workspaceRoot),
      []
    );

    const registryJson = JSON.parse(await readFile(first.registryPath, "utf8"));
    assert.deepEqual(
      registryJson.entries.map(
        (entry: { readonly stage: string }) => entry.stage
      ),
      [DESCRIPTION_BOUNDARY_STAGE]
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("WorkflowBoundaryGit resolves workflow boundary commits from Git history", async () => {
  const workspaceRoot = await createWorkspace();
  try {
    const facade = new WorkflowBoundaryFacade({
      clock: () => "2026-05-25T00:00:00.000Z",
    });
    const git = new WorkflowBoundaryGit();
    const descriptionBoundary = await facade.ensureBoundary({
      stage: "description",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    await writeText(path.join(workspaceRoot, "description.md"), "done\n");
    await git.commit({
      commitMessage: "codeai-step: Description accepted",
      paths: ["description.md"],
      workspaceRoot,
    });
    const virtualBoundary = await facade.ensureBoundary({
      stage: "virtual_simulation",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    const allBoundaries = await git.readBoundaryCommits(workspaceRoot);
    const resolvedVirtual = await git.findBoundaryCommit({
      stage: "virtual_simulation",
      workspaceRoot,
    });
    const resolvedDescription = await git.findBoundaryCommit({
      stage: "description",
      workspaceRoot,
    });

    assert.deepEqual(
      allBoundaries.map((entry) => entry.stage),
      ["virtual_simulation", "description"]
    );
    assert.equal(
      resolvedVirtual?.boundaryHash.startsWith(virtualBoundary.boundaryHash),
      true
    );
    assert.equal(
      resolvedVirtual?.commitMessage,
      "codeai-boundary: Virtual Simulation"
    );
    assert.equal(
      resolvedDescription?.boundaryHash.startsWith(
        descriptionBoundary.boundaryHash
      ),
      true
    );
    assert.equal(resolvedDescription?.stageLabel, "Description");
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("WorkflowBoundaryFacade restores from Git history when registry projection is stale", async () => {
  const workspaceRoot = await createWorkspace();
  try {
    const facade = new WorkflowBoundaryFacade({
      clock: () => "2026-05-25T00:00:00.000Z",
    });
    const git = new WorkflowBoundaryGit();
    const descriptionBoundary = await facade.ensureBoundary({
      stage: "description",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    await writeText(path.join(workspaceRoot, "description.md"), "done\n");
    await git.commit({
      commitMessage: "codeai-step: Description accepted",
      paths: ["description.md"],
      workspaceRoot,
    });
    await facade.ensureBoundary({
      stage: "virtual_simulation",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    await writeText(path.join(workspaceRoot, "virtual.md"), "virtual\n");
    await git.commit({
      commitMessage: "codeai-step: Virtual Simulation accepted",
      paths: ["virtual.md"],
      workspaceRoot,
    });
    const diagramBoundary = await facade.ensureBoundary({
      stage: "diagram_modules",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    await writeText(path.join(workspaceRoot, "diagram.md"), "diagram\n");

    await writeText(
      descriptionBoundary.registryPath,
      JSON.stringify({ entries: [], workspaceSlug: WORKSPACE_SLUG }, null, 2)
    );
    const restored = await facade.restoreBoundary({
      stage: "diagram_modules",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(
      restored.boundaryHash.startsWith(diagramBoundary.boundaryHash),
      true
    );
    assert.deepEqual(restored.prunedStages, ["diagram_modules"]);
    await assert.rejects(
      readFile(path.join(workspaceRoot, "diagram.md"), "utf8")
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("WorkflowBoundaryFacade heals pre-submit Description bootstrap residue", async () => {
  const workspaceRoot = await createWorkspace();
  try {
    await writeText(
      path.join(
        workspaceRoot,
        ".codeai-hub",
        WORKSPACE_SLUG,
        "description",
        "questionnaire.md"
      ),
      "# Description Questionnaire\n"
    );
    const boundary = await new WorkflowBoundaryFacade({
      clock: () => "2026-05-25T00:00:00.000Z",
    }).ensureBoundary({
      stage: DESCRIPTION_BOUNDARY_STAGE,
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(boundary.created, true);
    assert.deepEqual(
      await new WorkflowBoundaryGit().statusPorcelain(workspaceRoot),
      []
    );
    assert.equal(
      await readFile(
        path.join(
          workspaceRoot,
          ".codeai-hub",
          WORKSPACE_SLUG,
          "description",
          "questionnaire.md"
        ),
        "utf8"
      ),
      "# Description Questionnaire\n"
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

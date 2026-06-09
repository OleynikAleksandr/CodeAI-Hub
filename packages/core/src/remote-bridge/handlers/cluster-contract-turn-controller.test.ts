import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { ClusterContractPlanWriter } from "../../development-tree/cluster-workflow/cluster-contract-plan-writer";
import { ClusterContractTurnController } from "./cluster-contract-turn-controller";

const execFileAsync = promisify(execFile);
const WORKSPACE_SLUG = "demo-workspace";
const PART_ID = "finder-widget";
const CLUSTER_ID = "note-selection-cluster";
const STAGE = `development_tree/materialized/product-parts/${PART_ID}/clusters/${CLUSTER_ID}`;
const REVIEW_IN_PROGRESS_RE =
  /phase2\.contract-review\.task1` User or lead Product Part reviews/u;
const DRAFT_COMMIT_RE = /docs: draft note-selection-cluster cluster contract/u;
const LEDGER_COMMIT_RE = /chore: advance managed workflow ledger/u;
const FACADE_CLASS_DIAGNOSTIC_RE = /facade\.className is required/u;
const FACADE_CONTRACT_JSON_RE = /ClusterFacadeContract\.draft\.json/u;
const REPAIR_PROMPT_RE = /Core managed repair: Cluster Contract artifacts/u;

const runGit = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<string> => {
  const { stdout } = await execFileAsync("git", [...args], {
    cwd: workspaceRoot,
  });
  return stdout;
};

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const createArtifactPath = (fileName: string): string =>
  `.codeai-hub/${WORKSPACE_SLUG}/${STAGE}/${fileName}`;

const createConcreteFacadeContractJson = (): string =>
  `${JSON.stringify(
    {
      facade: {
        className: "NoteSelectionClusterFacade",
        filePath:
          "product-parts/finder-widget/clusters/note-selection-cluster/note-selection-cluster-facade.ts",
        methods: [
          {
            inputType: "ResolveNoteSelectionInput",
            name: "resolveNoteSelection",
            outputType: "ResolveNoteSelectionResult",
            signature:
              "resolveNoteSelection(input: ResolveNoteSelectionInput): Promise<ResolveNoteSelectionResult>",
          },
        ],
      },
      inputTypes: [
        {
          name: "ResolveNoteSelectionInput",
          fields: ["notesRoot"],
        },
      ],
      moduleBoundaries: [
        {
          inputs: ["ResolveNoteSelectionInput"],
          moduleId: "latest-note-resolver",
          outputs: ["ResolvedLatestNote"],
        },
      ],
      outputTypes: [
        {
          name: "ResolveNoteSelectionResult",
          fields: ["status", "selectedNote"],
        },
      ],
      resultUnion: {
        discriminator: "status",
        variants: ["data-found", "no-data", "access-error"],
      },
    },
    null,
    2
  )}\n`;

const CONTINUITY_INDEX_PATH = `.codeai-hub/${WORKSPACE_SLUG}/continuity/index.json`;
const CONTINUITY_CHAIN_PATH = `.codeai-hub/${WORKSPACE_SLUG}/continuity/${STAGE}/cluster-session-1/chain.json`;

const initializeWorkspace = async (workspaceRoot: string): Promise<string> => {
  await runGit(workspaceRoot, ["init"]);
  await runGit(workspaceRoot, ["config", "user.email", "test@example.local"]);
  await runGit(workspaceRoot, ["config", "user.name", "Test"]);
  const plan = await new ClusterContractPlanWriter().writePlan({
    branchName: "codex/demo/finder-widget/note-selection-cluster",
    clusterId: CLUSTER_ID,
    partId: PART_ID,
    worktreeRoot: workspaceRoot,
    workspaceSlug: WORKSPACE_SLUG,
  });
  await writeWorkspaceFile(
    workspaceRoot,
    CONTINUITY_INDEX_PATH,
    '{"version":1,"workspaceSlug":"demo-workspace","updatedAt":"2026-06-08T00:00:00.000Z","entries":[]}\n'
  );
  await runGit(workspaceRoot, ["add", "."]);
  await runGit(workspaceRoot, ["commit", "-m", "test: cluster plan"]);
  return plan.relativePath;
};

test("ClusterContractTurnController commits draft artifacts and opens review", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "cluster-contract-turn-")
  );
  try {
    const planPath = await initializeWorkspace(workspaceRoot);
    await writeWorkspaceFile(
      workspaceRoot,
      createArtifactPath("ClusterSpecification.draft.md"),
      "# Cluster Specification\n\nDefines the note selection cluster contract.\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      createArtifactPath("ClusterFacadeContract.draft.md"),
      "# Cluster Facade Contract\n\nInputs and outputs for note selection.\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      createArtifactPath("ClusterSpecification.draft.json"),
      '{"modules":["latest-note-resolver"]}\n'
    );
    await writeWorkspaceFile(
      workspaceRoot,
      createArtifactPath("ClusterFacadeContract.draft.json"),
      createConcreteFacadeContractJson()
    );
    await writeWorkspaceFile(
      workspaceRoot,
      CONTINUITY_INDEX_PATH,
      [
        '{"version":1,"workspaceSlug":"demo-workspace",',
        '"updatedAt":"2026-06-08T12:00:00.000Z",',
        '"entries":[{"dialogId":"cluster-session-1",',
        '"rootSessionId":"cluster-session-1",',
        '"latestSessionId":"cluster-session-1",',
        '"providerId":"codex","providerSessionId":"cluster-session-1",',
        `"stage":"${STAGE}","updatedAt":"2026-06-08T12:00:00.000Z"}]}\n`,
      ].join("")
    );
    await writeWorkspaceFile(
      workspaceRoot,
      CONTINUITY_CHAIN_PATH,
      [
        `{"stage":"${STAGE}",`,
        '"rootSessionId":"cluster-session-1",',
        '"updatedAt":"2026-06-08T12:00:00.000Z","segments":[]}\n',
      ].join("")
    );

    const result =
      await new ClusterContractTurnController().handleTurnCompleted({
        sessionId: "cluster-session-1",
        stage: STAGE,
        workspaceRoot,
        workspaceSlug: WORKSPACE_SLUG,
      });

    assert.equal(result.handled, true);
    assert.equal(
      (await runGit(workspaceRoot, ["status", "--porcelain"])).trim(),
      ""
    );
    const log = await runGit(workspaceRoot, ["log", "--oneline", "-3"]);
    assert.match(log, DRAFT_COMMIT_RE);
    assert.match(log, LEDGER_COMMIT_RE);
    const plan = await readFile(path.join(workspaceRoot, planPath), "utf8");
    assert.match(plan, REVIEW_IN_PROGRESS_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("ClusterContractTurnController blocks abstract facade contract JSON", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "cluster-contract-turn-invalid-")
  );
  try {
    await initializeWorkspace(workspaceRoot);
    await writeWorkspaceFile(
      workspaceRoot,
      createArtifactPath("ClusterSpecification.draft.md"),
      "# Cluster Specification\n\nDefines the note selection cluster contract.\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      createArtifactPath("ClusterFacadeContract.draft.md"),
      "# Cluster Facade Contract\n\nInputs and outputs for note selection.\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      createArtifactPath("ClusterSpecification.draft.json"),
      '{"modules":["latest-note-resolver"]}\n'
    );
    await writeWorkspaceFile(
      workspaceRoot,
      createArtifactPath("ClusterFacadeContract.draft.json"),
      '{"inputs":["notes"],"outputs":["latestNote"]}\n'
    );

    const result =
      await new ClusterContractTurnController().handleTurnCompleted({
        sessionId: "cluster-session-1",
        stage: STAGE,
        workspaceRoot,
        workspaceSlug: WORKSPACE_SLUG,
      });

    assert.equal(result.handled, true);
    assert.match(
      result.handled ? result.message.content : "",
      FACADE_CLASS_DIAGNOSTIC_RE
    );
    assert.match(
      result.handled ? (result.nextInternalMessage ?? "") : "",
      REPAIR_PROMPT_RE
    );
    assert.match(
      result.handled ? (result.nextInternalMessage ?? "") : "",
      FACADE_CLASS_DIAGNOSTIC_RE
    );
    assert.match(
      result.handled ? (result.nextInternalMessage ?? "") : "",
      FACADE_CONTRACT_JSON_RE
    );
    assert.equal(
      (await runGit(workspaceRoot, ["log", "--oneline", "--all"])).includes(
        "docs: draft note-selection-cluster cluster contract"
      ),
      false
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

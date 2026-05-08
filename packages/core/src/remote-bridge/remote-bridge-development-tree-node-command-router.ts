import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { createDevelopmentTreeMaterializedRoot } from "../development-tree/filesystem-structurator/development-tree-filesystem-paths";
import { DevelopmentTreeNodeDetector } from "../development-tree/node-bootstrap/development-tree-node-detector";
import { DraftWriter } from "../development-tree/node-bootstrap/draft-writer";
import type { RemoteBridgeSessionCreateRouter } from "./remote-bridge-session-create-router";

const execFileAsync = promisify(execFile);
const COMMAND = "development-tree:node-start";
const DEVELOPMENT_TREE_STAGE_PREFIX = "development_tree/";

type SendCommandError = (
  clientId: string,
  command: string,
  message: string,
  code: string
) => void;

const readOptionalString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export class RemoteBridgeDevelopmentTreeNodeCommandRouter {
  private readonly detector = new DevelopmentTreeNodeDetector();
  private readonly draftWriter = new DraftWriter();
  private readonly sendCommandError: SendCommandError;
  private readonly sessionCreateRouter: RemoteBridgeSessionCreateRouter;

  constructor(deps: {
    readonly sendCommandError: SendCommandError;
    readonly sessionCreateRouter: RemoteBridgeSessionCreateRouter;
  }) {
    this.sendCommandError = deps.sendCommandError;
    this.sessionCreateRouter = deps.sessionCreateRouter;
  }

  async handle(
    clientId: string,
    payload: {
      readonly modelId?: unknown;
      readonly providerId?: unknown;
      readonly workflowPath?: unknown;
      readonly workspacePath?: unknown;
      readonly workspaceSlug?: unknown;
    }
  ): Promise<void> {
    const providerId = readOptionalString(payload.providerId);
    const workspacePath = readOptionalString(payload.workspacePath);
    const workspaceSlug = readOptionalString(payload.workspaceSlug);
    const workflowPath = readOptionalString(payload.workflowPath);
    if (
      !(
        providerId &&
        workspacePath &&
        path.isAbsolute(workspacePath) &&
        workspaceSlug &&
        workflowPath?.startsWith(DEVELOPMENT_TREE_STAGE_PREFIX)
      )
    ) {
      this.sendCommandError(
        clientId,
        COMMAND,
        "Invalid Development Tree node start payload.",
        "invalid_payload"
      );
      return;
    }
    if (!(await this.isGitWorktreeClean(workspacePath))) {
      this.sendCommandError(
        clientId,
        COMMAND,
        "Workspace has uncommitted changes. Commit or clean the workspace before starting a Development Tree node.",
        "dirty_worktree"
      );
      return;
    }
    const materialized = createDevelopmentTreeMaterializedRoot({
      workspaceRoot: workspacePath,
      workspaceSlug,
    });
    const nodes = await this.detector.detect({
      materializedRootAbsolutePath: materialized.absolutePath,
      materializedRootRelativePath: materialized.relativePath,
    });
    const node = nodes.find(
      (candidate) => candidate.relativePath === workflowPath
    );
    if (!node) {
      this.sendCommandError(
        clientId,
        COMMAND,
        `Development Tree node is not materialized: ${workflowPath}`,
        "node_not_found"
      );
      return;
    }
    await this.draftWriter.writeDrafts({ node });
    await this.sessionCreateRouter.handle(clientId, {
      type: "session:create",
      payload: {
        providerId,
        workspacePath,
        initiativeSlug: workspaceSlug,
        stage: workflowPath,
        runSlug: "development-tree",
        modelSelection: {
          providerId,
          modelId: readOptionalString(payload.modelId),
        },
      },
    });
  }

  private async isGitWorktreeClean(workspacePath: string): Promise<boolean> {
    try {
      const { stdout } = await execFileAsync("git", ["status", "--porcelain"], {
        cwd: workspacePath,
      });
      return stdout.trim().length === 0;
    } catch {
      return false;
    }
  }
}

import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { RemoteBridgeSessionCreateRouter } from "./remote-bridge-session-create-router";

const execFileAsync = promisify(execFile);
const COMMAND = "development-tree:node-start";
const DEVELOPMENT_TREE_STAGE_PREFIX = "development_tree/";
const PRODUCT_PART_STAGE_RE =
  /^development_tree\/materialized\/product-parts\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

type SendCommandError = (
  clientId: string,
  command: string,
  message: string,
  code: string
) => void;

const readOptionalString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const directoryExists = async (absolutePath: string): Promise<boolean> =>
  Boolean((await stat(absolutePath).catch(() => null))?.isDirectory());

export class RemoteBridgeDevelopmentTreeNodeCommandRouter {
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
        "Core acceptance check failed for Development Tree node start: invalid payload. Required: absolute workspacePath, workspaceSlug, providerId, and workflowPath starting with development_tree/.",
        "invalid_payload"
      );
      return;
    }
    if (!(await this.isGitWorktreeClean(workspacePath))) {
      this.sendCommandError(
        clientId,
        COMMAND,
        "Core acceptance check failed for Development Tree node start: workspace Git status is dirty. Commit or clean the workspace, then start this node again.",
        "dirty_worktree"
      );
      return;
    }
    if (!PRODUCT_PART_STAGE_RE.test(workflowPath)) {
      this.sendCommandError(
        clientId,
        COMMAND,
        "Core acceptance check failed for Development Tree node start: Product Part Development Brief is pending. Start only Product Part nodes in this wave.",
        "product_part_brief_pending"
      );
      return;
    }
    if (
      !(await directoryExists(
        path.join(workspacePath, ".codeai-hub", workspaceSlug, workflowPath)
      ))
    ) {
      this.sendCommandError(
        clientId,
        COMMAND,
        `Core acceptance check failed for Development Tree node start: node folder is not materialized for ${workflowPath}. Refresh the Development Tree read model and retry only after the node appears as startable.`,
        "node_not_found"
      );
      return;
    }
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

import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type { Logger } from "../telemetry/logger";

const TEMPLATE_SYNC_STATE_RELATIVE_PATH =
  ".codeai-hub/templates/.template-sync-state.json";
const TEMPLATE_BACKUP_ROOT_RELATIVE_PATH = ".codeai-hub/templates/.backups";
const TEMPLATE_ROOT_PREFIX_RE = /^\.codeai-hub\/templates\//;

export type TemplateUpdateResolutionAction =
  | "backup-and-replace"
  | "preserve-current"
  | "replace-with-incoming";

export interface PendingTemplateUpdate {
  readonly destinationPath: string;
  readonly destinationRelativePath: string;
  readonly id: string;
  readonly incomingPath: string;
  readonly incomingRelativePath: string;
  readonly pendingBundledHash: string;
}

export interface TemplateUpdateResolutionRequest {
  readonly action: TemplateUpdateResolutionAction;
  readonly id: string;
}

export interface TemplateUpdateResolutionResult {
  readonly action: TemplateUpdateResolutionAction;
  readonly backupPath?: string;
  readonly error?: string;
  readonly id: string;
  readonly pendingUpdates: readonly PendingTemplateUpdate[];
  readonly status: "error" | "not_found" | "resolved";
}

interface TemplateSyncStateRecord {
  readonly bundledHash?: string;
  readonly destinationRelativePath: string;
  readonly dismissedBundledHash?: string;
  readonly incomingRelativePath?: string;
  readonly pendingBundledHash?: string;
  readonly updatedAt: string;
}

interface TemplateSyncStateFile {
  readonly templates: Record<string, TemplateSyncStateRecord>;
  readonly version: 1;
}

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const backupTimestamp = (): string =>
  new Date().toISOString().replace(/[:.]/g, "-");

export class TemplateUpdateResolutionService {
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async listPendingUpdates(): Promise<readonly PendingTemplateUpdate[]> {
    const home = this.resolveHome();
    if (!home) {
      return [];
    }
    return this.collectPendingUpdates(home, await this.loadSyncState(home));
  }

  async resolvePendingUpdate(
    request: TemplateUpdateResolutionRequest
  ): Promise<TemplateUpdateResolutionResult> {
    const home = this.resolveHome();
    if (!home) {
      return {
        action: request.action,
        id: request.id,
        pendingUpdates: [],
        status: "error",
        error: "Home directory is unavailable",
      };
    }

    const state = await this.loadSyncState(home);
    const record = state.templates[request.id];
    if (!(record?.pendingBundledHash && record.incomingRelativePath)) {
      return this.notFoundResult(home, state, request);
    }

    try {
      const backupPath = await this.applyResolution(home, record, request);
      state.templates[request.id] = this.resolveRecord(record, request.action);
      await this.saveSyncState(home, state);
      const pendingUpdates = await this.collectPendingUpdates(home, state);
      this.logger.info("Template update resolution applied", {
        action: request.action,
        backupPath,
        templateId: request.id,
      });
      return {
        action: request.action,
        backupPath,
        id: request.id,
        pendingUpdates,
        status: "resolved",
      };
    } catch (error) {
      const message = toErrorMessage(error);
      this.logger.warn("Template update resolution failed", {
        action: request.action,
        error: message,
        templateId: request.id,
      });
      return {
        action: request.action,
        error: message,
        id: request.id,
        pendingUpdates: await this.collectPendingUpdates(home, state),
        status: "error",
      };
    }
  }

  private async applyResolution(
    home: string,
    record: TemplateSyncStateRecord,
    request: TemplateUpdateResolutionRequest
  ): Promise<string | undefined> {
    const destinationPath = path.join(home, record.destinationRelativePath);
    const incomingPath = path.join(home, record.incomingRelativePath ?? "");

    if (request.action === "preserve-current") {
      await fs.rm(incomingPath, { force: true });
      return undefined;
    }

    await fs.mkdir(path.dirname(destinationPath), { recursive: true });
    const backupPath =
      request.action === "backup-and-replace"
        ? await this.backupCurrentTemplate(home, record, destinationPath)
        : undefined;
    await fs.copyFile(incomingPath, destinationPath);
    await fs.rm(incomingPath, { force: true });
    return backupPath;
  }

  private async backupCurrentTemplate(
    home: string,
    record: TemplateSyncStateRecord,
    destinationPath: string
  ): Promise<string | undefined> {
    try {
      await fs.access(destinationPath);
    } catch {
      return undefined;
    }

    const backupPath = path.join(
      home,
      TEMPLATE_BACKUP_ROOT_RELATIVE_PATH,
      backupTimestamp(),
      record.destinationRelativePath.replace(TEMPLATE_ROOT_PREFIX_RE, "")
    );
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.copyFile(destinationPath, backupPath);
    return backupPath;
  }

  private resolveRecord(
    record: TemplateSyncStateRecord,
    action: TemplateUpdateResolutionAction
  ): TemplateSyncStateRecord {
    if (action === "preserve-current") {
      return {
        bundledHash: record.bundledHash,
        destinationRelativePath: record.destinationRelativePath,
        dismissedBundledHash: record.pendingBundledHash,
        updatedAt: new Date().toISOString(),
      };
    }

    return {
      bundledHash: record.pendingBundledHash,
      destinationRelativePath: record.destinationRelativePath,
      updatedAt: new Date().toISOString(),
    };
  }

  private async collectPendingUpdates(
    home: string,
    state: TemplateSyncStateFile
  ): Promise<readonly PendingTemplateUpdate[]> {
    const updates: PendingTemplateUpdate[] = [];
    for (const [id, record] of Object.entries(state.templates)) {
      if (!(record.pendingBundledHash && record.incomingRelativePath)) {
        continue;
      }
      const incomingPath = path.join(home, record.incomingRelativePath);
      try {
        await fs.access(incomingPath);
      } catch {
        continue;
      }
      updates.push({
        id,
        destinationPath: path.join(home, record.destinationRelativePath),
        destinationRelativePath: record.destinationRelativePath,
        incomingPath,
        incomingRelativePath: record.incomingRelativePath,
        pendingBundledHash: record.pendingBundledHash,
      });
    }
    return updates;
  }

  private notFoundResult(
    home: string,
    state: TemplateSyncStateFile,
    request: TemplateUpdateResolutionRequest
  ): Promise<TemplateUpdateResolutionResult> {
    return this.collectPendingUpdates(home, state).then((pendingUpdates) => ({
      action: request.action,
      id: request.id,
      pendingUpdates,
      status: "not_found",
    }));
  }

  private async loadSyncState(home: string): Promise<TemplateSyncStateFile> {
    try {
      const raw = await fs.readFile(
        path.join(home, TEMPLATE_SYNC_STATE_RELATIVE_PATH),
        "utf8"
      );
      const parsed = JSON.parse(raw) as Partial<TemplateSyncStateFile>;
      if (parsed.version === 1 && parsed.templates) {
        return { version: 1, templates: parsed.templates };
      }
    } catch {
      // Missing or invalid state means there is nothing pending to resolve.
    }
    return { version: 1, templates: {} };
  }

  private async saveSyncState(
    home: string,
    state: TemplateSyncStateFile
  ): Promise<void> {
    const statePath = path.join(home, TEMPLATE_SYNC_STATE_RELATIVE_PATH);
    await fs.mkdir(path.dirname(statePath), { recursive: true });
    await fs.writeFile(
      statePath,
      `${JSON.stringify(state, null, 2)}\n`,
      "utf8"
    );
  }

  private resolveHome(): string | null {
    const home = homedir();
    return home || null;
  }
}

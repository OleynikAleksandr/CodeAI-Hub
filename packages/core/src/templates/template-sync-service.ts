import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type { Logger } from "../telemetry/logger";
import {
  BUNDLED_TEMPLATE_SOURCES,
  type BundledTemplateSource,
} from "./bundled-templates";

const pkg = require("../../package.json") as { version?: string };

type TemplateSyncOutcome =
  | "installed"
  | "preserved"
  | "updated"
  | "up-to-date"
  | "error";

interface TemplateSyncResult {
  readonly error?: string;
  readonly id: string;
  readonly outcome: TemplateSyncOutcome;
  readonly path: string;
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

interface TemplateSyncServiceOptions {
  readonly sources?: readonly BundledTemplateSource[];
  readonly syncVersion?: string;
}

const normalizeContent = (value: string): string =>
  value.replace(/\r\n/g, "\n").trimEnd();

const hashContent = (value: string): string =>
  createHash("sha256").update(value, "utf8").digest("hex");

const sanitizeVersionSegment = (value: string): string =>
  value.replace(/[^0-9A-Za-z._-]/g, "_");

const TEMPLATE_SYNC_STATE_RELATIVE_PATH =
  ".codeai-hub/templates/.template-sync-state.json";
const TEMPLATE_INCOMING_ROOT_RELATIVE_PATH = ".codeai-hub/templates/.incoming";
const TEMPLATE_ROOT_RELATIVE_PATH = ".codeai-hub/templates/";

const LEGACY_TEMPLATE_RELATIVE_PATHS = [
  ".codeai-hub/templates/description/reviewer-prompt.md",
  ".codeai-hub/templates/description/reviewer-template.md",
  ".codeai-hub/templates/virtual_simulation/virtual-simulation-template.md",
  ".codeai-hub/templates/diagram_modules/modules-diagram-prompt.md",
  ".codeai-hub/templates/diagram_modules/modules-diagram-template.mmd",
  ".codeai-hub/templates/diagram_facades/facades-graph-prompt.md",
  ".codeai-hub/templates/diagram_facades/facades-graph-template.mmd",
  ".codeai-hub/templates/diagram_facades/facade-map-prompt.md",
  ".codeai-hub/templates/diagram_facades/facade-map-template.md",
  ".codeai-hub/templates/diagram_facades/facade-map-field-reference.md",
  ".codeai-hub/templates/diagram_facades/facade-map-merge-rules.md",
  ".codeai-hub/templates/diagram_modules/module-inventory-prompt.md",
  ".codeai-hub/templates/diagram_modules/module-inventory-template.md",
  ".codeai-hub/templates/diagram_modules/module-inventory-field-reference.md",
  ".codeai-hub/templates/diagram_modules/module-inventory-merge-rules.md",
] as const;

export class TemplateSyncService {
  private readonly logger: Logger;
  private readonly sources: readonly BundledTemplateSource[];
  private readonly syncVersion: string;

  constructor(logger: Logger, options: TemplateSyncServiceOptions = {}) {
    this.logger = logger;
    this.sources = options.sources ?? BUNDLED_TEMPLATE_SOURCES;
    this.syncVersion = sanitizeVersionSegment(
      options.syncVersion ?? pkg.version ?? "unknown"
    );
  }

  async sync(): Promise<void> {
    const home = homedir();
    if (!home) {
      this.logger.warn("Template sync skipped", {
        reason: "Home directory is unavailable",
      });
      return;
    }

    const state = await this.loadSyncState(home);
    const results: TemplateSyncResult[] = [];
    for (const source of this.sources) {
      results.push(await this.syncTemplate(home, state, source));
    }
    await this.saveSyncState(home, state);
    const removedLegacyPaths = await this.removeLegacyTemplates(home);

    const summary = results.reduce(
      (acc, item) => {
        acc[item.outcome] += 1;
        return acc;
      },
      { installed: 0, preserved: 0, updated: 0, "up-to-date": 0, error: 0 }
    );

    this.logger.info("Template sync completed", {
      installed: summary.installed,
      preserved: summary.preserved,
      updated: summary.updated,
      upToDate: summary["up-to-date"],
      errors: summary.error,
      removedLegacyTemplates: removedLegacyPaths,
    });
  }

  private async removeLegacyTemplates(home: string): Promise<number> {
    let removedCount = 0;
    for (const relativePath of LEGACY_TEMPLATE_RELATIVE_PATHS) {
      const absolutePath = path.join(home, relativePath);
      try {
        await fs.unlink(absolutePath);
        removedCount += 1;
        this.logger.info("Removed legacy template", {
          path: absolutePath,
        });
      } catch {
        // Ignore missing files and filesystem errors to keep sync resilient.
      }
    }
    return removedCount;
  }

  private async syncTemplate(
    home: string,
    state: TemplateSyncStateFile,
    source: BundledTemplateSource
  ): Promise<TemplateSyncResult> {
    const decoded = this.decodeBase64(source);
    if (!decoded) {
      const message = "Bundled template content is empty";
      this.logger.warn("Template sync failed", {
        templateId: source.id,
        reason: message,
      });
      return { id: source.id, path: "", outcome: "error", error: message };
    }

    const normalizedBundled = normalizeContent(decoded);
    const bundledHash = hashContent(normalizedBundled);
    if (!normalizedBundled) {
      const message = "Bundled template content is blank";
      this.logger.warn("Template sync failed", {
        templateId: source.id,
        reason: message,
      });
      return { id: source.id, path: "", outcome: "error", error: message };
    }

    const destinationPath = path.join(home, source.destinationRelativePath);
    let existing: string | null = null;
    try {
      existing = await fs.readFile(destinationPath, "utf8");
    } catch {
      existing = null;
    }

    const normalizedExisting =
      existing === null ? null : normalizeContent(existing);
    if (normalizedExisting === normalizedBundled) {
      this.recordSyncedTemplate(state, source, bundledHash);
      return { id: source.id, path: destinationPath, outcome: "up-to-date" };
    }

    const existingHash =
      normalizedExisting === null ? null : hashContent(normalizedExisting);
    const existingStateRecord = state.templates[source.id];
    const previousBundledHash = existingStateRecord?.bundledHash;
    const isUserModified =
      existingHash !== null &&
      (!previousBundledHash || existingHash !== previousBundledHash);

    try {
      if (isUserModified) {
        if (existingStateRecord?.dismissedBundledHash === bundledHash) {
          this.recordDismissedTemplate(state, source, existingStateRecord);
          return { id: source.id, path: destinationPath, outcome: "preserved" };
        }

        const incomingRelativePath = await this.preserveIncomingTemplate(
          home,
          source,
          normalizedBundled
        );
        this.recordPreservedTemplate(
          state,
          source,
          bundledHash,
          incomingRelativePath
        );
        this.logger.info("Template user edits preserved", {
          templateId: source.id,
          path: destinationPath,
          incomingPath: path.join(home, incomingRelativePath),
        });
        return { id: source.id, path: destinationPath, outcome: "preserved" };
      }

      await fs.mkdir(path.dirname(destinationPath), { recursive: true });
      await fs.writeFile(destinationPath, `${normalizedBundled}\n`, "utf8");
      const outcome = existing === null ? "installed" : "updated";
      this.recordSyncedTemplate(state, source, bundledHash);
      this.logger.info("Template synced", {
        templateId: source.id,
        path: destinationPath,
        outcome,
      });
      return { id: source.id, path: destinationPath, outcome };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn("Template sync failed", {
        templateId: source.id,
        path: destinationPath,
        error: message,
      });
      return {
        id: source.id,
        path: destinationPath,
        outcome: "error",
        error: message,
      };
    }
  }

  private decodeBase64(source: BundledTemplateSource): string | null {
    const raw = source.base64.trim();
    if (!raw) {
      return null;
    }
    try {
      return Buffer.from(raw, "base64").toString("utf8");
    } catch {
      return null;
    }
  }

  private async loadSyncState(home: string): Promise<TemplateSyncStateFile> {
    try {
      const raw = await fs.readFile(
        path.join(home, TEMPLATE_SYNC_STATE_RELATIVE_PATH),
        "utf8"
      );
      const parsed = JSON.parse(raw) as Partial<TemplateSyncStateFile>;
      if (parsed.version === 1 && parsed.templates) {
        return {
          version: 1,
          templates: parsed.templates,
        };
      }
    } catch {
      // Missing or invalid state should not block template materialization.
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

  private async preserveIncomingTemplate(
    home: string,
    source: BundledTemplateSource,
    normalizedBundled: string
  ): Promise<string> {
    const incomingRelativePath = this.resolveIncomingRelativePath(source);
    const incomingPath = path.join(home, incomingRelativePath);
    await fs.mkdir(path.dirname(incomingPath), { recursive: true });
    await fs.writeFile(incomingPath, `${normalizedBundled}\n`, "utf8");
    return incomingRelativePath;
  }

  private resolveIncomingRelativePath(source: BundledTemplateSource): string {
    const destinationUnderTemplateRoot =
      source.destinationRelativePath.startsWith(TEMPLATE_ROOT_RELATIVE_PATH)
        ? source.destinationRelativePath.slice(
            TEMPLATE_ROOT_RELATIVE_PATH.length
          )
        : source.destinationRelativePath;
    return path.join(
      TEMPLATE_INCOMING_ROOT_RELATIVE_PATH,
      this.syncVersion,
      destinationUnderTemplateRoot
    );
  }

  private recordSyncedTemplate(
    state: TemplateSyncStateFile,
    source: BundledTemplateSource,
    bundledHash: string
  ): void {
    state.templates[source.id] = {
      bundledHash,
      destinationRelativePath: source.destinationRelativePath,
      updatedAt: new Date().toISOString(),
    };
  }

  private recordPreservedTemplate(
    state: TemplateSyncStateFile,
    source: BundledTemplateSource,
    pendingBundledHash: string,
    incomingRelativePath: string
  ): void {
    const previous = state.templates[source.id];
    state.templates[source.id] = {
      bundledHash: previous?.bundledHash,
      destinationRelativePath: source.destinationRelativePath,
      incomingRelativePath,
      pendingBundledHash,
      updatedAt: new Date().toISOString(),
    };
  }

  private recordDismissedTemplate(
    state: TemplateSyncStateFile,
    source: BundledTemplateSource,
    previous: TemplateSyncStateRecord
  ): void {
    state.templates[source.id] = {
      bundledHash: previous.bundledHash,
      destinationRelativePath: source.destinationRelativePath,
      dismissedBundledHash: previous.dismissedBundledHash,
      updatedAt: new Date().toISOString(),
    };
  }
}

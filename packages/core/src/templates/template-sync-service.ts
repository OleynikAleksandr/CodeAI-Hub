import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type { Logger } from "../telemetry/logger";
import {
  BUNDLED_TEMPLATE_SOURCES,
  type BundledTemplateSource,
} from "./bundled-templates";

type TemplateSyncOutcome = "installed" | "updated" | "up-to-date" | "error";

interface TemplateSyncResult {
  readonly error?: string;
  readonly id: string;
  readonly outcome: TemplateSyncOutcome;
  readonly path: string;
}

const normalizeContent = (value: string): string =>
  value.replace(/\r\n/g, "\n").trimEnd();

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

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async sync(): Promise<void> {
    const results: TemplateSyncResult[] = [];
    for (const source of BUNDLED_TEMPLATE_SOURCES) {
      results.push(await this.syncTemplate(source));
    }
    const removedLegacyPaths = await this.removeLegacyTemplates();

    const summary = results.reduce(
      (acc, item) => {
        acc[item.outcome] += 1;
        return acc;
      },
      { installed: 0, updated: 0, "up-to-date": 0, error: 0 }
    );

    this.logger.info("Template sync completed", {
      installed: summary.installed,
      updated: summary.updated,
      upToDate: summary["up-to-date"],
      errors: summary.error,
      removedLegacyTemplates: removedLegacyPaths,
    });
  }

  private async removeLegacyTemplates(): Promise<number> {
    const home = homedir();
    if (!home) {
      return 0;
    }

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
    source: BundledTemplateSource
  ): Promise<TemplateSyncResult> {
    const home = homedir();
    if (!home) {
      const message = "Home directory is unavailable";
      this.logger.warn("Template sync skipped", {
        templateId: source.id,
        reason: message,
      });
      return { id: source.id, path: "", outcome: "error", error: message };
    }

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
      return { id: source.id, path: destinationPath, outcome: "up-to-date" };
    }

    try {
      await fs.mkdir(path.dirname(destinationPath), { recursive: true });
      await fs.writeFile(destinationPath, `${normalizedBundled}\n`, "utf8");
      const outcome = existing === null ? "installed" : "updated";
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
}

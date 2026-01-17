import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type { Logger } from "../telemetry/logger";
import {
  BUNDLED_TEMPLATE_SOURCES,
  type BundledTemplateSource,
} from "./bundled-templates";

type TemplateSyncOutcome = "installed" | "updated" | "up-to-date" | "error";

type TemplateSyncResult = {
  readonly id: string;
  readonly path: string;
  readonly outcome: TemplateSyncOutcome;
  readonly error?: string;
};

const normalizeContent = (value: string): string =>
  value.replace(/\r\n/g, "\n").trimEnd();

export class TemplateSyncService {
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async sync(): Promise<void> {
    const home = homedir();
    if (home) {
      await this.archiveLegacyIdeaTemplates(home);
    } else {
      this.logger.warn("Legacy template archive skipped", {
        reason: "Home directory is unavailable",
      });
    }
    const results: TemplateSyncResult[] = [];
    for (const source of BUNDLED_TEMPLATE_SOURCES) {
      results.push(await this.syncTemplate(source));
    }

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
    });
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
      existing !== null ? normalizeContent(existing) : null;
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

  private async archiveLegacyIdeaTemplates(home: string): Promise<void> {
    const legacySource = path.join(
      home,
      ".codeai-hub/templates/full-development-flow/idea"
    );
    let stat: Awaited<ReturnType<typeof fs.stat>> | null = null;
    try {
      stat = await fs.stat(legacySource);
    } catch {
      stat = null;
    }
    if (!stat?.isDirectory()) {
      return;
    }

    const entries = await fs.readdir(legacySource);
    if (entries.length === 0) {
      return;
    }

    const legacyRoot = path.join(home, ".codeai-hub/templates/_legacy");
    const destination = await this.resolveLegacyDestination(legacyRoot);

    try {
      await fs.mkdir(legacyRoot, { recursive: true });
      await fs.rename(legacySource, destination);
      this.logger.info("Legacy templates archived", {
        source: legacySource,
        destination,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn("Legacy template archive failed", {
        source: legacySource,
        destination,
        error: message,
      });
    }
  }

  private async resolveLegacyDestination(legacyRoot: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const basePath = path.join(legacyRoot, `idea-${timestamp}`);
    let candidate = basePath;
    let counter = 1;

    while (true) {
      try {
        await fs.stat(candidate);
        candidate = `${basePath}-${counter}`;
        counter += 1;
      } catch {
        return candidate;
      }
    }
  }
}

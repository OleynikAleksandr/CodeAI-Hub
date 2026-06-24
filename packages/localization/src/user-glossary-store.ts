import { promises as fs } from "node:fs";
import path from "node:path";
import { GlossaryValidator } from "./glossary-validator";
import { resolveLocalizationPaths } from "./localization-paths";

export interface UserGlossaryOverrides {
  readonly preserve: readonly string[];
}

interface UserGlossaryStoreOptions {
  readonly glossaryDirectory?: string;
  readonly glossaryValidator?: GlossaryValidator;
}

const USER_GLOSSARY_FILE_NAME = "do-not-translate-terms.txt";
const USER_GLOSSARY_COMMENT_PREFIX = "#";
const USER_GLOSSARY_LINE_SPLIT_PATTERN = /\r?\n/u;
const USER_GLOSSARY_FILE_HEADER_LINES = [
  "# CodeAI Hub do-not-translate glossary",
  "# Add one English term per line. Blank lines and lines starting with # are ignored.",
  "# Edit this file directly in VS Code to preserve product, workflow, and technical terms.",
  "",
] as const;
const SEEDED_PRESERVE_TERMS = [
  "CodeAI Hub",
  "Project Manager",
  "Claude",
  "Codex",
  "Core",
  "Description",
  "Virtual Simulation",
  "Diagram Modules",
  "Diagram Facades",
  "React Flow",
  "VS Code",
  "CLI",
  "SDK",
  "JSON",
  "TypeScript",
  "Markdown",
  "CODEX_HOME",
  "settings.json",
  "config.toml",
  "auth.json",
  "module-map.md",
  "facade-map.md",
  "Final_Description.md",
  "questionnaire.md",
] as const;

const EMPTY_USER_GLOSSARY_OVERRIDES: UserGlossaryOverrides = {
  preserve: [],
};

const parseUserGlossaryOverrides = (raw: string): UserGlossaryOverrides => {
  return {
    preserve: raw
      .split(USER_GLOSSARY_LINE_SPLIT_PATTERN)
      .map((line) => line.trim())
      .filter(
        (line) =>
          line.length > 0 && !line.startsWith(USER_GLOSSARY_COMMENT_PREFIX)
      ),
  };
};

export class UserGlossaryStore {
  private readonly glossaryDirectory: string;
  private readonly glossaryValidator: GlossaryValidator;

  constructor(options: UserGlossaryStoreOptions = {}) {
    this.glossaryDirectory =
      options.glossaryDirectory ?? resolveLocalizationPaths().glossaryDirectory;
    this.glossaryValidator =
      options.glossaryValidator ?? new GlossaryValidator();
  }

  async load(): Promise<UserGlossaryOverrides> {
    try {
      const raw = await fs.readFile(this.userGlossaryPath, "utf8");
      return this.normalize(parseUserGlossaryOverrides(raw));
    } catch {
      return EMPTY_USER_GLOSSARY_OVERRIDES;
    }
  }

  async ensureEditableGlossaryFile(): Promise<string> {
    await fs.mkdir(this.glossaryDirectory, { recursive: true });

    try {
      await fs.access(this.userGlossaryPath);
      return this.userGlossaryPath;
    } catch {
      const seeded = this.normalize({
        preserve: SEEDED_PRESERVE_TERMS,
      });
      await fs.writeFile(this.userGlossaryPath, this.serialize(seeded), "utf8");
      return this.userGlossaryPath;
    }
  }

  async save(overrides: UserGlossaryOverrides): Promise<UserGlossaryOverrides> {
    const normalized = this.normalize(overrides);

    await fs.mkdir(path.dirname(this.userGlossaryPath), { recursive: true });
    await fs.writeFile(
      this.userGlossaryPath,
      this.serialize(normalized),
      "utf8"
    );

    return normalized;
  }

  private normalize(overrides: UserGlossaryOverrides): UserGlossaryOverrides {
    const validation = this.glossaryValidator.validatePreserveTerms(
      overrides.preserve
    );
    return {
      preserve: validation.preserve,
    };
  }

  private serialize(overrides: UserGlossaryOverrides): string {
    return `${[...USER_GLOSSARY_FILE_HEADER_LINES, ...overrides.preserve].join("\n")}\n`;
  }

  private get userGlossaryPath(): string {
    return path.join(this.glossaryDirectory, USER_GLOSSARY_FILE_NAME);
  }
}

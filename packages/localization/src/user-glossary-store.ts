import { promises as fs } from "node:fs";
import path from "node:path";
import { GlossaryValidator } from "./glossary-validator";
import { resolveLocalizationPaths } from "./localization-paths";

export interface UserGlossaryOverrides {
  readonly preserve: readonly string[];
}

const USER_GLOSSARY_FILE_NAME = "user-overrides.json";

const EMPTY_USER_GLOSSARY_OVERRIDES: UserGlossaryOverrides = {
  preserve: [],
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseUserGlossaryOverrides = (value: unknown): UserGlossaryOverrides => {
  if (!(isRecord(value) && Array.isArray(value.preserve))) {
    return EMPTY_USER_GLOSSARY_OVERRIDES;
  }

  return {
    preserve: value.preserve.filter(
      (term): term is string => typeof term === "string"
    ),
  };
};

export class UserGlossaryStore {
  private readonly glossaryValidator: GlossaryValidator;

  constructor(glossaryValidator = new GlossaryValidator()) {
    this.glossaryValidator = glossaryValidator;
  }

  async load(): Promise<UserGlossaryOverrides> {
    try {
      const raw = await fs.readFile(this.userGlossaryPath, "utf8");
      const parsed = parseUserGlossaryOverrides(JSON.parse(raw) as unknown);
      return this.normalize(parsed);
    } catch {
      return EMPTY_USER_GLOSSARY_OVERRIDES;
    }
  }

  async save(overrides: UserGlossaryOverrides): Promise<UserGlossaryOverrides> {
    const normalized = this.normalize(overrides);

    await fs.mkdir(path.dirname(this.userGlossaryPath), { recursive: true });
    await fs.writeFile(
      this.userGlossaryPath,
      `${JSON.stringify(normalized, null, 2)}\n`,
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

  private get userGlossaryPath(): string {
    return path.join(
      resolveLocalizationPaths().glossaryDirectory,
      USER_GLOSSARY_FILE_NAME
    );
  }
}

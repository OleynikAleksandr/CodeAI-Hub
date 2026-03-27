import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  resolveInitiativeDir,
  resolveInitiativeManifestPath,
  resolveInitiativesRoot,
  resolveUniqueSlug,
  toSlug,
} from "./index";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export interface InitiativeManifest {
  readonly createdAt: string;
  readonly description?: string;
  readonly displayName: string;
  readonly initiativeSlug: string;
  readonly updatedAt: string;
}

const parseInitiativeManifest = (value: unknown): InitiativeManifest | null => {
  if (!isRecord(value)) {
    return null;
  }

  const initiativeSlug = value.initiativeSlug;
  const displayName = value.displayName;
  const createdAt = value.createdAt;
  const updatedAt = value.updatedAt;

  if (
    typeof initiativeSlug !== "string" ||
    typeof displayName !== "string" ||
    typeof createdAt !== "string" ||
    typeof updatedAt !== "string"
  ) {
    return null;
  }

  const description =
    typeof value.description === "string" ? value.description : undefined;
  return {
    initiativeSlug,
    displayName,
    description,
    createdAt,
    updatedAt,
  };
};

const readJsonFile = async (filePath: string): Promise<unknown | null> => {
  try {
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as unknown;
  } catch {
    return null;
  }
};

const listExistingSlugs = async (rootDir: string): Promise<string[]> => {
  try {
    const entries = await readdir(rootDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
};

export class InitiativeStore {
  async list(workspaceRoot: string): Promise<InitiativeManifest[]> {
    const initiativesRoot = resolveInitiativesRoot(workspaceRoot);
    const slugs = await listExistingSlugs(initiativesRoot);
    const result: InitiativeManifest[] = [];

    for (const slug of slugs) {
      const manifestPath = resolveInitiativeManifestPath(workspaceRoot, slug);
      const parsed = parseInitiativeManifest(await readJsonFile(manifestPath));
      if (parsed) {
        result.push(parsed);
      }
    }

    return result;
  }

  async read(
    workspaceRoot: string,
    initiativeSlug: string
  ): Promise<InitiativeManifest | null> {
    const manifestPath = resolveInitiativeManifestPath(
      workspaceRoot,
      initiativeSlug
    );
    return parseInitiativeManifest(await readJsonFile(manifestPath));
  }

  async create(
    workspaceRoot: string,
    input: { readonly displayName: string; readonly description?: string }
  ): Promise<InitiativeManifest> {
    const initiativesRoot = resolveInitiativesRoot(workspaceRoot);
    await mkdir(initiativesRoot, { recursive: true });

    const baseSlug = toSlug(input.displayName);
    const existing = await listExistingSlugs(initiativesRoot);
    const initiativeSlug = resolveUniqueSlug(baseSlug, existing);

    const initiativeDir = resolveInitiativeDir(workspaceRoot, initiativeSlug);
    await mkdir(initiativeDir, { recursive: true });

    const now = new Date().toISOString();
    const manifest: InitiativeManifest = {
      initiativeSlug,
      displayName: input.displayName.trim(),
      description: input.description?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    await writeFile(
      resolveInitiativeManifestPath(workspaceRoot, initiativeSlug),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf-8"
    );

    return manifest;
  }

  async update(
    workspaceRoot: string,
    initiativeSlug: string,
    patch: {
      readonly displayName?: string;
      readonly description?: string | null;
    }
  ): Promise<InitiativeManifest | null> {
    const current = await this.read(workspaceRoot, initiativeSlug);
    if (!current) {
      return null;
    }

    const updatedAt = new Date().toISOString();
    const next: InitiativeManifest = {
      ...current,
      displayName: patch.displayName?.trim() ?? current.displayName,
      description:
        patch.description === null
          ? undefined
          : (patch.description?.trim() ?? current.description),
      updatedAt,
    };

    const manifestPath = resolveInitiativeManifestPath(
      workspaceRoot,
      initiativeSlug
    );
    await mkdir(path.dirname(manifestPath), { recursive: true });
    await writeFile(
      manifestPath,
      `${JSON.stringify(next, null, 2)}\n`,
      "utf-8"
    );
    return next;
  }
}

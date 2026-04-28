import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type {
  EffectiveModelInvocationProfile,
  ModelInvocationInstructionFragment,
} from "./model-invocation-profile-resolver";

export type LoadedModelInvocationInstructionStatus =
  | "code-owned"
  | "loaded"
  | "missing";

export interface LoadedModelInvocationInstructionFragment
  extends ModelInvocationInstructionFragment {
  readonly content?: string;
  readonly path?: string;
  readonly status: LoadedModelInvocationInstructionStatus;
}

interface ModelInvocationInstructionLoaderOptions {
  readonly templateRoot?: string;
}

const normalizeTemplateContent = (value: string): string =>
  value.replace(/\r\n/g, "\n").trimEnd();

export class ModelInvocationInstructionLoader {
  private readonly templateRoot: string;

  constructor(options: ModelInvocationInstructionLoaderOptions = {}) {
    this.templateRoot =
      options.templateRoot ?? path.join(homedir(), ".codeai-hub/templates");
  }

  async load(
    profile: EffectiveModelInvocationProfile
  ): Promise<readonly LoadedModelInvocationInstructionFragment[]> {
    const fragments: LoadedModelInvocationInstructionFragment[] = [];
    for (const fragment of profile.sessionProfile.instructionFragments) {
      fragments.push(await this.loadFragment(fragment));
    }
    return fragments;
  }

  private async loadFragment(
    fragment: ModelInvocationInstructionFragment
  ): Promise<LoadedModelInvocationInstructionFragment> {
    if (fragment.source === "code") {
      return { ...fragment, status: "code-owned" };
    }

    const templatePath = this.resolveTemplatePath(fragment.key);
    try {
      const content = normalizeTemplateContent(
        await fs.readFile(templatePath, "utf8")
      );
      if (!content) {
        return { ...fragment, path: templatePath, status: "missing" };
      }
      return {
        ...fragment,
        content,
        path: templatePath,
        status: "loaded",
      };
    } catch {
      return { ...fragment, path: templatePath, status: "missing" };
    }
  }

  private resolveTemplatePath(key: string): string {
    const root = path.resolve(this.templateRoot);
    const candidate = path.resolve(root, key);
    if (!(candidate === root || candidate.startsWith(`${root}${path.sep}`))) {
      throw new Error(`Template fragment escapes template root: ${key}`);
    }
    return candidate;
  }
}

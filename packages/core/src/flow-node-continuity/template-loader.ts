import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const BUNDLED_TEMPLATES = new Map<string, string>([
  [
    "flow/continuity/create-report-doc.md",
    `# Flow Node Continuity — Create Report (Doc Node)

Create a short continuity report for node \`{{nodeId}}\` (\`{{role}}\`) and save it to:
- \`{{reportPath}}\`

Hard rules:
- Do NOT include chat history.
- Do NOT paste large parts of artifacts (no full docs/code/diffs).
- Write ONLY the report file (atomic write: tmp -> rename).
- Do NOT send any user-facing chat messages.
- When done, reply with EXACTLY ONE line: \`__CODEAIHUB_INTERNAL_CONTINUITY_ACK__\`.

Required structure:

# Continuity Report — {{nodeId}} / {{role}}

## Canonical Artifact
- {{canonicalArtifactPath}}

## References To Read (only if needed)
- <path>: <why>

## Pending From User
- <question or expectation>
`,
  ],
  [
    "flow/continuity/create-report-code.md",
    `# Flow Node Continuity — Create Report (Code Node)

Create a short continuity report for node \`{{nodeId}}\` (\`{{role}}\`) and save it to:
- \`{{reportPath}}\`

Hard rules:
- Do NOT include chat history.
- Do NOT paste code/diffs/logs.
- Write ONLY the report file (atomic write: tmp -> rename).
- Do NOT send any user-facing chat messages.
- When done, reply with EXACTLY ONE line: \`__CODEAIHUB_INTERNAL_CONTINUITY_ACK__\`.

Required structure:

# Continuity Report — {{nodeId}} / {{role}}

## Current Task
- What: <short>
- Scope: <files/packages>
- Acceptance: <criteria>

## Required Reads (ordered)
1. <path>: <why>

## Repo Context
- Branch: <name>
- Last relevant commits:
  - <hash>: <message>

## Gates / Builds (last known)
- \`./scripts/check-architecture.sh\`: <OK/FAIL/NOT RUN>
- \`npx ultracite check\`: <OK/FAIL/NOT RUN>
- \`npx ts-prune\`: <OK/FAIL/NOT RUN>
- \`npx jscpd ...\`: <OK/FAIL/NOT RUN>
- \`npm run check:links\`: <OK/FAIL/NOT RUN>
- Target build: <command>: <OK/FAIL/NOT RUN>

## Next Step
- <single next action>
`,
  ],
  [
    "flow/continuity/resume.md",
    `# Flow Node Continuity — Resume

Read the latest continuity report:
- \`{{reportPath}}\`

Continue work in node \`{{nodeId}}\` as role \`{{role}}\`.

Hard rules (MUST):
- Do NOT write or update any continuity report files on your own.
- The ONLY time you may write a continuity report is when Core sends an explicit instruction titled "Flow Node Continuity — Create Report ..." AND it includes BOTH a temp path and a final report path to write.
- If you did not receive that Create Report instruction, you MUST NOT create/update any files under \`.codeai-hub/**/flow/nodes/**/continuity/reports/\`.
- Do NOT invent timestamps/paths for reports.
- Do NOT send any user-facing chat messages.
- When ready, reply with EXACTLY ONE line: \`Ready to continue working.\`.
`,
  ],
]);

const normalizeTemplateId = (templateId: string): string => {
  const normalizedInput = templateId.trim().replace(/\\\\/g, "/");
  if (!normalizedInput) {
    throw new Error("templateId is empty");
  }
  if (path.isAbsolute(normalizedInput)) {
    throw new Error(`templateId must be relative: ${templateId}`);
  }

  const normalized = path.posix.normalize(normalizedInput);
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length === 0) {
    throw new Error(`templateId must be a non-empty path: ${templateId}`);
  }
  if (parts.some((part) => part === "..")) {
    throw new Error(`templateId must not contain '..': ${templateId}`);
  }

  return parts.join("/");
};

const resolveTemplatePath = (
  templatesDir: string,
  templateId: string
): string => {
  const templatesRoot = path.resolve(templatesDir);
  const resolved = path.resolve(templatesRoot, ...templateId.split("/"));
  if (!resolved.startsWith(`${templatesRoot}${path.sep}`)) {
    throw new Error(`templateId escapes templatesDir: ${templateId}`);
  }
  return resolved;
};

export type TemplateLoaderOptions = {
  readonly templatesDir: string;
};

export class TemplateLoader {
  readonly #templatesDir: string;

  constructor(options: TemplateLoaderOptions) {
    this.#templatesDir = options.templatesDir;
    this.#syncBundledTemplatesToDisk();
  }

  load(templateId: string): string {
    const normalizedTemplateId = normalizeTemplateId(templateId);
    const templatePath = resolveTemplatePath(
      this.#templatesDir,
      normalizedTemplateId
    );

    if (existsSync(templatePath)) {
      try {
        return readFileSync(templatePath, "utf8");
      } catch {
        // Fallback to bundled template.
      }
    }

    const bundled = BUNDLED_TEMPLATES.get(normalizedTemplateId);
    if (!bundled) {
      throw new Error(`Unknown continuity templateId: ${templateId}`);
    }
    return bundled;
  }

  #syncBundledTemplatesToDisk(): void {
    const templatesRoot = path.resolve(this.#templatesDir);
    for (const [templateId, content] of BUNDLED_TEMPLATES.entries()) {
      const templatePath = resolveTemplatePath(templatesRoot, templateId);
      mkdirSync(path.dirname(templatePath), { recursive: true });

      let existing: string | null = null;
      if (existsSync(templatePath)) {
        try {
          existing = readFileSync(templatePath, "utf8");
        } catch {
          existing = null;
        }
      }
      if (existing === content) {
        continue;
      }
      writeFileSync(templatePath, content, "utf8");
    }
  }
}

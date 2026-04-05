#!/usr/bin/env node

// Generates packages/core/src/templates/bundled-templates.ts from source asset files.
// Run: node scripts/generate-bundled-templates.js
// Integrated into build-core.sh (runs before tsc).

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(
  path.dirname(require.resolve("./generate-bundled-templates.js")),
  ".."
);
const OUTPUT = path.join(
  ROOT,
  "packages/core/src/templates/bundled-templates.ts"
);

// Manifest: id, source asset path (relative to repo root), destination path (relative to home dir).
// Diagram workflow assets are bundled from dedicated agent packages into visible home templates.
const TEMPLATES = [
  {
    audience: "internal_agent_instructions",
    id: "description-collector-prompt",
    source:
      "packages/agents/description-agent/assets/description-collector-prompt.md",
    dest: ".codeai-hub/templates/description/description-collector-prompt.md",
  },
  {
    audience: "internal_agent_instructions",
    id: "description-template",
    source: "packages/agents/description-agent/assets/description-template.md",
    dest: ".codeai-hub/templates/description/description-template.md",
  },
  {
    audience: "artifacts_for_the_user",
    id: "description-questionnaire-template",
    source:
      "packages/agents/description-agent/assets/questionnaire-template.md",
    dest: ".codeai-hub/templates/description/questionnaire-template.md",
  },
  {
    audience: "internal_agent_instructions",
    id: "virtual-simulation-prompt",
    source: "packages/core/src/templates/source/virtual-simulation-prompt.md",
    dest: ".codeai-hub/templates/virtual_simulation/virtual-simulation-prompt.md",
  },
  {
    audience: "internal_agent_instructions",
    id: "application-foundation-envelope-prompt",
    source:
      "packages/core/src/templates/source/application-foundation-envelope-prompt.md",
    dest: ".codeai-hub/templates/application_foundation_envelope/application-foundation-envelope-prompt.md",
  },
  {
    audience: "internal_agent_instructions",
    id: "diagram-modules-prompt",
    source:
      "packages/agents/diagram-modules-agent/assets/diagram-modules-prompt.md",
    dest: ".codeai-hub/templates/diagram_modules/diagram-modules-prompt.md",
  },
  {
    audience: "internal_agent_instructions",
    id: "product-parts-index-template",
    source:
      "packages/agents/diagram-modules-agent/assets/product-parts-index-template.md",
    dest: ".codeai-hub/templates/diagram_modules/product-parts-index-template.md",
  },
  {
    audience: "internal_agent_instructions",
    id: "product-part-template",
    source:
      "packages/agents/diagram-modules-agent/assets/product-part-template.md",
    dest: ".codeai-hub/templates/diagram_modules/product-part-template.md",
  },
  {
    audience: "internal_agent_instructions",
    id: "diagram-modules-field-reference",
    source:
      "packages/agents/diagram-modules-agent/assets/diagram-modules-field-reference.md",
    dest: ".codeai-hub/templates/diagram_modules/diagram-modules-field-reference.md",
  },
  {
    audience: "internal_agent_instructions",
    id: "diagram-modules-merge-rules",
    source:
      "packages/agents/diagram-modules-agent/assets/diagram-modules-merge-rules.md",
    dest: ".codeai-hub/templates/diagram_modules/diagram-modules-merge-rules.md",
  },
];

function generate() {
  const entries = [];
  let missing = false;

  for (const t of TEMPLATES) {
    const absSource = path.join(ROOT, t.source);
    if (!fs.existsSync(absSource)) {
      console.error(`❌ Missing source: ${t.source}`);
      missing = true;
      continue;
    }
    const content = fs.readFileSync(absSource);
    const b64 = content.toString("base64");
    entries.push(
      `  {\n    id: "${t.id}",\n    audience: "${t.audience}",\n    destinationRelativePath:\n      "${t.dest}",\n    base64:\n      "${b64}",\n  }`
    );
  }

  if (missing) {
    process.exit(1);
  }

  const output = `export type BundledTemplateAudience =
  | "artifacts_for_the_user"
  | "internal_agent_instructions";

export interface BundledTemplateSource {
  readonly audience: BundledTemplateAudience;
  readonly base64: string;
  readonly destinationRelativePath: string;
  readonly id: string;
}

export const BUNDLED_TEMPLATE_SOURCES: readonly BundledTemplateSource[] = [
${entries.join(",\n")},
];
`;

  fs.writeFileSync(OUTPUT, output, "utf8");
  console.log(
    `✅ Generated bundled-templates.ts (${TEMPLATES.length} templates)`
  );
}

generate();

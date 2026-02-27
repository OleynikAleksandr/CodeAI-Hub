#!/usr/bin/env node

// Generates packages/core/src/templates/bundled-templates.ts from source asset files.
// Run: node scripts/generate-bundled-templates.js
// Integrated into build-core.sh (runs before tsc).

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(
  ROOT,
  "packages/core/src/templates/bundled-templates.ts"
);

// Manifest: id, source asset path (relative to repo root), destination path (relative to home dir).
// Source files for active agents live in packages/agents/*/assets/.
// Source files for deleted agents live in packages/core/src/templates/source/.
const TEMPLATES = [
  {
    id: "description-collector-prompt",
    source:
      "packages/agents/description-agent/assets/description-collector-prompt.md",
    dest: ".codeai-hub/templates/description/description-collector-prompt.md",
  },
  {
    id: "description-reviewer-prompt",
    source: "packages/agents/reviewer-agent/assets/reviewer-prompt.md",
    dest: ".codeai-hub/templates/description/reviewer-prompt.md",
  },
  {
    id: "description-template",
    source: "packages/agents/description-agent/assets/description-template.md",
    dest: ".codeai-hub/templates/description/description-template.md",
  },
  {
    id: "description-questionnaire-template",
    source:
      "packages/agents/description-agent/assets/questionnaire-template.md",
    dest: ".codeai-hub/templates/description/questionnaire-template.md",
  },
  {
    id: "virtual-simulation-prompt",
    source: "packages/core/src/templates/source/virtual-simulation-prompt.md",
    dest: ".codeai-hub/templates/virtual_simulation/virtual-simulation-prompt.md",
  },
  {
    id: "virtual-simulation-template",
    source: "packages/core/src/templates/source/virtual-simulation-template.md",
    dest: ".codeai-hub/templates/virtual_simulation/virtual-simulation-template.md",
  },
  {
    id: "modules-diagram-prompt",
    source: "packages/core/src/templates/source/modules-diagram-prompt.md",
    dest: ".codeai-hub/templates/diagram_modules/modules-diagram-prompt.md",
  },
  {
    id: "modules-diagram-template",
    source: "packages/core/src/templates/source/modules-diagram-template.mmd",
    dest: ".codeai-hub/templates/diagram_modules/modules-diagram-template.mmd",
  },
  {
    id: "facades-graph-prompt",
    source: "packages/core/src/templates/source/facades-graph-prompt.md",
    dest: ".codeai-hub/templates/diagram_facades/facades-graph-prompt.md",
  },
  {
    id: "facades-graph-template",
    source: "packages/core/src/templates/source/facades-graph-template.mmd",
    dest: ".codeai-hub/templates/diagram_facades/facades-graph-template.mmd",
  },
  {
    id: "description-reviewer-template",
    source: "packages/agents/reviewer-agent/assets/reviewer-template.md",
    dest: ".codeai-hub/templates/description/reviewer-template.md",
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
      `  {\n    id: "${t.id}",\n    destinationRelativePath:\n      "${t.dest}",\n    base64:\n      "${b64}",\n  }`
    );
  }

  if (missing) {
    process.exit(1);
  }

  const output = `export type BundledTemplateSource = {
  readonly id: string;
  readonly destinationRelativePath: string;
  readonly base64: string;
};

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

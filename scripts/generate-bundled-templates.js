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
// Diagram workflow assets are bundled from dedicated agent packages into visible home templates.
const TEMPLATES = [
  {
    id: "description-collector-prompt",
    source:
      "packages/agents/description-agent/assets/description-collector-prompt.md",
    dest: ".codeai-hub/templates/description/description-collector-prompt.md",
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
    id: "module-map-prompt",
    source: "packages/agents/diagram-modules-agent/assets/module-map-prompt.md",
    dest: ".codeai-hub/templates/diagram_modules/module-map-prompt.md",
  },
  {
    id: "module-map-template",
    source:
      "packages/agents/diagram-modules-agent/assets/module-map-template.md",
    dest: ".codeai-hub/templates/diagram_modules/module-map-template.md",
  },
  {
    id: "module-map-field-reference",
    source:
      "packages/agents/diagram-modules-agent/assets/module-map-field-reference.md",
    dest: ".codeai-hub/templates/diagram_modules/module-map-field-reference.md",
  },
  {
    id: "module-map-merge-rules",
    source:
      "packages/agents/diagram-modules-agent/assets/module-map-merge-rules.md",
    dest: ".codeai-hub/templates/diagram_modules/module-map-merge-rules.md",
  },
  {
    id: "facade-map-prompt",
    source: "packages/agents/diagram-facades-agent/assets/facade-map-prompt.md",
    dest: ".codeai-hub/templates/diagram_facades/facade-map-prompt.md",
  },
  {
    id: "facade-map-template",
    source:
      "packages/agents/diagram-facades-agent/assets/facade-map-template.md",
    dest: ".codeai-hub/templates/diagram_facades/facade-map-template.md",
  },
  {
    id: "facade-map-field-reference",
    source:
      "packages/agents/diagram-facades-agent/assets/facade-map-field-reference.md",
    dest: ".codeai-hub/templates/diagram_facades/facade-map-field-reference.md",
  },
  {
    id: "facade-map-merge-rules",
    source:
      "packages/agents/diagram-facades-agent/assets/facade-map-merge-rules.md",
    dest: ".codeai-hub/templates/diagram_facades/facade-map-merge-rules.md",
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

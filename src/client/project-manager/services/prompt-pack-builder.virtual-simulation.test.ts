import assert from "node:assert/strict";
import test from "node:test";
import { buildWorkflowPromptPack } from "./prompt-pack-builder";

const PROMPT_MATERIALIZER_CACHE_DIMENSIONS = [
  "chatLanguage",
  "artifactLanguage",
  "promptPackVersion",
  "appVersion",
] as const;

test("virtual simulation prompt pack separates chat and artifact languages", () => {
  const pack = buildWorkflowPromptPack({
    artifactLanguage: "ru",
    chatLanguage: "uk",
    stage: "virtual_simulation",
    workspacePath: "/tmp/workspace",
    workspaceSlug: "demo-workspace",
    prompt: "",
    questionnairePath: ".codeai-hub/demo-workspace/description/Final_Description.md",
    sourceArtifacts: [
      {
        content: "# Final Description\n\nUser-facing source content.\n",
        label: "Final_Description.md",
        relativePath: ".codeai-hub/demo-workspace/description/Final_Description.md",
      },
    ],
    templatePath: "/tmp/should-not-appear.md",
  });

  assert.equal(
    pack.content.startsWith("Workflow runtime language contract:"),
    true
  );
  assert.equal(
    pack.content.includes(
      "Chat language code: `uk` (from Settings > General > Reasoning)."
    ),
    true
  );
  assert.equal(
    pack.content.includes(
      "Artifact prose language code: `ru` (from Settings > General > Artifacts for the User)."
    ),
    true
  );
  assert.equal(
    pack.content.includes("Build the artifact from `Final_Description.md`."),
    true
  );
  assert.equal(pack.content.includes("Workflow artifact mode:"), true);
  assert.equal(pack.content.includes("- Mode: `create_initial_draft`."), true);
  assert.equal(
    pack.content.includes(
      "Target artifact: `.codeai-hub/demo-workspace/virtual_simulation/virtual-simulation.md`."
    ),
    true
  );
  assert.equal(
    pack.content.includes(
      "Do not search for, read, or check whether the target artifact already exists."
    ),
    true
  );
  assert.equal(pack.content.includes("Runtime tooling facts:"), true);
  assert.equal(pack.content.includes("Python command: `python3`."), true);
  assert.equal(pack.content.includes("Node command: `node`."), true);
  assert.equal(pack.content.includes("Package manager command: `npm`."), true);
  assert.equal(pack.content.includes("Artifact write encoding:"), true);
  assert.equal(
    pack.content.includes("Write Markdown artifacts as UTF-8 text"),
    true
  );
  assert.equal(
    pack.content.includes("Cyrillic and other localized prose"),
    true
  );
  assert.equal(
    pack.content.includes(
      "Do not send user-facing progress updates about routine encoding retries"
    ),
    true
  );
  assert.equal(pack.content.includes("Artifact edit operation:"), true);
  assert.equal(pack.content.includes("use `apply_patch` when available"), true);
  assert.equal(
    pack.content.includes(
      "Do not choose fallback scripts as the first approach"
    ),
    true
  );
  assert.equal(
    pack.content.includes("patch mismatch, invisible blank lines"),
    true
  );
  assert.equal(
    pack.content.includes("Authoritative upstream source documents (inline):"),
    true
  );
  assert.equal(
    pack.content.includes(
      "- Do not reread input documents by path unless an artifact below is explicitly marked truncated."
    ),
    true
  );
  assert.equal(pack.content.includes("- Relative path:"), false);
  assert.equal(pack.content.includes("- Absolute path:"), false);
  assert.equal(pack.content.includes("Final_Description.md (relative):"), false);
  assert.equal(pack.content.includes("Final_Description.md (absolute):"), false);
  assert.equal(
    pack.content.includes("````markdown\n# Final Description"),
    true
  );
  assert.equal(
    pack.content.includes("User-facing source content."),
    true
  );
  assert.equal(
    pack.content.includes(
      "Final language reminder: user-facing chat stays in `uk`; artifact prose stays in `ru`; English examples/templates are format-only."
    ),
    true
  );
  assert.equal(pack.content.includes("Template (absolute)"), false);
});

test("description prompt pack embeds inputs without provider-visible input paths", () => {
  const pack = buildWorkflowPromptPack({
    artifactLanguage: "uk",
    chatLanguage: "ru",
    stage: "description",
    workspacePath: "/tmp/workspace",
    workspaceSlug: "demo-workspace",
    prompt: "",
    questionnairePath: ".codeai-hub/demo-workspace/description/questionnaire.md",
    sourceArtifacts: [
      {
        content: "# Questionnaire\n\nUser submitted product answers.\n",
        label: "Questionnaire",
        relativePath: ".codeai-hub/demo-workspace/description/questionnaire.md",
      },
    ],
    templatePath: "/tmp/description-template.md",
  });

  assert.equal(pack.content.includes("Questionnaire (relative):"), false);
  assert.equal(pack.content.includes("Questionnaire (absolute):"), false);
  assert.equal(pack.content.includes("Template (absolute):"), false);
  assert.equal(
    pack.content.startsWith(
      "Локализованный пакет инструкций CodeAI Hub (ru):"
    ),
    true
  );
  assert.equal(
    pack.content.includes(
      "Общайся с пользователем на языке `ru`, как указано в Settings > General > Reasoning."
    ),
    true
  );
  assert.equal(
    pack.content.includes(
      "Заполняй описательный текст артефакта на языке `uk`, как указано в Settings > General > Artifacts for the User."
    ),
    true
  );
  assert.equal(
    pack.content.includes(
      "Во время автоматического draft-pass используй только этот prompt и runtime-provided inline source documents"
    ),
    true
  );
  assert.equal(
    pack.content.includes(
      "Artifact prose language code: `uk` (from Settings > General > Artifacts for the User)."
    ),
    true
  );
  assert.equal(pack.content.includes("Workflow artifact mode:"), true);
  assert.equal(pack.content.includes("- Mode: `create_initial_draft`."), true);
  assert.equal(
    pack.content.includes(
      "Target artifact: `.codeai-hub/demo-workspace/description/Final_Description.md`."
    ),
    true
  );
  assert.equal(pack.content.includes("Runtime tooling facts:"), true);
  assert.equal(pack.content.includes("Artifact write encoding:"), true);
  assert.equal(pack.content.includes("Artifact edit operation:"), true);
  assert.equal(
    pack.content.includes("Authoritative upstream source documents (inline):"),
    true
  );
  assert.equal(pack.content.includes("### Questionnaire"), true);
  assert.equal(
    pack.content.includes("````markdown\n# Questionnaire"),
    true
  );
  assert.equal(
    pack.content.includes("User submitted product answers."),
    true
  );
  assert.equal(
    pack.content.includes(
      "Final language reminder: user-facing chat stays in `ru`; artifact prose stays in `uk`; English examples/templates are format-only."
    ),
    true
  );
});

test("diagram modules prompt pack targets product part index and omits generic template hint", () => {
  const pack = buildWorkflowPromptPack({
    artifactLanguage: "de",
    chatLanguage: "ru",
    stage: "diagram_modules",
    workspacePath: "/tmp/workspace",
    workspaceSlug: "demo-workspace",
    prompt: "",
    questionnairePath:
      ".codeai-hub/demo-workspace/virtual_simulation/virtual-simulation.md",
    sourceArtifacts: [
      {
        content: "# Final Description\n\nDescription source.\n",
        label: "Final_Description.md",
        relativePath: ".codeai-hub/demo-workspace/description/Final_Description.md",
      },
      {
        content: "# Virtual Simulation\n\nSimulation source.\n",
        label: "virtual-simulation.md",
        relativePath:
          ".codeai-hub/demo-workspace/virtual_simulation/virtual-simulation.md",
      },
    ],
    templatePath: "/tmp/diagram-modules-prompt.md",
  });

  assert.equal(
    pack.content.includes(
      "Build the staged artifact from `Final_Description.md` and `virtual-simulation.md`."
    ),
    true
  );
  assert.equal(
    pack.content.includes("Build the artifact from the questionnaire and template."),
    false
  );
  assert.equal(pack.content.includes("Workflow artifact mode:"), true);
  assert.equal(pack.content.includes("- Mode: `create_initial_draft`."), true);
  assert.equal(
    pack.content.includes(
      "Target artifact: `.codeai-hub/demo-workspace/diagram_modules/product-parts.index.md`."
    ),
    true
  );
  assert.equal(
    pack.content.includes(
      "Diagram Modules must be Core-checkable before handoff"
    ),
    true
  );
  assert.equal(
    pack.content.includes(
      "create one valid `product-parts/<part-id>.md` file for every Product Part declared in the index"
    ),
    true
  );
  assert.equal(
    pack.content.includes("create or update `product-parts.index.md`"),
    false
  );
  assert.equal(pack.content.includes("Runtime tooling facts:"), true);
  assert.equal(pack.content.includes("Artifact write encoding:"), true);
  assert.equal(pack.content.includes("Artifact edit operation:"), true);
  assert.equal(
    pack.content.includes(
      "Target path (relative): `codeai-hub/demo-workspace/diagram_modules/product-parts.index.md`"
    ),
    false
  );
  assert.equal(
    pack.content.includes(
      "Target path (relative): `.codeai-hub/demo-workspace/diagram_modules/product-parts.index.md`"
    ),
    true
  );
  assert.equal(
    pack.content.includes(
      "Final_Description.md (relative): `.codeai-hub/demo-workspace/description/Final_Description.md`"
    ),
    true
  );
  assert.equal(
    pack.content.includes(
      "virtual-simulation.md (relative): `.codeai-hub/demo-workspace/virtual_simulation/virtual-simulation.md`"
    ),
    true
  );
  assert.equal(
    pack.content.includes("### Final_Description.md"),
    true
  );
  assert.equal(
    pack.content.includes("Description source."),
    true
  );
  assert.equal(
    pack.content.includes("### virtual-simulation.md"),
    true
  );
  assert.equal(
    pack.content.includes("Simulation source."),
    true
  );
  assert.equal(
    pack.content.includes(
      "Chat language code: `ru` (from Settings > General > Reasoning)."
    ),
    true
  );
  assert.equal(
    pack.content.includes(
      "Для Diagram Modules держи Product Part / Cluster / Module titles"
    ),
    true
  );
  assert.equal(
    pack.content.includes(
      "Artifact prose language code: `de` (from Settings > General > Artifacts for the User)."
    ),
    true
  );
  assert.equal(
    pack.content.includes(
      "Keep Product Part / Cluster / Module names and titles, contract-bound DSL markers, headers, field names, ids, and staged status tokens in canonical English form."
    ),
    true
  );
  assert.equal(
    pack.content.includes(
      "Localize only descriptive prose such as Purpose, Responsibility, notes, assumptions / open questions, and user-facing artifact notes."
    ),
    true
  );
  assert.equal(pack.content.includes("Work phases:"), true);
  assert.equal(
    pack.content.includes(
      "Phase 2: create one valid `product-parts/<part-id>.md` file"
    ),
    true
  );
  assert.equal(pack.content.includes("Template (absolute)"), false);
  assert.equal(
    pack.content.includes(
      "do not spend the current turn searching for staged examples"
    ),
    true
  );
  assert.equal(pack.content.includes("module-map.md"), false);
  assert.equal(
    pack.content.includes("Output file name: `product-parts.index.md`"),
    true
  );
});

test("technical root prompt packs target skeleton and quality gate artifacts", () => {
  const skeletonPack = buildWorkflowPromptPack({
    artifactLanguage: "en",
    chatLanguage: "en",
    stage: "application_skeleton",
    workspacePath: "/tmp/workspace",
    workspaceSlug: "demo-workspace",
    prompt: "",
    questionnairePath:
      ".codeai-hub/demo-workspace/diagram_modules/product-parts.index.md",
  });
  const gatesPack = buildWorkflowPromptPack({
    artifactLanguage: "en",
    chatLanguage: "en",
    stage: "quality_gates",
    workspacePath: "/tmp/workspace",
    workspaceSlug: "demo-workspace",
    prompt: "",
    questionnairePath:
      ".codeai-hub/demo-workspace/application_skeleton/application-skeleton-map.json",
  });

  assert.equal(
    skeletonPack.relativePath,
    ".codeai-hub/demo-workspace/application_skeleton/application-skeleton.md"
  );
  assert.equal(
    skeletonPack.content.includes(
      "product-parts.index.md (relative): `.codeai-hub/demo-workspace/diagram_modules/product-parts.index.md`"
    ),
    true
  );
  assert.equal(
    skeletonPack.content.includes(
      "Skeleton map JSON: `.codeai-hub/demo-workspace/application_skeleton/application-skeleton-map.json`"
    ),
    true
  );
  assert.equal(
    skeletonPack.content.includes("Output file name: `application-skeleton.md`"),
    true
  );
  assert.equal(
    skeletonPack.content.includes("confirm the selected stack"),
    false
  );
  assert.equal(skeletonPack.content.includes("infer a recommended stack/repo/package-manager baseline"), true);
  assert.equal(skeletonPack.content.includes("materializationState: \"not_started\""), true);
  assert.equal(
    gatesPack.relativePath,
    ".codeai-hub/demo-workspace/quality_gates/quality-gates.md"
  );
  assert.equal(
    gatesPack.content.includes(
      "application-skeleton-map.json (relative): `.codeai-hub/demo-workspace/application_skeleton/application-skeleton-map.json`"
    ),
    true
  );
  assert.equal(
    gatesPack.content.includes(
      "Quality gates JSON: `.codeai-hub/demo-workspace/quality_gates/quality-gates.json`"
    ),
    true
  );
  assert.equal(gatesPack.content.includes("Work phases:"), true);
  assert.equal(gatesPack.content.includes("runtime-embedded accepted Application Skeleton artifacts"), true);
  assert.equal(gatesPack.content.includes("Output file name: `quality-gates.md`"), true);
});

test("workflow localized prompt pack is language-keyable and keeps canonical tokens protected", () => {
  const baseInput = {
    artifactLanguage: "ru",
    stage: "diagram_modules" as const,
    workspacePath: "/tmp/workspace",
    workspaceSlug: "demo-workspace",
    prompt: "",
    questionnairePath:
      ".codeai-hub/demo-workspace/virtual_simulation/virtual-simulation.md",
    sourceArtifacts: [
      {
        content: "# Final Description\n\nDescription source.\n",
        label: "Final_Description.md",
        relativePath: ".codeai-hub/demo-workspace/description/Final_Description.md",
      },
      {
        content: "# Virtual Simulation\n\nSimulation source.\n",
        label: "virtual-simulation.md",
        relativePath:
          ".codeai-hub/demo-workspace/virtual_simulation/virtual-simulation.md",
      },
    ],
  };
  const localized = buildWorkflowPromptPack({
    ...baseInput,
    chatLanguage: "ru",
  });
  const canonical = buildWorkflowPromptPack({
    ...baseInput,
    chatLanguage: "en",
  });

  assert.deepEqual(PROMPT_MATERIALIZER_CACHE_DIMENSIONS, [
    "chatLanguage",
    "artifactLanguage",
    "promptPackVersion",
    "appVersion",
  ]);
  assert.notEqual(localized.content, canonical.content);
  assert.equal(
    localized.content.startsWith(
      "Локализованный пакет инструкций CodeAI Hub (ru):"
    ),
    true
  );
  assert.equal(
    canonical.content.startsWith("Workflow runtime language contract:"),
    true
  );
  assert.equal(
    localized.content.includes("Product Part / Cluster / Module"),
    true
  );
  assert.equal(localized.content.includes("DSL markers"), true);
  assert.equal(localized.content.includes("field names"), true);
  assert.equal(localized.content.includes("ids"), true);
  assert.equal(localized.content.includes("statuses"), true);
  assert.equal(localized.content.includes("`create_initial_draft`"), true);
  assert.equal(localized.content.includes("`product-parts.index.md`"), true);
  assert.equal(
    localized.content.includes(
      "`.codeai-hub/demo-workspace/diagram_modules/product-parts.index.md`"
    ),
    true
  );
});

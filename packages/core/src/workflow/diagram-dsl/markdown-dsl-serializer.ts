import type {
  DiagramMapModel,
  FacadeEntity,
  FacadeMapModel,
  FacadeRelation,
  ModuleEntity,
  ModuleMapModel,
  ModuleRelation,
} from "./diagram-dsl-types";
import {
  DIAGRAM_REVISION_PLACEHOLDER,
  materializeDiagramRevision,
} from "./diagram-revision";

const joinBlocks = (
  blocks: readonly (readonly string[])[]
): readonly string[] =>
  blocks.flatMap((block, index) => (index === 0 ? block : ["", ...block]));

const pushScalar = (
  lines: string[],
  key: string,
  value: string | undefined
): void => {
  if (value) {
    lines.push(`- ${key}: ${value}`);
  }
};

const pushList = (
  lines: string[],
  key: string,
  values: readonly string[]
): void => {
  if (values.length === 0) {
    return;
  }
  lines.push(`- ${key}:`);
  for (const value of values) {
    lines.push(`  - ${value}`);
  }
};

const pushTextBlock = (
  lines: string[],
  label: "Notes" | "Rationale",
  value: string | undefined
): void => {
  if (!value) {
    return;
  }
  lines.push("", `${label}:`, ...value.split("\n"));
};

const buildMetadataLines = (
  version: number,
  stage: DiagramMapModel["stage"],
  updated: string
): readonly string[] => [
  "## Metadata",
  `- Version: ${version}`,
  `- Stage: ${stage}`,
  `- Revision: ${DIAGRAM_REVISION_PLACEHOLDER}`,
  `- Updated: ${updated}`,
];

const buildModuleBlock = (entity: ModuleEntity): readonly string[] => {
  const lines = [
    `### Module: ${entity.id}`,
    `- Id: ${entity.id}`,
    `- Kind: ${entity.kind}`,
    `- Title: ${entity.title}`,
    `- Responsibility: ${entity.responsibility}`,
  ];
  pushScalar(lines, "Cluster", entity.cluster);
  pushList(lines, "Inputs", entity.inputs);
  pushList(lines, "Outputs", entity.outputs);
  pushScalar(lines, "Spec Target", entity.specTarget);
  pushList(lines, "Contract Targets", entity.contractTargets);
  pushList(lines, "Code Targets", entity.codeTargets);
  lines.push(`- Origin: ${entity.origin}`, `- Status: ${entity.status}`);
  pushTextBlock(lines, "Notes", entity.notes);
  pushTextBlock(lines, "Rationale", entity.rationale);
  return lines;
};

const buildModuleRelationBlock = (
  relation: ModuleRelation
): readonly string[] => {
  const lines = [
    `### Relation: ${relation.id}`,
    `- Id: ${relation.id}`,
    `- From: ${relation.from}`,
    `- To: ${relation.to}`,
    `- Type: ${relation.type}`,
  ];
  pushScalar(lines, "Label", relation.label);
  pushScalar(lines, "Criticality", relation.criticality);
  lines.push(`- Origin: ${relation.origin}`, `- Status: ${relation.status}`);
  pushTextBlock(lines, "Notes", relation.notes);
  return lines;
};

const buildFacadeBlock = (entity: FacadeEntity): readonly string[] => {
  const lines = [
    `### Facade: ${entity.id}`,
    `- Id: ${entity.id}`,
    `- Module: ${entity.module}`,
    `- Kind: ${entity.kind}`,
    `- Visibility: ${entity.visibility}`,
  ];
  pushList(lines, "Methods", entity.methods);
  pushList(
    lines,
    "Ports",
    entity.ports.map(
      (port) =>
        `${port.direction}: ${port.type} ${port.direction === "In" ? "from" : "to"} ${port.target}`
    )
  );
  pushList(lines, "Contract Targets", entity.contractTargets);
  pushList(lines, "Code Targets", entity.codeTargets);
  lines.push(`- Origin: ${entity.origin}`, `- Status: ${entity.status}`);
  pushTextBlock(lines, "Notes", entity.notes);
  pushTextBlock(lines, "Rationale", entity.rationale);
  return lines;
};

const buildFacadeRelationBlock = (
  relation: FacadeRelation
): readonly string[] => {
  const lines = [
    `### Facade Relation: ${relation.id}`,
    `- Id: ${relation.id}`,
    `- From: ${relation.from}`,
    `- To: ${relation.to}`,
    `- Type: ${relation.type}`,
  ];
  pushScalar(lines, "Label", relation.label);
  lines.push(`- Origin: ${relation.origin}`, `- Status: ${relation.status}`);
  pushTextBlock(lines, "Notes", relation.notes);
  return lines;
};

const serializeModuleMapBody = (model: ModuleMapModel): string =>
  [
    "# Module Map",
    "",
    ...buildMetadataLines(model.version, model.stage, model.updated),
    "",
    "## Modules",
    "",
    ...joinBlocks(model.modules.map(buildModuleBlock)),
    "",
    "## Relations",
    "",
    ...joinBlocks(model.relations.map(buildModuleRelationBlock)),
  ].join("\n");

const serializeFacadeMapBody = (model: FacadeMapModel): string =>
  [
    "# Facade Map",
    "",
    ...buildMetadataLines(model.version, model.stage, model.updated),
    "",
    "## Facades",
    "",
    ...joinBlocks(model.facades.map(buildFacadeBlock)),
    "",
    "## Facade Relations",
    "",
    ...joinBlocks(model.relations.map(buildFacadeRelationBlock)),
  ].join("\n");

export const serializeModuleMapDsl = (model: ModuleMapModel): string =>
  materializeDiagramRevision(serializeModuleMapBody(model)).content;

export const serializeFacadeMapDsl = (model: FacadeMapModel): string =>
  materializeDiagramRevision(serializeFacadeMapBody(model)).content;

export const serializeDiagramMapDsl = (model: DiagramMapModel): string =>
  model.stage === "diagram_modules"
    ? serializeModuleMapDsl(model)
    : serializeFacadeMapDsl(model);

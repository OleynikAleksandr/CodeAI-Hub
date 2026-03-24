import type {
  ClusterEntity,
  DiagramMapModel,
  ModuleEntity,
  ModuleMapModel,
  ModuleRelation,
  ProductPartEntity,
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
  lines.push("", `${label}:`, ...value.replace(/\r\n?/g, "\n").split("\n"));
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

const buildModuleBlock = (
  entity: ModuleEntity,
  headingLevel: "###" | "####" | "#####"
): readonly string[] => {
  const lines = [
    `${headingLevel} Module: ${entity.id}`,
    `- Id: ${entity.id}`,
    `- Kind: ${entity.kind}`,
    `- Title: ${entity.title}`,
    `- Responsibility: ${entity.responsibility}`,
  ];
  pushScalar(lines, "Product Part", entity.productPart);
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

const buildClusterBlock = (
  cluster: ClusterEntity,
  modules: readonly ModuleEntity[]
): readonly string[] => {
  const lines = [
    `### Cluster: ${cluster.id}`,
    `- Id: ${cluster.id}`,
    `- Title: ${cluster.title}`,
    `- Purpose: ${cluster.purpose}`,
    `- Product Part: ${cluster.productPart}`,
  ];
  pushList(lines, "Modules", cluster.moduleIds);
  pushTextBlock(lines, "Notes", cluster.notes);
  if (modules.length === 0) {
    return lines;
  }
  return [
    ...lines,
    "",
    ...joinBlocks(modules.map((module) => buildModuleBlock(module, "####"))),
  ];
};

const buildProductPartBlock = (
  productPart: ProductPartEntity,
  clustersById: ReadonlyMap<string, ClusterEntity>,
  modulesById: ReadonlyMap<string, ModuleEntity>
): readonly string[] => {
  const lines = [
    `### Product Part: ${productPart.id}`,
    `- Id: ${productPart.id}`,
    `- Title: ${productPart.title}`,
    `- Purpose: ${productPart.purpose}`,
  ];
  pushList(lines, "Clusters", productPart.clusterIds);
  pushList(lines, "Standalone Modules", productPart.standaloneModuleIds);
  pushTextBlock(lines, "Notes", productPart.notes);

  const blocks: (readonly string[])[] = [];
  for (const clusterId of productPart.clusterIds) {
    const cluster = clustersById.get(clusterId);
    if (!cluster) {
      continue;
    }
    const modules = cluster.moduleIds
      .map((moduleId) => modulesById.get(moduleId))
      .filter((module): module is ModuleEntity => Boolean(module));
    blocks.push(buildClusterBlock(cluster, modules));
  }
  for (const moduleId of productPart.standaloneModuleIds) {
    const module = modulesById.get(moduleId);
    if (!module) {
      continue;
    }
    blocks.push(buildModuleBlock(module, "####"));
  }

  return blocks.length === 0 ? lines : [...lines, "", ...joinBlocks(blocks)];
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

const serializeModuleMapBody = (model: ModuleMapModel): string =>
  (() => {
    const hasOwnershipHierarchy =
      (model.productParts?.length ?? 0) > 0 &&
      (model.clusters?.length ?? 0) > 0;
    if (!hasOwnershipHierarchy) {
      return [
        "# Module Map",
        "",
        ...buildMetadataLines(model.version, model.stage, model.updated),
        "",
        "## Modules",
        "",
        ...joinBlocks(
          model.modules.map((module) => buildModuleBlock(module, "###"))
        ),
        "",
        "## Relations",
        "",
        ...joinBlocks(model.relations.map(buildModuleRelationBlock)),
      ].join("\n");
    }

    const clustersById = new Map(
      (model.clusters ?? []).map((cluster) => [cluster.id, cluster] as const)
    );
    const modulesById = new Map(
      model.modules.map((module) => [module.id, module] as const)
    );

    return [
      "# Module Map",
      "",
      ...buildMetadataLines(model.version, model.stage, model.updated),
      "",
      "## Product Parts",
      "",
      ...joinBlocks(
        (model.productParts ?? []).map((productPart) =>
          buildProductPartBlock(productPart, clustersById, modulesById)
        )
      ),
      "",
      "## Relations",
      "",
      ...joinBlocks(model.relations.map(buildModuleRelationBlock)),
    ].join("\n");
  })();

export const serializeModuleMapDsl = (model: ModuleMapModel): string =>
  materializeDiagramRevision(serializeModuleMapBody(model)).content;

export const serializeDiagramMapDsl = (model: DiagramMapModel): string =>
  serializeModuleMapDsl(model);

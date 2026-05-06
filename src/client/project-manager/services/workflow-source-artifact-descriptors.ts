import type { WorkflowStageId } from "./description-submit-service";

export type WorkflowSourceArtifactDescriptor = {
  readonly label: string;
  readonly relativePath: string;
};

const PRODUCT_PART_ID_RE = /^-\s*Id:\s*`([^`\n]+)`\s*$/gim;
const SAFE_PRODUCT_PART_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const buildWorkflowSourceArtifactDescriptors = (params: {
  readonly questionnairePath: string;
  readonly stage: WorkflowStageId;
  readonly workspaceSlug: string;
}): readonly WorkflowSourceArtifactDescriptor[] => {
  if (params.stage === "description") {
    return [{ label: "Questionnaire", relativePath: params.questionnairePath }];
  }
  if (params.stage === "virtual_simulation") {
    return [
      { label: "Final_Description.md", relativePath: params.questionnairePath },
    ];
  }
  if (params.stage === "diagram_modules") {
    return [
      {
        label: "Final_Description.md",
        relativePath: `.codeai-hub/${params.workspaceSlug}/description/Final_Description.md`,
      },
      {
        label: "virtual-simulation.md",
        relativePath: `.codeai-hub/${params.workspaceSlug}/virtual_simulation/virtual-simulation.md`,
      },
    ];
  }
  if (params.stage === "application_skeleton") {
    return [
      {
        label: "Final_Description.md",
        relativePath: `.codeai-hub/${params.workspaceSlug}/description/Final_Description.md`,
      },
      {
        label: "virtual-simulation.md",
        relativePath: `.codeai-hub/${params.workspaceSlug}/virtual_simulation/virtual-simulation.md`,
      },
      {
        label: "product-parts.index.md",
        relativePath: `.codeai-hub/${params.workspaceSlug}/diagram_modules/product-parts.index.md`,
      },
    ];
  }
  return [
    {
      label: "application-skeleton.md",
      relativePath: `.codeai-hub/${params.workspaceSlug}/application_skeleton/application-skeleton.md`,
    },
    {
      label: "application-skeleton-map.json",
      relativePath: `.codeai-hub/${params.workspaceSlug}/application_skeleton/application-skeleton-map.json`,
    },
  ];
};

export const buildProductPartSourceArtifactDescriptors = (params: {
  readonly productPartsIndexContent: string;
  readonly workspaceSlug: string;
}): readonly WorkflowSourceArtifactDescriptor[] => {
  const seen = new Set<string>();
  const descriptors: WorkflowSourceArtifactDescriptor[] = [];
  for (const match of params.productPartsIndexContent.matchAll(PRODUCT_PART_ID_RE)) {
    const partId = match[1]?.trim();
    if (!partId || seen.has(partId) || !SAFE_PRODUCT_PART_ID_RE.test(partId)) {
      continue;
    }
    seen.add(partId);
    descriptors.push({
      label: `Product Part: ${partId}`,
      relativePath: `.codeai-hub/${params.workspaceSlug}/diagram_modules/product-parts/${partId}.md`,
    });
  }
  return descriptors;
};

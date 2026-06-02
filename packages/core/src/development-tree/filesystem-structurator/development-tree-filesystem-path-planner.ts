import type { DevelopmentTreeSnapshot } from "../development-tree-types";
import {
  createDevelopmentTreeDirectoryPlan,
  createDevelopmentTreeMaterializedRoot,
  createDevelopmentTreeTodoStageRoot,
  type DevelopmentTreeFilesystemDirectoryPlan,
  type DevelopmentTreeFilesystemNodeKind,
  type DevelopmentTreeFilesystemPathPlan,
} from "./development-tree-filesystem-paths";

interface DevelopmentTreePlanRoot {
  readonly absolutePath: string;
  readonly relativePath: string;
}

export interface DevelopmentTreeFilesystemPathPlannerRequest {
  readonly snapshot: DevelopmentTreeSnapshot;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

const LEAD_ORCHESTRATION_SEGMENT = "lead-product-part-orchestration";
const LEAD_ORCHESTRATION_CHILDREN = [
  { kind: "contract_graph", segment: "contract-graph" },
  { kind: "cross_part_contracts", segment: "cross-part-contracts" },
  { kind: "shared_interfaces", segment: "shared-interfaces" },
  { kind: "execution_waves", segment: "execution-waves" },
] as const satisfies readonly {
  readonly kind: DevelopmentTreeFilesystemNodeKind;
  readonly segment: string;
}[];

const createProductPartSegments = (partId: string): readonly string[] => [
  "product-parts",
  partId,
];

const createClusterSegments = (params: {
  readonly clusterId: string;
  readonly partId: string;
}): readonly string[] => [
  ...createProductPartSegments(params.partId),
  "clusters",
  params.clusterId,
];

const createClusterModuleSegments = (params: {
  readonly clusterId: string;
  readonly moduleId: string;
  readonly partId: string;
}): readonly string[] => [
  ...createClusterSegments(params),
  "modules",
  params.moduleId,
];

const createStandaloneModuleSegments = (params: {
  readonly moduleId: string;
  readonly partId: string;
}): readonly string[] => [
  ...createProductPartSegments(params.partId),
  "modules",
  params.moduleId,
];

const pushModuleDirectoryPlans = (params: {
  readonly clusterId?: string;
  readonly directories: DevelopmentTreeFilesystemDirectoryPlan[];
  readonly moduleId: string;
  readonly moduleSegments: readonly string[];
  readonly partId: string;
  readonly rootAbsolutePath: string;
  readonly rootRelativePath: string;
}): void => {
  const base = {
    rootAbsolutePath: params.rootAbsolutePath,
    rootRelativePath: params.rootRelativePath,
    partId: params.partId,
    ...(params.clusterId ? { clusterId: params.clusterId } : {}),
    moduleId: params.moduleId,
  };
  params.directories.push(
    createDevelopmentTreeDirectoryPlan({
      ...base,
      kind: "module",
      segments: params.moduleSegments,
    })
  );
};

const createPlanRoots = (params: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): readonly [DevelopmentTreePlanRoot, DevelopmentTreePlanRoot] => [
  createDevelopmentTreeMaterializedRoot(params),
  createDevelopmentTreeTodoStageRoot({ workspaceRoot: params.workspaceRoot }),
];

const pushProductPartDirectoryPlan = (params: {
  readonly directories: DevelopmentTreeFilesystemDirectoryPlan[];
  readonly partId: string;
  readonly rootAbsolutePath: string;
  readonly rootRelativePath: string;
}): void => {
  params.directories.push(
    createDevelopmentTreeDirectoryPlan({
      rootAbsolutePath: params.rootAbsolutePath,
      rootRelativePath: params.rootRelativePath,
      kind: "product_part",
      partId: params.partId,
      segments: createProductPartSegments(params.partId),
    })
  );
};

const pushLeadOrchestrationDirectoryPlans = (params: {
  readonly directories: DevelopmentTreeFilesystemDirectoryPlan[];
  readonly partId: string;
  readonly rootAbsolutePath: string;
  readonly rootRelativePath: string;
}): void => {
  const orchestrationSegments = [
    ...createProductPartSegments(params.partId),
    LEAD_ORCHESTRATION_SEGMENT,
  ];
  const base = {
    rootAbsolutePath: params.rootAbsolutePath,
    rootRelativePath: params.rootRelativePath,
    partId: params.partId,
  };
  params.directories.push(
    createDevelopmentTreeDirectoryPlan({
      ...base,
      kind: "lead_orchestration",
      segments: orchestrationSegments,
    }),
    ...LEAD_ORCHESTRATION_CHILDREN.map((child) =>
      createDevelopmentTreeDirectoryPlan({
        ...base,
        kind: child.kind,
        segments: [...orchestrationSegments, child.segment],
      })
    )
  );
};

const pushClusterDirectoryPlan = (params: {
  readonly clusterId: string;
  readonly directories: DevelopmentTreeFilesystemDirectoryPlan[];
  readonly partId: string;
  readonly rootAbsolutePath: string;
  readonly rootRelativePath: string;
}): void => {
  params.directories.push(
    createDevelopmentTreeDirectoryPlan({
      rootAbsolutePath: params.rootAbsolutePath,
      rootRelativePath: params.rootRelativePath,
      kind: "cluster",
      partId: params.partId,
      clusterId: params.clusterId,
      segments: createClusterSegments({
        partId: params.partId,
        clusterId: params.clusterId,
      }),
    })
  );
};

const pushClusterTreeDirectoryPlans = (params: {
  readonly cluster: DevelopmentTreeSnapshot["parts"][number]["clusters"][number];
  readonly directories: DevelopmentTreeFilesystemDirectoryPlan[];
  readonly partId: string;
  readonly roots: readonly DevelopmentTreePlanRoot[];
}): void => {
  for (const root of params.roots) {
    pushClusterDirectoryPlan({
      directories: params.directories,
      partId: params.partId,
      clusterId: params.cluster.id,
      rootAbsolutePath: root.absolutePath,
      rootRelativePath: root.relativePath,
    });
  }

  for (const module of params.cluster.modules) {
    for (const root of params.roots) {
      pushModuleDirectoryPlans({
        directories: params.directories,
        rootAbsolutePath: root.absolutePath,
        rootRelativePath: root.relativePath,
        partId: params.partId,
        clusterId: params.cluster.id,
        moduleId: module.id,
        moduleSegments: createClusterModuleSegments({
          partId: params.partId,
          clusterId: params.cluster.id,
          moduleId: module.id,
        }),
      });
    }
  }
};

const pushPartDirectoryPlans = (params: {
  readonly directories: DevelopmentTreeFilesystemDirectoryPlan[];
  readonly isLeadPart: boolean;
  readonly part: DevelopmentTreeSnapshot["parts"][number];
  readonly roots: readonly DevelopmentTreePlanRoot[];
}): void => {
  for (const root of params.roots) {
    pushProductPartDirectoryPlan({
      directories: params.directories,
      partId: params.part.id,
      rootAbsolutePath: root.absolutePath,
      rootRelativePath: root.relativePath,
    });
    if (params.isLeadPart) {
      pushLeadOrchestrationDirectoryPlans({
        directories: params.directories,
        partId: params.part.id,
        rootAbsolutePath: root.absolutePath,
        rootRelativePath: root.relativePath,
      });
    }
  }

  for (const cluster of params.part.clusters) {
    pushClusterTreeDirectoryPlans({
      cluster,
      directories: params.directories,
      partId: params.part.id,
      roots: params.roots,
    });
  }

  for (const module of params.part.standaloneModules) {
    for (const root of params.roots) {
      pushModuleDirectoryPlans({
        directories: params.directories,
        rootAbsolutePath: root.absolutePath,
        rootRelativePath: root.relativePath,
        partId: params.part.id,
        moduleId: module.id,
        moduleSegments: createStandaloneModuleSegments({
          partId: params.part.id,
          moduleId: module.id,
        }),
      });
    }
  }
};

export class DevelopmentTreeFilesystemPathPlanner {
  plan(
    params: DevelopmentTreeFilesystemPathPlannerRequest
  ): DevelopmentTreeFilesystemPathPlan {
    const [materializedRoot, ...roots] = createPlanRoots({
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
    const directories: DevelopmentTreeFilesystemDirectoryPlan[] = [];
    const allRoots = [materializedRoot, ...roots];

    for (const part of params.snapshot.parts) {
      if (part.status !== "materialized") {
        continue;
      }
      pushPartDirectoryPlans({
        directories,
        part,
        roots: allRoots,
        isLeadPart: params.snapshot.leadProductPartId === part.id,
      });
    }

    return {
      rootAbsolutePath: materializedRoot.absolutePath,
      rootRelativePath: materializedRoot.relativePath,
      directories,
    };
  }
}

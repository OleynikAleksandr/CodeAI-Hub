import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import type { DevelopmentTreeAgentPromptPackContract } from "../development-tree-types";
import type { DevelopmentTreeDetectedNode } from "./development-tree-node-detector";
import {
  NodeFirstMessageBuilder,
  type NodePromptArtifactContextEntry,
} from "./node-first-message-builder";
import {
  NodePromptContextExtractor,
  type NodePromptSourceArtifact,
} from "./node-prompt-context-extractor";

export interface DevelopmentTreeAgentSessionGateway {
  readonly createSessionForWorkflow: (options: {
    readonly context: {
      readonly initiativeSlug: string;
      readonly runSlug?: string | null;
      readonly stage: string;
    };
    readonly providerId: string;
    readonly workspacePath: string;
  }) => Promise<{ readonly id: string } | null>;
  readonly handleMessage: (sessionId: string, content: string) => Promise<void>;
}

export interface NodeAgentSessionBootstrapperOptions {
  readonly artifactLanguage?:
    | string
    | (() => Promise<string | null | undefined> | string | null | undefined);
  readonly gateway: DevelopmentTreeAgentSessionGateway;
  readonly providerId: string | (() => Promise<string> | string);
  readonly responseLanguage?:
    | string
    | (() => Promise<string | null | undefined> | string | null | undefined);
  readonly technologyBase?: string;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}

export interface NodeAgentSessionBootstrapResult {
  readonly draftFileNames: readonly string[];
  readonly firstMessageSent: boolean;
  readonly node: DevelopmentTreeDetectedNode;
  readonly requiresTechnologyBaseAnswer: boolean;
  readonly sessionId: string | null;
  readonly stage: string;
}

const CODEAI_HUB_SEGMENT = ".codeai-hub";
const DEFAULT_ARTIFACT_LANGUAGE = "en";
const DEFAULT_RESPONSE_LANGUAGE = "en";
const DETAILED_PART_CONTEXT_RETRY_COUNT = 6;
const DETAILED_PART_CONTEXT_RETRY_DELAY_MS = 100;
const WORKFLOW_PATH_SEPARATOR_RE = /[\\/]+/;

const resolveSettingsPath = (): string =>
  process.env.CLAUDE_SETTINGS_PATH ??
  `${homedir()}/.codeai-hub/settings/settings.json`;

const splitWorkflowPath = (value: string): readonly string[] =>
  value
    .split(WORKFLOW_PATH_SEPARATOR_RE)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

const stripCodeAiWorkspacePrefix = (
  segments: readonly string[],
  workspaceSlug: string
): readonly string[] =>
  segments[0] === CODEAI_HUB_SEGMENT && segments[1] === workspaceSlug
    ? segments.slice(2)
    : segments;

const createNodeWorkflowPath = (
  node: DevelopmentTreeDetectedNode,
  workspaceSlug: string
): string =>
  stripCodeAiWorkspacePrefix(
    splitWorkflowPath(node.relativePath),
    workspaceSlug
  ).join("/");

const createPromptPackContract = (params: {
  readonly stage: string;
  readonly workspaceSlug: string;
}): DevelopmentTreeAgentPromptPackContract => ({
  artifactVersion: "development-tree-agent-prompt-pack-v1",
  researchArtifactPath: path.posix.join(
    ".codeai-hub",
    params.workspaceSlug,
    params.stage,
    "AgentResearch.draft.json"
  ),
  requiresResearchArtifactBeforeExternalRecommendations: true,
  structuredOutputPolicy: "core_validator_required",
  workflowPath: params.stage,
});

const createPromptPackContractLines = (
  contract: DevelopmentTreeAgentPromptPackContract
): string[] => [
  "",
  "Core-owned prompt pack contract:",
  `- Workflow path: ${contract.workflowPath}`,
  `- Research artifact path: ${contract.researchArtifactPath}`,
  `- Structured output policy: ${contract.structuredOutputPolicy}`,
  "- If you use external search, provider knowledge, tools/framework recommendations, quality gate recommendations, runtime practices, or implementation rules, first create or update this research artifact before presenting recommendations as accepted facts.",
  "- Research artifact JSON shape: artifactVersion, workflowPath, topic, status, sources[], recommendations[].",
  "- Each source must include title, url, sourceType, retrievedAt, whyRelevant, and optional warning.",
  "- Each recommendation must include recommendation, sourceUrls, tradeoff, requiredChecks, and userApprovalRequired.",
  "- Provider structured output/tool schemas are preferred when available, but Core validators and hooks remain the enforcement authority.",
];

const resolveProviderId = async (
  providerId: NodeAgentSessionBootstrapperOptions["providerId"]
): Promise<string> =>
  typeof providerId === "function" ? await providerId() : providerId;

const readObject = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const readSettingsLocalizationCategory = async (
  categoryKeys: readonly string[],
  fallbackLanguage: string
): Promise<string> => {
  try {
    const settings = readObject(
      JSON.parse(await readFile(resolveSettingsPath(), "utf8"))
    );
    const general = readObject(settings.general);
    const localization = readObject(general.localization);
    const categories = readObject(localization.categories);
    for (const key of categoryKeys) {
      const categoryLanguage = categories[key];
      if (typeof categoryLanguage === "string" && categoryLanguage.trim()) {
        return categoryLanguage.trim();
      }
    }
    const defaultLanguage = localization.defaultLanguage;
    return typeof defaultLanguage === "string" && defaultLanguage.trim()
      ? defaultLanguage.trim()
      : fallbackLanguage;
  } catch {
    return fallbackLanguage;
  }
};

const readReasoningLanguageFromSettings = (): Promise<string> =>
  readSettingsLocalizationCategory(["reasoning"], DEFAULT_RESPONSE_LANGUAGE);

const readArtifactLanguageFromSettings = (): Promise<string> =>
  readSettingsLocalizationCategory(
    ["artifactsForTheUser", "artifacts_for_the_user"],
    DEFAULT_ARTIFACT_LANGUAGE
  );

const resolveResponseLanguage = async (
  responseLanguage: NodeAgentSessionBootstrapperOptions["responseLanguage"]
): Promise<string> => {
  if (typeof responseLanguage === "function") {
    const resolved = await responseLanguage();
    return resolved?.trim() || DEFAULT_RESPONSE_LANGUAGE;
  }
  if (typeof responseLanguage === "string" && responseLanguage.trim()) {
    return responseLanguage.trim();
  }
  return readReasoningLanguageFromSettings();
};

const resolveArtifactLanguage = async (
  artifactLanguage: NodeAgentSessionBootstrapperOptions["artifactLanguage"]
): Promise<string> => {
  if (typeof artifactLanguage === "function") {
    const resolved = await artifactLanguage();
    return resolved?.trim() || DEFAULT_ARTIFACT_LANGUAGE;
  }
  if (typeof artifactLanguage === "string" && artifactLanguage.trim()) {
    return artifactLanguage.trim();
  }
  return readArtifactLanguageFromSettings();
};

const createWorkflowArtifactSpecs = (
  workspaceSlug: string,
  partId: string
): readonly { readonly label: string; readonly relativePath: string }[] => [
  {
    label: "Final Description",
    relativePath: `.codeai-hub/${workspaceSlug}/description/Final_Description.md`,
  },
  {
    label: "Virtual Simulation",
    relativePath: `.codeai-hub/${workspaceSlug}/virtual_simulation/virtual-simulation.md`,
  },
  {
    label: "Diagram Modules Index",
    relativePath: `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`,
  },
  {
    label: `Diagram Modules Product Part: ${partId}`,
    relativePath: `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts/${partId}.md`,
  },
  {
    label: "Application Skeleton Map",
    relativePath: `.codeai-hub/${workspaceSlug}/application_skeleton/application-skeleton-map.json`,
  },
  {
    label: "Quality Gates Contract",
    relativePath: `.codeai-hub/${workspaceSlug}/quality_gates/quality-gates.json`,
  },
];

const wait = (durationMs: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });

const isDetailedPartContextSpec = (
  relativePath: string,
  partId: string
): boolean =>
  relativePath.endsWith(`/diagram_modules/product-parts/${partId}.md`);

const readOptionalArtifactContent = async (
  workspacePath: string,
  relativePath: string,
  retryCount: number
): Promise<string | null> => {
  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      const rawContent = await readFile(
        path.join(workspacePath, relativePath),
        "utf8"
      );
      const content = rawContent.trim();
      return content.length > 0 ? content : null;
    } catch {
      if (attempt >= retryCount) {
        return null;
      }
      await wait(DETAILED_PART_CONTEXT_RETRY_DELAY_MS);
    }
  }
  return null;
};

const readArtifactContext = async (
  node: DevelopmentTreeDetectedNode,
  options: NodeAgentSessionBootstrapperOptions
): Promise<readonly NodePromptArtifactContextEntry[]> => {
  const artifacts: NodePromptSourceArtifact[] = [];
  for (const spec of createWorkflowArtifactSpecs(
    options.workspaceSlug,
    node.partId
  )) {
    const retryCount = isDetailedPartContextSpec(spec.relativePath, node.partId)
      ? DETAILED_PART_CONTEXT_RETRY_COUNT
      : 0;
    const content = await readOptionalArtifactContent(
      options.workspacePath,
      spec.relativePath,
      retryCount
    );
    if (content) {
      artifacts.push({
        content,
        label: spec.label,
        relativePath: spec.relativePath,
      });
    }
  }
  return new NodePromptContextExtractor().extract({ artifacts, node });
};

export class NodeAgentSessionBootstrapper {
  private readonly firstMessageBuilder = new NodeFirstMessageBuilder();

  async bootstrapNode(
    node: DevelopmentTreeDetectedNode,
    options: NodeAgentSessionBootstrapperOptions
  ): Promise<NodeAgentSessionBootstrapResult> {
    const stage = createNodeWorkflowPath(node, options.workspaceSlug);
    const providerId = await resolveProviderId(options.providerId);
    const responseLanguage = await resolveResponseLanguage(
      options.responseLanguage
    );
    const artifactLanguage = await resolveArtifactLanguage(
      options.artifactLanguage
    );
    const artifactContext = await readArtifactContext(node, options);
    const session = await options.gateway.createSessionForWorkflow({
      providerId,
      workspacePath: options.workspacePath,
      context: {
        initiativeSlug: options.workspaceSlug,
        runSlug: "development-tree",
        stage,
      },
    });
    const firstMessage = this.firstMessageBuilder.build({
      artifactLanguage,
      artifactContext,
      node,
      responseLanguage,
      technologyBase: options.technologyBase,
    });
    const promptPackContract = createPromptPackContract({
      stage,
      workspaceSlug: options.workspaceSlug,
    });
    const firstMessageContent = [
      firstMessage.content,
      ...createPromptPackContractLines(promptPackContract),
    ].join("\n");
    if (session) {
      await options.gateway.handleMessage(session.id, firstMessageContent);
    }
    return {
      draftFileNames: firstMessage.draftFileNames,
      firstMessageSent: Boolean(session),
      node,
      requiresTechnologyBaseAnswer: firstMessage.requiresTechnologyBaseAnswer,
      sessionId: session?.id ?? null,
      stage,
    };
  }
}

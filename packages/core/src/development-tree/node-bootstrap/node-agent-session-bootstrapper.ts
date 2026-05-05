import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import type { DevelopmentTreeDetectedNode } from "./development-tree-node-detector";
import { NodeFirstMessageBuilder } from "./node-first-message-builder";

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
const DEFAULT_RESPONSE_LANGUAGE = "en";
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

const resolveProviderId = async (
  providerId: NodeAgentSessionBootstrapperOptions["providerId"]
): Promise<string> =>
  typeof providerId === "function" ? await providerId() : providerId;

const readObject = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const readReasoningLanguageFromSettings = async (): Promise<string> => {
  try {
    const settings = readObject(
      JSON.parse(await readFile(resolveSettingsPath(), "utf8"))
    );
    const general = readObject(settings.general);
    const localization = readObject(general.localization);
    const categories = readObject(localization.categories);
    const reasoningLanguage = categories.reasoning;
    if (typeof reasoningLanguage === "string" && reasoningLanguage.trim()) {
      return reasoningLanguage.trim();
    }
    const defaultLanguage = localization.defaultLanguage;
    return typeof defaultLanguage === "string" && defaultLanguage.trim()
      ? defaultLanguage.trim()
      : DEFAULT_RESPONSE_LANGUAGE;
  } catch {
    return DEFAULT_RESPONSE_LANGUAGE;
  }
};

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
      node,
      responseLanguage,
      technologyBase: options.technologyBase,
    });
    if (session) {
      await options.gateway.handleMessage(session.id, firstMessage.content);
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

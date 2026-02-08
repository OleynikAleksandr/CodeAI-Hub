import type {
  ArtifactPointer,
  NodeSnapshot,
  SessionSnapshot,
  WorkspaceSnapshot,
} from "./workspace-runtime-types";
import type { WorkspaceState } from "./workspace-store";

const toReadonlyRecord = <T>(
  entries: Iterable<[string, T]>
): Readonly<Record<string, T>> => {
  const result: Record<string, T> = {};
  for (const [key, value] of entries) {
    result[key] = value;
  }
  return Object.freeze(result);
};

const toArtifactsRecord = (
  artifactsByNode: WorkspaceState["artifactsByNode"]
): Readonly<Record<string, Readonly<Record<string, ArtifactPointer>>>> => {
  const result: Record<string, Readonly<Record<string, ArtifactPointer>>> = {};
  for (const [nodeId, artifacts] of artifactsByNode.entries()) {
    result[nodeId] = toReadonlyRecord<ArtifactPointer>(artifacts.entries());
  }
  return Object.freeze(result);
};

export const buildSnapshot = (
  workspaceRoot: string,
  state: WorkspaceState
): WorkspaceSnapshot => ({
  workspaceRoot,
  loadState: state.loadState,
  error: state.error,
  workflow: {
    nodes: toReadonlyRecord<NodeSnapshot>(state.nodes.entries()),
  },
  sessions: toReadonlyRecord<SessionSnapshot>(state.sessions.entries()),
  artifacts: {
    currentByNodeId: toArtifactsRecord(state.artifactsByNode),
  },
});

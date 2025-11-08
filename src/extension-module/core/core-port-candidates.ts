import { readPreferredCorePort } from "../runtime/runtime-registry";

const PORT_FALLBACK_START = 8080;
const PORT_FALLBACK_COUNT = 13;
const PORT_CANDIDATE_POOL: readonly number[] = Array.from(
  { length: PORT_FALLBACK_COUNT },
  (_, index) => PORT_FALLBACK_START + index
);

export const buildPortCandidates = async (
  envPort: number,
  preferredPort?: number
): Promise<number[]> => {
  const ordered: number[] = [];
  const seen = new Set<number>();
  const push = (candidate?: number): void => {
    if (!Number.isFinite(candidate)) {
      return;
    }
    const normalized = Number(candidate);
    if (normalized <= 0 || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    ordered.push(normalized);
  };

  push(preferredPort);
  push(envPort);
  const stored = await readPreferredCorePort();
  push(stored);
  for (const fallback of PORT_CANDIDATE_POOL) {
    push(fallback);
  }
  return ordered;
};

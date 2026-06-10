const NPM_RUN_SCRIPT_RE =
  /(?:^|[\s;&|()])npm\s+run\s+(?:(?:--silent|--if-present|--foreground-scripts|--ignore-scripts)\s+)*([^\s;&|()]+)/gmu;
const MAX_SCRIPT_RESOLUTION_DEPTH = 4;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const readGateCommand = (
  commands: Record<string, unknown>,
  gateId: string
): string | null => {
  const gate = commands[gateId];
  if (!isRecord(gate)) {
    return null;
  }
  const command = gate.proposedCommand ?? gate.command;
  return typeof command === "string" && command.trim().length > 0
    ? command.trim()
    : null;
};

export const collectNpmRunScripts = (text: string): readonly string[] => {
  const scripts = new Set<string>();
  for (const match of text.matchAll(NPM_RUN_SCRIPT_RE)) {
    const scriptName = match[1]?.trim();
    if (scriptName && scriptName !== "--") {
      scripts.add(scriptName);
    }
  }
  return [...scripts];
};

export const collectReachableScripts = (params: {
  readonly packageScripts: Record<string, string>;
  readonly text: string;
}): ReadonlySet<string> => {
  const reachable = new Set<string>();
  let frontier = collectNpmRunScripts(params.text);
  let depth = 0;
  while (frontier.length > 0 && depth < MAX_SCRIPT_RESOLUTION_DEPTH) {
    const next: string[] = [];
    for (const scriptName of frontier) {
      if (reachable.has(scriptName)) {
        continue;
      }
      reachable.add(scriptName);
      const body = params.packageScripts[scriptName];
      if (body) {
        next.push(...collectNpmRunScripts(body));
      }
    }
    frontier = next;
    depth += 1;
  }
  return reachable;
};

export interface GateCommandReachability {
  readonly reachableFromHook: boolean;
  readonly unresolvedScripts: readonly string[];
}

export const evaluateGateCommandReachability = (params: {
  readonly command: string;
  readonly hookText: string;
  readonly packageScripts: Record<string, string>;
}): GateCommandReachability => {
  const commandScripts = collectNpmRunScripts(params.command);
  const unresolvedScripts = commandScripts.filter(
    (scriptName) => !(scriptName in params.packageScripts)
  );
  const reachableScripts = collectReachableScripts({
    packageScripts: params.packageScripts,
    text: params.hookText,
  });
  const literalHit = params.hookText.includes(params.command);
  const scriptHit = commandScripts.some((scriptName) =>
    reachableScripts.has(scriptName)
  );
  const bodyHit =
    commandScripts.length === 0 &&
    [...reachableScripts].some((scriptName) =>
      (params.packageScripts[scriptName] ?? "").includes(params.command)
    );
  return {
    reachableFromHook: literalHit || scriptHit || bodyHit,
    unresolvedScripts,
  };
};

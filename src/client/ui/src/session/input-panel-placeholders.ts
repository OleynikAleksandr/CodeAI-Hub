type ResolveInputPlaceholderOptions = {
  readonly isQueued: boolean;
  readonly terminalNoResume: boolean;
  readonly connectionState: string;
  readonly continuityLockActive: boolean;
  readonly continuityErrorCopy: string | null;
};

export const resolveInputPlaceholder = (
  options: ResolveInputPlaceholderOptions
): string => {
  if (options.isQueued) {
    return "Message queued. Sending as soon as it is ready…";
  }
  if (options.terminalNoResume) {
    return "This session is complete and read-only.";
  }
  if (options.connectionState === "running") {
    return "Agent is working… Please wait.";
  }
  if (options.continuityLockActive || options.connectionState === "blocked") {
    return "Agent is resuming your session… Please wait.";
  }
  if (options.continuityErrorCopy) {
    return `Continuity failed: ${options.continuityErrorCopy}`;
  }
  return "Type your request or drag files with Shift held...";
};

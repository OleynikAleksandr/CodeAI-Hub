const CODEX_AUTH_FAILURE_PATTERN =
  /refresh token was already used|token_expired|access token could not be refreshed/iu;

export const formatCodexAuthRecoveryMessage = (params: {
  readonly message: string;
  readonly providerId: string | undefined;
}): string | null => {
  if (
    params.providerId !== "codexCli" ||
    !CODEX_AUTH_FAILURE_PATTERN.test(params.message)
  ) {
    return null;
  }
  return `Codex authentication needs a full re-login.
Close CodeAI Hub Project Manager and every other app that is using Codex, then run in Terminal:
cd ~
codex logout
codex login
After login succeeds, reopen CodeAI Hub and retry this step.
Original provider error: ${params.message}`;
};

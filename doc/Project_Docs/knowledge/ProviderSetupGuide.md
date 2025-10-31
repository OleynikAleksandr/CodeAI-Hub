# Provider Setup Guide

CodeAI Hub assumes that you already have valid subscriptions and official tooling for each AI provider you plan to use. The extension **does not install CLI tools on your behalf**. Follow the checklists below before launching the extension.

> **Important:** keep credentials private. The commands below run under your user account and store tokens on your machine only.

## Anthropic Claude

1. **Install the CLI / SDK**
   ```bash
   npm install -g @anthropic-ai/claude-agent-sdk
   ```
   This adds the `claude` binary to your global npm prefix (for example `~/.npm-global/bin`).

2. **Authenticate**
   ```bash
   claude login
   ```
   Complete the browser flow. Credentials are stored under `~/.claude/`.

3. **Verify installation**
   ```bash
   claude --version
   claude whoami
   ```
   Both commands must succeed without prompting.

## OpenAI Codex

1. **Install the SDK**
   ```bash
   npm install -g @openai/codex-sdk
   ```
   The global binary resides in `~/.npm-global/bin/codex` (macOS/Linux) or `%APPDATA%\npm\codex` (Windows).

2. **Authenticate**
   - ChatGPT login (default):
     ```bash
     codex login
     ```
   - API key (optional): set `CODEX_API_KEY=<your-key>` and rerun the command.
   Tokens are stored in `~/.codex/auth.json`.

3. **Verify installation**
   ```bash
   codex --version
   codex exec --experimental-json -p "ping" | head -n 1
   ```
   The second command should emit a JSONL response without errors.

## Google Gemini CLI

1. **Install the CLI**
   ```bash
   npm install -g @google/gemini-cli
   ```

2. **Authenticate**
   ```bash
   gemini login
   ```
   Follow the browser prompt. Credentials live in `~/.gemini/credentials.json`.

3. **Verify installation**
   ```bash
   gemini --version
   printf 'ping\n/exit\n' | gemini -o json
   ```
   The prompt should return a JSON object and exit code 0.

## If you skip a provider

- Keep the CLI uninstalled, or run its `logout` command to invalidate tokens.
- Inside CodeAI Hub you can disable the provider in Settings (upcoming UI). Until then, the provider will show as `inactive` when the CLI is missing.

Prepare these tools before installing or updating the extension to ensure a smooth start.

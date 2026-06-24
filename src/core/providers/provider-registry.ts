import {
  getDefaultProviderDescription,
  getDefaultProviderTitle,
  type ProviderStackDescriptor,
} from "../../types/provider";

/**
 * Describes the set of provider stacks currently available to the extension.
 * In the future this registry will interrogate installed CLIs. For now it
 * returns static stubs that mark the stacks as connected.
 */
export class ProviderRegistry {
  listStacks(): readonly ProviderStackDescriptor[] {
    return this.stacks;
  }

  private readonly stacks: readonly ProviderStackDescriptor[] = [
    {
      id: "claudeCodeCli",
      title: getDefaultProviderTitle("claudeCodeCli"),
      description: getDefaultProviderDescription("claudeCodeCli"),
      connected: true,
      statusMessage: null,
    },
    {
      id: "codexCli",
      title: getDefaultProviderTitle("codexCli"),
      description: getDefaultProviderDescription("codexCli"),
      connected: true,
      statusMessage: null,
    },
  ];
}

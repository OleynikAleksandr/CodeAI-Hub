import {
  getDefaultProviderDescription,
  getDefaultProviderTitle,
  type ProviderStackDescriptor,
} from "../../../../types/provider";

export const FALLBACK_PROVIDERS: ProviderStackDescriptor[] = [
  {
    id: "claudeCodeCli",
    title: getDefaultProviderTitle("claudeCodeCli"),
    description: getDefaultProviderDescription("claudeCodeCli"),
    connected: true,
  },
  {
    id: "codexCli",
    title: getDefaultProviderTitle("codexCli"),
    description: getDefaultProviderDescription("codexCli"),
    connected: true,
  },
  {
    id: "geminiCli",
    title: getDefaultProviderTitle("geminiCli"),
    description: getDefaultProviderDescription("geminiCli"),
    connected: true,
  },
];

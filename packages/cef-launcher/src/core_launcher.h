#pragma once

#include <string>

namespace codeai::launcher {

// Starts the CodeAI Hub core orchestrator if it is not already running.
// Returns true when the core is reachable (either already running or
// successfully launched), false otherwise.
bool EnsureCoreProcessRunning();

// Exposed for tests/platform code to check whether an active core is listening.
bool IsCoreListening(const std::string& host, int port);

void LogLauncherInfo(const std::string& message);
void LogLauncherWarn(const std::string& message);
void LogLauncherError(const std::string& message);

}  // namespace codeai::launcher

#include "core_launcher.h"

#include <algorithm>
#include <chrono>
#include <cerrno>
#include <ctime>
#include <cctype>
#include <cstdio>
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <limits>
#include <optional>
#include <string>
#include <sstream>
#include <system_error>
#include <thread>
#include <vector>
#include <iterator>

#include "base/cef_callback.h"
#include "include/cef_task.h"
#include "include/wrapper/cef_closure_task.h"

#ifdef _WIN32
#include <Windows.h>
#include <ShlObj.h>
#include <processenv.h>
#include <shellapi.h>
#include <winbase.h>
#include <winsock2.h>
#include <ws2tcpip.h>
#pragma comment(lib, "Ws2_32.lib")
#else
#include <arpa/inet.h>
#include <netdb.h>
#include <spawn.h>
#include <sys/socket.h>
#include <sys/types.h>
#include <unistd.h>
#include <fcntl.h>
#include <signal.h>
extern char** environ;
#endif

namespace codeai::launcher {

namespace {

constexpr const char* kDefaultHost = "127.0.0.1";
constexpr int kDefaultPort = 8080;
constexpr int kConnectTimeoutMs = 800;
constexpr int kReadyPollAttempts = 25;
constexpr int kReadyPollDelayMs = 200;
constexpr int kCoreMonitoringIntervalMs = 5000;
constexpr const char* kLogsRoot = ".codeai-hub/logs";
constexpr const char* kLauncherLogDirectory = "launcher";
constexpr const char* kLauncherLogFilename = "launcher.log";
constexpr const char* kCoreLogDirectory = "core";
constexpr const char* kCoreLogFilename = "core.log";
constexpr const char* kStateRoot = ".codeai-hub/state";
constexpr const char* kManagerLockFilename = "core-manager.lock";
constexpr const char* kWorkspaceStateFilename = "workspace-path";
constexpr const char* kCurrentPointerFilename = "current";
constexpr int kPortCandidatePool[] = {
  8080, 8081, 8082, 8083, 8084, 8085, 8086, 8087, 8088, 8089, 8090, 8091, 8092
};
constexpr int kShutdownWaitMs = 5000;
constexpr int kShutdownPollDelayMs = 200;
constexpr char kPathSeparator =
#ifdef _WIN32
  ';'
#else
  ':'
#endif
;

struct ManagerClaim {
  std::string manager;
  int pid = 0;
  long long timestamp = 0;
};

struct LockAcquisitionResult {
  bool acquired = false;
  std::string owner;
};

bool g_manager_lock_acquired = false;
std::filesystem::path g_manager_lock_path;

void ReleaseManagerLock();
const std::string kLauncherManagerId = "launcher";

std::string g_workspace_override;

std::filesystem::path GetHomeDirectory();

std::string CurrentTimestamp() {
  const auto now = std::chrono::system_clock::now();
  const auto time = std::chrono::system_clock::to_time_t(now);
  std::tm tm_info {};
#ifdef _WIN32
  localtime_s(&tm_info, &time);
#else
  localtime_r(&time, &tm_info);
#endif
  std::ostringstream stream;
  stream << std::put_time(&tm_info, "%Y-%m-%dT%H:%M:%S");
  const auto milliseconds =
    std::chrono::duration_cast<std::chrono::milliseconds>(
      now.time_since_epoch()) % 1000;
  stream << '.' << std::setw(3) << std::setfill('0') << milliseconds.count()
         << 'Z';
  return stream.str();
}

std::filesystem::path ResolveLauncherLogFile() {
  static bool initialized = false;
  static std::filesystem::path logFile;
  if (initialized) {
    return logFile;
  }

  initialized = true;
  const std::filesystem::path home = GetHomeDirectory();
  const std::filesystem::path logDir =
    home / kLogsRoot / kLauncherLogDirectory;
  std::error_code ec;
  std::filesystem::create_directories(logDir, ec);
  if (ec) {
    return logFile;
  }

  logFile = logDir / kLauncherLogFilename;
  return logFile;
}

void AppendLauncherLog(const std::string& level, const std::string& message) {
  const std::filesystem::path logFile = ResolveLauncherLogFile();
  if (logFile.empty()) {
    return;
  }

  std::ofstream stream(logFile, std::ios::app);
  if (!stream) {
    return;
  }
  stream << CurrentTimestamp() << " [" << level << "] " << message << '\n';
}

std::string GetEnvOrDefault(const char* key, const std::string& fallback) {
  if (!key) {
    return fallback;
  }
  const char* value = std::getenv(key);
  if (!value || value[0] == '\0') {
    return fallback;
  }
  return value;
}

std::string ResolveWorkspacePath(const std::filesystem::path& home) {
  const std::string envWorkspace =
    GetEnvOrDefault("CLAUDE_WORKSPACE_PATH", "");
  if (!envWorkspace.empty()) {
    return envWorkspace;
  }
  if (!g_workspace_override.empty()) {
    return g_workspace_override;
  }
  return home.string();
}

int ParsePort(const std::string& value, int fallback) {
  if (value.empty()) {
    return fallback;
  }
  char* end = nullptr;
  const long parsed = std::strtol(value.c_str(), &end, 10);
  if (end == value.c_str() || (end && *end != '\0')) {
    return fallback;
  }
  if (parsed <= 0 || parsed > 65535) {
    return fallback;
  }
  return static_cast<int>(parsed);
}

std::string FormatEndpoint(const std::string& host, int port) {
  return host + ":" + std::to_string(port);
}

std::string PrependPathSegment(
  const std::filesystem::path& segment,
  const std::string& existing
) {
  if (segment.empty()) {
    return existing;
  }
  if (existing.empty()) {
    return segment.string();
  }
  return segment.string() + kPathSeparator + existing;
}

#ifdef _WIN32
bool IsManagerProcessAlive(int pid) {
  if (pid <= 0) {
    return false;
  }
  HANDLE process = OpenProcess(SYNCHRONIZE, FALSE, static_cast<DWORD>(pid));
  if (!process) {
    return false;
  }
  const DWORD waitResult = WaitForSingleObject(process, 0);
  CloseHandle(process);
  return waitResult == WAIT_TIMEOUT;
}
#else
bool IsManagerProcessAlive(int pid) {
  if (pid <= 0) {
    return false;
  }
  if (kill(static_cast<pid_t>(pid), 0) == 0) {
    return true;
  }
  return errno == EPERM;
}
#endif

std::filesystem::path ResolveManagerLockPath(
  const std::filesystem::path& home
) {
  const std::filesystem::path lockDir = home / kStateRoot;
  std::error_code ec;
  std::filesystem::create_directories(lockDir, ec);
  return lockDir / kManagerLockFilename;
}

std::optional<ManagerClaim> ReadManagerClaim(
  const std::filesystem::path& lockFile
) {
  std::ifstream stream(lockFile);
  if (!stream) {
    return std::nullopt;
  }
  ManagerClaim claim;
  std::string line;
  while (std::getline(stream, line)) {
    const auto separator = line.find('=');
    if (separator == std::string::npos) {
      continue;
    }
    const std::string key = line.substr(0, separator);
    const std::string value = line.substr(separator + 1);
    if (key == "manager") {
      claim.manager = value;
    } else if (key == "pid") {
      claim.pid = std::stoi(value);
    } else if (key == "timestamp") {
      claim.timestamp = std::stoll(value);
    }
  }
  if (claim.manager.empty() || claim.pid <= 0) {
    return std::nullopt;
  }
  return claim;
}

std::string SerializeManagerClaim(int pid) {
  const long long timestamp = std::chrono::duration_cast<
    std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()
  ).count();
  std::ostringstream payload;
  payload << "manager=" << kLauncherManagerId << "\n";
  payload << "pid=" << pid << "\n";
  payload << "timestamp=" << timestamp << "\n";
  return payload.str();
}

bool TryWriteManagerClaim(
  const std::filesystem::path& lockFile,
  int pid
) {
  const std::string payload = SerializeManagerClaim(pid);
#ifdef _WIN32
  HANDLE handle = CreateFileW(
    lockFile.wstring().c_str(),
    GENERIC_WRITE,
    0,
    nullptr,
    CREATE_NEW,
    FILE_ATTRIBUTE_NORMAL,
    nullptr
  );
  if (handle == INVALID_HANDLE_VALUE) {
    return false;
  }
  DWORD written = 0;
  const BOOL success = WriteFile(
    handle,
    payload.c_str(),
    static_cast<DWORD>(payload.size()),
    &written,
    nullptr
  );
  CloseHandle(handle);
  return success == TRUE;
#else
  const std::string lockPath = lockFile.string();
  const int fd = open(lockPath.c_str(), O_CREAT | O_EXCL | O_WRONLY, 0644);
  if (fd < 0) {
    return false;
  }
  const ssize_t result = write(fd, payload.c_str(), payload.size());
  close(fd);
  return result == static_cast<ssize_t>(payload.size());
#endif
}

[[maybe_unused]] LockAcquisitionResult AcquireManagerLock(
  const std::filesystem::path& home
) {
  LockAcquisitionResult result;
  if (g_manager_lock_acquired) {
    result.acquired = true;
    return result;
  }
  const std::filesystem::path lockFile = ResolveManagerLockPath(home);
#ifdef _WIN32
  const int currentPid = static_cast<int>(GetCurrentProcessId());
#else
  const int currentPid = static_cast<int>(getpid());
#endif
  for (int attempt = 0; attempt < 2; ++attempt) {
    if (TryWriteManagerClaim(lockFile, currentPid)) {
      g_manager_lock_acquired = true;
      g_manager_lock_path = lockFile;
      std::atexit(ReleaseManagerLock);
      result.acquired = true;
      return result;
    }
    const auto claim = ReadManagerClaim(lockFile);
    if (!claim.has_value()) {
      std::error_code removeError;
      std::filesystem::remove(lockFile, removeError);
      continue;
    }
    if (claim->manager == kLauncherManagerId && claim->pid == currentPid) {
      g_manager_lock_acquired = true;
      g_manager_lock_path = lockFile;
      result.acquired = true;
      return result;
    }
    if (!IsManagerProcessAlive(claim->pid)) {
      std::error_code removeError;
      std::filesystem::remove(lockFile, removeError);
      continue;
    }
    result.owner = claim->manager;
    return result;
  }
  return result;
}

void ReleaseManagerLock() {
  if (!g_manager_lock_acquired) {
    return;
  }
  if (!g_manager_lock_path.empty()) {
    std::error_code ec;
    std::filesystem::remove(g_manager_lock_path, ec);
  }
  g_manager_lock_acquired = false;
}

#ifdef _WIN32
void SetEnv(const std::string& key, const std::string& value) {
  _putenv_s(key.c_str(), value.c_str());
}

std::filesystem::path GetHomeDirectory() {
  PWSTR path = nullptr;
  if (SHGetKnownFolderPath(FOLDERID_Profile, 0, nullptr, &path) == S_OK) {
    std::filesystem::path result(path);
    CoTaskMemFree(path);
    return result;
  }
  const char* userProfile = std::getenv("USERPROFILE");
  if (userProfile && userProfile[0] != '\0') {
    return std::filesystem::path(userProfile);
  }
  const char* homeDrive = std::getenv("HOMEDRIVE");
  const char* homePath = std::getenv("HOMEPATH");
  if (homeDrive && homePath && homeDrive[0] != '\0' && homePath[0] != '\0') {
    return std::filesystem::path(std::string(homeDrive) + homePath);
  }
  return std::filesystem::current_path();
}

std::string DetectPlatformKey() {
  return "win32-x64";
}
#else
void SetEnv(const std::string& key, const std::string& value) {
  setenv(key.c_str(), value.c_str(), 1);
}

std::filesystem::path GetHomeDirectory() {
  const char* home = std::getenv("HOME");
  if (home && home[0] != '\0') {
    return std::filesystem::path(home);
  }
  return std::filesystem::current_path();
}

std::string DetectPlatformKey() {
#if defined(__APPLE__)
#if defined(__aarch64__) || defined(__ARM_ARCH_7A__)
  return "darwin-arm64";
#else
  return "darwin-x64";
#endif
#else
  return "linux-x64";
#endif
}
#endif

std::string Trim(const std::string& value) {
  const auto is_space = [](unsigned char ch) { return std::isspace(ch) != 0; };
  auto start = std::find_if_not(value.begin(), value.end(), is_space);
  auto end = std::find_if_not(value.rbegin(), value.rend(), is_space).base();
  if (start >= end) {
    return "";
  }
  return std::string(start, end);
}

std::optional<std::string> ReadPointerFile(
  const std::filesystem::path& pointerPath
) {
  std::ifstream stream(pointerPath);
  if (!stream.is_open()) {
    return std::nullopt;
  }
  std::string line;
  std::getline(stream, line);
  stream.close();
  line = Trim(line);
  if (line.empty()) {
    return std::nullopt;
  }
  return line;
}

std::optional<std::filesystem::path> ResolveCoreRuntimeDirectory(
  const std::filesystem::path& home
) {
  const std::string platformKey = DetectPlatformKey();
  const std::filesystem::path base =
    home / ".codeai-hub" / "core" / platformKey;
  if (!std::filesystem::exists(base) || !std::filesystem::is_directory(base)) {
    return std::nullopt;
  }

  const std::filesystem::path pointer =
    base / kCurrentPointerFilename;
  const auto currentVersion = ReadPointerFile(pointer);
  if (currentVersion && !currentVersion->empty()) {
    const std::filesystem::path candidate = base / *currentVersion;
    const std::filesystem::path installMarker = candidate / "install.json";
    if (
      std::filesystem::exists(candidate) &&
      std::filesystem::exists(installMarker)
    ) {
      return candidate;
    }
  }

  std::optional<std::filesystem::path> latest;
  for (const auto& entry : std::filesystem::directory_iterator(base)) {
    if (!entry.is_directory()) {
      continue;
    }
    const auto& candidate = entry.path();
    const std::string name = candidate.filename().string();
    if (name == "downloads" || name == "tmp" || name.empty()) {
      continue;
    }
    const std::filesystem::path installMarker = candidate / "install.json";
    if (!std::filesystem::exists(installMarker)) {
      continue;
    }
    if (!latest.has_value() ||
        candidate.filename().string() > latest->filename().string()) {
      latest = candidate;
    }
  }
  return latest;
}

[[maybe_unused]] std::filesystem::path ResolveNodeExecutable(
  const std::filesystem::path& runtimeDir
) {
#ifdef _WIN32
  return runtimeDir / "node" / "node.exe";
#else
  return runtimeDir / "node" / "bin" / "node";
#endif
}

[[maybe_unused]] std::filesystem::path ResolveEntryPoint(
  const std::filesystem::path& runtimeDir
) {
  return runtimeDir / "app" / "dist" / "index.js";
}

std::optional<std::filesystem::path> ResolveProviderPath(
  const std::filesystem::path& home,
  const std::string& providerId
) {
  const std::filesystem::path providerRoot =
    home / ".codeai-hub" / "providers" / providerId;
  const std::filesystem::path marker = providerRoot / "latest";
  if (!std::filesystem::exists(marker)) {
    return std::nullopt;
  }
  std::ifstream stream(marker);
  if (!stream.is_open()) {
    return std::nullopt;
  }
  std::string version;
  std::getline(stream, version);
  stream.close();
  version = Trim(version);
  if (version.empty()) {
    return std::nullopt;
  }
  const std::filesystem::path resolved = providerRoot / version;
  if (!std::filesystem::exists(resolved)) {
    return std::nullopt;
  }
  return resolved;
}

void ExportProviderEnvironment(
  const std::filesystem::path& home
) {
  const auto claude = ResolveProviderPath(home, "claude");
  if (claude) {
    SetEnv("CLAUDE_MODULE_PATH", claude->string());
  }

  const auto codex = ResolveProviderPath(home, "codex");
  if (codex) {
    SetEnv("CODEX_MODULE_PATH", codex->string());
  }
}

#ifdef _WIN32
[[maybe_unused]] bool LaunchProcess(
  const std::filesystem::path& executable,
  const std::filesystem::path& entryPoint
) {
  std::wstring command =
    L"\"" + executable.wstring() + L"\" \"" + entryPoint.wstring() + L"\"";
  STARTUPINFOW startupInfo;
  PROCESS_INFORMATION processInfo;
  ZeroMemory(&startupInfo, sizeof(startupInfo));
  ZeroMemory(&processInfo, sizeof(processInfo));
  startupInfo.cb = sizeof(startupInfo);

  BOOL success = CreateProcessW(
    nullptr,
    command.data(),
    nullptr,
    nullptr,
    FALSE,
    CREATE_NO_WINDOW,
    nullptr,
    nullptr,
    &startupInfo,
    &processInfo);

  if (!success) {
    DWORD error = GetLastError();
    LogLauncherError(
      "CreateProcessW failed with error code " + std::to_string(error));
    std::fprintf(
      stderr,
      "CodeAIHubLauncher: failed to start core process (error %lu)\n",
      error);
    return false;
  }

  CloseHandle(processInfo.hProcess);
  CloseHandle(processInfo.hThread);
  return true;
}

bool LaunchSupervisorStart(
  const std::string& host,
  int port
) {
  const std::wstring hostWide(host.begin(), host.end());
  const std::wstring portWide = std::to_wstring(port);
  std::wstring command =
    L"codeai-core start --host " + hostWide + L" --port " + portWide;

  STARTUPINFOW startupInfo;
  PROCESS_INFORMATION processInfo;
  ZeroMemory(&startupInfo, sizeof(startupInfo));
  ZeroMemory(&processInfo, sizeof(processInfo));
  startupInfo.cb = sizeof(startupInfo);

  BOOL success = CreateProcessW(
    nullptr,
    command.data(),
    nullptr,
    nullptr,
    FALSE,
    CREATE_NO_WINDOW,
    nullptr,
    nullptr,
    &startupInfo,
    &processInfo);

  if (!success) {
    DWORD error = GetLastError();
    LogLauncherError(
      "CreateProcessW failed for codeai-core with error code " +
      std::to_string(error));
    std::fprintf(
      stderr,
      "CodeAIHubLauncher: failed to start core supervisor (error %lu)\n",
      error);
    return false;
  }

  CloseHandle(processInfo.hProcess);
  CloseHandle(processInfo.hThread);
  return true;
}
#else
[[maybe_unused]] bool LaunchProcess(
  const std::filesystem::path& executable,
  const std::filesystem::path& entryPoint
) {
  std::vector<char*> argv;
  argv.push_back(const_cast<char*>(executable.c_str()));
  argv.push_back(const_cast<char*>(entryPoint.c_str()));
  argv.push_back(nullptr);

  pid_t pid;
  const int status =
    posix_spawn(&pid, executable.c_str(), nullptr, nullptr, argv.data(), environ);
  if (status != 0) {
    LogLauncherError(
      "posix_spawn failed with status " + std::to_string(status));
    std::fprintf(
      stderr,
  "CodeAIHubLauncher: posix_spawn failed to start core (status %d)\n",
      status);
    return false;
  }
  return true;
}

bool LaunchSupervisorStart(
  const std::string& host,
  int port
) {
  std::vector<std::string> args;
  args.emplace_back("codeai-core");
  args.emplace_back("start");
  args.emplace_back("--host");
  args.push_back(host);
  args.emplace_back("--port");
  args.push_back(std::to_string(port));

  std::vector<char*> argv;
  argv.reserve(args.size() + 1);
  for (std::string& arg : args) {
    argv.push_back(arg.data());
  }
  argv.push_back(nullptr);

  pid_t pid;
  const int status = posix_spawnp(
    &pid,
    "codeai-core",
    nullptr,
    nullptr,
    argv.data(),
    environ
  );
  if (status != 0) {
    LogLauncherError(
      "posix_spawnp failed for codeai-core with status " +
      std::to_string(status));
    std::fprintf(
      stderr,
      "CodeAIHubLauncher: posix_spawnp failed to start core supervisor (status %d)\n",
      status);
    return false;
  }
  return true;
}
#endif

void EnsureGlobalEnvironment(
  const std::filesystem::path& runtimeDir,
  const std::filesystem::path& home
) {
  const std::filesystem::path appDir = runtimeDir / "app";
  SetEnv("CODEAI_HUB_RUNTIME_DIR", runtimeDir.string());
  SetEnv("CODEAI_HUB_APP_DIR", appDir.string());

  const std::filesystem::path nodeBin = runtimeDir / "node" / "bin";
  const std::string existingPath = GetEnvOrDefault("PATH", "");
  const std::string updatedPath =
    PrependPathSegment(nodeBin, existingPath);
  SetEnv("PATH", updatedPath);
  LogLauncherInfo("PATH updated for core bootstrap: " + updatedPath);

  const std::filesystem::path logsRoot = home / kLogsRoot;
  const std::filesystem::path coreLogDir =
    logsRoot / kCoreLogDirectory;
  std::error_code logDirError;
  std::filesystem::create_directories(coreLogDir, logDirError);
  const std::filesystem::path coreLogFile =
    coreLogDir / kCoreLogFilename;
  SetEnv("CODEAI_CORE_LOG_FILE", coreLogFile.string());
  if (logDirError) {
    LogLauncherWarn(
      "Failed to ensure core log directory: " + coreLogDir.string());
  } else {
    LogLauncherInfo(
      "Core log file configured at " + coreLogFile.string());
  }

  RegisterWorkspaceFromState(home);
  const std::string workspace = ResolveWorkspacePath(home);
  SetEnv("CLAUDE_WORKSPACE_PATH", workspace);
  const std::string codexWorkspace =
    GetEnvOrDefault("CODEX_WORKSPACE_PATH", workspace);
  SetEnv("CODEX_WORKSPACE_PATH", codexWorkspace);
  SetEnv("CODEX_SKIP_GIT_REPO_CHECK", "true");

  SetEnv("CORE_MANAGED_MODE", "launcher");
  LogLauncherInfo("Core managed mode set to: launcher");

  if (GetEnvOrDefault("NODE_ENV", "") .empty()) {
    SetEnv("NODE_ENV", "production");
  }
}

void MonitorCoreHealth();

}  // namespace

std::optional<std::string> ExtractWorkspacePath(
  const std::filesystem::path& configPath
) {
  std::ifstream stream(configPath);
  if (!stream.is_open()) {
    return std::nullopt;
  }
  const std::string content(
    (std::istreambuf_iterator<char>(stream)),
    std::istreambuf_iterator<char>()
  );
  const std::string key = "\"workspacePath\"";
  const size_t keyPos = content.find(key);
  if (keyPos == std::string::npos) {
    return std::nullopt;
  }
  const size_t colonPos = content.find(':', keyPos + key.size());
  if (colonPos == std::string::npos) {
    return std::nullopt;
  }
  size_t firstQuote = content.find('"', colonPos);
  if (firstQuote == std::string::npos) {
    return std::nullopt;
  }
  firstQuote += 1;
  size_t secondQuote = content.find('"', firstQuote);
  if (secondQuote == std::string::npos || secondQuote <= firstQuote) {
    return std::nullopt;
  }
  std::string raw = content.substr(firstQuote, secondQuote - firstQuote);
  raw = Trim(raw);
  if (raw.empty()) {
    return std::nullopt;
  }
  return raw;
}

std::optional<std::string> ReadWorkspaceState(
  const std::filesystem::path& home
) {
  const std::filesystem::path stateFile =
    home / kStateRoot / kWorkspaceStateFilename;
  std::ifstream stream(stateFile);
  if (!stream.is_open()) {
    return std::nullopt;
  }
  std::string line;
  std::getline(stream, line);
  stream.close();
  line = Trim(line);
  if (line.empty()) {
    return std::nullopt;
  }
  return line;
}

void RegisterWorkspaceFromState(const std::filesystem::path& home) {
  if (!g_workspace_override.empty()) {
    return;
  }
  const auto stored = ReadWorkspaceState(home);
  if (stored && !stored->empty()) {
    g_workspace_override = *stored;
    LogLauncherInfo("Workspace override loaded from state file.");
  }
}


void RegisterWorkspaceFromConfig(const std::string& configPath) {
  if (configPath.empty()) {
    return;
  }
  std::error_code ec;
  std::filesystem::path resolved(configPath);
  if (!std::filesystem::exists(resolved, ec)) {
    return;
  }
  const auto workspace = ExtractWorkspacePath(resolved);
  if (!workspace || workspace->empty()) {
    return;
  }
  g_workspace_override = *workspace;
  LogLauncherInfo("Workspace override captured: " + g_workspace_override);
}

std::optional<std::string> ExtractJsonStringField(
  const std::string& json,
  const std::string& key
) {
  const std::string pattern = "\"" + key + "\"";
  const auto keyPos = json.find(pattern);
  if (keyPos == std::string::npos) {
    return std::nullopt;
  }
  const auto colonPos = json.find(':', keyPos + pattern.size());
  if (colonPos == std::string::npos) {
    return std::nullopt;
  }
  auto quoteStart = json.find('"', colonPos + 1);
  if (quoteStart == std::string::npos) {
    return std::nullopt;
  }
  auto quoteEnd = json.find('"', quoteStart + 1);
  if (quoteEnd == std::string::npos || quoteEnd <= quoteStart + 1) {
    return std::nullopt;
  }
  return json.substr(quoteStart + 1, quoteEnd - quoteStart - 1);
}

std::optional<int> TryParseInt(const std::string& value) {
  if (value.empty()) {
    return std::nullopt;
  }
  char* end = nullptr;
  const long parsed = std::strtol(value.c_str(), &end, 10);
  if (end == value.c_str() || (end && *end != '\0')) {
    return std::nullopt;
  }
  if (
    parsed < std::numeric_limits<int>::min() ||
    parsed > std::numeric_limits<int>::max()
  ) {
    return std::nullopt;
  }
  return static_cast<int>(parsed);
}

std::optional<int> ExtractJsonIntField(
  const std::string& json,
  const std::string& key
) {
  const std::string pattern = "\"" + key + "\"";
  const auto keyPos = json.find(pattern);
  if (keyPos == std::string::npos) {
    return std::nullopt;
  }
  const auto colonPos = json.find(':', keyPos + pattern.size());
  if (colonPos == std::string::npos) {
    return std::nullopt;
  }
  size_t index = colonPos + 1;
  while (
    index < json.size() &&
    std::isspace(static_cast<unsigned char>(json[index])) != 0
  ) {
    ++index;
  }
  size_t end = index;
  while (
    end < json.size() &&
    std::isdigit(static_cast<unsigned char>(json[end])) != 0
  ) {
    ++end;
  }
  if (end == index) {
    return std::nullopt;
  }
  const auto slice = json.substr(index, end - index);
  return TryParseInt(slice);
}

std::optional<std::string> ReadCoreVersion(
  const std::filesystem::path& runtimeDir
) {
  const std::filesystem::path installFile = runtimeDir / "install.json";
  std::ifstream stream(installFile);
  if (!stream.is_open()) {
    return std::nullopt;
  }
  std::string content(
    (std::istreambuf_iterator<char>(stream)),
    std::istreambuf_iterator<char>());
  stream.close();
  return ExtractJsonStringField(content, "coreVersion");
}

std::optional<int> ReadPreferredCorePort(const std::filesystem::path& home) {
  const std::filesystem::path registryPath =
    home / ".codeai-hub" / "state" / "runtime-registry.json";
  std::ifstream stream(registryPath);
  if (!stream.is_open()) {
    return std::nullopt;
  }
  std::string content(
    (std::istreambuf_iterator<char>(stream)),
    std::istreambuf_iterator<char>());
  stream.close();
  return ExtractJsonIntField(content, "corePort");
}

std::vector<int> BuildPortCandidates(
  int envPort,
  const std::optional<int>& storedPort
) {
  std::vector<int> candidates;
  const auto append = [&candidates](int candidate) {
    if (candidate <= 0) {
      return;
    }
    if (
      std::find(candidates.begin(), candidates.end(), candidate) ==
      candidates.end()
    ) {
      candidates.push_back(candidate);
    }
  };

  append(envPort);
  if (storedPort.has_value()) {
    append(*storedPort);
  }
  for (int candidate : kPortCandidatePool) {
    append(candidate);
  }
  return candidates;
}

struct HttpResponse {
  int status = -1;
  std::string body;
};

struct CoreHealthInfo {
  std::string version;
  int pid = 0;
};

struct CoreStatusSummary {
  bool healthy = false;
};

#ifdef _WIN32
bool SendAll(SOCKET sock, const std::string& data) {
  size_t total = 0;
  while (total < data.size()) {
    const int sent = send(
      sock,
      data.data() + total,
      static_cast<int>(data.size() - total),
      0);
    if (sent <= 0) {
      return false;
    }
    total += static_cast<size_t>(sent);
  }
  return true;
}

bool ReceiveAll(SOCKET sock, std::string& buffer) {
  char chunk[1024];
  int received = 0;
  while ((received = recv(sock, chunk, sizeof(chunk), 0)) > 0) {
    buffer.append(chunk, received);
  }
  return !buffer.empty();
}
#else
bool SendAll(int sock, const std::string& data) {
  size_t total = 0;
  while (total < data.size()) {
    const ssize_t sent = send(
      sock,
      data.data() + total,
      data.size() - total,
      0);
    if (sent <= 0) {
      return false;
    }
    total += static_cast<size_t>(sent);
  }
  return true;
}

bool ReceiveAll(int sock, std::string& buffer) {
  char chunk[1024];
  ssize_t received = 0;
  while ((received = recv(sock, chunk, sizeof(chunk), 0)) > 0) {
    buffer.append(chunk, received);
  }
  return !buffer.empty();
}
#endif

std::optional<HttpResponse> PerformHttpRequest(
  const std::string& host,
  int port,
  const std::string& requestPayload
) {
  const std::string portString = std::to_string(port);
#ifdef _WIN32
  WSADATA wsaData;
  if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
    return std::nullopt;
  }
#endif
  addrinfo hints = {};
  hints.ai_family = AF_UNSPEC;
  hints.ai_socktype = SOCK_STREAM;
  hints.ai_protocol = IPPROTO_TCP;

  addrinfo* result = nullptr;
  if (
    getaddrinfo(host.c_str(), portString.c_str(), &hints, &result) != 0 ||
    !result
  ) {
#ifdef _WIN32
    WSACleanup();
#endif
    return std::nullopt;
  }

  std::optional<HttpResponse> response;
  for (addrinfo* ptr = result; ptr != nullptr; ptr = ptr->ai_next) {
#ifdef _WIN32
    SOCKET sock = socket(ptr->ai_family, ptr->ai_socktype, ptr->ai_protocol);
    if (sock == INVALID_SOCKET) {
      continue;
    }
    DWORD timeout = kConnectTimeoutMs;
    setsockopt(
      sock,
      SOL_SOCKET,
      SO_RCVTIMEO,
      reinterpret_cast<const char*>(&timeout),
      sizeof(timeout));
    setsockopt(
      sock,
      SOL_SOCKET,
      SO_SNDTIMEO,
      reinterpret_cast<const char*>(&timeout),
      sizeof(timeout));
    if (::connect(sock, ptr->ai_addr, static_cast<int>(ptr->ai_addrlen)) != 0) {
      closesocket(sock);
      continue;
    }
    std::string raw;
    if (!SendAll(sock, requestPayload) || !ReceiveAll(sock, raw)) {
      closesocket(sock);
      continue;
    }
    closesocket(sock);
#else
    int sock = socket(ptr->ai_family, ptr->ai_socktype, ptr->ai_protocol);
    if (sock < 0) {
      continue;
    }
    timeval timeout{};
    timeout.tv_sec = kConnectTimeoutMs / 1000;
    timeout.tv_usec = (kConnectTimeoutMs % 1000) * 1000;
    setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, &timeout, sizeof(timeout));
    setsockopt(sock, SOL_SOCKET, SO_SNDTIMEO, &timeout, sizeof(timeout));
    if (::connect(sock, ptr->ai_addr, ptr->ai_addrlen) != 0) {
      close(sock);
      continue;
    }
    std::string raw;
    if (!SendAll(sock, requestPayload) || !ReceiveAll(sock, raw)) {
      close(sock);
      continue;
    }
    close(sock);
#endif
    const auto headerEnd = raw.find("\r\n\r\n");
    if (headerEnd == std::string::npos) {
      continue;
    }
    const std::string header = raw.substr(0, headerEnd);
    const std::string body = raw.substr(headerEnd + 4);
    int status = -1;
    const auto firstSpace = header.find(' ');
    if (firstSpace != std::string::npos) {
      const auto secondSpace = header.find(' ', firstSpace + 1);
      if (secondSpace != std::string::npos && secondSpace > firstSpace + 1) {
        const auto slice =
          header.substr(firstSpace + 1, secondSpace - firstSpace - 1);
        const auto parsed = TryParseInt(slice);
        status = parsed.value_or(-1);
      }
    }
    response = HttpResponse{status, body};
    break;
  }

  freeaddrinfo(result);
#ifdef _WIN32
  WSACleanup();
#endif
  return response;
}

std::optional<CoreHealthInfo> QueryCoreHealth(
  const std::string& host,
  int port
) {
  const std::string request =
    "GET /api/v1/health HTTP/1.1\r\nHost: " + host + ":" +
    std::to_string(port) +
    "\r\nConnection: close\r\n\r\n";
  const auto response = PerformHttpRequest(host, port, request);
  if (!response.has_value() || response->status != 200) {
    return std::nullopt;
  }

  CoreHealthInfo info;
  const auto version = ExtractJsonStringField(response->body, "version");
  if (version.has_value()) {
    info.version = *version;
  }
  const auto pid = ExtractJsonIntField(response->body, "pid");
  if (pid.has_value()) {
    info.pid = *pid;
  }
  return info;
}

std::optional<CoreStatusSummary> QueryCoreStatus(
  const std::string& host,
  int port
) {
  const std::string request =
    "GET /api/v1/status HTTP/1.1\r\nHost: " + host + ":" +
    std::to_string(port) +
    "\r\nConnection: close\r\n\r\n";
  const auto response = PerformHttpRequest(host, port, request);
  if (!response.has_value() || response->status != 200) {
    return std::nullopt;
  }

  CoreStatusSummary summary;
  summary.healthy = true;
  return summary;
}

bool RequestCoreShutdown(const std::string& host, int port) {
  const std::string request =
    "POST /api/v1/shutdown HTTP/1.1\r\nHost: " + host + ":" +
    std::to_string(port) +
    "\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
  const auto response = PerformHttpRequest(host, port, request);
  if (!response.has_value()) {
    return false;
  }
  return response->status == 200 || response->status == 202;
}

bool WaitForPortRelease(const std::string& host, int port) {
  const auto deadline = std::chrono::steady_clock::now() +
    std::chrono::milliseconds(kShutdownWaitMs);
  while (std::chrono::steady_clock::now() < deadline) {
    if (!IsCoreListening(host, port)) {
      return true;
    }
    std::this_thread::sleep_for(
      std::chrono::milliseconds(kShutdownPollDelayMs));
  }
  return false;
}

bool ForceKillProcess(int pid) {
  if (pid <= 0) {
    return false;
  }
#ifdef _WIN32
  HANDLE process = OpenProcess(PROCESS_TERMINATE, FALSE, static_cast<DWORD>(pid));
  if (!process) {
    return false;
  }
  const BOOL terminated = TerminateProcess(process, 1);
  CloseHandle(process);
  return terminated == TRUE;
#else
  if (kill(static_cast<pid_t>(pid), SIGKILL) == 0) {
    return true;
  }
  return errno == EPERM;
#endif
}

bool TryShutdownExistingCore(
  const std::string& host,
  int port,
  int pid
) {
  LogLauncherInfo(
    "Requesting shutdown of running CodeAI Hub core on " +
    FormatEndpoint(host, port));
  if (RequestCoreShutdown(host, port) && WaitForPortRelease(host, port)) {
    LogLauncherInfo("Existing core stopped gracefully.");
    return true;
  }
  if (pid > 0 && ForceKillProcess(pid) && WaitForPortRelease(host, port)) {
    LogLauncherWarn("Forced termination of existing core process.");
    return true;
  }
  LogLauncherWarn("Failed to stop existing core instance.");
  return false;
}

void LogLauncherInfo(const std::string& message) {
  AppendLauncherLog("INFO", message);
}

void LogLauncherWarn(const std::string& message) {
  AppendLauncherLog("WARN", message);
}

void LogLauncherError(const std::string& message) {
  AppendLauncherLog("ERROR", message);
}

bool IsCoreListening(const std::string& host, int port) {
  const std::string portString = std::to_string(port);
#ifdef _WIN32
  WSADATA wsaData;
  if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
    return false;
  }
#endif
  addrinfo hints = {};
  hints.ai_family = AF_UNSPEC;
  hints.ai_socktype = SOCK_STREAM;
  hints.ai_protocol = IPPROTO_TCP;

  addrinfo* result = nullptr;
  const int status = getaddrinfo(
    host.c_str(),
    portString.c_str(),
    &hints,
    &result);
  if (status != 0 || !result) {
#ifdef _WIN32
    WSACleanup();
#endif
    return false;
  }

  bool connected = false;
  for (addrinfo* ptr = result; ptr != nullptr; ptr = ptr->ai_next) {
#ifdef _WIN32
    SOCKET sock = socket(ptr->ai_family, ptr->ai_socktype, ptr->ai_protocol);
    if (sock == INVALID_SOCKET) {
      continue;
    }
    DWORD timeout = kConnectTimeoutMs;
    setsockopt(
      sock,
      SOL_SOCKET,
      SO_RCVTIMEO,
      reinterpret_cast<const char*>(&timeout),
      sizeof(timeout));
    setsockopt(
      sock,
      SOL_SOCKET,
      SO_SNDTIMEO,
      reinterpret_cast<const char*>(&timeout),
      sizeof(timeout));
    if (::connect(sock, ptr->ai_addr, static_cast<int>(ptr->ai_addrlen)) ==
        0) {
      connected = true;
      closesocket(sock);
      break;
    }
    closesocket(sock);
#else
    int sock = socket(ptr->ai_family, ptr->ai_socktype, ptr->ai_protocol);
    if (sock < 0) {
      continue;
    }
    timeval timeout{};
    timeout.tv_sec = kConnectTimeoutMs / 1000;
    timeout.tv_usec = (kConnectTimeoutMs % 1000) * 1000;
    setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, &timeout, sizeof(timeout));
    setsockopt(sock, SOL_SOCKET, SO_SNDTIMEO, &timeout, sizeof(timeout));
    if (::connect(sock, ptr->ai_addr, ptr->ai_addrlen) == 0) {
      connected = true;
      close(sock);
      break;
    }
    close(sock);
#endif
  }

  freeaddrinfo(result);
#ifdef _WIN32
  WSACleanup();
#endif
  return connected;
}

bool EnsureCoreProcessRunning() {
  const std::string host = GetEnvOrDefault("CORE_HOST", kDefaultHost);
  const std::string envPortValue =
    GetEnvOrDefault("CORE_PORT", std::to_string(kDefaultPort));
  const int envPort = ParsePort(envPortValue, kDefaultPort);

  const std::filesystem::path home = GetHomeDirectory();
  const auto runtimeDir = ResolveCoreRuntimeDirectory(home);
  if (!runtimeDir) {
    LogLauncherError(
      "Core runtime directory not found under " +
      (home / ".codeai-hub" / "core").string());
    std::fprintf(
      stderr,
      "CodeAIHubLauncher: core runtime not found under %s\n",
      (home / ".codeai-hub" / "core").string().c_str());
    return false;
  }
  LogLauncherInfo("Using core runtime at " + runtimeDir->string());

  const auto desiredVersion = ReadCoreVersion(*runtimeDir);
  const auto storedPort = ReadPreferredCorePort(home);
  const std::vector<int> portCandidates =
    BuildPortCandidates(envPort, storedPort);

  int selectedPort = -1;
  for (int candidate : portCandidates) {
    const auto health = QueryCoreHealth(host, candidate);
    if (health.has_value()) {
      if (
        !desiredVersion.has_value() ||
        (health->version == *desiredVersion)
      ) {
        LogLauncherInfo(
          "Core orchestrator already listening on " +
          FormatEndpoint(host, candidate));
        SetEnv("CORE_PORT", std::to_string(candidate));
        return true;
      }
      if (TryShutdownExistingCore(host, candidate, health->pid)) {
        selectedPort = candidate;
        break;
      }
      continue;
    }
    selectedPort = candidate;
    break;
  }

  if (selectedPort < 0) {
    LogLauncherError(
      "Unable to locate an available port for CodeAI Hub core startup.");
    return false;
  }

  LogLauncherInfo(
    "Selected port " + std::to_string(selectedPort) +
    " for CodeAI Hub core startup.");
  SetEnv("CORE_PORT", std::to_string(selectedPort));

  EnsureGlobalEnvironment(*runtimeDir, home);
  ExportProviderEnvironment(home);

  LogLauncherInfo(
    "Requesting CodeAI Hub core startup via Supervisor on " +
    FormatEndpoint(host, selectedPort));
  if (!LaunchSupervisorStart(host, selectedPort)) {
    LogLauncherError(
      "Failed to start core via Supervisor CLI, falling back to direct core "
      "startup.");

    const std::filesystem::path nodeExecutable =
      *runtimeDir / "node" / "bin" / "node";
    const std::filesystem::path appEntry =
      *runtimeDir / "app" / "dist" / "index.js";

    if (!std::filesystem::exists(nodeExecutable)) {
      LogLauncherError(
        "Core runtime is missing node executable at " +
        nodeExecutable.string());
      return false;
    }
    if (!std::filesystem::exists(appEntry)) {
      LogLauncherError(
        "Core runtime is missing entry point at " + appEntry.string());
      return false;
    }

    if (!LaunchProcess(nodeExecutable, appEntry)) {
      LogLauncherError("Direct core process launch failed.");
      return false;
    }
  }

  LogLauncherInfo("Waiting for core orchestrator readiness...");
  for (int attempt = 0; attempt < kReadyPollAttempts; ++attempt) {
    std::this_thread::sleep_for(std::chrono::milliseconds(kReadyPollDelayMs));
    if (IsCoreListening(host, selectedPort)) {
      LogLauncherInfo(
        "Core orchestrator is ready on " +
        FormatEndpoint(host, selectedPort));
      return true;
    }
  }

  LogLauncherWarn(
    "Core orchestrator did not become ready within the expected timeframe");
  std::fprintf(
    stderr,
    "CodeAIHubLauncher: core did not become ready within timeout\n");
  return false;
}

bool RestartCoreProcess() {
  const std::string host = GetEnvOrDefault("CORE_HOST", kDefaultHost);
  const int port = ParsePort(
    GetEnvOrDefault("CORE_PORT", std::to_string(kDefaultPort)),
    kDefaultPort);
  const auto health = QueryCoreHealth(host, port);
  const bool coreListening = health.has_value() || IsCoreListening(host, port);

  if (coreListening) {
    LogLauncherInfo(
      "Explicit core restart requested on " + FormatEndpoint(host, port));
    if (!TryShutdownExistingCore(host, port, health ? health->pid : -1)) {
      return false;
    }
  } else {
    LogLauncherInfo(
      "Explicit core restart requested while core is offline; starting fresh instance.");
  }

  return EnsureCoreProcessRunning();
}

void StartCoreMonitoring() {
  LogLauncherInfo("Starting core health monitoring");
  CefPostDelayedTask(
    TID_UI,
    base::BindOnce(&MonitorCoreHealth),
    kCoreMonitoringIntervalMs);
}

namespace {

void MonitorCoreHealth() {
  const std::string host = GetEnvOrDefault("CORE_HOST", kDefaultHost);
  const int port = ParsePort(
    GetEnvOrDefault("CORE_PORT", std::to_string(kDefaultPort)),
    kDefaultPort);

  const auto status = QueryCoreStatus(host, port);
  if (!status.has_value() || !status->healthy) {
    LogLauncherWarn(
      "Core monitoring detected core is unreachable on " +
      FormatEndpoint(host, port) +
      "; core will not be restarted automatically. "
      "Check /api/v1/status for details.");
  }

  CefPostDelayedTask(
    TID_UI,
    base::BindOnce(&MonitorCoreHealth),
    kCoreMonitoringIntervalMs);
}

}  // namespace

}  // namespace codeai::launcher

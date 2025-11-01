#include "core_launcher.h"

#include <algorithm>
#include <chrono>
#include <ctime>
#include <cctype>
#include <cstdio>
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <optional>
#include <string>
#include <sstream>
#include <system_error>
#include <thread>
#include <vector>

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
extern char** environ;
#endif

namespace codeai::launcher {

namespace {

constexpr const char* kDefaultHost = "127.0.0.1";
constexpr int kDefaultPort = 8080;
constexpr int kConnectTimeoutMs = 800;
constexpr int kReadyPollAttempts = 25;
constexpr int kReadyPollDelayMs = 200;
constexpr const char* kLogsRoot = ".codeai-hub/logs";
constexpr const char* kLauncherLogDirectory = "launcher";
constexpr const char* kLauncherLogFilename = "launcher.log";
constexpr const char* kCoreLogDirectory = "core";
constexpr const char* kCoreLogFilename = "core.log";
constexpr char kPathSeparator =
#ifdef _WIN32
  ';'
#else
  ':'
#endif
;

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

std::optional<std::filesystem::path> ResolveCoreRuntimeDirectory(
  const std::filesystem::path& home
) {
  const std::string platformKey = DetectPlatformKey();
  const std::filesystem::path base =
    home / ".codeai-hub" / "core" / platformKey;
  if (!std::filesystem::exists(base) || !std::filesystem::is_directory(base)) {
    return std::nullopt;
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

std::filesystem::path ResolveNodeExecutable(
  const std::filesystem::path& runtimeDir
) {
#ifdef _WIN32
  return runtimeDir / "node" / "node.exe";
#else
  return runtimeDir / "node" / "bin" / "node";
#endif
}

std::filesystem::path ResolveEntryPoint(
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

  const auto gemini = ResolveProviderPath(home, "gemini");
  if (gemini) {
    SetEnv("GEMINI_MODULE_PATH", gemini->string());
  }
}

#ifdef _WIN32
bool LaunchProcess(
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
#else
bool LaunchProcess(
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

  const std::string workspace = home.string();
  SetEnv("CLAUDE_WORKSPACE_PATH", workspace);
  SetEnv("CODEX_WORKSPACE_PATH", workspace);
  SetEnv("GEMINI_WORKSPACE_PATH", workspace);
  SetEnv("CODEX_SKIP_GIT_REPO_CHECK", "true");

  if (GetEnvOrDefault("NODE_ENV", "") .empty()) {
    SetEnv("NODE_ENV", "production");
  }
}

}  // namespace

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
  const int port = ParsePort(
    GetEnvOrDefault("CORE_PORT", std::to_string(kDefaultPort)),
    kDefaultPort);
  LogLauncherInfo(
    "Ensuring core orchestrator is reachable on " +
    FormatEndpoint(host, port));
  if (IsCoreListening(host, port)) {
    LogLauncherInfo(
      "Core orchestrator already listening on " +
      FormatEndpoint(host, port));
    return true;
  }

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

  const std::filesystem::path nodeExecutable = ResolveNodeExecutable(*runtimeDir);
  const std::filesystem::path entryPoint = ResolveEntryPoint(*runtimeDir);

  if (!std::filesystem::exists(nodeExecutable)) {
    LogLauncherError(
      "Node executable missing at " + nodeExecutable.string());
    std::fprintf(
      stderr,
      "CodeAIHubLauncher: node executable missing at %s\n",
      nodeExecutable.string().c_str());
    return false;
  }
  if (!std::filesystem::exists(entryPoint)) {
    LogLauncherError(
      "Core entry point missing at " + entryPoint.string());
    std::fprintf(
      stderr,
      "CodeAIHubLauncher: entry point missing at %s\n",
      entryPoint.string().c_str());
    return false;
  }

  EnsureGlobalEnvironment(*runtimeDir, home);
  ExportProviderEnvironment(home);

  LogLauncherInfo(
    "Launching core orchestrator using " +
    nodeExecutable.string() + " " + entryPoint.string());
  if (!LaunchProcess(nodeExecutable, entryPoint)) {
    LogLauncherError("Failed to spawn core orchestrator process");
    return false;
  }

  LogLauncherInfo("Waiting for core orchestrator readiness...");
  for (int attempt = 0; attempt < kReadyPollAttempts; ++attempt) {
    std::this_thread::sleep_for(std::chrono::milliseconds(kReadyPollDelayMs));
    if (IsCoreListening(host, port)) {
      LogLauncherInfo(
        "Core orchestrator is ready on " +
        FormatEndpoint(host, port));
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

}  // namespace codeai::launcher

import Foundation

private let helperVersion = "0.1.0"

private enum HelperCommand: String, Codable {
    case availability
    case preflight
    case translate
    case translateBatch
}

private struct HelperRequest: Decodable {
    let command: HelperCommand
    let requestId: String?
    let sourceLanguage: String?
    let targetLanguage: String?
    let text: String?
    let batch: [String]?
}

private struct HelperResponse: Encodable {
    let ok: Bool
    let requestId: String?
    let command: String?
    let helperVersion: String
    let errorCode: String?
    let message: String?
}

private enum HelperExitCode: Int32 {
    case success = 0
    case invalidInput = 64
    case runtimeFailure = 70
}

private func readStandardInput() throws -> Data {
    let input = FileHandle.standardInput.readDataToEndOfFile()
    guard input.isEmpty == false else {
        throw HelperFailure.invalidInput("Expected JSON request on stdin.")
    }
    return input
}

private enum HelperFailure: Error {
    case invalidInput(String)
    case runtime(String)
}

private func makeResponse(
    ok: Bool,
    request: HelperRequest?,
    errorCode: String?,
    message: String?
) -> HelperResponse {
    HelperResponse(
        ok: ok,
        requestId: request?.requestId,
        command: request?.command.rawValue,
        helperVersion: helperVersion,
        errorCode: errorCode,
        message: message
    )
}

private func writeResponse(_ response: HelperResponse) throws {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.sortedKeys]
    let data = try encoder.encode(response)
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data("\n".utf8))
}

private func handle(_ request: HelperRequest) -> HelperResponse {
    makeResponse(
        ok: false,
        request: request,
        errorCode: "command_not_implemented",
        message: "Command '\(request.command.rawValue)' is reserved by the Apple Native Translation helper contract and will be implemented by the next task."
    )
}

private func run() -> HelperExitCode {
    do {
        let input = try readStandardInput()
        let request = try JSONDecoder().decode(HelperRequest.self, from: input)
        try writeResponse(handle(request))
        return .success
    } catch let failure as HelperFailure {
        let message: String
        let exitCode: HelperExitCode
        switch failure {
        case let .invalidInput(value):
            message = value
            exitCode = .invalidInput
        case let .runtime(value):
            message = value
            exitCode = .runtimeFailure
        }
        try? writeResponse(makeResponse(
            ok: false,
            request: nil,
            errorCode: exitCode == .invalidInput ? "invalid_input" : "runtime_failure",
            message: message
        ))
        return exitCode
    } catch is DecodingError {
        try? writeResponse(makeResponse(
            ok: false,
            request: nil,
            errorCode: "invalid_json",
            message: "Request JSON does not match the Apple Native Translation helper envelope."
        ))
        return .invalidInput
    } catch {
        try? writeResponse(makeResponse(
            ok: false,
            request: nil,
            errorCode: "runtime_failure",
            message: error.localizedDescription
        ))
        return .runtimeFailure
    }
}

exit(run().rawValue)

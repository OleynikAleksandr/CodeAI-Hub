// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "AppleSpeechHelper",
    platforms: [
        .macOS("13.0")
    ],
    products: [
        .executable(
            name: "apple-speech-helper",
            targets: ["AppleSpeechHelper"]
        )
    ],
    targets: [
        .executableTarget(
            name: "AppleSpeechHelper"
        ),
        .testTarget(
            name: "AppleSpeechHelperTests"
        )
    ]
)

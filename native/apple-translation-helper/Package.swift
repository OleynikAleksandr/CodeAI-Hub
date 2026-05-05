// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "AppleTranslationHelper",
    platforms: [
        .macOS("26.0")
    ],
    products: [
        .executable(
            name: "apple-translation-helper",
            targets: ["AppleTranslationHelper"]
        )
    ],
    targets: [
        .executableTarget(
            name: "AppleTranslationHelper"
        )
    ]
)

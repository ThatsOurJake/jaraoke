#!/bin/bash

# Usage:
#   ./scripts/build.sh --node <node_version> --platform <platform> [--debug true|false]
#
# Platforms (maps to rust target):
#   darwin-arm64      = aarch64-apple-darwin
#   darwin-x64        = x86_64-apple-darwin
#   win-x64           = x86_64-pc-windows-msvc
#   linux-x64         = x86_64-unknown-linux-gnu
#   linux-arm64       = armv7-unknown-linux-gnueabi
#
# Example:
#   ./scripts/build.sh --node 20.11.1 --platform darwin-arm64 --debug true

# Show usage information
show_usage() {
    echo "Usage: ./scripts/build.sh --node <node_version> --platform <platform> [--debug true|false]"
    echo ""
    echo "Platforms (maps to rust target):"
    echo "  darwin-arm64      = aarch64-apple-darwin"
    echo "  darwin-x64        = x86_64-apple-darwin"
    echo "  win-x64           = x86_64-pc-windows-msvc"
    echo "  linux-x64         = x86_64-unknown-linux-gnu"
    echo "  linux-arm64       = armv7-unknown-linux-gnueabi"
    echo ""
    echo "Example:"
    echo "  ./scripts/build.sh --node 20.11.1 --platform darwin-arm64 --debug true"
}

NODE_RUNTIME_VERSION=""
PLATFORM=""
DEBUG_BUILD="false"
NODE_PLATFORM=""
RUST_TARGET=""

# Function to map platform to rust target
get_rust_target() {
    local platform=$1
    case $platform in
        darwin-arm64)
            echo "aarch64-apple-darwin"
        ;;
        darwin-x64)
            echo "x86_64-apple-darwin"
        ;;
        win-x64)
            echo "x86_64-pc-windows-msvc"
        ;;
        linux-x64)
            echo "x86_64-unknown-linux-gnu"
        ;;
        linux-arm64)
            echo "armv7-unknown-linux-gnueabi"
        ;;
        *)
            echo ""
        ;;
    esac
}

# Parse command line arguments
if [[ $# -eq 0 ]]; then
    echo "Error: No arguments provided"
    show_usage
    exit 1
fi

while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            show_usage
            exit 0
        ;;
        --node)
            NODE_RUNTIME_VERSION="$2"
            shift 2
        ;;
        --platform)
            PLATFORM="$2"
            shift 2
        ;;
        --debug)
            DEBUG_BUILD="$2"
            shift 2
        ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
        ;;
    esac
done

# Validate required arguments
if [[ -z "$NODE_RUNTIME_VERSION" ]]; then
    echo "Error: --node <node_version> is required"
    show_usage
    exit 1
fi

if [[ -z "$PLATFORM" ]]; then
    echo "Error: --platform <platform> is required"
    show_usage
    exit 1
fi

# Validate platform and set rust target
RUST_TARGET=$(get_rust_target "$PLATFORM")
if [[ -z "$RUST_TARGET" ]]; then
    echo "Error: Invalid platform '$PLATFORM'. Valid options are: darwin-arm64, darwin-x64, win-x64, linux-x64, linux-arm64"
    show_usage
    exit 1
fi
NODE_PLATFORM="$PLATFORM"

BUILD_DIR="tmp-build"
STATIC_DIR="./app-wrapper/static"
RESOURCES_DIR="./app-wrapper/resources"
APP_DIR="app"

echo "=========================================="
echo "Build Configuration"
echo "=========================================="
echo "Node Version:     $NODE_RUNTIME_VERSION"
echo "Platform:         $PLATFORM"
echo "Rust Target:      $RUST_TARGET"
echo "Debug Build:      $DEBUG_BUILD"
echo "=========================================="
echo ""

rm -rf $BUILD_DIR
mkdir $BUILD_DIR
mkdir $BUILD_DIR/$APP_DIR

echo "Building Client"
pnpm --dir ./app/client build
cp -r ./app/client/dist/. ./$BUILD_DIR/$APP_DIR
cp -r ./app/client/public ./$BUILD_DIR/$APP_DIR/public

echo "Building Server"
pnpm --dir ./app/server build
cp -r ./app/server/dist/. ./$BUILD_DIR/$APP_DIR

echo "Installing Modules"
pnpm deploy --legacy --shamefully-hoist --prod --filter ./app/server ./$BUILD_DIR/$APP_DIR/deps
cp -r ./$BUILD_DIR/$APP_DIR/deps/node_modules ./$BUILD_DIR
rm -rf ./$BUILD_DIR/$APP_DIR/deps

echo "Building App Wrapper"
rm -rf $RESOURCES_DIR
cp -r $BUILD_DIR/. $RESOURCES_DIR
sh ./scripts/download-node.sh $NODE_PLATFORM $NODE_RUNTIME_VERSION
NODE_RUNTIME=$(find .cache/node-$NODE_RUNTIME_VERSION-$NODE_PLATFORM/bin -name node)
echo "Copying Node into build"
mkdir $RESOURCES_DIR/bin
cp $NODE_RUNTIME $RESOURCES_DIR/bin
cp -r $STATIC_DIR/. $RESOURCES_DIR

if [[ "$DEBUG_BUILD" == "true" ]]; then
    echo "Debug Build!"
    pnpm tauri build --debug --target $RUST_TARGET
else
    echo "Production Build!"
    pnpm tauri build --target $RUST_TARGET
fi

echo "Done ✨"

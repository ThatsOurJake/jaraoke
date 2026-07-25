#!/bin/bash

# Usage:
#   ./scripts/build.sh --node <node_version> --platform <platform> [--debug true|false]
#
# Platforms (maps to Rust target):
#   darwin-arm64      = aarch64-apple-darwin
#   darwin-x64        = x86_64-apple-darwin
#   win-x64           = x86_64-pc-windows-msvc
#   linux-x64         = x86_64-unknown-linux-gnu
#
# Output: tmp-build/
#   app/          compiled server + client static assets
#   node_modules/ production server dependencies
#   bin/          node runtime + viewer (WRY) binary
#   launcher.js   compiled launcher entry point
#   run.sh        Unix entry script
#   run.bat       Windows entry script
#
# Example:
#   ./scripts/build.sh --node 20.11.1 --platform darwin-arm64

set -euo pipefail

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

show_usage() {
    echo "Usage: ./scripts/build.sh --node <node_version> --platform <platform> [--debug true|false]"
    echo ""
    echo "Platforms:"
    echo "  darwin-arm64      = aarch64-apple-darwin"
    echo "  darwin-x64        = x86_64-apple-darwin"
    echo "  win-x64           = x86_64-pc-windows-msvc"
    echo "  linux-x64         = x86_64-unknown-linux-gnu"
    echo ""
    echo "Example:"
    echo "  ./scripts/build.sh --node 20.11.1 --platform darwin-arm64"
}

get_rust_target() {
    local platform=$1
    case $platform in
        darwin-arm64) echo "aarch64-apple-darwin"       ;;
        darwin-x64)   echo "x86_64-apple-darwin"        ;;
        win-x64)      echo "x86_64-pc-windows-msvc"     ;;
        linux-x64)    echo "x86_64-unknown-linux-gnu"   ;;
        *)            echo ""                            ;;
    esac
}

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

NODE_RUNTIME_VERSION=""
PLATFORM=""
DEBUG_BUILD="false"

if [[ $# -eq 0 ]]; then
    echo "Error: No arguments provided"
    show_usage
    exit 1
fi

while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)  show_usage; exit 0 ;;
        --node)     NODE_RUNTIME_VERSION="$2"; shift 2 ;;
        --platform) PLATFORM="$2";             shift 2 ;;
        --debug)    DEBUG_BUILD="$2";          shift 2 ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
        ;;
    esac
done

if [[ -z "$NODE_RUNTIME_VERSION" ]]; then
    echo "Error: --node <node_version> is required"
    show_usage; exit 1
fi

if [[ -z "$PLATFORM" ]]; then
    echo "Error: --platform <platform> is required"
    show_usage; exit 1
fi

RUST_TARGET=$(get_rust_target "$PLATFORM")
if [[ -z "$RUST_TARGET" ]]; then
    echo "Error: Invalid platform '$PLATFORM'. Valid options: darwin-arm64, darwin-x64, win-x64, linux-x64"
    show_usage; exit 1
fi

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

BUILD_DIR="tmp-build"
APP_DIR="app"

VIEWER_SRC="./app/launcher/viewer"
VIEWER_BIN_NAME="viewer"
NODE_BIN_NAME="node"
if [[ "$PLATFORM" == "win-x64" ]]; then
    VIEWER_BIN_NAME="viewer.exe"
    NODE_BIN_NAME="node.exe"
fi

CARGO_PROFILE="release"
if [[ "$DEBUG_BUILD" == "true" ]]; then
    CARGO_PROFILE="debug"
fi
export DEBUG_BUILD

echo "=========================================="
echo "Build Configuration"
echo "=========================================="
echo "Node Version:  $NODE_RUNTIME_VERSION"
echo "Platform:      $PLATFORM"
echo "Rust Target:   $RUST_TARGET"
echo "Debug Build:   $DEBUG_BUILD"
echo "=========================================="
echo ""

# ---------------------------------------------------------------------------
# Clean and scaffold
# ---------------------------------------------------------------------------

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/$APP_DIR"
mkdir -p "$BUILD_DIR/bin"

# ---------------------------------------------------------------------------
# 1. Build client
# ---------------------------------------------------------------------------

echo "Building Client…"
pnpm --dir ./app/client build
cp -r ./app/client/dist/. "./$BUILD_DIR/$APP_DIR"
rm -rf "./$BUILD_DIR/$APP_DIR/.vite"
mkdir -p "./$BUILD_DIR/$APP_DIR/public"
cp -r ./app/client/public/. "./$BUILD_DIR/$APP_DIR/public"
mkdir -p "./$BUILD_DIR/.vite"
cp -r ./app/client/dist/.vite/. "./$BUILD_DIR/.vite"

# ---------------------------------------------------------------------------
# 2. Build server
# ---------------------------------------------------------------------------

echo "Building Server…"
pnpm --dir ./app/server build
cp -r ./app/server/dist/. "./$BUILD_DIR/$APP_DIR"

# ---------------------------------------------------------------------------
# 3. Build launcher (TypeScript → bundled CommonJS)
# ---------------------------------------------------------------------------

echo "Building Launcher…"
pnpm --dir ./app/launcher build
cp ./app/launcher/dist/index.js "./$BUILD_DIR/launcher.js"

# ---------------------------------------------------------------------------
# 4. Build WRY viewer (Rust)
# ---------------------------------------------------------------------------

echo "Building WRY Viewer (Rust, target: $RUST_TARGET)…"
if [[ "$DEBUG_BUILD" == "true" ]]; then
    cargo build --manifest-path "$VIEWER_SRC/Cargo.toml" --target "$RUST_TARGET"
else
    cargo build --release --manifest-path "$VIEWER_SRC/Cargo.toml" --target "$RUST_TARGET"
fi
cp "$VIEWER_SRC/target/$RUST_TARGET/$CARGO_PROFILE/$VIEWER_BIN_NAME" "./$BUILD_DIR/bin/$VIEWER_BIN_NAME"

# ---------------------------------------------------------------------------
# 5. Bundle Node runtime
# ---------------------------------------------------------------------------

echo "Downloading Node runtime…"
sh ./scripts/download-node.sh "$PLATFORM" "$NODE_RUNTIME_VERSION"
NODE_RUNTIME=$(find ".cache/node-$NODE_RUNTIME_VERSION-$PLATFORM" -name "$NODE_BIN_NAME" -not -path "*/include/*" | head -1)
echo "Copying Node into build…"
cp "$NODE_RUNTIME" "./$BUILD_DIR/bin/$NODE_BIN_NAME"

# ---------------------------------------------------------------------------
# 6. Entry point scripts
# ---------------------------------------------------------------------------
echo "Creating entrypoint scripts"

cat > "./$BUILD_DIR/run.sh" << 'EOF'
#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/bin/node" "$DIR/launcher.js" "$@"
EOF
chmod +x "./$BUILD_DIR/run.sh"

cat > "./$BUILD_DIR/run.bat" << 'EOF'
@echo off
SET "DIR=%~dp0"
"%DIR%bin\node.exe" "%DIR%launcher.js" %*
EOF

# ---------------------------------------------------------------------------
# 7. Copy Launcher Assets into tmp-build root
# ---------------------------------------------------------------------------
echo "Copying Launcher assets"
cp -r ./app/launcher/assets/. "./$BUILD_DIR"

echo ""
echo "Done ✨  Output: $BUILD_DIR/"

#!/bin/bash

# Usage:
#   ./scripts/build.sh --product <jaraoke|jaraoke-studio> --node <node_version> --platform <platform> [--debug true|false]
#
# Platforms (maps to Rust target):
#   darwin-arm64      = aarch64-apple-darwin
#   darwin-x64        = x86_64-apple-darwin
#   win-x64           = x86_64-pc-windows-msvc
#   linux-x64         = x86_64-unknown-linux-gnu
#
# Output: tmp-build/<product>/
#   app/ or studio-app/  compiled server + client static assets
#   bin/                 node runtime + viewer (WRY) binary
#   launcher.js          compiled launcher entry point
#   run.sh               Unix entry script
#   run.bat              Windows entry script
#
# Example:
#   ./scripts/build.sh --node 20.11.1 --platform darwin-arm64

set -euo pipefail

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

show_usage() {
    echo "Usage: ./scripts/build.sh --product <jaraoke|jaraoke-studio> --node <node_version> --platform <platform> [--debug true|false]"
    echo ""
    echo "Products:"
    echo "  jaraoke"
    echo "  jaraoke-studio"
    echo ""
    echo "Platforms:"
    echo "  darwin-arm64      = aarch64-apple-darwin"
    echo "  darwin-x64        = x86_64-apple-darwin"
    echo "  win-x64           = x86_64-pc-windows-msvc"
    echo "  linux-x64         = x86_64-unknown-linux-gnu"
    echo ""
    echo "Example:"
    echo "  ./scripts/build.sh --product jaraoke --node 20.11.1 --platform darwin-arm64"
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

run_pnpm() {
    if [[ -n "${PNPM_BIN:-}" ]]; then
        "$PNPM_BIN" "$@"
        return
    fi
    
    if command -v pnpm >/dev/null 2>&1; then
        pnpm "$@"
        return
    fi
    
    if command -v corepack >/dev/null 2>&1; then
        corepack pnpm "$@"
        return
    fi
    
    echo "Error: neither pnpm nor corepack is available. Set PNPM_BIN to a working pnpm command if needed."
    exit 1
}

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

NODE_RUNTIME_VERSION=""
PLATFORM=""
DEBUG_BUILD="false"
PRODUCT="jaraoke"

if [[ $# -eq 0 ]]; then
    echo "Error: No arguments provided"
    show_usage
    exit 1
fi

while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)  show_usage; exit 0 ;;
        --product)  PRODUCT="$2";              shift 2 ;;
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

if [[ "$PRODUCT" != "jaraoke" && "$PRODUCT" != "jaraoke-studio" ]]; then
    echo "Error: Invalid product '$PRODUCT'. Valid options: jaraoke, jaraoke-studio"
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

BUILD_ROOT="tmp-build"
BUILD_DIR="$BUILD_ROOT/$PRODUCT"
APP_DIR="app"
CLIENT_DIR="./apps/jaraoke/client"
SERVER_DIR="./apps/jaraoke/server"

if [[ "$PRODUCT" == "jaraoke-studio" ]]; then
    APP_DIR="studio-app"
    CLIENT_DIR="./apps/jaraoke-studio/client"
    SERVER_DIR="./apps/jaraoke-studio/server"
fi

VIEWER_SRC="./packages/launcher/viewer"
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
echo "Product:       $PRODUCT"
echo "Platform:      $PLATFORM"
echo "Rust Target:   $RUST_TARGET"
echo "Debug Build:   $DEBUG_BUILD"
echo "=========================================="
echo ""

# ---------------------------------------------------------------------------
# Clean and scaffold
# ---------------------------------------------------------------------------

mkdir -p "$BUILD_ROOT"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/$APP_DIR"
mkdir -p "$BUILD_DIR/bin"

# ---------------------------------------------------------------------------
# 1. Build client
# ---------------------------------------------------------------------------

echo "Building Client…"
run_pnpm --dir "$CLIENT_DIR" build

if [[ "$PRODUCT" == "jaraoke" ]]; then
    cp -r "$CLIENT_DIR/dist/." "./$BUILD_DIR/$APP_DIR"
    rm -rf "./$BUILD_DIR/$APP_DIR/.vite"
    mkdir -p "./$BUILD_DIR/$APP_DIR/public"
    cp -r "$CLIENT_DIR/public/." "./$BUILD_DIR/$APP_DIR/public"
    mkdir -p "./$BUILD_DIR/.vite"
    cp -r "$CLIENT_DIR/dist/.vite/." "./$BUILD_DIR/.vite"
else
    mkdir -p "./$BUILD_DIR/$APP_DIR/public/public"
    cp "$CLIENT_DIR/dist/index.html" "./$BUILD_DIR/$APP_DIR/public/index.html"
    cp -r "$CLIENT_DIR/dist/assets" "./$BUILD_DIR/$APP_DIR/public/public/assets"
fi

# ---------------------------------------------------------------------------
# 2. Build server
# ---------------------------------------------------------------------------

echo "Building Server…"
run_pnpm --dir "$SERVER_DIR" build
cp -r "$SERVER_DIR/dist/." "./$BUILD_DIR/$APP_DIR"

# ---------------------------------------------------------------------------
# 3. Build launcher (TypeScript → bundled CommonJS)
# ---------------------------------------------------------------------------

echo "Building Launcher…"
run_pnpm --dir ./packages/launcher build
cp ./packages/launcher/dist/index.js "./$BUILD_DIR/launcher.js"

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
NODE_RUNTIME=$(find ".cache/node-v$NODE_RUNTIME_VERSION-$PLATFORM" -name "$NODE_BIN_NAME" -not -path "*/include/*" | head -1)
echo "Copying Node into build…"
cp "$NODE_RUNTIME" "./$BUILD_DIR/bin/$NODE_BIN_NAME"

# ---------------------------------------------------------------------------
# 6. Entry point scripts
# ---------------------------------------------------------------------------
echo "Creating entrypoint scripts"

if [[ "$PRODUCT" == "jaraoke" ]]; then
    cat > "./$BUILD_DIR/run.sh" << 'EOF'
#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/bin/node" "$DIR/launcher.js" --product jaraoke "$@"
EOF
else
    cat > "./$BUILD_DIR/run.sh" << 'EOF'
#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/bin/node" "$DIR/launcher.js" --product jaraoke-studio "$@"
EOF
fi
chmod +x "./$BUILD_DIR/run.sh"

if [[ "$PRODUCT" == "jaraoke" ]]; then
    cat > "./$BUILD_DIR/run.bat" << 'EOF'
@echo off
SET "DIR=%~dp0"
"%DIR%bin\node.exe" "%DIR%launcher.js" --product jaraoke %*
EOF
else
    cat > "./$BUILD_DIR/run.bat" << 'EOF'
@echo off
SET "DIR=%~dp0"
"%DIR%bin\node.exe" "%DIR%launcher.js" --product jaraoke-studio %*
EOF
fi

# ---------------------------------------------------------------------------
# 7. Copy Launcher Assets into tmp-build root
# ---------------------------------------------------------------------------
echo "Copying Launcher assets"
cp -r ./packages/launcher/assets/. "./$BUILD_DIR"

echo ""
echo "Done ✨  Output: $BUILD_DIR/"

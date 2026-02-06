#!/bin/sh

set -e

# Function to display usage
usage() {
    echo "Usage: $0 <platform> <version>"
    echo ""
    echo "Platforms:"
    echo "  darwin-arm64, darwin-x64, linux-arm64, linux-ppc64le, linux-s390x, linux-x64, win-arm64, win-x64"
    echo ""
    echo "Example: $0 darwin-arm64 v20.10.0"
    exit 1
}

# Check if required arguments are provided
if [ $# -ne 2 ]; then
    echo "Error: Both platform and version arguments are required"
    usage
fi

PLATFORM=$1
VERSION=$2

# Validate platform argument
case $PLATFORM in
    darwin-arm64|darwin-x64|linux-arm64|linux-x64|win-arm64|win-x64)
    ;;
    *)
        echo "Error: Invalid platform '$PLATFORM'"
        usage
    ;;
esac

# Ensure version starts with 'v'
if [ "${VERSION#v}" = "$VERSION" ]; then
    VERSION="v$VERSION"
fi

# Determine file extension based on platform
case $PLATFORM in
    win-*)
        ARCHIVE_EXT="zip"
    ;;
    *)
        ARCHIVE_EXT="tar.gz"
    ;;
esac

# Create cache directory
CACHE_DIR=".cache"
mkdir -p "$CACHE_DIR"

# Construct filenames and URLs
FILENAME="node-${VERSION}-${PLATFORM}.${ARCHIVE_EXT}"
SHASUMS_FILE="SHASUMS256.txt"
BASE_URL="https://nodejs.org/download/release/${VERSION}"
ARCHIVE_URL="${BASE_URL}/${FILENAME}"
SHASUMS_URL="${BASE_URL}/${SHASUMS_FILE}"

ARCHIVE_PATH="${CACHE_DIR}/${FILENAME}"
SHASUMS_PATH="${CACHE_DIR}/${SHASUMS_FILE}"

# Function to download file if it doesn't exist
download_if_missing() {
    local url=$1
    local path=$2
    local description=$3
    
    if [ -f "$path" ]; then
        echo "$description already exists at $path"
    else
        echo "Downloading $description from $url..."
        if command -v curl >/dev/null 2>&1; then
            curl -L -o "$path" "$url"
            elif command -v wget >/dev/null 2>&1; then
            wget -O "$path" "$url"
        else
            echo "Error: Neither curl nor wget found. Please install one of them."
            exit 1
        fi
        echo "$description downloaded successfully"
    fi
}

# Download files
echo "Downloading Node.js ${VERSION} for ${PLATFORM}..."
download_if_missing "$ARCHIVE_URL" "$ARCHIVE_PATH" "Node.js archive"
download_if_missing "$SHASUMS_URL" "$SHASUMS_PATH" "SHA checksums file"

# Verify SHA256 checksum
echo "Verifying SHA256 checksum..."
if command -v sha256sum >/dev/null 2>&1; then
    # Linux
    SHA_TOOL="sha256sum"
    elif command -v shasum >/dev/null 2>&1; then
    # macOS
    SHA_TOOL="shasum -a 256"
else
    echo "Error: No SHA256 tool found (tried sha256sum and shasum)"
    exit 1
fi

# Extract the expected checksum from SHASUMS256.txt
EXPECTED_CHECKSUM=$(grep "$FILENAME" "$SHASUMS_PATH" | awk '{print $1}')

if [ -z "$EXPECTED_CHECKSUM" ]; then
    echo "Error: Could not find checksum for $FILENAME in $SHASUMS_FILE"
    exit 1
fi

# Calculate actual checksum
ACTUAL_CHECKSUM=$($SHA_TOOL "$ARCHIVE_PATH" | awk '{print $1}')

# Compare checksums
if [ "$EXPECTED_CHECKSUM" = "$ACTUAL_CHECKSUM" ]; then
    echo "✓ Checksum verification passed"
else
    echo "✗ Checksum verification failed!"
    echo "Expected: $EXPECTED_CHECKSUM"
    echo "Actual:   $ACTUAL_CHECKSUM"
    exit 1
fi

# Extract the archive
EXTRACT_DIR="${CACHE_DIR}/node-${VERSION}-${PLATFORM}"

if [ -d "$EXTRACT_DIR" ]; then
    echo "Node.js already extracted at $EXTRACT_DIR"
else
    echo "Extracting Node.js archive..."
    
    case $ARCHIVE_EXT in
        "zip")
            if command -v unzip >/dev/null 2>&1; then
                unzip -q "$ARCHIVE_PATH" -d "$CACHE_DIR"
            else
                echo "Error: unzip command not found"
                exit 1
            fi
        ;;
        "tar.gz")
            tar -xzf "$ARCHIVE_PATH" -C "$CACHE_DIR"
        ;;
    esac
    
    echo "✓ Node.js extracted successfully to $EXTRACT_DIR"
fi

echo ""
echo "Node.js ${VERSION} for ${PLATFORM} is ready!"
echo "Location: $EXTRACT_DIR"
echo "Binary: $EXTRACT_DIR/bin/node" # Note: Windows will have .exe extension


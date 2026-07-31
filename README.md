# Jaraoke

<img src="https://github.com/thatsourjake/jaraoke/blob/main/.git-assets/app-icon.png" width="256px" alt="The logo of Jaraoke - A karaoke microphone"></img>

Jaraoke is a local karaoke project built as a pnpm monorepo.

It currently contains two app targets:

- `jaraoke` — the main karaoke player
- `jaraoke-studio` — a placeholder studio app used to prove the new split architecture and packaging flow

Both apps share infrastructure such as the launcher and shared types, but they are packaged and run as separate products.

## Workspace layout

```text
apps/
  jaraoke/
    client/
    server/
  jaraoke-studio/
    client/
    server/
packages/
  launcher/
  shared/
scripts/
```

## Development

### Prerequisites

- Biome (2.3.8)
- Rust compiler (rustc 1.93.0)
- Node.js v24.9.0
- pnpm via Corepack
- ffmpeg and ffprobe
- mpv if not using the web-based player

### Development commands

From the repo root:

```sh
# Main karaoke player
pnpm dev
```

```sh
# Explicit jaraoke development flow
pnpm dev:jaraoke
```

```sh
# Placeholder studio development flow
pnpm dev:studio
```

Default local ports:

- `jaraoke` server: `9897`
- `jaraoke` client: Vite default, usually `5173`
- `jaraoke-studio` server: `9898`
- `jaraoke-studio` client: `5174`

When `jaraoke` runs for the first time it creates its local app-data directory under `jaraoke-dev`. The generated settings file contains the configured `ffmpeg`, `ffprobe`, and `mpv` paths.

To increase log level:

```sh
LOG_LEVEL=debug pnpm dev:jaraoke
```

### Testing the launcher locally

Build the server first, then point the launcher at a running Vite dev server.

```sh
# terminal 1 — Vite dev server
pnpm --dir ./apps/jaraoke/client dev
```

```sh
# terminal 2 — server
pnpm --dir ./apps/jaraoke/server dev
```

```sh
# terminal 3 — launcher (opens WRY at Vite)
SERVER_ENTRY=./apps/jaraoke/server/dist/index.js \
VIEWER_BIN=./packages/launcher/viewer/target/<target>/release/viewer \
node ./packages/launcher/dist/index.js --url http://localhost:5173
```

Or skip the viewer entirely with `--no-ui` and use the browser directly.

## Building

### Additional prerequisites

Everything required for development, plus:

- Cargo
- The Rust cross-compilation target for your chosen platform

#### Installing a Rust target

```sh
# macOS Apple Silicon
rustup target add aarch64-apple-darwin

# macOS Intel
rustup target add x86_64-apple-darwin

# Windows x64
rustup target add x86_64-pc-windows-msvc

# Linux x64
rustup target add x86_64-unknown-linux-gnu
```

> Linux build hosts also need the WebKitGTK development headers to compile the WRY viewer:
>
> ```sh
> # Ubuntu / Debian
> sudo apt install libwebkit2gtk-4.1-dev
>
> # Fedora / RHEL
> sudo dnf install webkit2gtk4.1-devel
>
> # Arch Linux
> sudo pacman -S webkit2gtk-4.1
> ```

### Product builds

The root build scripts compile the individual workspace packages:

```sh
pnpm build:jaraoke
```

```sh
pnpm build:studio
```

### Portable packaged builds

Use the packaging script to create a self-contained runtime bundle for a specific product.

```sh
sh ./scripts/build.sh --product <jaraoke|jaraoke-studio> --node <node_version> --platform <platform> [--debug true|false]
```

Arguments:

| Argument | Description |
|---|---|
| `--product <name>` | Product to package: `jaraoke` or `jaraoke-studio` |
| `--node <version>` | Node.js version to bundle, for example `24.9.0` |
| `--platform <platform>` | Target platform |
| `--debug true` | Debug build of the WRY viewer; default is `false` |

Supported platforms:

| `--platform` | OS |
|---|---|
| `darwin-arm64` | macOS (Apple Silicon) |
| `darwin-x64` | macOS (Intel) |
| `win-x64` | Windows x64 |
| `linux-x64` | Linux x64 |

Examples:

```sh
sh ./scripts/build.sh --product jaraoke --node 24.9.0 --platform darwin-arm64
```

```sh
sh ./scripts/build.sh --product jaraoke-studio --node 24.9.0 --platform darwin-arm64
```

If your non-interactive shell does not expose `pnpm` or `corepack`, set `PNPM_BIN` explicitly when running the packaging script.

### Packaged output

Each packaged build is written to its own folder:

```text
tmp-build/
  jaraoke/
  jaraoke-studio/
```

For `jaraoke`, the packaged layout looks like:

```text
tmp-build/jaraoke/
  app/
  .vite/
  bin/
    node
    viewer
  launcher.js
  run.sh
  run.bat
```

For `jaraoke-studio`, the packaged layout looks like:

```text
tmp-build/jaraoke-studio/
  studio-app/
  bin/
    node
    viewer
  launcher.js
  run.sh
  run.bat
```

All application code is bundled and minified. No `node_modules` directory is included in the packaged output.

## Running packaged builds

After building, change into the product-specific output directory and run the bundled launcher script.

### macOS / Linux

```
./run.sh [options]
```

### Windows

```
.\run.bat [options]
```

### Launcher options

| Flag | Default | Description |
|---|---|---|
| `--port <port>` | `9897` | Port the server listens on |
| `--host <host>` | `127.0.0.1` | Host the server binds to |
| `--log-level <level>` | `info` | Server log level (`debug`, `info`, `warn`, `error`) |
| `--no-ui` | — | Start the server only, no viewer window |
| `--url <url>` | — | Override the URL opened in the viewer |

Examples:

```sh
# Standard kiosk launch
./run.sh

# Server only (headless / remote access)
./run.sh --no-ui

# Expose server on all interfaces
./run.sh --host 0.0.0.0 --port 9897
```

### Linux runtime dependencies

The viewer window uses [WRY](https://github.com/tauri-apps/wry) which requires **WebKitGTK** on Linux. Install the appropriate package for your distro before running:

| Distro | Command |
|---|---|
| Ubuntu / Debian | `sudo apt install libwebkit2gtk-4.1-0` |
| Fedora / RHEL | `sudo dnf install webkit2gtk4.1` |
| Arch Linux | `sudo pacman -S webkit2gtk-4.1` |

> On Wayland, ensure `WEBKIT_DISABLE_COMPOSITING_MODE=1` is set if the window fails to render correctly.

(In the future this will be done via a Docker container).

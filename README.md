# Jaraoke

<img src="https://github.com/thatsourjake/jaraoke/blob/main/.git-assets/app-icon.png" width="256px" alt="The logo of Jaraoke - A karaoke microphone"></img>

This project aims to be a karaoke player similar to those currently available with the main difference of it being all in 1 solution without the need of a DJ.

## Usage
_This section will be filled out soon with the wiki being the source of information, if you're wanting to run the program then follow the building steps_

## Running

After building, the output directory (`tmp-build/`) is self-contained. Start Jaraoke with the entry script for your platform:

**macOS / Linux**
```
./run.sh [options]
```

**Windows**
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

**Examples**
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

## Development

### Prerequisites
- Biome (2.3.8)
  - This is installed globally rather than into each of the packages for ease of development
- Rust Compiler (rustc 1.93.0)
- NodeJS v24.9.0
- Pnpm
- ffmpeg (and ffprobe)
- mpv (if not using web based player)

### Getting started

The main codebase is preact and koa nodejs api. Both projects can be started using `pnpm dev`, doing this in two terminal tabs will allow you to run both projects at once.

The server will boot on port `9897` and vite usually boots on `5173`. The client is setup to proxy any `/api/*` requests to the backend.

When the project has ran for the first time various files will be created under `jaraoke-dev`, the specific location will be outputted in the console of the api.

If you want to increase log level then you can run `LOG_LEVEL=debug pnpm dev`.

There will be a settings file that is generated in the `jaraoke-dev` directory, this will have the ffmpegPath, mpvPath and ffprobePath, these should be updated if neither of them are on your $PATH. (Note if you're using the player=web then you don't need mpv).

### Testing the launcher locally

To test the viewer window during development, build the server first then point the launcher at an already-running Vite dev server:

```sh
# terminal 1 — Vite dev server
pnpm --dir ./apps/jaraoke/client dev

# terminal 2 — server
pnpm --dir ./apps/jaraoke/server dev

# terminal 3 — launcher (opens WRY at Vite)
SERVER_ENTRY=./apps/jaraoke/server/dist/index.js \
VIEWER_BIN=./packages/launcher/viewer/target/<target>/release/viewer \
node ./packages/launcher/dist/index.js --url http://localhost:5173
```

Or skip the viewer entirely with `--no-ui` and use the browser directly.

## Building

### Prerequisites

Everything required for development, plus:

- **Cargo** — ships with the [Rust toolchain](https://rustup.rs)
- **Rust cross-compilation target** for your chosen platform (see below)

#### Installing a cross-compilation target

```sh
# macOS Apple Silicon
rustup target add aarch64-apple-darwin

# macOS Intel
rustup target add x86_64-apple-darwin

# Windows x64 (requires MSVC linker or cross toolchain)
rustup target add x86_64-pc-windows-msvc

# Linux x64
rustup target add x86_64-unknown-linux-gnu
```

> **Linux build hosts** also need the WebKitGTK development headers to compile the WRY viewer:
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

### Running the build

```sh
sh ./scripts/build.sh --node <node_version> --platform <platform> [--debug true|false]
```

| Argument | Description |
|---|---|
| `--node <version>` | Node.js version to bundle (e.g. `24.9.0`) |
| `--platform <platform>` | Target platform (see table below) |
| `--debug true` | Debug build of the WRY viewer (default: `false`) |

Supported platforms:

| `--platform` | OS |
|---|---|
| `darwin-arm64` | macOS (Apple Silicon) |
| `darwin-x64` | macOS (Intel) |
| `win-x64` | Windows x64 |
| `linux-x64` | Linux x64 |

**Example**
```sh
sh ./scripts/build.sh --node 24.9.0 --platform darwin-arm64
```

### What the build script does

1. Builds the Preact client (`vite build`)
2. Bundles the Koa server into a single minified file (`esbuild`)
3. Bundles the Node launcher into a single minified file (`esbuild`)
4. Compiles the WRY viewer Rust binary (`cargo build --release`)
5. Downloads and bundles the specified Node.js runtime
6. Writes `run.sh` / `run.bat` entry scripts

### Output

Once complete, `tmp-build/` contains a self-contained, portable directory:

```
tmp-build/
  app/            bundled server (index.js) + client static assets
  .vite/          Vite manifest (used by server for HTML generation)
  bin/
    node          bundled Node.js runtime
    viewer        WRY viewer binary (viewer.exe on Windows)
  launcher.js     bundled launcher
  run.sh          Unix entry script
  run.bat         Windows entry script
```

All application code is bundled and minified — no `node_modules` directory is included.

(In the future this will be done via a Docker container).

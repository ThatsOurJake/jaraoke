# Jaraoke

<img src="https://github.com/username/repository/blob/main/.git-assets/app-icon.png" width="256px" alt="The logo of Jaraoke - A karaoke microphone"></img>

This project aims to be a karaoke player similar to those currently available with the main difference of it being all in 1 solution without the need of a DJ.

## Usage
_This section will be filled out soon with the wiki being the source of information, if you're wanting to run the program then follow the building steps_

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

## Building
To build the project you can run the following:
```
sh ./scripts/build.sh --node <node_version> --platform <platform> --debug <true|false>
```

The build script also accepts `--help` to help with which platform you want to build for. Once the build is complete they will be outputted to "app-wrapper/target/<platform>/release|debug/bundle"

(In the future this will be done via a docker container).

# Jaraoke

This project aims to be a karaoke player similar to those currently available with the main difference of it being all in 1 solution without the need of a DJ.

## Development

### Prerequisites
- Biome (2.2.5)
  - This is installed globally rather than into each of the packages for ease of development

### Getting started

#### Server
To run the server use
```
LOG_LEVEL=debug pnpm dev
```

When the server has ran the first time the settings file will be created at the root app directory (as the project is in dev mode), you'll will want to update the following keys:
```
ffmpegPath
projectMHeadlessPath
visualsDirectory
mpvPath
```
These should point to the relevant binaries, for example visuals and projectMHeadless should use the ones baked into this repo

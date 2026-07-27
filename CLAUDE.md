# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An Arkanoid/Breakout game to be built with **vanilla HTML, CSS, and JavaScript — zero dependencies**. As of now the game itself is **not implemented**: the repo contains only art/sound assets and a spec-driven development workflow. Do not add a bundler, framework, or package manager unless a spec explicitly calls for it.

The project language is Spanish (see `README.md`). Match the user's language in replies.

## Development workflow: spec-driven

Feature work goes through two skills before any code is written:

- **`/spec <description>`** — designs a spec section by section (asks clarifying questions first, never writes code). Saves to `specs/NN-slug.md` in `Draft` state.
- **`/spec-impl <NN-slug>`** — implements an *approved* spec. Refuses to run unless the spec's status means "Approved". Creates/switches to a `spec-NN-slug` git branch (controlled by `AutoCreateBranch` in `specs/.spec-config.yml`, default `true`), then implements step by step, pausing after each step for diff review.

Skill definitions live in `.agents/skills/spec/` and `.agents/skills/spec-impl/`; `spec/template.md` is the spec structure. Full source/hashes tracked in `skills-lock.json`. Note: `specs/` does not exist yet and is created by the first `/spec` run.

## Assets

- `assets/spritesheet-breakout.png` — the sprite sheet. Loaded and drawn via `assets/spritesheet.js`.
- `assets/spritesheet.js` — the drawing API. Key functions:
  - `loadSpritesheet(cb)` — async loads the PNG into an offscreen canvas, then invokes `cb` (queues callbacks until loaded). Call before drawing.
  - `drawSprite(ctx, name, x, y, w, h)` — draws a named sprite. Names: `paddle`, `ball`, or `block_<color>` (colors: `gray`, `red`, `yellow`, `cyan`, `magenta`, `hotpink`, `green`).
  - `drawFrame(ctx, frame, x, y, w, h)` — draws a raw `{sx,sy,sw,sh}` frame, e.g. an entry from `EXPLOSION_FRAMES[color]` (4 frames/color, `EXPLOSION_DURATION` = 150ms).
- `assets/sounds/` — `ball-bounce.mp3`, `break-sound.mp3`.

## Running

No build step. Once an `index.html` exists, open it in a browser (or serve the folder over a static HTTP server so the spritesheet/sound files load without file:// restrictions).

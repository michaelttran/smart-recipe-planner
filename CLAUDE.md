# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Expo SDK 52** with **Expo Router 4** (file-based navigation)
- **React Native** (iOS & Android)
- **TypeScript** with path alias `@/` mapping to repo root
- **Claude API** via direct `fetch` (not the Node.js SDK — React Native compatibility)

## Dev Commands

```bash
npm install            # install dependencies
npx expo start         # start Metro bundler (scan QR with Expo Go)
npx expo start --ios   # open iOS simulator
npx expo start --android  # open Android emulator
```

## Architecture

Three-screen stack via Expo Router:

| Route | File | Purpose |
|-------|------|---------|
| `/` | `app/index.tsx` | Camera/photo picker; calls Claude; navigates to `/recipes` |
| `/recipes` | `app/recipes.tsx` | Displays 5 recipe cards; refresh triggers new Claude call |
| `/recipe/[id]` | `app/recipe/[id].tsx` | Full recipe detail (index into `store.recipes`) |

**Global store** (`lib/store.ts`) — a mutable singleton holding the current image (base64 + URI + mediaType), the active recipe list, and all previously shown recipe names (used to exclude repeats on refresh).

**Claude integration** (`lib/claude.ts`) — calls `POST /v1/messages` directly with:
- Model: `claude-opus-4-8`
- Vision: base64-encoded image block
- Structured output: `output_config.format.type: "json_schema"`
- Thinking: `{ type: "adaptive" }`
- Repeat exclusion: previous recipe names passed in the prompt on refresh

## Environment

Copy `.env.example` to `.env` and set your key:
```
EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...
```

`EXPO_PUBLIC_` prefix exposes the variable in the client bundle (Expo convention). Acceptable for demo; a production app should proxy through a backend.

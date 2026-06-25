# mise

A mobile app that turns a photo of your ingredients into personalized recipe suggestions, powered by the Claude AI API.

## Overview

mise (a nod to *mise en place*) lets you photograph whatever ingredients you have on hand, answer a few quick preference questions, and receive five tailored recipes in seconds. The AI model used scales with how much time you want to spend cooking — faster queries use lighter models, leisurely cooking unlocks deeper reasoning.

## Features

- **Ingredient scanning** — photograph or select an image of your ingredients from your library
- **Ingredient confirmation** — review and edit the extracted ingredient list before proceeding; add missed items or remove incorrect ones
- **Preference customization** — set time available, meal type, flavor profiles, dietary needs, cuisine direction, and whether recipes should stick to only the photographed ingredients or allow extras
- **AI-powered recipe generation** — five unique recipes streamed from Claude in real time; a live character counter shows generation progress and cards spring-animate in as they arrive
- **Weekly meal plan** — generate a full Mon–Sun dinner plan from your ingredients, with Claude strategically reusing ingredients across meals to minimize waste and a consolidated shopping list of only what you still need to buy
- **Recipe detail** — full ingredient list, step-by-step instructions, cook/prep/total time, servings, difficulty, and per-serving macros (calories, protein, carbs, fat, fiber)
- **Infinite scroll recipes** — refreshing appends new batches below existing results so you can scroll back and compare
- **Save recipes** — bookmark any recipe; favorites sync to your account and are accessible from any device
- **Shop ingredients** — share a formatted ingredient list to Instacart, AnyList, Notes, or any other app via the native share sheet
- **User accounts** — sign up and sign in with email; favorites are tied to your account and persist across devices
- **Model routing by time preference** — Quick (<30 min) uses Haiku, Medium (30–60 min) uses Sonnet, No rush uses Opus with adaptive thinking
- **Server-side caching** — identical ingredient + preference combinations are served from Supabase instead of calling Claude again; cache hits bypass the rate limit entirely

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 52 + Expo Router 4 |
| Platform | React Native (iOS & Android) |
| Language | TypeScript |
| AI | Claude API via Expo API Routes (Haiku 4.5 / Sonnet 4.6 / Opus 4.8) |
| Auth | Supabase Auth (email/password) |
| Database | Supabase (recipe cache, user profiles, favorites) |
| Secure storage | `expo-secure-store` (auth token persistence) |
| Icons | `@expo/vector-icons` (Ionicons) |

## Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- An [Anthropic API key](https://console.anthropic.com/)
- A [Supabase](https://supabase.com/) project
- Expo Go app (for device testing) or Xcode (for iOS simulator)

## Getting Started

```bash
# Install dependencies
npm install

# Copy the environment template and fill in your keys
cp .env.example .env

# Start the Metro bundler
npx expo start

# Or open directly in the iOS simulator
npx expo run:ios
```

## Environment Variables

```
# Server-side only (Expo API routes)
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Client-side (safe to expose — anon key, not service key)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Production only
EXPO_PUBLIC_API_URL=https://your-deployed-server.com
```

## Supabase Setup

Run the following in your Supabase **SQL Editor**:

```sql
create table recipe_cache (
  id          uuid        primary key default gen_random_uuid(),
  cache_key   text        unique not null,
  recipes     jsonb       not null,
  hit_count   integer     default 1,
  created_at  timestamptz default now()
);

create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

create table favorites (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete cascade not null,
  recipe      jsonb not null,
  recipe_name text not null,
  created_at  timestamptz default now(),
  unique (user_id, recipe_name)
);

-- Auto-create a profile whenever a user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

## Project Structure

```
app/
  _layout.tsx               # Root layout — auth gate, persistent tab bar
  (auth)/
    sign-in.tsx             # Sign in screen
    sign-up.tsx             # Sign up screen
  (tabs)/
    index.tsx               # Discover tab — camera / photo picker
    saved.tsx               # Saved tab — bookmarked recipes (fetched from Supabase)
  ingredients.tsx           # Ingredient confirmation screen (edit before proceeding)
  preferences.tsx           # Customization screen
  recipes.tsx               # Recipe list (batched, append-on-refresh)
  recipe/[id].tsx           # Recipe detail — macros, ingredients, steps, share button
  api/
    ingredients+api.ts      # POST /api/ingredients — Haiku vision extraction
    recipes+api.ts          # POST /api/recipes — Claude generation + Supabase cache
    favorites+api.ts        # GET/POST/DELETE /api/favorites — per-user favorites
components/
  TabBar.tsx                # Persistent bottom tab bar (Discover / Saved / Account)
contexts/
  AuthContext.tsx           # Supabase session state, auth redirect logic
lib/
  supabase-client.ts        # Supabase client with chunked SecureStore adapter
  api-client.ts             # Typed fetch wrappers with JWT auth headers
  store.ts                  # Mutable global singleton — image, ingredients, recipes, favorites
types/
  recipe.ts                 # Recipe, Ingredient, Macros, RecipeListResponse types
  preferences.ts            # UserPreferences type and defaults
assets/
  images/logo.png           # mise brand logo
```

## Testing

```bash
npm test            # run all tests once
npm run test:watch  # watch mode
```

Tests live in `__tests__/` and use Jest with the `jest-expo` preset.

### `store.test.ts` — global state logic (20 tests)

| Area | What's verified |
|---|---|
| `setImage` | Clears ingredients, recipes, batch sizes, and shown-name history when a new photo is selected |
| `setRecipes` | Assigns `timestamp-index` IDs, initialises `recipeBatchSizes` as a single-entry array, accumulates `allShownRecipeNames`, replaces prior recipes |
| `appendRecipes` | Appends without replacing, adds a new batch-size entry, produces globally unique IDs across batches, accumulates names |
| `isFavorite` | Matches by recipe name (not by the client-side or Supabase ID) |
| `addToFavorites` | Prepends to the list, stores the Supabase UUID as the recipe `id` |
| `removeFromFavorites` | Removes by name; is a no-op for unknown names |
| `setFavorites` | Replaces the full list and sets Supabase UUIDs on each entry |

### `api-helpers.test.ts` — auth and rate-limiting middleware (13 tests)

| Area | What's verified |
|---|---|
| `requireUser` | Returns 401 when the header is absent, not a Bearer token, or the token is invalid; returns the user id on success; strips the `Bearer ` prefix before calling Supabase |
| `checkUsage` | Passes when no usage row exists (first call) or count is below the limit; throws 429 when count meets or exceeds the limit; error messages name the right resource ("ingredient scans" vs "recipe generations") |
| `incrementUsage` | Calls the `increment_usage` RPC with the correct `p_user_id` and `p_field` arguments |
| `errorResponse` | Maps `ApiError` to its own status code; maps generic `Error` to 500; maps unknown thrown values to 500 |

## Navigation Flow

```
Sign In / Sign Up
  ↓
Discover (camera) → Ingredients (confirm) → Customize → Recipes (streaming) → Recipe Detail
                                                  |             ↑                   |
                                            Plan my week  (appends new          Share /
                                                  ↓        batch below)        Bookmark
                                            Meal Plan (7 days + shopping list)

Saved (always accessible via tab bar) → Recipe Detail
```

## API Usage & Cost

Each unique ingredient + preference combination makes one Claude API call; repeat combinations are served from the Supabase cache. Approximate cost per uncached call:

| Mode | Model | Est. cost |
|---|---|---|
| Quick | Haiku 4.5 | ~$0.01 |
| Medium | Sonnet 4.6 | ~$0.05 |
| No rush | Opus 4.8 | ~$0.15–0.20 |

Monitor spend at **console.anthropic.com → Usage**.

---

## Changelog

### v0.3.0

- **Streaming recipe generation** — the recipes API now returns `text/event-stream`; the server parses Claude's SSE events and forwards live progress updates to the client. The preferences screen shows a real-time character counter ("Generating… 1,842 chars") while Claude writes, and recipe cards spring-animate in with an 80ms stagger when they arrive
- **Weekly meal plan** — new "Plan my week" button on the preferences screen calls a dedicated `/api/meal-plan` endpoint. Claude (Sonnet) generates 7 dinners (Mon–Sun) with strategic ingredient reuse across meals to reduce waste, full per-recipe macros and instructions, and a consolidated shopping list of items not already in your fridge. Tapping any day expands the full recipe inline. Shopping list is shareable via the native share sheet
- **Streaming on refresh** — the "New recipes" header button also uses the stream, showing a live token counter in place of a spinner while new batches load

### v0.2.0

- **Ingredient confirmation screen** — after photo selection, a Haiku-powered vision call extracts a canonical ingredient list; users can remove incorrect items or add missed ones before proceeding. This also normalizes the cache key from raw image bytes to a stable ingredient list, so different photos of the same ingredients produce cache hits
- **User accounts** — email/password sign-up and sign-in via Supabase Auth; auth tokens stored securely with `expo-secure-store`
- **Server-side favorites** — favorites now sync to Supabase per user and load on any device; removed AsyncStorage dependency
- **Server-side recipe caching** — recipe results are cached in Supabase keyed by a SHA-256 hash of the sorted ingredient list and preferences; cache is skipped on refresh to ensure variety
- **Append-on-refresh** — tapping "New recipes" appends a new batch below existing results with a section divider, so users can scroll back and compare
- **Macros** — each recipe now includes per-serving calories, protein, carbs, fat, and fiber displayed in a bar above the cook time stats
- **Shop ingredients** — a "Shop ingredients" button on the recipe detail screen opens the native share sheet with a formatted ingredient list, compatible with Instacart, AnyList, Notes, and any other app
- **API key security** — `ANTHROPIC_API_KEY` moved from `EXPO_PUBLIC_` (client-exposed) to server-only via Expo API routes
- **Account tab** — tab bar updated with an Account tab for sign-out

### v0.1.0 — Initial release

- Photo library support — users can select an ingredient photo from their library in addition to taking one with the camera
- Preference customization screen — added between photo selection and recipe results, collecting:
  - Time available (Quick / Medium / No rush), which routes to Haiku, Sonnet, or Opus respectively
  - Ingredient usage (photographed ingredients only, or open to adding extras)
  - Meal type (Breakfast, Lunch, Dinner, Snack, Dessert)
  - Flavor profiles (Savory, Sweet, Spicy, Fresh & Light, Smoky, Comforting, Umami, Tangy)
  - Dietary restrictions (Vegetarian, Vegan, Gluten-Free, Dairy-Free, Low-Carb, Keto)
  - Cuisine direction (Italian, Asian, Mexican, Mediterranean, American, Indian, Surprise Me)
  - Free-text extra ingredients field
- NYT Cooking-inspired UI — editorial typography, cream background, dark green brand color
- Saved recipes — bookmark any recipe; favorites persist across sessions
- Brand refresh — app renamed to **mise**, new logo, color palette updated to forest green (`#2D4A1E`) and warm cream (`#F5F0E8`)
- Persistent tab bar — Discover and Saved tabs remain accessible from every screen in the app
- Back-to-recipes navigation — users can return from the Customize screen to their existing recipe results without triggering a new API call
- Fixed status bar text overlap — Saved screen content no longer scrolls behind the iOS status bar

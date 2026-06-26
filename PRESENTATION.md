# Video Talking Points

---

## Production Quality

**Modularity**
- Code is split by responsibility: `lib/` holds pure logic (store, API client, auth/rate-limit helpers), `app/api/` holds server-side route handlers, `contexts/` holds React state, `types/` holds shared interfaces
- Shared middleware (`lib/api-helpers.ts`) is imported by all three API routes — auth and rate-limiting logic lives in one place, not copy-pasted per route
- The global store is a typed singleton with explicit setter functions — no mutation happens outside `lib/store.ts`

**Edge cases handled**
- Auth tokens from Supabase can exceed 2KB; `expo-secure-store` has a 2KB limit per key, so the client uses a chunked adapter that splits tokens across multiple keys transparently
- Claude API calls have explicit timeouts (30s for ingredient scans, 90s for recipe generation) with `AbortController`
- Usage is only incremented *after* a successful Claude response — a failed or timed-out call doesn't count against the user's daily limit
- Cache hits bypass rate limiting entirely — only calls that actually reach Claude count
- Favorites use optimistic UI with error revert: the UI updates immediately, and rolls back if the API call fails
- `isFavorite` matches by recipe name, not ID, because discover recipes have client-side timestamp IDs while saved recipes have Supabase UUIDs — name is the only stable key across both contexts

**Rate limiting**
- Per-user daily limits stored in Supabase (`usage` table), incremented via an atomic `INSERT ... ON CONFLICT DO UPDATE` SQL function to avoid race conditions
- 20 ingredient scans / 10 recipe generations per user per day
- Returns a 429 with a human-readable message ("Daily limit reached — 10 recipe generations/day. Try again tomorrow.")

**Tests**
- 33 unit tests across two suites: store logic and API middleware
- Store tests cover ID assignment, batch accumulation, favorites matching — all the logic that's easy to get subtly wrong
- API helper tests mock Supabase and verify auth rejection paths, rate limit thresholds, RPC call arguments, and error response shapes

---

## AI-Native Speed

**How I used AI**
- Claude Code wrote the majority of the implementation: API routes, auth flow, Supabase integration, store mutations, UI components, unit tests
- I directed architecture (what to build and why), reviewed output, caught bugs, and made calls Claude couldn't — like checking Supabase dashboard state or running SQL queries to verify triggers fired

**How I verified and refined**
- TypeScript caught type mismatches immediately (e.g., the `UsageField` index type error in `_helpers.ts`)
- Ran in iOS simulator after each major change to verify the golden path
- Hit real errors that required diagnosis: the profiles trigger silently failing due to missing `set search_path = public`; RLS policies blocking inserts; Metro not picking up new env vars; stale Metro cache hiding schema changes
- Each error required understanding the root cause, not just applying a suggested fix — the AI proposed approaches, I verified them against real system state

**Where I pushed back or corrected**
- Instacart has no public consumer API — rejected that path and chose native share sheet instead
- Moved `_helpers.ts` out of `app/api/` after Expo Router flagged it as a missing route export
- The favorites ID mismatch (client timestamp IDs vs Supabase UUIDs) was a subtle bug that required a deliberate design decision to unify on recipe name as the stable key
- On iOS, a `multiline` `TextInput` ignores the `returnKeyType="done"` setting — the Done key inserts a newline instead of dismissing the keyboard, blocking the CTA buttons below it. Fixed with `blurOnSubmit` and `KeyboardAvoidingView`; a purely web-trained mental model would miss this platform-specific behavior entirely

---

## The "Wow" Factor

The high-leverage extension is **model routing tied to user intent**.

Most apps pick one Claude model. mise routes to a different model based on how much time the user says they have to cook:

| User selection | Model | Why |
|---|---|---|
| Quick (< 30 min) | Haiku 4.5 | Fast, cheap — simple recipes don't need deep reasoning |
| Medium (30–60 min) | Sonnet 4.6 | Balanced quality and speed |
| No rush | Opus 4.8 + adaptive thinking | Best reasoning for complex, multi-technique recipes |

This means the AI capability scales with the complexity of the output actually needed. A user asking for a 15-minute snack gets a near-instant response. A user planning a Sunday roast gets a model that can reason about technique, timing, and flavor development. The latency and cost profile match the use case automatically.

The other meaningful extension is the **Supabase cache keyed by ingredient fingerprint, not image bytes**. The ingredient confirmation step normalizes the raw image into a canonical list before generating recipes — so two different photos of the same fridge produce a cache hit. This is a deliberate architectural choice that makes caching practical rather than theoretical.

Two additional high-leverage extensions worth calling out:

**Streaming recipe generation with real-time feedback**
The recipes API returns `text/event-stream`. The server parses Claude's raw SSE events, extracts text deltas, and forwards them as simplified `{type: "progress", chars: N}` events. The client shows a live character counter ("Generating… 1,842 chars") in the button while Claude is writing, then cards spring-animate in with an 80ms stagger when the stream completes. This is a real streaming implementation — not a fake timer — and works for both initial generation and refresh. On cache hits, a `complete` event is sent immediately so the client code is uniform regardless of cache state.

**Weekly meal plan with ingredient reuse strategy**
A second AI flow on the same preferences: Claude (Sonnet) generates 7 dinners (Mon–Sun) with a specific instruction to reuse ingredients strategically across meals — "if you use half a can of coconut milk Monday, use the rest Thursday." This is a different use of the Claude API than the recipe generator: it's asking for planning and optimization, not just generation. The output includes per-recipe macros, full instructions, and a consolidated shopping list of only the items not already in your fridge, shareable via the native share sheet.

---

## Video Sections

### Product Demo

**What I built**
mise (a nod to *mise en place*) is a mobile app that turns a photo of your ingredients into personalized recipes, powered by Claude. You photograph what's in your fridge, confirm the ingredient list, set your preferences, and either get five recipes streamed in real time or a full week of dinners planned — with full ingredient lists, step-by-step instructions, macros, and a one-tap share to your shopping app of choice.

**Why**
The insight is that the bottleneck in home cooking isn't skill — it's knowing what to make with what you already have. Existing recipe apps require you to search, not discover. mise flips that: you show it what you have, it tells you what to make.

**Business impact**
- Reduces food waste by surfacing recipes for ingredients that would otherwise go unused
- Reduces friction to cooking at home, which has downstream health and cost benefits
- The model routing means the experience is genuinely fast for quick meals (< 5s with Haiku) while still offering depth for more ambitious cooking

---

### Tech Stack

| Choice | Why |
|---|---|
| Expo SDK 54 + Router 6 | Single codebase for iOS and Android; Expo API Routes let you run server-side Node.js handlers in the same project, so the API key never touches the client. SDK 54 aligns with the public Expo Go app so no custom build is needed for device demos |
| React Native | Write once, run on iOS and Android from a single codebase. Camera, photo library, share sheet, and secure storage all map to real native device APIs — no web-to-native wrappers needed |
| TypeScript | Catches type mismatches at compile time rather than at runtime on a user's device. The Claude API response shape is complex (nested recipes, macros, per-ingredient fields) — a typo in a field name surfaces immediately rather than silently returning `undefined` in production |
| Claude API via Expo API Routes (Haiku 4.5 / Sonnet 4.6 / Opus 4.8) | The official Node.js SDK doesn't work in React Native / Metro due to Node built-in dependencies, so the API is called via `fetch` from server-side Expo API Routes — the key never reaches the client. Model is routed by cooking time preference: Haiku for quick recipes (fast, cheap), Sonnet for medium, Opus with adaptive thinking for leisurely cooking where deeper reasoning improves quality |
| Supabase | Auth, database, and RPC functions in one platform — no separate auth service, no separate cache layer. Recipe cache, favorites, usage tracking, and user profiles all live in one place with a single set of credentials |
| `expo-secure-store` | Encrypted on-device storage for JWT tokens — the correct default for mobile auth. Standard `AsyncStorage` is unencrypted; auth tokens need to survive app restarts and must not be readable by other apps |

---

### Architectural Decisions

**Expo API Routes as the backend**
The API key for Anthropic never leaves the server. `app/api/*.ts` files run in Node.js on the server side; the client only ever calls `/api/ingredients` and `/api/recipes`. This is the minimum viable security boundary for a demo — in production this would be a dedicated backend service.

**Global mutable store singleton**
Rather than Redux or Zustand, the app uses a plain TypeScript object in `lib/store.ts` with explicit setter functions. At this scale (one user session, one linear flow) a singleton is simpler and has zero overhead. The tradeoff is that it doesn't support concurrent sessions or undo — neither of which is needed here.

**Cache key = SHA-256 of ingredients + preferences, not image bytes**
Hashing the raw image would make the cache useless — two photos of the same fridge would never match. By fingerprinting the *normalized ingredient list* after the confirmation step, cache hits are practical. The ingredient confirmation screen is load-bearing for caching, not just UX.

**Shared auth/rate-limit middleware**
`lib/api-helpers.ts` contains `requireUser`, `checkUsage`, and `incrementUsage`. All three API routes (`/api/ingredients`, `/api/recipes`, `/api/meal-plan`) import from it. This means the auth and rate-limiting behavior is tested once and consistent — there's no risk of one route forgetting to check the token or counting differently.

**Cache hits are free**
`checkUsage` is only called when Claude will actually be invoked. A cache hit returns immediately without touching the usage table. This is the right user-facing behavior and also makes the system cheaper to operate.

**Streaming via SSE — client code is uniform**
The recipes route always returns `text/event-stream`, whether the response comes from cache or Claude. Cache hits send a single `{type: "complete"}` event immediately; Claude calls send `{type: "progress"}` events followed by `{type: "complete"}` at the end. The client doesn't need to handle two different response formats — it just reads the stream. This makes the streaming architecture easier to test and extend.

**Graceful SSE fallback for React Native**
React Native's `fetch` implementation doesn't expose `response.body` as a `ReadableStream` the way browsers do. Rather than switching to a different transport, the client detects whether `.getReader()` is available and falls back to reading the entire SSE response as text, then replaying the events in order. The `complete` event fires correctly either way, so recipe cards animate in and the meal plan loads — the only difference is the live character counter is skipped on device. The server-side SSE architecture is unchanged.

**Meal plan as a separate Claude flow on the same data**
Rather than repurposing the recipe prompt, the meal plan uses a distinct prompt that asks Claude to reason about ingredient reuse across 7 days. This is a different task — planning and optimization vs. generation — and gets a different model call (Sonnet, not model-routed, because the complexity is uniform regardless of time preference). The two flows share the same auth, rate limiting, and ingredient/preference data from the store.

---

### Technical Trade-offs

**What I chose not to do**

- *Instacart deep link integration* — Instacart has no public consumer API. The share sheet is the practical alternative and works with any app the user already has.
- *Real-time favorites sync* — favorites load on tab focus, not via a WebSocket subscription. For a personal recipe app this is fine; at scale you'd want optimistic sync with a real-time layer.
- *Offline mode* — the app requires a network connection. Caching recipes locally for offline access would require a local database (SQLite via Expo), which adds complexity not justified for a demo.
- *Push notifications* — no "your weekly meal plan is ready" workflow, which would be a natural next feature.

**What I'd do to productionize**

- *Separate backend service* — move the API routes to a proper Express or Next.js server with structured logging, request tracing, and health checks. Expo API Routes are convenient for demos but not designed for production traffic.
- *Redis for caching* — replace the Supabase recipe cache with Redis for sub-millisecond cache reads and TTL-based expiry. Supabase works but adds a round-trip that Redis eliminates.
- *Rate limit enforcement at the edge* — move rate limiting to an API gateway or middleware layer (Upstash, Cloudflare Workers) so it's enforced before requests reach the application server.
- *Image storage* — currently images are sent as base64 in the request body. In production, upload to object storage (S3 / Supabase Storage) and send a signed URL to the Claude API instead, which reduces payload size and enables audit logging.
- *Proper observability* — add structured logging, error tracking (Sentry), and cost monitoring per user so you can identify abuse patterns and optimize model routing thresholds.
- *Prompt versioning* — the Claude prompts are hardcoded. In production you'd want to version and A/B test prompts without a code deploy.

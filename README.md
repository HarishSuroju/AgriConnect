# AgriConnect

AgriConnect is a crop residue exchange platform built for three user groups:

- Farmers can list biomass residue, estimate transport and earnings, and track requests.
- Industries can browse available residue, submit purchase requests, and manage pickups.
- Admins can review platform activity, users, transactions, and approval states.

## AI Features

AgriConnect uses LLM-powered features in two places:

**AI Crop Analysis** (`supabase/functions/analyze-crop`)
When a farmer uploads a photo while listing residue, a vision-language model classifies the crop type, estimates moisture level, and assigns a quality grade. The model is first asked to verify the image actually shows crop residue before analyzing it, uploads that don't (diagrams, screenshots, unrelated photos) are rejected with a clear message instead of returning a fabricated result.

**AI Match Assistant** (`supabase/functions/ai-match-assistant`)
On the Industry Browse page, industry users can describe what they need in plain language (e.g. "I need 10 tons of paddy within 50km"). The assistant uses LLM tool-calling: the model decides when to query live listing data via a `search_residue_listings` tool, then explains the ranked results in plain language. The underlying scoring/ranking logic (crop match, quantity, quality grade, distance) is a pure, unit-tested module at `src/lib/matchScoring.ts`, so results are deterministic and verifiable, the model explains them, it doesn't calculate them.

Both features are provider-agnostic: they call an OpenAI-compatible chat completions endpoint, configured via environment variables, so the underlying model (OpenAI, Groq, or any compatible provider) can be swapped without code changes.

### Required environment variables (Supabase Edge Function secrets)

| Variable | Used by | Notes |
|---|---|---|
| `AI_GATEWAY_URL` | both functions | OpenAI-compatible chat completions endpoint |
| `AI_GATEWAY_API_KEY` | both functions | API key for the above |
| `AI_MODEL` | both functions | Must support vision (for crop analysis) and tool-calling (for the match assistant). Currently using Groq's `qwen/qwen3.8-27b`. |
| `MATCH_AI_GATEWAY_URL` | ai-match-assistant only | Optional override if you want the match assistant on a different provider/model than crop analysis |
| `MATCH_AI_API_KEY` | ai-match-assistant only | Optional override |
| `MATCH_AI_MODEL` | ai-match-assistant only | Optional override |

If the `MATCH_AI_*` variables aren't set, `ai-match-assistant` falls back to the shared `AI_GATEWAY_*` variables.

## Stack

- React 18
- JavaScript
- Vite
- Tailwind CSS
- shadcn/ui and Radix UI
- Supabase Auth, Postgres, Storage, Edge Functions
- LLM integration via an OpenAI-compatible API (currently Groq)

## Local Development

```sh
npm install
npm run dev
```

The Vite dev server runs on `http://localhost:8080`.

## Useful Commands

```sh
npm run build
npm run lint
npm test
```

## Testing

Tests run on Vitest with React Testing Library. Coverage includes:

- `src/test/matchScoring.test.ts`: unit tests for the match assistant's scoring/ranking logic (crop filtering, distance cutoffs, quality grade weighting, quantity sufficiency, edge cases like missing coordinates)
- `src/test/AIMatchAssistant.test.tsx`: component tests for the AI Match Assistant chat UI, with a mocked Supabase client (sends correct payload, renders results, handles errors, blocks empty input)

## Deploying Edge Functions

```sh
npx supabase login
npx supabase link --project-ref jncutfofscjcdxlfxbtp
npx supabase functions deploy ai-match-assistant
npx supabase functions deploy analyze-crop
```

## Project Structure

- `src/pages`: route-level screens for public, farmer, industry, and admin views
- `src/components`: reusable UI and domain components (includes `AIMatchAssistant.tsx`, `AIAnalysisPanel.tsx`)
- `src/lib`: framework-free, unit-tested business logic (e.g. `matchScoring.ts`)
- `src/contexts`: auth and shared app state
- `src/integrations/supabase`: Supabase client and generated types
- `src/test`: Vitest unit and component tests
- `supabase/migrations`: database schema and policy changes
- `supabase/functions`: edge functions, `analyze-crop` (AI vision analysis) and `ai-match-assistant` (AI tool-calling matching)
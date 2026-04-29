# AgriConnect

AgriConnect is a crop residue exchange platform built for three user groups:

- Farmers can list biomass residue, estimate transport and earnings, and track requests.
- Industries can browse available residue, submit purchase requests, and manage pickups.
- Admins can review platform activity, users, transactions, and approval states.

## Stack

- React 18
- JavaScript
- Vite
- Tailwind CSS
- shadcn/ui and Radix UI
- Supabase Auth, Postgres, Storage, Edge Functions

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

## Project Structure

- `src/pages`: route-level screens for public, farmer, industry, and admin views
- `src/components`: reusable UI and domain components
- `src/contexts`: auth and shared app state
- `src/integrations/supabase`: Supabase client and generated types
- `supabase/migrations`: database schema and policy changes
- `supabase/functions`: edge functions for analysis and admin utilities

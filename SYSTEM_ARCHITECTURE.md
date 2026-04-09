# AgriConnect System Architecture

## Overview

AgriConnect is a crop residue exchange platform built as a client-side React application backed by Supabase services. The system supports three main personas: farmers, industries, and admins. The frontend handles routing, UI state, localization, and form workflows, while Supabase provides authentication, database storage, row-level policy enforcement, file storage, and edge functions.

## High-Level Architecture

```text
Browser
  -> React + Vite SPA
  -> Supabase client
     -> Auth
     -> Postgres
     -> Storage
     -> Edge Functions
```

### Presentation Layer

- `src/pages`: route-level screens for landing, login, dashboards, listings, requests, and admin views.
- `src/components`: reusable UI and domain components such as AI analysis, complaint dialogs, gamification, navigation, and cards.
- `src/contexts`: shared application state, especially authentication and demo state.
- `src/i18n`: translation resources and language switching.

### Application Logic Layer

- User session management is handled in `src/contexts/AuthContext.tsx`.
- Role-based routing and dashboard composition are handled in `src/App.tsx` and page components.
- Listing, request, and complaint flows are implemented in page-level components using Supabase queries.
- AI crop analysis is handled by `src/components/AIAnalysisPanel.tsx`, which calls the `analyze-crop` edge function.

### Data Layer

- Supabase Postgres stores core entities such as `profiles`, `user_roles`, `industry_profiles`, `residue_listings`, `transactions`, `notifications`, `complaints`, `user_stats`, `credit_score_events`, `credit_score_rules`, and `fraud_reports`.
- Row-level security and SQL policies enforce access by role and ownership.
- Generated database types live in `src/integrations/supabase/types.ts`.

### External Services

- Supabase Auth manages sign-up, sign-in, sessions, and password authentication.
- Supabase Storage hosts residue images.
- Supabase Edge Functions provide server-side workflows such as AI crop analysis and seed/admin utilities.
- OpenAI is used indirectly through the `analyze-crop` edge function via the configured AI gateway.

## Core User Flows

### Guest Flow

1. Guest opens the landing page and views the platform overview.
2. Guest switches language if needed and reads the public marketing content.
3. Guest chooses sign in or register from the login screen.
4. Registration stores the account in Supabase Auth and creates the profile/role records through the auth pipeline.
5. After authentication, the app routes the user to the correct dashboard based on role.

### Farmer Flow

1. Farmer signs in through Supabase Auth.
2. Farmer lands on the farmer dashboard and sees total earnings, carbon credits, trust points, and recent activity.
3. Farmer opens List Residue to create a listing.
4. Farmer uploads an image or uses text-only input for residue details.
5. The frontend invokes `analyze-crop` to estimate crop type, moisture, grade, and confidence.
6. The listing is saved in `residue_listings` and becomes visible to industries.
7. Farmer can review available nearby industries, send requests, and track outgoing requests.
8. When a transaction completes, carbon metrics, `user_stats.total_points`, and related transaction fields are updated.

### Industry Flow

1. Industry user signs in through Supabase Auth.
2. Industry user lands on the industry dashboard and sees request counts, total spend, and available residue.
3. Industry user browses residue listings and inspects pricing, location, and cluster eligibility.
4. Industry user submits purchase or pickup requests tied to a listing.
5. Accepted transactions move through pending, scheduled, and completed states.
6. Industry user can raise complaints from completed transactions if needed.
7. Industry trust points and activity are shown through the gamification card.

### Admin Flow

1. Admin signs in and lands on the admin dashboard.
2. Admin reviews users, transactions, approval states, complaints, and fraud reports.
3. Admin opens the complaints tab to resolve, reject, block, or deduct points from complaint cases.
4. Complaint resolution updates the complaint record and can reduce `user_stats.total_points`.
5. Admin reviews fraud reports and credit score history in the fraud reports area.
6. Admin monitors platform health and moderation actions across all users.

## Domain Responsibilities

### Points and Credits

- `user_stats.total_points` is the main gamification point balance shown in the Trust Level card.
- `profiles.credit_score` is the credit score system used for fraud and score events.
- `transactions.credit_points` stores per-transaction points.
- Carbon credits shown on the farmer dashboard are derived from biomass and transaction data.

### AI Analysis

- The frontend sends image data and crop hints to the `analyze-crop` edge function.
- The edge function attempts AI inference through the gateway.
- If the gateway fails, the function returns a fallback result with a debug case identifier.

## Deployment Boundaries

- Frontend build and local development use Vite.
- Edge functions are deployed independently through the Supabase CLI.
- Database schema changes are managed via migration files in `supabase/migrations`.
- Environment variables for edge functions are stored in `supabase/functions/.env` locally and pushed to Supabase secrets.

## Key Project Files

- [README.md](README.md)
- [src/App.tsx](src/App.tsx)
- [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx)
- [src/components/AIAnalysisPanel.tsx](src/components/AIAnalysisPanel.tsx)
- [src/pages/FarmerDashboard.tsx](src/pages/FarmerDashboard.tsx)
- [src/pages/IndustryDashboard.tsx](src/pages/IndustryDashboard.tsx)
- [src/pages/AdminComplaints.tsx](src/pages/AdminComplaints.tsx)
- [supabase/functions/analyze-crop/index.ts](supabase/functions/analyze-crop/index.ts)
- [supabase/migrations](supabase/migrations)

## Notes

- The architecture is intentionally modular: UI, auth, domain logic, and data access are separated so individual features can evolve without large cross-cutting changes.
- Server-side AI fallback behavior is designed to keep the UI responsive even when the upstream AI provider is unavailable.
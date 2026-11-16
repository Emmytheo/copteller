# Copteller — Standalone Digital Cooperative, Thrift & Fleet Financing OS

Copteller is a standalone Next.js + Payload CMS + Supabase platform for autonomous cooperative governance, rotational thrift (`Ajo` / `Esusu`), asset hire-purchase (`HP` / fleet leasing), institutional grant disbursements, and multi-role financial operations.

## Project Structure

- `app/(copteller)/copteller/(marketing)` — Public marketing, product showcase, simulator, and grant claim pages
- `app/(copteller)/copteller/(auth)` — Authentication, password recovery, and multi-profile switcher
- `app/(copteller)/copteller/onboarding` — Role-specific onboarding flows (Member, Coop Admin, Investor)
- `app/(copteller)/copteller/(portal)` — 5 Role-based Portals:
  - **Member Portal** (`/copteller/dashboard`, `/copteller/wallet`, `/copteller/esusu`, `/copteller/hp`, `/copteller/dues`, `/copteller/credit`, `/copteller/circles`, `/copteller/household`, `/copteller/cards`, `/copteller/services`)
  - **Cooperative Admin Portal** (`/copteller/admin`, `/copteller/admin/members`, `/copteller/admin/schemes`, `/copteller/admin/fleet`, `/copteller/admin/dues`, `/copteller/admin/payouts`, `/copteller/admin/ledger`, `/copteller/admin/audit`)
  - **Investor Console** (`/copteller/investor`, `/copteller/investor/schemes`, `/copteller/investor/payouts`, `/copteller/investor/registry`)
  - **Institutional Partner Console** (`/copteller/partner`, `/copteller/partner/schemes`, `/copteller/partner/beneficiaries`, `/copteller/partner/settlements`, `/copteller/partner/governance`)
  - **Bank Superadmin Console** (`/copteller/superadmin`, `/copteller/superadmin/unions`, `/copteller/superadmin/schemes`, `/copteller/superadmin/assets`, `/copteller/superadmin/grants`, `/copteller/superadmin/workflows`, `/copteller/superadmin/endpoints`, `/copteller/superadmin/vault`, `/copteller/superadmin/compliance`)
- `app/api/copteller/**` — Copteller REST API endpoints
- `lib/copteller/**` — Database connection pool (`pg.ts`), Payload helper (`db.ts`), Supabase clients (`supabase/*`), and role/profile authentication (`auth.ts`)
- `scripts/copteller-profiles-schema.sql` — Supabase SQL migration for `public.copteller_profiles`

## Running Locally

1. Configure `.env.local` (see `.env.example` for required variables).
2. Start the development server (defaults to port `3001` so it can run alongside the Partner MFB Core Banking Suite on port `3000`):
   ```bash
   yarn dev
   ```
3. Build for production:
   ```bash
   yarn build
   yarn start
   ```


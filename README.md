# University Event Planning App (Scaffold)

Tech stack: Next.js App Router, TypeScript, Tailwind CSS, Prisma ORM, PostgreSQL (Azure).

## Quick start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env file:
   ```bash
   cp .env.example .env
   ```
   If you also use Next.js local env loading, copy to `.env.local` too:
   ```bash
   cp .env .env.local
   ```
   Set `DATABASE_URL` to your pooled connection and `DIRECT_URL` to a direct/non-pooler host for migrations.
3. Generate Prisma client and migrate:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate -- --name init
   ```
4. Run development server:
   ```bash
   npm run dev
   ```

## Core features scaffolded

- Auth with JWT cookie (`/api/auth/signup`, `/api/auth/login`)
- Event creation with category-specific fields and ticket options
- Admin approval flows for events and ticket payment slips
- Sponsorship request + SMTP email dispatch
- Voting (`RSVP` and `organiserVote`)
- Organiser badge assignment after admin event approval

# Pikaboo — 3D print order desk

Customer order form + Genny's Studio admin dashboard, backed by Supabase
(database, auth, file storage) and Resend (email). Built from the
`Pikaboo Order Form` / `Pikaboo Studio` designs.

**Not live yet.** See [`SETUP.md`](./SETUP.md) for the steps to connect it to
a real database and start receiving orders — takes about 20 minutes.

## Local development

```bash
npm install
cp .env.local.example .env.local   # then fill in the values, see SETUP.md
npm run dev
```

- `/` — the customer order form
- `/studio` — the admin dashboard (sign in required, see SETUP.md)

## Project layout

- `src/app/page.tsx` — customer order form
- `src/app/studio/` — Studio admin (login + dashboard)
- `src/app/api/` — server routes for order/idea submission and status emails
- `src/components/studio/` — Orders / Ideas / Prints & colors tabs
- `src/lib/` — Supabase clients, email templates, shared types
- `supabase/schema.sql` — full database schema, security rules, and starter catalog

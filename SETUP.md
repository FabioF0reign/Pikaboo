# Pikaboo — going live

This app is code-complete. Nothing works yet because it isn't connected to a
database or an email account — that's on you, and it's about 20 minutes of
clicking through two websites, no coding involved. Follow this in order.

## 1. Create a Supabase project (the database)

1. Go to [supabase.com](https://supabase.com), sign up, and click **New project**.
2. Pick any name/region and a database password (save it somewhere, you likely won't need it again).
3. Once it's ready, open **SQL Editor** (left sidebar) → **New query**.
4. Open `supabase/schema.sql` from this project, copy the whole file, paste it into the query box, and click **Run**.
   This creates every table, security rule, storage bucket, and the starter menu of 6 prints and 12 colors.
5. Open **Project Settings → API**. You'll need three values from here in step 3 below:
   - **Project URL**
   - **anon / public** key
   - **service_role** key (click "reveal") — keep this one secret, never share it or put it in client-side code

## 2. Create your admin login (Genny's account)

1. In Supabase, open **Authentication → Users → Add user → Create new user**.
2. Enter the email and password you want to use to sign into the Studio (the admin dashboard). Tick **Auto Confirm User**.
3. That's your only login — there's no public sign-up page, which is intentional (it's a single-owner shop).

## 3. Create a Resend account (order/idea emails)

1. Go to [resend.com](https://resend.com) and sign up (free tier: 3,000 emails/month, plenty for this).
2. **Domains → Add Domain**, add your own domain, and add the DNS records it gives you at your domain host (GoDaddy, etc.) — this is required, Resend won't send from an unverified domain. This can take up to a few hours to verify.
   - Don't have a domain yet? You can skip verification and use `onboarding@resend.dev` as the from-address for testing, but real orders should come from your own domain so customer replies land somewhere real.
3. **API Keys → Create API Key** — copy it, you'll only see it once.

## 4. Set your environment variables

Copy `.env.local.example` to `.env.local` and fill in the values from steps 1–3:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=...
RESEND_FROM_EMAIL=Pikaboo <orders@yourdomain.com>
STUDIO_NOTIFY_EMAIL=genny@yourdomain.com   # where new-order/new-idea alerts go
PAYPAL_ME_HANDLE=...                       # optional — adds a PayPal payment link to the confirmation email
CASHAPP_CASHTAG=...                        # optional — adds a Cash App payment link to the confirmation email
```

Run it locally to try it out:

```
npm install
npm run dev
```

Visit `http://localhost:3000` for the order form and `http://localhost:3000/studio` for the Studio (sign in with the account from step 2).

## 5. Deploy it for real (Vercel)

No coding required, just clicking through two more websites.

**Get the code onto GitHub:**

1. If you don't have a GitHub account, sign up at [github.com](https://github.com) — it's free.
2. Go to [github.com/new](https://github.com/new). Name it `pikaboo`, leave it Public or Private (doesn't matter), and **don't** check "Add a README". Click **Create repository**.
3. On the new (empty) repo's page, click the **"uploading an existing file"** link.
4. Unzip the project on your computer, open that unzipped `pikaboo` folder, select **everything inside it** (`src`, `supabase`, `public`, `package.json`, etc. — not the outer folder itself), and drag it all into the upload box.
5. Scroll down and click **Commit changes**.

**Deploy it on Vercel:**

6. Go to [vercel.com](https://vercel.com) and click **Continue with GitHub** — this creates your Vercel account and links it to GitHub in one step.
7. Click **Add New → Project**, find your `pikaboo` repo, click **Import**.
8. Before clicking Deploy, expand **Environment Variables** and add the same values from step 4 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `STUDIO_NOTIFY_EMAIL`, and `PAYPAL_ME_HANDLE` / `CASHAPP_CASHTAG` if you're using those).
9. Click **Deploy**. In a minute or two you'll get a live `pikaboo-xxxx.vercel.app` URL — that's your real, working site.

**Point your GoDaddy domain at it (optional):**

10. In Vercel: **Settings → Domains → Add**, type your domain, and it'll show you a CNAME or A record to add.
11. In GoDaddy: **My Products → DNS** for that domain, add the record Vercel gave you. Takes a few minutes to an hour to go live.

This replaces the "upload files to GoDaddy File Manager" plan discussed earlier — GoDaddy's shared hosting can't run this kind of app (it needs a server to talk to Supabase/Resend securely), but pointing your GoDaddy domain at Vercel works great and is free.

**Making changes later:** once it's on GitHub, any time this app's code changes, re-uploading the changed files (same drag-and-drop as step 4) automatically redeploys the live site — Vercel watches the GitHub repo for you.

## What's different from the design prototype

- **Real accounts instead of a shared passcode.** The Studio no longer unlocks with `pikaboo` — it's a real login (step 2), so only you can get in, and the session works the same on your phone and laptop.
- **Orders sync everywhere, instantly.** A customer ordering on their phone shows up in your Studio immediately, on any device — this was the main limitation called out in the original design chat.
- **Real emails.** You get an email the moment an order or custom-print idea comes in. Customers get an email the moment you hit "Confirm order" — and another when you mark it done: for a ship-to-me order, clicking "Mark picked up / shipped" asks for a tracking number (optional, you can skip it) and emails the customer with it; for local pickup it just sends a "thanks for picking up" email, no tracking prompt.
- **"Load sample orders" and "Reset to defaults" were removed.** Those were demo helpers for the prototype; seeding fake orders or wiping your real catalog isn't something you want on a live store. Ask if you'd like either brought back as an admin-only tool.
- **Payment links, not checkout.** "Send my order" still just saves the order and emails you — nothing is charged automatically. But once you hit "Confirm order," the email to the customer includes tap-to-pay Venmo, PayPal, and Cash App links pre-filled with the total, a Zelle number to send to, and a line asking Apple Cash payers to text you. Real in-site card checkout (Stripe) is still a separate project — say the word if you want that next.
- **Shipping price varies by state.** Set a default flat rate plus per-state overrides from the Studio's **Shipping** tab — customers see the right price the moment they pick their state, before submitting.
- **Per-worker payment handles.** If an order's been claimed by Fabian or Thalia (the claim buttons on an order card, so two people don't print the same thing) before you hit "Confirm order," the payment email uses that worker's own Venmo/PayPal/Cash App/Zelle/phone if you've set them (`FABIAN_VENMO_HANDLE`, `THALIA_CASHAPP_CASHTAG`, etc. — see `.env.local.example`), so the customer pays the right person directly. Unclaimed orders, or handles you haven't set for that worker, fall back to the shop-wide ones.

## Costs

Everything here runs on free tiers at your current scale: Supabase free tier (500MB database, 1GB file storage, 50k monthly active users), Resend free tier (3,000 emails/month), Vercel free tier (plenty for a small shop's traffic). You'll only hit a paywall if this genuinely takes off.

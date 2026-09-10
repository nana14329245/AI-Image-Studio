# UP / SCALE

Swiss-inspired image upscaler using Next.js App Router, React, TypeScript/TSX and Tailwind CSS utility classes.

## Run

1. Install Node.js 20.9 or newer.
2. Run `npm ci`.
3. Copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Complete the Supabase database setup below. For image processing, also set `SUPABASE_SERVICE_ROLE_KEY` and `REPLICATE_API_TOKEN`.
4. Run `npm run dev`, then open the Local URL printed in the terminal (the port may be 3001).

Production: `npm run build`, then `npm start`.

## Features

- Responsive grid layout, black/white palette and orange accent.
- File picker and drag-and-drop for JPG, PNG and WebP up to 4 MB; direct HTTPS image URLs.
- Preview with a 16-megapixel input limit on the client.
- 2× and 4× enlargement through the existing Replicate Real-ESRGAN model.
- Original/result switch, loading and error states, download and open-image fallback.
- Styling lives primarily in JSX; one small global CSS file.

## Notes

Images are sent to Replicate when processing starts. API usage may incur charges. The API token remains server-side. No credentials are included in this source archive; use your existing local token.

Live AI processing requires a valid token, service credit and model access. A production deployment should provide authentication, rate limits and platform-level request limits before exposing the paid endpoint publicly. Configure enough server execution time for model processing. Remote image downloads depend on the provider's CORS headers; the open-image link is available as a fallback.

This project preserves the original Next.js dependencies and lockfile. The archive excludes node_modules, build caches, Git history and local secrets.

## Setup (Auth, Database, Credits, Subscriptions, Rate limiting) — in progress

This pass wires real infrastructure on top of the original UI. **Status: core plumbing done and building cleanly; gallery/account pages still show sample data and are not yet wired to the new APIs.**

### 1. Supabase
1. Create a project at supabase.com, then copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API).
2. Run `supabase/migrations/0001_init.sql` against your project (SQL Editor, or `supabase db push` if you use the CLI). It creates `profiles`, `credit_ledger`, `generations`, `rate_limit_events`, the `spend_credits` / `grant_credits` / `check_rate_limit` RPCs, RLS policies, and a public `generations` storage bucket.
3. Auth → Providers → enable **Email** and **Google** (add your Google OAuth client ID/secret from the Google Cloud Console; set the Supabase-provided redirect URL in Google's console).
4. Auth → URL Configuration → add your site URL and `/auth/callback` to the allowed redirect URLs.

### 2. Stripe
1. Create two recurring Prices (Pro, Business) in the Stripe Dashboard → Product catalog, and put their IDs in `STRIPE_PRICE_PRO` / `STRIPE_PRICE_BUSINESS`.
2. Set `STRIPE_SECRET_KEY` from the Dashboard.
3. Create a webhook endpoint pointing at `https://your-domain/api/webhooks/stripe` listening for `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`; copy its signing secret into `STRIPE_WEBHOOK_SECRET`. For local testing use `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

### 3. What's already wired
- Login/Signup (`/login`, `/signup`) — email/password + Google OAuth, via Supabase Auth. `src/proxy.ts` (Next's current name for middleware) refreshes sessions and redirects signed-out users.
- New users get a `profiles` row with 20 free credits automatically (DB trigger).
- `/api/upscale` now requires login, checks a sliding-window rate limit, verifies/deducts credits atomically, and logs every job to `generations` (the real gallery table).
- `/api/billing/checkout` and `/api/billing/portal` create real Stripe Checkout / Billing Portal sessions; `/api/webhooks/stripe` keeps `profiles.plan`, `subscription_status` and monthly credit grants in sync.
- Dark mode is a real theme, not a mock toggle — colors are design tokens (`--color-ink`, `--color-paper`, etc. in `globals.css`), switchable via the toggle in the sidebar and persisted in a `theme` cookie.

### 4. Not yet done
- `/gallery` and `/account` still render their original sample data — they need to be pointed at the `generations` table and the new billing/profile APIs.
- The Product / Ad / Portrait tools don't have generation routes yet (only `/api/upscale` does); they'll need the same auth + rate-limit + credit-spend pattern once their underlying image models are wired up.
- No automated refund path if a job fails after credits are reserved but before the provider responds (current code only ever deducts credits on confirmed success, so this is a lower-risk gap, but worth reviewing under load).

## แก้ปัญหา Supabase URL / Key

- ไฟล์ `.env.local` ต้องอยู่ข้าง `package.json` ไม่ใช่ใน `src` และไม่ใช่ `.env.local.txt`
- คัดลอก `.env.example` เป็น `.env.local` เฉพาะเมื่อยังไม่มีไฟล์เดิม เพื่อไม่ทับคีย์ที่ตั้งไว้แล้ว
- ใส่ Project URL และ Publishable key ของโปรเจกต์จริง หรือใช้ชื่อ `NEXT_PUBLIC_SUPABASE_ANON_KEY` สำหรับ anon key
- ถ้ากรอกทั้งสองคีย์ แอปจะเลือก Publishable key ก่อน
- ห้ามใส่ Secret key หรือ service_role ในตัวแปร `NEXT_PUBLIC_`
- หยุดเซิร์ฟเวอร์ด้วย Control + C แล้วรัน `npm run dev` ใหม่หลังแก้ค่า
- ถ้าค่ายังไม่ครบ หน้าเว็บจะไป `/setup` และ API จะตอบ 503 โดยไม่ข้ามการล็อกอิน
- หน้า setup ตรวจรูปแบบเบื้องต้นเท่านั้น คีย์ต้องเป็นของโปรเจกต์จริงจึงจะล็อกอินได้
- ZIP นี้ไม่มีคีย์จริง จึงต้องใส่ค่าของคุณก่อนใช้งานระบบบัญชีและสร้างภาพ

Implementation references: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
and https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack
# AI-Image-Studio
# AI-Image-Studio

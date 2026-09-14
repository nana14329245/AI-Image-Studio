# UP / SCALE

Swiss-inspired image upscaler using Next.js App Router, React, TypeScript/TSX and Tailwind CSS utility classes.

## Run

1. Install Node.js 20.9 or newer.
2. Run `npm ci`.
3. Copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Complete the Supabase database setup below. For image processing, also set `SUPABASE_SERVICE_ROLE_KEY` and `FAL_KEY`.
4. Run `npm run dev`, then open the Local URL printed in the terminal (the port may be 3001).

Production: `npm run build`, then `npm start`.

## Features

- Responsive grid layout, black/white palette and orange accent.
- File picker and drag-and-drop for JPG, PNG and WebP up to 4 MB; direct HTTPS image URLs.
- Preview with a 16-megapixel input limit on the client.
- 2× enlargement through fal.ai Clarity Upscaler (`fal-ai/clarity-upscaler`) and 4× enlargement through Topaz (`fal-ai/topaz/upscale/image`). Supports two enhancement styles: **Natural (High Fidelity V2)** for faithful preservation, and **Vivid & Sharp (Standard V2)** for enhanced color grading, vibrance, and crisp details.
- Product Studio, Ad Studio, and Professional Photo generate one image per request with FLUX Kontext (`fal-ai/flux-pro/kontext`), using the selected styles, backgrounds, platforms, and sizes.
- Ad Studio keeps headline, benefit, and CTA copy outside the generated image so text stays accurate and editable.
- Original/result switch, real fal.ai queue status progress, error states, download and open-image fallback.
- Complete Account & Subscription workspace (`/account`) with real-time profile editing, subscription management (Free, Pro, Business via Stripe Checkout & Billing Portal), and credit transaction ledger history.
- Styling lives primarily in JSX; one small global CSS file.

## Notes

Images are sent to fal.ai when processing starts. API usage may incur charges. Set the server-only `FAL_KEY` in `.env.local`; never expose it through a `NEXT_PUBLIC_` variable. No credentials are included in this source archive.

Successful generations are copied from fal.ai to the project's Supabase Storage bucket before credits are deducted. `/gallery` shows the signed-in user's completed generation history, and result downloads use an authenticated application route so browsers save the file instead of opening the provider URL. Image tools submit fal.ai queue jobs and poll the application status route; the displayed percentage represents the confirmed queue/generation/save stage, not an estimated timer.
Set the `generations` bucket's maximum file size to 50 MB by applying every migration in `supabase/migrations/`, including `0003_increase_generation_storage_limit.sql`. In Supabase Dashboard → Storage Settings, ensure the project-wide file size limit is also at least 50 MB.

Live AI processing requires a valid token, service credit and model access. A production deployment should provide authentication, rate limits and platform-level request limits before exposing the paid endpoint publicly. Configure enough server execution time for model processing. Remote image downloads depend on the provider's CORS headers; the open-image link is available as a fallback.

This project preserves the original Next.js dependencies and lockfile. The archive excludes node_modules, build caches, Git history and local secrets.

## Setup (Auth, Database, Credits, Subscriptions, Rate limiting) — in progress

This pass wires real infrastructure on top of the original UI.

### 1. Supabase
1. Create a project at supabase.com, then copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API).
2. Run every migration in `supabase/migrations/` against your project in filename order (SQL Editor, or `supabase db push` if you use the CLI). They create `profiles`, `credit_ledger`, `generations`, `rate_limit_events`, the `spend_credits` / `grant_credits` / `check_rate_limit` RPCs, RLS policies, and a public `generations` storage bucket.
3. Auth → Providers → enable **Email** and **Google** (add your Google OAuth client ID/secret from the Google Cloud Console; set the Supabase-provided redirect URL in Google's console).
4. Auth → URL Configuration → add your site URL and `/auth/callback` to the allowed redirect URLs.

### 2. Stripe
1. Create two recurring Prices (Pro, Business) in the Stripe Dashboard → Product catalog, and put their IDs in `STRIPE_PRICE_PRO` / `STRIPE_PRICE_BUSINESS`.
2. Set `STRIPE_SECRET_KEY` from the Dashboard.
3. Create a webhook endpoint pointing at `https://your-domain/api/webhooks/stripe` listening for `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`; copy its signing secret into `STRIPE_WEBHOOK_SECRET`. For local testing use `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

### 3. What's already wired
- Login/Signup (`/login`, `/signup`) — email/password + Google OAuth, via Supabase Auth. `src/proxy.ts` (Next's current name for middleware) refreshes sessions and redirects signed-out users.
- New users get a `profiles` row with 20 free credits automatically (DB trigger).
- `/api/upscale` now requires login, checks a sliding-window rate limit, submits a fal.ai queue job, and logs every job to `generations` (the real gallery table).
- `/api/product`, `/api/ads`, and `/api/portrait` follow the same authenticated, rate-limited, queued generation-record flow. `/api/generations/[id]/status` is owner-scoped and finalizes output storage and credits exactly once, including recovery after an interrupted save. Product and portrait generation cost 6 credits; ads generation costs 8 credits.
- `/api/billing/checkout` and `/api/billing/portal` create real Stripe Checkout / Billing Portal sessions; `/api/webhooks/stripe` keeps `profiles.plan`, `subscription_status` and monthly credit grants in sync.
- Dark mode is a real theme, not a mock toggle — colors are design tokens (`--color-ink`, `--color-paper`, etc. in `globals.css`), switchable via the toggle in the sidebar and persisted in a `theme` cookie.

### 4. Notes
- Credits are deducted only after a completed provider result is stored successfully.

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

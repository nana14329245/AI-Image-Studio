# UP / SCALE

Swiss-inspired image upscaler using Next.js App Router, React, TypeScript/TSX and Tailwind CSS utility classes.

## Run

1. Install Node.js 20.9 or newer.
2. Run `npm ci`.
3. Copy `.env.example` to `.env.local` and set your `REPLICATE_API_TOKEN`.
4. Run `npm run dev`, then open http://localhost:3000.

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

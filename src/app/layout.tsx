import type { Metadata } from "next";
import { cookies } from "next/headers";
import AnalyticsProvider from "@/components/AnalyticsProvider";
import ConsentBanner from "@/components/ConsentBanner";
import { getSiteUrl } from "@/lib/siteUrl";
import "./globals.css";

const title = "AI Image Studio — ภาพสินค้ามืออาชีพสำหรับผู้ขายออนไลน์";
const description =
  "ขยายภาพ 4K, ถ่ายภาพสินค้า 4 มุมมอง, สร้างภาพโฆษณา และภาพโปรไฟล์มืออาชีพ สำหรับร้านค้าบน Shopee, Lazada และ TikTok — ครบในที่เดียว ด้วยเครดิตชุดเดียว";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { default: title, template: "%s · AI Image Studio" },
  description,
  applicationName: "AI Image Studio",
  // Shop owners pass links around in LINE and Facebook, where a missing preview
  // card is the difference between a link that gets opened and one that does not.
  openGraph: {
    type: "website",
    siteName: "AI Image Studio",
    locale: "th_TH",
    url: "/",
    title,
    description,
  },
  twitter: { card: "summary_large_image", title, description },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get("theme")?.value === "dark" ? "dark" : "light";
  return (
    <html lang="th" data-theme={theme}>
      <body>
        <AnalyticsProvider />
        {children}
        <ConsentBanner />
      </body>
    </html>
  );
}

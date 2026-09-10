import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Image Studio",
  description: "Swiss-inspired AI image workspace for upscaling, product images, ads and professional photos.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get("theme")?.value === "dark" ? "dark" : "light";
  return (
    <html lang="th" data-theme={theme}>
      <body>{children}</body>
    </html>
  );
}

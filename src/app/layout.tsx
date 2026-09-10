import type { Metadata } from "next";
import "./globals.css";
import StudioShell from "@/components/StudioShell";

export const metadata: Metadata = {
  title: "AI Image Studio",
  description: "Swiss-inspired AI image workspace for upscaling, product images, ads and professional photos.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="th"><body><StudioShell>{children}</StudioShell></body></html>;
}

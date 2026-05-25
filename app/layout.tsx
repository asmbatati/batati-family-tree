import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "موقع البطاطي — Al-Batati Family Tree",
    template: "%s | Al-Batati"
  },
  description:
    "منصة حديثة لشجرة عائلة البطاطي — تاريخ، نسب، شجرة عائلة بطبقات، أحداث، وتحليلات. A modern bilingual family-tree platform for the Al-Batati family.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "موقع البطاطي — Al-Batati Family Tree",
    description: "شجرة عائلة البطاطي بتصميم حديث وطبقات تفاعلية.",
    type: "website"
  }
};

export const viewport: Viewport = {
  themeColor: "#a87a34",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // The actual <html dir lang> is set by [locale]/layout.tsx; this is a thin shell.
  return children as React.ReactElement;
}

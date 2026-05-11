import "./globals.css";
import type { Metadata } from "next";
import { fontInter, fontMono } from "@/lib/fonts";
import { ThemeScript } from "@/components/shell/ThemeScript";
import { TopBar } from "@/components/shell/TopBar";
import { MetaRail } from "@/components/shell/MetaRail";

export const metadata: Metadata = {
  title: "IntelRelay",
  description:
    "API-first IOC submission router with safe browser-automation fallbacks.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${fontInter.variable} ${fontMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen bg-paper text-ink antialiased">
        <TopBar />
        <div className="mx-auto flex max-w-[1440px]">
          <MetaRail />
          <main className="min-w-0 flex-1 px-5 py-8 lg:px-8 lg:py-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Dekko, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";
import resume from "@/content/resume.json";

/** Body and headings. Variable, so the 400 roman and 700 display cuts are one file. */
const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
  display: "swap",
});

/** The note hand: captions, dates, tabs and counters. */
const dekko = Dekko({
  variable: "--font-dekko",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${resume.profile.name} — Portfolio`,
  description: resume.profile.headline,
};

/**
 * Applies the stored theme before first paint, so a dark-mode visitor never
 * sees a flash of the light page. Falls back to the OS preference, and to
 * light if storage is unavailable.
 */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="light"}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${schibsted.variable} ${dekko.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      {/* No body background: <html> carries the fallback colour, and the page's
          fixed gradient canvas paints between the two. */}
      <body className="min-h-full text-strong">{children}</body>
    </html>
  );
}

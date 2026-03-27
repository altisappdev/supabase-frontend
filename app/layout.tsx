import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./styles/globals.css";
import { AppProviders } from "@/components/providers/app-providers";

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "Supabase Todo Frontend",
  description: "Login, manage todos, and update your profile with the Nest + Supabase backend.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${bodyFont.variable} ${headingFont.variable}`}>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

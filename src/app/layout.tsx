import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "2 Books 2 Furious",
  description: "The book club home for 2 Books 2 Furious - meetings, reviews, backlog and more.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <Header />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
          <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
            <p>2 Books 2 Furious</p>
            <Link
              href="/suggestions"
              className="mt-2 inline-block text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Suggest a Feature
            </Link>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
